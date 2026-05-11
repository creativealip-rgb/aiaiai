type DeliveryCredential = {
  productName: string;
  variantName: string;
  credential: string;
};

type RenderOrderDeliveryEmailHtmlInput = {
  appName: string;
  orderNumber: string;
  items: DeliveryCredential[];
};

export function renderOrderDeliveryEmailHtml({
  appName,
  orderNumber,
  items,
}: RenderOrderDeliveryEmailHtmlInput): string {
  const htmlItems = items
    .map(
      (item) => `
        <li style="margin-bottom:14px;">
          <div style="font-size:14px;font-weight:700;">
            ${escapeHtml(item.productName)} - ${escapeHtml(item.variantName)}
          </div>
          <pre style="margin-top:8px;white-space:pre-wrap;word-break:break-word;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px;font-size:12px;line-height:1.5;">${escapeHtml(item.credential)}</pre>
        </li>`,
    )
    .join("");

  return `<!doctype html>
<html lang="id">
  <body style="margin:0;padding:24px;background:#f6f7f8;color:#0f172a;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;">
      <tbody>
        <tr>
          <td style="padding:20px 24px;background:#0f172a;color:#ffffff;">
            <div style="font-size:18px;font-weight:700;">${escapeHtml(appName)}</div>
            <div style="margin-top:4px;font-size:13px;opacity:.9;">Kredensial order ${escapeHtml(orderNumber)}</div>
          </td>
        </tr>
        <tr>
          <td style="padding:24px;">
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Pembayaran order <strong>${escapeHtml(orderNumber)}</strong> sudah kami terima.</p>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">Berikut kredensial Anda:</p>
            <ol style="margin:0;padding-left:20px;">${htmlItems}</ol>
            <p style="margin:20px 0 0;font-size:12px;color:#475569;">Simpan data ini dengan aman dan jangan bagikan ke pihak lain.</p>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
