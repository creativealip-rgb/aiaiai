import { NextResponse } from "next/server";
import { z } from "zod";

import { memoryRateLimit } from "@/lib/rate-limit";
import { resendGuestOrderAccessLink } from "@/server/services/orders";

const requestSchema = z.object({
  orderNumber: z.string().trim().min(3).max(64),
  email: z.string().trim().email(),
});

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const emailKey = parsed.data.email.toLowerCase();
  const limit = memoryRateLimit(`magic-link:${emailKey}`, { max: 3, windowSeconds: 60 * 60 });
  if (!limit.success) {
    return NextResponse.json(
      {
        error: "Terlalu banyak permintaan. Coba lagi nanti.",
        retryAt: new Date(limit.resetAt).toISOString(),
      },
      { status: 429 },
    );
  }

  // Intentionally return generic success to avoid order/email enumeration.
  await resendGuestOrderAccessLink(parsed.data.orderNumber, parsed.data.email);
  return NextResponse.json({
    ok: true,
    message: "Jika data cocok, link akses baru sudah dikirim ke email.",
  });
}

