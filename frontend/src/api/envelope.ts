// Single response envelope shape for all API routes.

export type ErrorCode =
  | "VALIDATION"
  | "NOT_FOUND"
  | "AI_NOT_CONFIGURED"
  | "AI_RATE_LIMIT"
  | "UPSTREAM"
  | "INTERNAL";

export interface Ok<T> {
  ok: true;
  data: T;
}

export interface Err {
  ok: false;
  error: { code: ErrorCode; message: string; details?: unknown };
}

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  AI_NOT_CONFIGURED: 503,
  AI_RATE_LIMIT: 429,
  UPSTREAM: 502,
  INTERNAL: 500,
};

export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data } satisfies Ok<T>, init);
}

export function fail(code: ErrorCode, message: string, details?: unknown): Response {
  return Response.json(
    { ok: false, error: { code, message, details } } satisfies Err,
    { status: STATUS[code] }
  );
}
