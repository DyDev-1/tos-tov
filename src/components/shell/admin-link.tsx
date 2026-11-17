"use client";

import { useAuth } from "@clerk/nextjs";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { apiFetch } from "@/lib/client-api";
import { isAuthPath } from "@/lib/nav";

// "Admin" in the header, shown only to admins. This is just a shortcut: showing or hiding it protects nothing.
// The admin pages and API routes check the role on the server every time.
export function AdminLink() {
  const t = useTranslations("Header");
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    apiFetch<{ role: string; banned: boolean }>("/api/v1/me").then((result) => {
      if (!cancelled && result.ok) setIsAdmin(result.data.role === "admin" && !result.data.banned);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn || !isAdmin || isAuthPath(pathname)) return null;
  return (
    <Link
      href="/admin"
      className="inline-flex min-h-11 items-center gap-2 rounded-full bg-secondary px-4 font-semibold text-primary hover:bg-secondary/70"
    >
      <ShieldCheck aria-hidden className="size-4" />
      {t("admin")}
    </Link>
  );
}
