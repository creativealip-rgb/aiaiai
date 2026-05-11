"use server";

import { randomBytes } from "node:crypto";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { requireAdmin } from "@/server/auth";
import { recordAdminAction } from "@/server/services/admin-audit";

function revalidateUsersPages(userId: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function setUserBanStatusAction(
  userId: string,
  banned: boolean,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!userId) return actionError("User ID tidak valid.");
  if (admin.id === userId) return actionError("Anda tidak bisa mengubah status akun sendiri.");

  const [row] = await db
    .update(users)
    .set({
      isBanned: banned,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  if (!row) return actionError("User tidak ditemukan.");

  try {
    await recordAdminAction({
      actorId: admin.id,
      action: banned ? "user.ban" : "user.unban",
      entityType: "user",
      entityId: userId,
      diff: { isBanned: banned },
    });
  } catch (error) {
    console.error("[setUserBanStatusAction] audit log failed", error);
  }

  revalidateUsersPages(userId);
  return actionOk(undefined);
}

export async function resetUserPasswordAction(
  userId: string,
): Promise<ActionResult<{ temporaryPassword: string }>> {
  const admin = await requireAdmin();
  if (!userId) return actionError("User ID tidak valid.");
  if (admin.id === userId) return actionError("Gunakan flow reset password pribadi untuk akun Anda.");

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return actionError("User tidak ditemukan.");

  const [credential] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")))
    .limit(1);

  if (!credential) {
    return actionError("User ini login via OAuth-only (tanpa password credential).");
  }

  const temporaryPassword = `AI3-${randomBytes(4).toString("hex")}`;
  const passwordHash = await hashPassword(temporaryPassword);

  await db
    .update(accounts)
    .set({
      password: passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(accounts.id, credential.id));

  try {
    await recordAdminAction({
      actorId: admin.id,
      action: "user.reset_password",
      entityType: "user",
      entityId: userId,
      diff: { provider: "credential" },
    });
  } catch (error) {
    console.error("[resetUserPasswordAction] audit log failed", error);
  }

  revalidateUsersPages(userId);
  return actionOk({ temporaryPassword });
}
