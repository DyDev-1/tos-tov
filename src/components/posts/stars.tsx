import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Five stars, filled up to `value`. Colour is not the only signal: the rating is also given in words
// (aria-label). A partly filled average rounds to whole stars.
export function Stars({ value, label, className }: { value: number; label: string; className?: string }) {
  const filled = Math.round(value);
  return (
    <span role="img" aria-label={label} className={cn("inline-flex gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={cn("size-4", n <= filled ? "fill-laterite text-laterite" : "text-border")} />
      ))}
    </span>
  );
}
