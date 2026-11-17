// Small helper for calling our own API from the browser.
// It never throws: network problems come back as { ok: false, status: 0 }.

export type ApiResult<T> =
  | { ok: true; status: number; data: T; meta?: Record<string, unknown> }
  | { ok: false; status: number; code?: string; message?: string };

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
    const body = await response.json().catch(() => null);
    if (response.ok) return { ok: true, status: response.status, data: body?.data as T, meta: body?.meta };
    return { ok: false, status: response.status, code: body?.error?.code, message: body?.error?.message };
  } catch {
    return { ok: false, status: 0 };
  }
}
