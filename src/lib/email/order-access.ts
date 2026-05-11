import { env } from "@/lib/env";

type SendGuestOrderAccessEmailInput = {
  to: string;
  orderNumber: string;
  token: string;
};

function buildOrderAccessUrl(orderNumber: string, token: string): string {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, "");
  return `${base}/order/${encodeURIComponent(orderNumber)}?token=${encodeURIComponent(token)}`;
}

export async function sendGuestOrderAccessEmail({
  to,
  orderNumber,
  token,
}: SendGuestOrderAccessEmailInput): Promise<void> {
  const accessUrl = buildOrderAccessUrl(orderNumber, token);
  const subject = `Link akses order ${orderNumber}`;
  const text = [
    `Pesanan ${orderNumber} sudah dibayar.`,
    "",
    "Gunakan link berikut untuk melihat status order Anda:",
    accessUrl,
    "",
    "Link berlaku selama 30 hari.",
  ].join("\n");

  if (!env.RESEND_API_KEY) {
    // Fallback dev mode until Resend is configured.
    console.info(`\n[order:magic-link] to=${to}\n  order=${orderNumber}\n  url=${accessUrl}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to,
      subject,
      text,
      html: `<p>Pesanan <strong>${orderNumber}</strong> sudah dibayar.</p><p><a href="${accessUrl}">Lihat status order</a></p><p>Link berlaku selama 30 hari.</p>`,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body.slice(0, 300)}`);
  }
}

