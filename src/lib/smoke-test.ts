// A quick check that a deployed copy of the site is alive and safe. Run after every deploy:
//   npm run smoke -- https://staging.example.com
// It only reads public pages and APIs, so it is safe to run against production.
// Plain functions (fetch is passed in), so the tests can run it without a network.

export type SmokeResult = { name: string; ok: boolean; detail: string };

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export async function runSmoke(
  baseUrl: string,
  options: { fetchFn?: FetchFn; expectStage?: number } = {},
): Promise<SmokeResult[]> {
  const base = baseUrl.replace(/\/+$/, "");
  const get: FetchFn = options.fetchFn ?? ((url, init) => fetch(url, init));
  const results: SmokeResult[] = [];

  async function check(name: string, run: () => Promise<string>) {
    try {
      results.push({ name, ok: true, detail: await run() });
    } catch (error) {
      results.push({ name, ok: false, detail: error instanceof Error ? error.message : String(error) });
    }
  }
  const expect = (condition: boolean, message: string) => {
    if (!condition) throw new Error(message);
  };
  const json = async (path: string) => {
    const response = await get(`${base}${path}`, { redirect: "manual" });
    return { response, body: await response.json().catch(() => null) };
  };

  await check("Database answers (/api/v1/health)", async () => {
    const { response, body } = await json("/api/v1/health");
    expect(response.status === 200, `status ${response.status}`);
    expect(body?.status === "ok" && body?.database === "up", `body ${JSON.stringify(body)}`);
    return "ok, database up";
  });

  await check("All 25 provinces are there", async () => {
    const { response, body } = await json("/api/v1/provinces");
    expect(response.status === 200, `status ${response.status}`);
    expect(body?.data?.length === 25, `${body?.data?.length} provinces`);
    return "25 provinces";
  });

  await check("Categories are there", async () => {
    const { body } = await json("/api/v1/categories");
    expect(Array.isArray(body?.data) && body.data.length > 0, "no categories");
    return `${body.data.length} categories`;
  });

  await check("The places list works", async () => {
    const { response, body } = await json("/api/v1/places?limit=1");
    expect(response.status === 200, `status ${response.status}`);
    expect(Array.isArray(body?.data) && typeof body?.meta?.total === "number", "unexpected shape");
    return `${body.meta.total} places`;
  });

  await check("Release stage is as expected (/api/v1/features)", async () => {
    const { response, body } = await json("/api/v1/features");
    expect(response.status === 200, `status ${response.status}`);
    const stage = body?.data?.stage;
    expect([1, 2, 3, 4].includes(stage), `stage ${stage}`);
    if (options.expectStage !== undefined) expect(stage === options.expectStage, `stage ${stage}, expected ${options.expectStage}`);
    return `stage ${stage}`;
  });

  for (const [locale, label] of [["en", "English"], ["km", "Khmer"]] as const) {
    await check(`${label} home page opens`, async () => {
      const response = await get(`${base}/${locale}`);
      expect(response.status === 200, `status ${response.status}`);
      const html = await response.text();
      expect(html.includes(`<html lang="${locale}"`), `no <html lang="${locale}">`);
      return "200";
    });
  }

  await check("The admin API is closed to visitors", async () => {
    const response = await get(`${base}/api/v1/admin/overview`);
    expect(response.status === 401, `status ${response.status}, expected 401`);
    return "401";
  });

  await check("The admin pages are closed to visitors", async () => {
    const response = await get(`${base}/en/admin`, { redirect: "manual" });
    expect([301, 302, 303, 307, 308].includes(response.status), `status ${response.status}, expected a redirect to log in`);
    expect((response.headers.get("location") ?? "").includes("sign-in"), "does not lead to the log in page");
    return "redirects to log in";
  });

  await check("Security headers are set", async () => {
    const response = await get(`${base}/en`);
    expect(response.headers.get("x-content-type-options") === "nosniff", "x-content-type-options missing");
    expect(!!response.headers.get("referrer-policy"), "referrer-policy missing");
    return "ok";
  });

  return results;
}
