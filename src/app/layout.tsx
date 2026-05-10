import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: {
    default: "AI3 — Marketplace Akun & Jasa Digital",
    template: "%s | AI3",
  },
  description:
    "Marketplace akun digital (Netflix, Spotify, ChatGPT, dll.) dan jasa digital. Pembelian otomatis, garansi, pembayaran QRIS / VA / e-wallet.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={cn("font-sans antialiased", geist.variable)}>
      <body>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
