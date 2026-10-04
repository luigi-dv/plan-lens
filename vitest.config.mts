import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
    // Makes DATABASE_URL from .env visible to the integration tests (CI sets it directly).
    env: loadEnv(mode, process.cwd(), ""),
    // Integration tests each create and drop their own schema; keep them from interleaving.
    fileParallelism: false,
  },
}));
