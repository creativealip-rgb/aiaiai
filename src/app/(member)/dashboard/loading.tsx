export default function DashboardLoading() {
  return (
    <section className="space-y-4">
      <div className="bg-muted h-7 w-52 animate-pulse rounded-md" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="space-y-3 rounded-md border p-4">
            <div className="bg-muted h-5 w-1/3 animate-pulse rounded-md" />
            <div className="bg-muted h-8 w-2/3 animate-pulse rounded-md" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-md border p-4">
        <div className="bg-muted h-5 w-40 animate-pulse rounded-md" />
        <div className="bg-muted h-9 w-52 animate-pulse rounded-md" />
      </div>
    </section>
  );
}

