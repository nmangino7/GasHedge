import { z } from "zod";

export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: Response };

/**
 * Parse + validate a JSON request body against a Zod schema. On failure returns
 * a ready-to-return 400 Response with a clear `{ error }` message (matching the
 * app's existing client error convention).
 */
export async function parseJson<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<ParseResult<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, response: Response.json({ error: "Request body must be valid JSON." }, { status: 400 }) };
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.issues
      .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
      .join("; ");
    return { ok: false, response: Response.json({ error: `Invalid request — ${msg}` }, { status: 400 }) };
  }
  return { ok: true, data: result.data };
}
