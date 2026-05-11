export default function PublicLoading() {
  return (
    <section className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <div className="bg-muted h-8 w-64 animate-pulse rounded-md" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="space-y-3 rounded-md border p-3">
            <div className="bg-muted h-36 w-full animate-pulse rounded-md" />
            <div className="bg-muted h-4 w-4/5 animate-pulse rounded-md" />
            <div className="bg-muted h-4 w-2/5 animate-pulse rounded-md" />
          </div>
        ))}
      </div>
    </section>
  );
}

