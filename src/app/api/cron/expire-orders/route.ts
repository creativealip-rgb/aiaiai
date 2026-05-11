/**
 * Cron / manual trigger to expire pending orders past their `expires_at`.
 *
 * Call via: GET /api/cron/expire-orders (protected by a simple bearer token
 * or called from a scheduled job). For MVP, no auth — just don't expose
 * publicly in production without a secret header.
 *
 * IMPLEMENTATION_PLAN.md §7.1 — "Expiry worker (cron/route handler setiap 5 menit)"
 */

import { NextResponse } from "next/server";

import { expirePendingOrders } from "@/server/services/orders";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await expirePendingOrders();
    return NextResponse.json({ expired: count });
  } catch (error) {
    console.error("[cron/expire-orders]", error);
    return NextResponse.json(
      { error: "Failed to expire orders" },
      { status: 500 },
    );
  }
}
