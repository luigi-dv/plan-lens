import { NextResponse, type NextRequest } from "next/server";
import { NotFoundError, ValidationError } from "./errors";

/**
 * Wraps a Route Handler: JSON on success, 400/404 for known errors,
 * and a generic 500 (details only in the server log) for everything else.
 */
export function apiHandler<T>(handler: (request: NextRequest) => Promise<T>) {
  return async (request: NextRequest) => {
    try {
      return NextResponse.json(await handler(request));
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (error instanceof NotFoundError) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      console.error(error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}
