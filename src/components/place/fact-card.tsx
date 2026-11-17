import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// One fact: a small grey label and the value in bold. "sand" cards are filled (What you need),
// "outline" cards have a border (Practical).
export function FactCard({
  label,
  children,
  variant = "sand",
}: {
  label: string;
  children: ReactNode;
  variant?: "sand" | "outline";
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4",
        variant === "sand" ? "bg-secondary" : "border border-border bg-card",
      )}
    >
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{children}</dd>
    </div>
  );
}
