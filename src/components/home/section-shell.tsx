import type { ReactNode } from "react";

// Heading + optional subtitle + content, used by every Home section.
export function SectionShell({
  id,
  title,
  subtitle,
  action,
  children,
}: {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 id={`${id}-heading`} className="font-heading text-xl font-bold sm:text-2xl">
            {title}
          </h2>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
