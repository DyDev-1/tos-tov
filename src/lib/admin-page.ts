import "server-only";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/auth";

// Every admin PAGE calls this first. A layout alone is not enough: Next.js does not run a layout again
// when you move between pages inside it, so each page checks the role itself, on the server.
//   - not logged in: sent to log in, and back afterwards;
//   - logged in but not an admin (or banned): a plain 404, so the admin area does not even show it exists.
export async function requireAdminPage(locale: Locale, path: string) {
  const user = await getCurrentUser();
  if (!user) redirect({ href: { pathname: "/sign-in", query: { redirect_url: `/${locale}${path}` } }, locale });
  if (!user || user.role !== "admin" || user.bannedAt) notFound();
  return user;
}

export const ADMIN_PAGE_SIZE = 20;

// Read ?status=&q=&page= from the address. Unknown statuses are ignored.
export function readAdminParams<S extends string>(
  query: Record<string, string | string[] | undefined>,
  statuses: readonly S[],
) {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
  const status = statuses.find((s) => s === first(query.status));
  const q = first(query.q)?.slice(0, 100);
  const page = Math.max(1, Math.floor(Number(first(query.page))) || 1);
  return { status, q, page, limit: ADMIN_PAGE_SIZE, offset: (page - 1) * ADMIN_PAGE_SIZE };
}
