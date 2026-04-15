export function HomeLandingSkeleton() {
  return (
    <main className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-200/80" />
          <div className="hidden gap-6 sm:flex">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200/80" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200/80" />
          </div>
          <div className="h-9 w-24 animate-pulse rounded-lg bg-slate-200/80" />
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-24 text-center">
        <div className="mx-auto mb-6 h-4 max-w-xs animate-pulse rounded bg-slate-200/80" />
        <div className="mx-auto mb-4 h-12 max-w-lg animate-pulse rounded-lg bg-slate-200/80" />
        <div className="mx-auto h-4 max-w-md animate-pulse rounded bg-slate-200/80" />
      </div>
    </main>
  );
}
