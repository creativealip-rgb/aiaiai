import { ImageResponse } from "next/og";

import { env } from "@/lib/env";

export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0f172a 0%, #1d4ed8 50%, #0891b2 100%)",
          color: "white",
          padding: "56px",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            borderRadius: 9999,
            border: "1px solid rgba(255,255,255,0.45)",
            padding: "10px 18px",
            fontSize: 26,
          }}
        >
          Marketplace Akun & Jasa Digital
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 76, fontWeight: 700, letterSpacing: -1 }}>
            {env.NEXT_PUBLIC_APP_NAME}
          </div>
          <div style={{ fontSize: 36, opacity: 0.95, maxWidth: "92%" }}>
            Streaming, AI, produktifitas. Garansi aktif dan pembayaran lokal.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
