// Small helpers so every API route answers in the same format.

// Reference data changes rarely: browsers keep it 5 minutes, shared caches (CDN) 1 hour.
export const REFERENCE_CACHE = "public, max-age=300, s-maxage=3600";
// Places change more often (likes, new places): keep them for a minute.
export const PLACES_CACHE = "public, max-age=60, s-maxage=300, stale-while-revalidate=600";

export function jsonData<T>(data: T, init?: { cache?: string; meta?: Record<string, unknown>; status?: number }) {
  return Response.json(
    init?.meta ? { data, meta: init.meta } : { data },
    {
      status: init?.status,
      headers: init?.cache ? { "Cache-Control": init.cache } : undefined,
    },
  );
}

export function jsonError(status: number, code: string, message: string, details?: unknown) {
  return Response.json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

// Read a JSON request body. Returns undefined when the body is missing or not valid JSON.
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export const unauthorized = () => jsonError(401, "unauthorized", "Please log in first");

export const forbidden = () => jsonError(403, "forbidden", "You are not allowed to do this");
// A banned person can still read the site, but cannot post, comment, like, save, report or upload.
export const banned = () => jsonError(403, "banned", "Your account has been suspended");

// The feature exists but is not open yet at the current release stage.
export const featureClosed = () => jsonError(403, "feature_closed", "This feature is not open yet");
