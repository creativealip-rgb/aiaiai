import "server-only";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
}) {
  await db.insert(notifications).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    linkUrl: input.linkUrl ?? null,
  });
}

export async function listNotificationsByUser(userId: string, limit = 20) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(Math.min(100, Math.max(1, limit)));
}
