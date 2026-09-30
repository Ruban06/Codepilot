export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10" aria-busy="true" aria-label="Loading analysis">
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-64 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded-md bg-muted" />
      </div>

      {/* Section skeletons */}
      {Array.from({ length: 6 }).map((_, i) => (
        <section key={i} className="space-y-3 rounded-lg border p-6">
          <div className="h-5 w-48 animate-pulse rounded-md bg-muted" />
          <div className="space-y-2">
            <div className="h-3 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-4/6 animate-pulse rounded-md bg-muted" />
          </div>
        </section>
      ))}
    </div>
  )
}
