"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { requireUser } from "@/server/auth";

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!id) return actionError("ID notifikasi tidak valid.");

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/reviews");
  return actionOk(undefined);
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const user = await requireUser();
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, user.id));

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard/reviews");
  return actionOk(undefined);
}
