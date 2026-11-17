import "server-only";
import type { z } from "zod";
import type { UserRow } from "@/db/schema";
import { adminGuard } from "@/lib/admin-guard";
import { jsonData, jsonError, readJson } from "@/lib/api";
import type { Result } from "@/lib/services/admin";

// Shared pieces of the admin API routes, so each route is a few lines:
//   withAdmin(async (admin) => ...)  checks the role first (401 / 403), and turns crashes into a 500;
//   toResponse(result)               turns a service result into the right status code.

export async function withAdmin(run: (admin: UserRow) => Promise<Response>): Promise<Response> {
  try {
    const guard = await adminGuard();
    if ("response" in guard) return guard.response;
    return await run(guard.admin);
  } catch (error) {
    console.error("admin route failed", error);
    return jsonError(500, "internal_error", "Something went wrong");
  }
}

// What each "reason" from a service means over HTTP.
const STATUS: Record<string, [number, string]> = {
  not_found: [404, "Not found"],
  invalid_reference: [400, "Unknown province or category"],
  same_place: [400, "Choose a different place to merge into"],
  already_merged: [409, "This place was already merged into another"],
  target_unavailable: [409, "The place to merge into is hidden or merged"],
  slug_taken: [409, "That web name is already used"],
  in_use: [409, "This category still has places. Move them first."],
  cannot_ban_admin: [403, "Admins cannot be banned"],
  cannot_ban_yourself: [403, "You cannot ban yourself"],
  already_banned: [409, "This person is already banned"],
  not_banned: [409, "This person is not banned"],
  cannot_trust_admin: [409, "Admins already publish without approval"],
  user_banned: [409, "A banned person cannot be trusted"],
  already_trusted: [409, "This person is already trusted"],
  not_trusted: [409, "This person is not trusted"],
};

export function toResponse(result: Result | Result<{ id: number }>, successStatus = 200): Response {
  if (result.ok) return jsonData("value" in result ? result.value : { done: true }, { status: successStatus });
  const [status, message] = STATUS[result.reason] ?? [400, result.reason];
  return jsonError(status, result.reason, message);
}

export function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}
export const badId = () => jsonError(400, "invalid_id", "The id in the address is not valid");

// Read and check a JSON body. Returns the data, or a 400 response.
export async function parseBody<S extends z.ZodType>(request: Request, schema: S): Promise<{ data: z.infer<S> } | { response: Response }> {
  const parsed = schema.safeParse(await readJson(request));
  if (parsed.success) return { data: parsed.data };
  return {
    response: jsonError(400, "invalid_body", parsed.error.issues[0]?.message ?? "Invalid input", parsed.error.flatten().fieldErrors),
  };
}

export function parseQuery<S extends z.ZodType>(request: Request, schema: S): { data: z.infer<S> } | { response: Response } {
  const parsed = schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (parsed.success) return { data: parsed.data };
  return { response: jsonError(400, "invalid_query", "Some options are not valid", parsed.error.flatten().fieldErrors) };
}

export const PRIVATE = "private, no-store";
