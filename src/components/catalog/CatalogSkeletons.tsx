const CARD_ITEMS = [0, 1, 2, 3];

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-lg bg-line/60 ${className}`}
    />
  );
}

export function CatalogSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando catálogo">
      <div className="grid gap-6 lg:grid-cols-[280px_1fr] lg:items-start">
        <div className="rounded-2xl border border-line bg-card p-4">
          <SkeletonBlock className="h-5 w-20" />
          <SkeletonBlock className="mt-4 h-11 w-full" />
          <div className="mt-5 flex gap-1.5">
            <SkeletonBlock className="h-7 w-16" />
            <SkeletonBlock className="h-7 w-24" />
            <SkeletonBlock className="h-7 w-20" />
          </div>
          <SkeletonBlock className="mt-5 h-10 w-full" />
          <SkeletonBlock className="mt-3 h-10 w-full" />
          <SkeletonBlock className="mt-5 h-11 w-full" />
        </div>

        <div>
          <div className="flex items-end justify-between border-b border-line pb-4">
            <div>
              <SkeletonBlock className="h-3 w-16" />
              <SkeletonBlock className="mt-2 h-8 w-32" />
            </div>
            <SkeletonBlock className="h-4 w-24" />
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {CARD_ITEMS.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-line bg-card p-5"
              >
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="mt-3 h-5 w-3/4" />
                <SkeletonBlock className="mt-2 h-4 w-full" />
                <SkeletonBlock className="mt-2 h-4 w-5/6" />
                <div className="mt-4 flex gap-1.5">
                  <SkeletonBlock className="h-6 w-24 rounded-full" />
                  <SkeletonBlock className="h-6 w-20 rounded-full" />
                </div>
                <SkeletonBlock className="mt-4 h-3 w-2/3" />
                <SkeletonBlock className="mt-4 h-9 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SourceDetailSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Carregando fonte"
      className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12"
    >
      <SkeletonBlock className="h-4 w-48" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <div>
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-4 h-10 w-4/5" />
          <SkeletonBlock className="mt-4 h-5 w-full" />
          <SkeletonBlock className="mt-2 h-5 w-3/4" />
          <div className="mt-5 flex gap-1.5">
            <SkeletonBlock className="h-6 w-28 rounded-full" />
            <SkeletonBlock className="h-6 w-24 rounded-full" />
            <SkeletonBlock className="h-6 w-20 rounded-full" />
          </div>
          <SkeletonBlock className="mt-6 h-11 w-52" />
          <SkeletonBlock className="mt-10 h-40 w-full rounded-2xl" />
          <SkeletonBlock className="mt-6 h-48 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">
          <SkeletonBlock className="h-52 w-full rounded-2xl" />
          <SkeletonBlock className="h-44 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function NeighborhoodSkeleton() {
  return (
    <div aria-busy="true" aria-label="Carregando bairros" className="mt-10">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <SkeletonBlock key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
      <SkeletonBlock className="mt-10 h-6 w-40" />
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <SkeletonBlock key={index} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
