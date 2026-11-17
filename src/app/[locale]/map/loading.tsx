// Shown while the Map page loads: filter pills, a list and a map block.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-4 px-4 py-4" aria-busy="true">
      <div className="flex gap-2 overflow-hidden">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 w-44 shrink-0 animate-pulse rounded-full bg-muted" />
        ))}
      </div>
      <div className="grid gap-4 lg:h-[calc(100dvh-11rem)] lg:grid-cols-[minmax(20rem,32%)_1fr]">
        <div className="hidden space-y-3 lg:block">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
        <div className="h-[60dvh] animate-pulse rounded-3xl bg-tint-sage lg:h-auto" />
      </div>
    </main>
  );
}
