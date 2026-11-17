import { useLocale, useTranslations } from "next-intl";
import { Stars } from "@/components/posts/stars";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { formatDate, timeAgo } from "@/lib/dates";
import { pickText } from "@/lib/i18n-content";
import type { AdminPlaceRow, getAdminOverview } from "@/lib/services/admin";
import { AdminAction } from "./admin-action";
import { BanControl } from "./ban-control";
import { StatusBadge } from "./list-controls";

const ROW = "rounded-2xl border border-border bg-card p-4";
const LINK = "font-semibold text-primary underline-offset-4 hover:underline";
const api = (path: string) => `/api/v1/admin/${path}`;

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl bg-secondary p-6 text-muted-foreground">{text}</p>;
}

// ---------------------------------------------------------------- Overview

export function OverviewCards({ data }: { data: Awaited<ReturnType<typeof getAdminOverview>> }) {
  const t = useTranslations("Admin.overview");
  const queues = [
    { key: "pendingPlaces", value: data.pendingPlaces, href: { pathname: "/admin/places", query: { status: "pending" } } },
    { key: "pendingPosts", value: data.pendingPosts, href: { pathname: "/admin/posts", query: { status: "pending" } } },
    { key: "openReports", value: data.openReports, href: { pathname: "/admin/reports", query: { status: "open" } } },
  ] as const;
  const waiting = queues.some((q) => q.value > 0);

  return (
    <div className="space-y-6">
      {!waiting && <p className="rounded-2xl bg-secondary p-4 font-semibold text-primary">{t("clear")}</p>}
      <ul className="grid gap-4 sm:grid-cols-3">
        {queues.map((queue) => (
          <li key={queue.key}>
            <Link
              href={queue.href}
              data-testid={`queue-${queue.key}`}
              className="block rounded-3xl border-2 border-border bg-card p-5 transition-colors hover:border-primary"
            >
              <p className="font-heading text-4xl font-bold text-primary">{queue.value}</p>
              <p className="mt-1 font-semibold">{t(queue.key)}</p>
              <p className="mt-2 text-sm text-laterite">{t("open")}</p>
            </Link>
          </li>
        ))}
      </ul>
      <dl className="grid gap-3 sm:grid-cols-3">
        {(["totalPlaces", "totalUsers", "bannedUsers"] as const).map((key) => (
          <div key={key} className="rounded-2xl bg-secondary p-4">
            <dt className="text-sm text-muted-foreground">{t(key)}</dt>
            <dd className="font-heading text-2xl font-bold">{data[key]}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------- Places

export function PlacesAdminList({ items }: { items: AdminPlaceRow[] }) {
  const t = useTranslations("Admin");
  const locale = useLocale() as Locale;
  if (items.length === 0) return <Empty text={t("places.empty")} />;

  return (
    <ul className="space-y-3">
      {items.map((place) => (
        <li key={place.id} data-testid="admin-place" className={ROW}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading text-lg font-bold">{pickText(place.name, locale)}</p>
              <p className="text-muted-foreground">
                {pickText(place.province.name, locale)} · {pickText(place.category.name, locale)}
              </p>
              <p className="text-sm text-muted-foreground">
                {[place.addedBy ? t("places.addedBy", { name: place.addedBy }) : null, timeAgo(place.createdAt, locale)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={place.status} />
              {place.mergedInto && <span className="text-sm text-muted-foreground">{t("places.mergedInto")}</span>}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {place.status === "pending" && (
              <AdminAction label={t("actions.approve")} endpoint={api(`places/${place.id}/status`)} body={{ status: "published" }} variant="primary" />
            )}
            {place.status === "published" && (
              <AdminAction label={t("actions.hide")} endpoint={api(`places/${place.id}/status`)} body={{ status: "hidden" }} confirm={t("common.confirm")} variant="danger" />
            )}
            {place.status === "hidden" && !place.mergedInto && (
              <AdminAction label={t("actions.unhide")} endpoint={api(`places/${place.id}/status`)} body={{ status: "published" }} />
            )}
            {place.status === "pending" && (
              <AdminAction label={t("actions.hide")} endpoint={api(`places/${place.id}/status`)} body={{ status: "hidden" }} confirm={t("common.confirm")} variant="danger" />
            )}
            <Link href={`/admin/places/${place.id}`} className={`${LINK} inline-flex min-h-11 items-center px-2`}>
              {t("common.edit")}
            </Link>
            {place.status === "published" && (
              <Link href={`/places/${place.slug}`} className={`${LINK} inline-flex min-h-11 items-center px-2`}>
                {t("common.viewOnSite")}
              </Link>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- Posts and comments

type Named = { slug: string; name: { en: string; km: string } };

export function PostsAdminList({
  items,
}: {
  items: { id: number; status: "pending" | "published" | "hidden"; rating: number; story: string; visitedAt: string; createdAt: string; author: { name: string }; place: Named }[];
}) {
  const t = useTranslations("Admin");
  const tp = useTranslations("Posts");
  const locale = useLocale() as Locale;
  if (items.length === 0) return <Empty text={t("posts.empty")} />;

  return (
    <ul className="space-y-3">
      {items.map((post) => (
        <li key={post.id} data-testid="admin-post" className={ROW}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">
                {post.author.name} · <Link href={`/places/${post.place.slug}`} className={LINK}>{pickText(post.place.name, locale)}</Link>
              </p>
              <p className="text-sm text-muted-foreground">
                {tp("visited", { date: formatDate(`${post.visitedAt}T12:00:00Z`, locale) })} · {timeAgo(post.createdAt, locale)}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <StatusBadge status={post.status} />
              <Stars value={post.rating} label={tp("ratedAria", { rating: post.rating })} />
            </div>
          </div>
          <p className="mt-3 break-words whitespace-pre-line">{post.story}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {post.status !== "published" && (
              <AdminAction
                label={post.status === "pending" ? t("actions.approve") : t("actions.unhide")}
                endpoint={api(`posts/${post.id}/status`)}
                body={{ status: "published" }}
                variant={post.status === "pending" ? "primary" : "outline"}
              />
            )}
            {post.status !== "hidden" && (
              <AdminAction label={t("actions.hide")} endpoint={api(`posts/${post.id}/status`)} body={{ status: "hidden" }} confirm={t("common.confirm")} variant="danger" />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CommentsAdminList({
  items,
}: {
  items: { id: number; status: "published" | "hidden"; body: string; createdAt: string; author: { name: string }; place: Named }[];
}) {
  const t = useTranslations("Admin");
  const locale = useLocale() as Locale;
  if (items.length === 0) return <Empty text={t("comments.empty")} />;

  return (
    <ul className="space-y-3">
      {items.map((comment) => (
        <li key={comment.id} data-testid="admin-comment" className={ROW}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="font-semibold">
              {comment.author.name} · <Link href={`/places/${comment.place.slug}`} className={LINK}>{pickText(comment.place.name, locale)}</Link>
              <span className="font-normal text-muted-foreground"> · {timeAgo(comment.createdAt, locale)}</span>
            </p>
            <StatusBadge status={comment.status} />
          </div>
          <p className="mt-2 break-words whitespace-pre-line">{comment.body}</p>
          <div className="mt-3">
            {comment.status === "published" ? (
              <AdminAction label={t("actions.hide")} endpoint={api(`comments/${comment.id}/status`)} body={{ status: "hidden" }} confirm={t("common.confirm")} variant="danger" />
            ) : (
              <AdminAction label={t("actions.restore")} endpoint={api(`comments/${comment.id}/status`)} body={{ status: "published" }} />
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- Reports

export function ReportsAdminList({
  items,
}: {
  items: {
    id: number;
    reason: "wrong_info" | "closed" | "unsafe" | "duplicate" | "other";
    message: string | null;
    status: "open" | "resolved";
    createdAt: string;
    reporter: { name: string };
    place: { id: number; slug: string; name: { en: string; km: string }; status: "pending" | "published" | "hidden" };
  }[];
}) {
  const t = useTranslations("Admin");
  const locale = useLocale() as Locale;
  if (items.length === 0) return <Empty text={t("reports.empty")} />;

  return (
    <ul className="space-y-3">
      {items.map((report) => (
        <li key={report.id} data-testid="admin-report" className={ROW}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-heading text-lg font-bold">{t(`reports.reasons.${report.reason}`)}</p>
              <p className="text-muted-foreground">
                {t("reports.onPlace", { name: pickText(report.place.name, locale) ?? report.place.slug })} · {t("reports.reporter", { name: report.reporter.name })} · {timeAgo(report.createdAt, locale)}
              </p>
            </div>
            <StatusBadge status={report.status} />
          </div>
          {report.message && <p className="mt-2 break-words whitespace-pre-line">{report.message}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {report.status === "open" && (
              <AdminAction label={t("actions.resolve")} endpoint={api(`reports/${report.id}/resolve`)} variant="primary" />
            )}
            {report.place.status === "published" && (
              <AdminAction label={t("reports.hidePlace")} endpoint={api(`places/${report.place.id}/status`)} body={{ status: "hidden" }} confirm={t("common.confirm")} variant="danger" />
            )}
            <Link href={`/admin/places/${report.place.id}`} className={`${LINK} inline-flex min-h-11 items-center px-2`}>
              {t("common.edit")}
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- Users

export function UsersAdminList({
  items,
}: {
  items: { id: number; name: string; email: string | null; role: "user" | "admin"; trusted: boolean; bannedAt: string | null; bannedReason: string | null; createdAt: string }[];
}) {
  const t = useTranslations("Admin");
  const locale = useLocale() as Locale;
  if (items.length === 0) return <Empty text={t("users.empty")} />;

  return (
    <ul className="space-y-3">
      {items.map((user) => (
        <li key={user.id} data-testid="admin-user" className={ROW}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading text-lg font-bold">
                {user.name} {user.role === "admin" && <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-sm font-semibold">{t("users.admin")}</span>}
              </p>
              <p className="truncate text-muted-foreground">{user.email ?? t("common.anonymous")}</p>
              <p className="text-sm text-muted-foreground">{t("users.joined", { date: formatDate(user.createdAt, locale) })}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {user.bannedAt && <StatusBadge status="banned" />}
              {user.trusted && !user.bannedAt && (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">{t("users.trusted")}</span>
              )}
            </div>
          </div>
          {user.bannedAt && user.bannedReason && <p className="mt-2 text-destructive">{t("users.bannedFor", { reason: user.bannedReason })}</p>}
          {user.role !== "admin" && (
            <div className="mt-3 space-y-3">
              {!user.bannedAt && (
                <div className="flex flex-wrap items-center gap-2">
                  {user.trusted ? (
                    <AdminAction label={t("users.removeTrust")} endpoint={api(`users/${user.id}/trust`)} method="DELETE" />
                  ) : (
                    <AdminAction label={t("users.makeTrusted")} endpoint={api(`users/${user.id}/trust`)} />
                  )}
                  <span className="text-sm text-muted-foreground">{t("users.trustHelp")}</span>
                </div>
              )}
              {user.bannedAt ? (
                <AdminAction label={t("actions.unban")} endpoint={api(`users/${user.id}/ban`)} method="DELETE" />
              ) : (
                <BanControl userId={user.id} name={user.name} />
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- Activity log

export function LogList({
  items,
}: {
  items: { id: number; action: string; target: { type: string; id: number | null }; details: Record<string, unknown>; admin: { name: string }; createdAt: string }[];
}) {
  const t = useTranslations("Admin");
  const locale = useLocale() as Locale;
  if (items.length === 0) return <Empty text={t("log.empty")} />;

  return (
    <ol className="space-y-2">
      {items.map((entry) => (
        <li key={entry.id} data-testid="admin-log" className={ROW}>
          <p className="font-semibold">
            {/* Message keys cannot contain a dot, so "place.merge" is looked up as "place_merge". */}
            {t.has(`actionNames.${entry.action.replace(".", "_")}`) ? t(`actionNames.${entry.action.replace(".", "_")}`) : entry.action}
            <span className="font-normal text-muted-foreground">
              {" "}
              · {entry.target.id !== null ? t("log.on", { type: entry.target.type, id: entry.target.id }) : entry.target.type}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {t("common.by", { name: entry.admin.name })} · {formatDate(entry.createdAt, locale)} · {timeAgo(entry.createdAt, locale)}
          </p>
          {Object.keys(entry.details).length > 0 && (
            <p className="mt-1 break-words text-sm text-muted-foreground">
              {Object.entries(entry.details)
                .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
                .join(" · ")}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
