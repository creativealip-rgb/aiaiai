export default function AuthLoading() {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 py-12">
      <div className="bg-muted h-7 w-40 animate-pulse rounded-md" />
      <div className="space-y-3 rounded-md border p-4">
        <div className="bg-muted h-9 w-full animate-pulse rounded-md" />
        <div className="bg-muted h-9 w-full animate-pulse rounded-md" />
        <div className="bg-muted h-9 w-32 animate-pulse rounded-md" />
      </div>
    </main>
  );
}

