-- Idempotent: safe to run repeatedly (npm run db:migrate, also called by db:import).
-- Neon / Supabase: run `CREATE EXTENSION IF NOT EXISTS postgis;` once first (see db/init.sql).

CREATE TABLE IF NOT EXISTS constraints (
  id         serial PRIMARY KEY,
  name       text NOT NULL,
  dataset    text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- EPSG:4326 (lon/lat, degrees). The source data is EPSG:2180 and is reprojected on import.
  geom       geometry(MultiPolygon, 4326) NOT NULL
);

-- Area in m², measured in EPSG:2180 (PUWG 1992, Poland's metric national grid), not in degrees.
-- Computed once per row: reprojecting a 118,000-vertex polygon on every request costs ~35 ms.
ALTER TABLE constraints
  ADD COLUMN IF NOT EXISTS area_m2 double precision
  GENERATED ALWAYS AS (ST_Area(ST_Transform(geom, 2180))) STORED;

-- Viewport (&&) queries use this.
CREATE INDEX IF NOT EXISTS constraints_geom_gist
  ON constraints USING GIST (geom);

CREATE INDEX IF NOT EXISTS constraints_dataset_idx
  ON constraints (dataset);

-- Superseded by the index on constraint_parts below.
DROP INDEX IF EXISTS constraints_geog_gist;

-- Each constraint cut into pieces of at most 256 vertices with ST_Subdivide.
-- Point and distance tests on one huge polygon walk every vertex; on its parts, the index
-- narrows the work to the few small pieces near the point. The parts partition the original,
-- so "inside any part" = inside, and "min distance over parts" = distance.
CREATE TABLE IF NOT EXISTS constraint_parts (
  constraint_id integer NOT NULL REFERENCES constraints (id) ON DELETE CASCADE,
  geom          geometry(Geometry, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS constraint_parts_geom_gist
  ON constraint_parts USING GIST (geom);

-- /api/nearby casts to geography so distances are in metres. A cast in the WHERE clause
-- cannot use the index above, so index the cast expression too.
CREATE INDEX IF NOT EXISTS constraint_parts_geog_gist
  ON constraint_parts USING GIST ((geom::geography));

CREATE INDEX IF NOT EXISTS constraint_parts_constraint_idx
  ON constraint_parts (constraint_id);

-- Keep constraint_parts in step with constraints, however rows get there (import or tests).
CREATE OR REPLACE FUNCTION constraints_subdivide() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM constraint_parts WHERE constraint_id = NEW.id;
  INSERT INTO constraint_parts (constraint_id, geom)
  SELECT NEW.id, ST_Subdivide(NEW.geom, 256);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS constraints_subdivide ON constraints;
CREATE TRIGGER constraints_subdivide
  AFTER INSERT OR UPDATE OF geom ON constraints
  FOR EACH ROW EXECUTE FUNCTION constraints_subdivide();
