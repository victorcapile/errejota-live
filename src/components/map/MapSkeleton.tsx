export function MapSkeleton() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col bg-background lg:h-[calc(100dvh-4rem)] lg:flex-row">
      <div className="order-2 flex flex-col border-t border-line bg-card lg:order-1 lg:h-full lg:w-[410px] lg:flex-none lg:border-r lg:border-t-0">
        <div className="border-b border-line p-3">
          <div className="h-10 animate-pulse rounded-xl bg-background" />
        </div>
        <div className="flex gap-1.5 overflow-hidden border-b border-line px-3 py-2.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-7 w-20 shrink-0 animate-pulse rounded-full bg-background"
            />
          ))}
        </div>
        <div className="border-b border-line px-4 py-3">
          <div className="h-5 w-40 animate-pulse rounded bg-background" />
          <div className="mt-2 h-3 w-56 animate-pulse rounded bg-background" />
          <div className="mt-3 h-9 animate-pulse rounded-xl bg-background" />
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex gap-3">
              <div className="size-8 shrink-0 animate-pulse rounded-lg bg-background" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-2/3 animate-pulse rounded bg-background" />
                <div className="h-2.5 w-1/2 animate-pulse rounded bg-background" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="paper-grid order-1 h-[46dvh] min-h-[280px] shrink-0 bg-brand/5 lg:order-2 lg:h-full lg:min-h-0 lg:flex-1">
        <div className="grid size-full place-items-center">
          <div className="flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-xs font-medium text-muted shadow-sm">
            <span
              className="size-2 animate-pulse rounded-full bg-brand"
              aria-hidden
            />
            Carregando mapa…
          </div>
        </div>
      </div>
    </div>
  );
}
