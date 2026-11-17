import { Landmark } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { SITE_NAME } from "@/lib/site";

export function Logo() {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2 font-heading text-lg font-bold text-primary">
      <span aria-hidden className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
        <Landmark className="size-4" />
      </span>
      {SITE_NAME}
    </Link>
  );
}
