interface SearchResultsSkeletonProps {
  label: string;
}

function SearchResultsSkeleton({ label }: SearchResultsSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid gap-8 lg:grid-cols-[290px_minmax(0,1fr)]"
    >
      <span className="sr-only">{label}</span>

      <div
        aria-hidden="true"
        className="hidden h-[620px] animate-pulse rounded-2xl border border-line bg-card lg:block"
      />

      <div aria-hidden="true">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-7 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-8 w-52 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="overflow-hidden rounded-2xl border border-line bg-card shadow-card"
            >
              <div className="aspect-[16/10] animate-pulse bg-muted" />
              <div className="p-5">
                <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-muted" />
                <div className="mt-5 h-4 w-full animate-pulse rounded bg-muted" />
                <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-muted" />
                <div className="mt-8 h-11 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { SearchResultsSkeleton };
