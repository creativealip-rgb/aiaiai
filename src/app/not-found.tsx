import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Halaman tidak ditemukan",
};

// Force dynamic rendering to work around a Next.js 16 bug where the internal
// `/_not-found` page fails to prerender with "Cannot read properties of null
// (reading 'useContext')". Tracked upstream:
// https://github.com/vercel/next.js/issues/85604
// https://github.com/vercel/next.js/issues/84994
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <main
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
        maxWidth: "32rem",
        margin: "4rem auto",
      }}
    >
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Halaman tidak ditemukan</h1>
      <p style={{ color: "#555", marginBottom: "1rem" }}>
        URL yang Anda tuju tidak ada atau sudah dipindahkan.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "0.5rem 0.75rem",
          borderRadius: "6px",
          border: "1px solid #ccc",
          color: "#111",
          textDecoration: "none",
        }}
      >
        Kembali ke beranda
      </Link>
    </main>
  );
}
