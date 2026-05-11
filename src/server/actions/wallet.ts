"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { requireUser } from "@/server/auth";
import { createWalletTopup, WalletError } from "@/server/services/wallet";

const topupSchema = z.object({
  amount: z.coerce.number().int().positive(),
});

export async function createWalletTopupAction(
  input: unknown,
): Promise<ActionResult<{ paymentUrl: string }>> {
  const user = await requireUser("/dashboard/wallet");
  const parsed = topupSchema.safeParse(input);
  if (!parsed.success) return actionError("Nominal top up tidak valid.");

  try {
    const res = await createWalletTopup(user.id, parsed.data.amount);
    revalidatePath("/dashboard/wallet");
    return actionOk(res);
  } catch (error) {
    if (error instanceof WalletError) {
      return actionError(error.message, { code: error.code });
    }
    console.error("[createWalletTopupAction]", error);
    return actionError("Gagal membuat top up.");
  }
}

