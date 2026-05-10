import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Akun diblokir",
};

/**
 * Landing for users whose `isBanned` flag is set. `requireUser()` in
 * @/server/auth redirects here from any protected route.
 */
export default function BannedPage() {
  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Akun diblokir</h1>
        <p className="text-muted-foreground text-sm">
          Akun Anda sedang diblokir oleh admin. Jika Anda merasa ini tidak semestinya terjadi,
          silakan hubungi customer support.
        </p>
        <Link className="text-primary text-sm underline-offset-2 hover:underline" href="/">
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
