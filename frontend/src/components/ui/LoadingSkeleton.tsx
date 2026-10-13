export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line p-5">
          <div className="skeleton mb-3 h-4 w-2/3 rounded" />
          <div className="skeleton mb-2 h-3 w-full rounded" />
          <div className="skeleton h-3 w-1/3 rounded" />
        </div>
      ))}
    </div>
  );
}

export function MetricSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-line bg-elevated p-4">
          <div className="skeleton mb-4 h-3 w-20 rounded" />
          <div className="skeleton h-7 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}
