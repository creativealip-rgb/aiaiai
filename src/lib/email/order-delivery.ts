import { env } from "@/lib/env";
import { renderOrderDeliveryEmailHtml } from "@/emails/order-delivery-email";

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

  const html = renderOrderDeliveryEmailHtml({
    appName: env.NEXT_PUBLIC_APP_NAME,
    orderNumber,
    items,
  });

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
