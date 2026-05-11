import "server-only";

import { headers } from "next/headers";

import { db } from "@/db";
import { adminActionLogs } from "@/db/schema";

type AdminAuditInput = {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  diff?: Record<string, unknown>;
};

export async function recordAdminAction(input: AdminAuditInput): Promise<void> {
  const reqHeaders = await headers();
  const ipAddress = reqHeaders.get("x-forwarded-for") ?? reqHeaders.get("x-real-ip");
  const userAgent = reqHeaders.get("user-agent");

  await db.insert(adminActionLogs).values({
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    diff: input.diff ?? null,
    ipAddress: ipAddress ? ipAddress.slice(0, 255) : null,
    userAgent: userAgent ? userAgent.slice(0, 500) : null,
  });
}

