import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "AI3 — Marketplace Akun & Jasa Digital",
    template: "%s | AI3",
  },
  description:
    "Marketplace akun digital (Netflix, Spotify, ChatGPT, dll.) dan jasa digital. Pembelian otomatis, garansi, pembayaran QRIS / VA / e-wallet.",
  applicationName: env.NEXT_PUBLIC_APP_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: env.NEXT_PUBLIC_APP_NAME,
    title: "AI3 — Marketplace Akun & Jasa Digital",
    description:
      "Marketplace akun digital (Netflix, Spotify, ChatGPT, dll.) dan jasa digital. Pembelian otomatis, garansi, pembayaran QRIS / VA / e-wallet.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI3 — Marketplace Akun & Jasa Digital",
    description:
      "Marketplace akun digital (Netflix, Spotify, ChatGPT, dll.) dan jasa digital. Pembelian otomatis, garansi, pembayaran QRIS / VA / e-wallet.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={cn("font-sans antialiased", geist.variable)}>
      <body>
        <a
          href="#main-content"
          className="bg-background text-foreground sr-only fixed top-2 left-2 z-50 rounded-md border px-3 py-2 text-sm shadow focus:not-sr-only"
        >
          Lewati ke konten utama
        </a>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
