export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10" aria-busy="true" aria-label="Loading dashboard">
      <div className="mb-6 h-7 w-40 animate-pulse rounded-md bg-muted" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-5">
            <div className="h-5 w-3/4 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted" />
            <div className="h-3 w-1/3 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
