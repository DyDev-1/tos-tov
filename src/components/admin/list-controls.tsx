import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type Query = Record<string, string | undefined>;

// A link to the same page with a different ?status= / ?page=. Empty values are left out of the address.
function withQuery(pathname: string, query: Query) {
  const clean = Object.fromEntries(Object.entries(query).filter(([, v]) => v)) as Record<string, string>;
  return { pathname, query: clean } as const;
}

// "Waiting | Published | Hidden" tabs. The chosen one keeps the search words.
export function StatusTabs({
  pathname,
  statuses,
  current,
  q,
  allLabel,
}: {
  pathname: string;
  statuses: readonly string[];
  current?: string;
  q?: string;
  allLabel?: boolean;
}) {
  const t = useTranslations("Admin.status");
  const tabs: (string | undefined)[] = allLabel ? [undefined, ...statuses] : [...statuses];
  return (
    <ul className="flex flex-wrap gap-2" aria-label={t("all")}>
      {tabs.map((status) => (
        <li key={status ?? "all"}>
          <Link
            href={withQuery(pathname, { status, q })}
            aria-current={current === status ? "true" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border-2 px-4 font-semibold",
              current === status ? "border-primary bg-secondary" : "border-border hover:bg-secondary/60",
            )}
          >
            {status ? t(status as "pending") : t("all")}
          </Link>
        </li>
      ))}
    </ul>
  );
}

// A plain search box (works without JavaScript): sends ?q= and keeps the status.
export function SearchBox({ action, q, status, placeholder }: { action: string; q?: string; status?: string; placeholder: string }) {
  const t = useTranslations("Admin.common");
  return (
    <form action={action} role="search" className="flex gap-2">
      {status && <input type="hidden" name="status" value={status} />}
      <label className="flex-1">
        <span className="sr-only">{t("searchLabel")}</span>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder}
          maxLength={100}
          className="min-h-11 w-full rounded-full border-2 border-border bg-card px-4 focus-visible:border-primary focus-visible:outline-none"
        />
      </label>
      <button type="submit" className="min-h-11 rounded-full bg-primary px-5 font-semibold text-primary-foreground">
        {t("search")}
      </button>
    </form>
  );
}

// Previous / Next with "Page 2 of 5". Needs the base address and the other words to keep.
export function Pagination({
  pathname,
  page,
  total,
  pageSize,
  query,
}: {
  pathname: string;
  page: number;
  total: number;
  pageSize: number;
  query: Query;
}) {
  const t = useTranslations("Admin.common");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const link = "inline-flex min-h-11 items-center rounded-full border-2 border-border px-4 font-semibold hover:bg-secondary";
  return (
    <nav aria-label={t("pageOf", { page, pages })} className="flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={withQuery(pathname, { ...query, page: page > 2 ? String(page - 1) : undefined })} className={link}>
          {t("prev")}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground">{t("pageOf", { page, pages })}</span>
      {page < pages ? (
        <Link href={withQuery(pathname, { ...query, page: String(page + 1) })} className={link}>
          {t("next")}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

const TONES: Record<string, string> = {
  pending: "bg-laterite/15 text-laterite",
  published: "bg-primary/10 text-primary",
  hidden: "bg-muted text-muted-foreground",
  open: "bg-laterite/15 text-laterite",
  resolved: "bg-primary/10 text-primary",
  banned: "bg-destructive/10 text-destructive",
};

// A small coloured label. The word is always there, so colour is never the only signal.
export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations("Admin.status");
  return (
    <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold", TONES[status] ?? "bg-muted")}>
      {t(status as "pending")}
    </span>
  );
}
