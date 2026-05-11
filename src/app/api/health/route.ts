import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({
      ok: true,
      service: "ai3",
      db: "up",
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    logger.error({ err: error }, "health.check_failed");
    return NextResponse.json(
      {
        ok: false,
        service: "ai3",
        db: "down",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}

