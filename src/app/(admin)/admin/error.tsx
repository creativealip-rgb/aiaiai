"use client";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="space-y-4 rounded-md border p-4">
      <h2 className="text-lg font-semibold">Admin panel gagal dimuat.</h2>
      <p className="text-muted-foreground text-sm">
        Coba ulang request. Jika tetap gagal, cek log server.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
      >
        Coba lagi
      </button>
    </section>
  );
}

