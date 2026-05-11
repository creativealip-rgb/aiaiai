import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { accountStocks } from "@/db/schema";

const requestSchema = z.object({
  variantIds: z.array(z.string().min(1)).max(100),
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

  const variantIds = [...new Set(parsed.data.variantIds)];
  if (variantIds.length === 0) {
    return NextResponse.json({ counts: {} as Record<string, number> });
  }

  const rows = await db
    .select({
      variantId: accountStocks.variantId,
      available: sql<number>`count(*)::int`,
    })
    .from(accountStocks)
    .where(
      and(
        inArray(accountStocks.variantId, variantIds),
        eq(accountStocks.status, "available"),
      ),
    )
    .groupBy(accountStocks.variantId);

  const counts: Record<string, number> = {};
  for (const id of variantIds) counts[id] = 0;
  for (const row of rows) counts[row.variantId] = Number(row.available ?? 0);

  return NextResponse.json({ counts });
}
