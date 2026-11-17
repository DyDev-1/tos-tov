"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// Choose 1 to 5 stars. These are real radio buttons, so the keyboard (arrow keys) and screen readers just work.
export function StarInput({ value, onChange, label, error }: { value: number; onChange: (value: number) => void; label: string; error?: string }) {
  const t = useTranslations("Share.rating");
  return (
    <fieldset aria-invalid={!!error} className="space-y-2">
      <legend className="mb-2 font-bold">{label}</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="relative grid size-12 cursor-pointer place-items-center rounded-full has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
              aria-label={t("stars", { count: n })}
            />
            <Star aria-hidden className={cn("size-8 transition-colors", n <= value ? "fill-laterite text-laterite" : "text-border")} />
          </label>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  );
}
