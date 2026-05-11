export default function AdminLoading() {
  return (
    <section className="space-y-4">
      <div className="bg-muted h-7 w-40 animate-pulse rounded-md" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="space-y-3 rounded-md border p-4">
            <div className="bg-muted h-5 w-1/2 animate-pulse rounded-md" />
            <div className="bg-muted h-8 w-2/3 animate-pulse rounded-md" />
          </div>
        ))}
      </div>
      <div className="bg-muted h-72 w-full animate-pulse rounded-md border" />
    </section>
  );
}

