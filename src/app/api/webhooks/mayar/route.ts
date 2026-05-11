import { NextResponse } from "next/server";

import { db } from "@/db";
import { paymentWebhookEvents } from "@/db/schema";
import {
  verifyMayarWebhook,
  type MayarWebhookPayload,
} from "@/lib/payment/mayar";
import { processPaymentSuccess } from "@/server/services/orders";
import { processWalletTopupSuccess } from "@/server/services/wallet";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = req.headers.get("x-callback-token") ?? "";

  if (!verifyMayarWebhook(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: MayarWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventId = payload.data?.id ?? payload.data?.transaction_id ?? "";
  if (!eventId) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  // Idempotency check
  const [existing] = await db
    .select({ id: paymentWebhookEvents.id })
    .from(paymentWebhookEvents)
    .where(eq(paymentWebhookEvents.eventId, eventId))
    .limit(1);

  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  // Record event
  await db.insert(paymentWebhookEvents).values({
    gateway: "mayar",
    eventId,
    eventType: payload.event,
    payload: payload as unknown as Record<string, unknown>,
  });

  // Process
  try {
    const isWalletTopup = await processWalletTopupSuccess(payload.data.id);
    if (isWalletTopup) {
      await db
        .update(paymentWebhookEvents)
        .set({ processedAt: new Date() })
        .where(eq(paymentWebhookEvents.eventId, eventId));
      return NextResponse.json({ received: true, topup: true });
    }

    if (payload.event === "payment.success" || payload.data?.status === "paid") {
      await processPaymentSuccess(
        payload.data.id,
        payload.data.transaction_id,
        payload.data.payment_method,
      );
    }

    // Mark processed
    await db
      .update(paymentWebhookEvents)
      .set({ processedAt: new Date() })
      .where(eq(paymentWebhookEvents.eventId, eventId));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(paymentWebhookEvents)
      .set({ error: errMsg })
      .where(eq(paymentWebhookEvents.eventId, eventId));
    console.error("[mayar-webhook] processing error:", error);
  }

  return NextResponse.json({ received: true });
}
