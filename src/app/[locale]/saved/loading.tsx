// Shown while the Saved page loads.
export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6" aria-busy="true">
      <div className="h-10 w-40 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/3] animate-pulse rounded-3xl bg-muted" />
        ))}
      </div>
    </main>
  );
}
