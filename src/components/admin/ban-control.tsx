"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { AdminAction } from "./admin-action";

// Ban a person: a reason is required (it goes in the activity log), then a confirmation.
export function BanControl({ userId, name }: { userId: number; name: string }) {
  const t = useTranslations("Admin");
  const [reason, setReason] = useState("");
  const id = useId();
  const ready = reason.trim().length >= 3;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold">
        {t("users.reasonLabel")}
      </label>
      <div className="flex flex-wrap items-start gap-2">
        <input
          id={id}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("users.reasonPlaceholder")}
          maxLength={300}
          className="min-h-11 min-w-0 flex-1 rounded-full border-2 border-border bg-background px-4 focus-visible:border-primary focus-visible:outline-none"
        />
        {ready ? (
          <AdminAction
            label={t("actions.ban")}
            endpoint={`/api/v1/admin/users/${userId}/ban`}
            body={{ reason: reason.trim() }}
            confirm={t("users.banConfirm", { name })}
            variant="danger"
          />
        ) : (
          <button type="button" disabled className="min-h-11 rounded-full border-2 border-destructive px-4 font-semibold text-destructive opacity-50">
            {t("actions.ban")}
          </button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t("users.banHelp")}</p>
    </div>
  );
}
