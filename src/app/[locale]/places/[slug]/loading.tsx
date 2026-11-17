// Shown while the place page loads: grey blocks in the same places as the real content.
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4" aria-busy="true">
      <div className="-mx-4 aspect-[4/3] animate-pulse bg-muted md:mx-0 md:aspect-auto md:h-[26rem] md:rounded-3xl" />
      <div className="mt-6 space-y-3">
        <div className="h-8 w-24 animate-pulse rounded-full bg-muted" />
        <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-5 w-full max-w-xl animate-pulse rounded bg-muted" />
        <div className="h-5 w-3/4 max-w-xl animate-pulse rounded bg-muted" />
      </div>
    </main>
  );
}
