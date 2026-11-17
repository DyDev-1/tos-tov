// Small helpers so every API route answers in the same format.

// Reference data changes rarely: browsers keep it 5 minutes, shared caches (CDN) 1 hour.
export const REFERENCE_CACHE = "public, max-age=300, s-maxage=3600";

export function jsonData<T>(data: T, init?: { cache?: string }) {
  return Response.json(
    { data },
    { headers: init?.cache ? { "Cache-Control": init.cache } : undefined },
  );
}

export function jsonError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status });
}
