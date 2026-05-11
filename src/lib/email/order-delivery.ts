import { env } from "@/lib/env";

type DeliveryCredential = {
  productName: string;
  variantName: string;
  credential: string;
};

type SendOrderDeliveryEmailInput = {
  to: string;
  orderNumber: string;
  items: DeliveryCredential[];
};

export async function sendOrderDeliveryEmail({
  to,
  orderNumber,
  items,
}: SendOrderDeliveryEmailInput): Promise<void> {
  if (items.length === 0) return;

  const lines = items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.productName} — ${item.variantName}\n${item.credential}`,
    )
    .join("\n\n");

  const subject = `Kredensial order ${orderNumber}`;
  const text = [
    `Pembayaran order ${orderNumber} sudah kami terima.`,
    "",
    "Berikut kredensial Anda:",
    "",
    lines,
    "",
    "Simpan data ini dengan aman.",
  ].join("\n");

  const htmlItems = items
    .map(
      (item, idx) =>
        `<li><strong>${idx + 1}. ${escapeHtml(item.productName)} — ${escapeHtml(item.variantName)}</strong><pre>${escapeHtml(item.credential)}</pre></li>`,
    )
    .join("");

  const html = `<p>Pembayaran order <strong>${escapeHtml(orderNumber)}</strong> sudah kami terima.</p><p>Berikut kredensial Anda:</p><ol>${htmlItems}</ol><p>Simpan data ini dengan aman.</p>`;

  if (!env.RESEND_API_KEY) {
    console.info(`\n[order:delivery] to=${to}\n  order=${orderNumber}\n${text}\n`);
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
      html,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed (${res.status}): ${body.slice(0, 300)}`);
  }
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

