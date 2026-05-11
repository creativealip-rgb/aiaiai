"use server";

import { revalidatePath } from "next/cache";

import { voucherFormSchema } from "@/lib/schemas/vouchers";
import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { requireAdmin } from "@/server/auth";
import {
  VoucherValidationError,
  createVoucher,
  deleteVoucher,
  updateVoucher,
} from "@/server/services/vouchers";

function revalidateVouchers() {
  revalidatePath("/admin/vouchers");
  revalidatePath("/checkout");
}

function mapVoucherError(error: unknown): ActionResult<never> {
  if (error instanceof VoucherValidationError) {
    return actionError(error.message, { code: error.code });
  }
  return actionError(error instanceof Error ? error.message : "Terjadi kesalahan.");
}

export async function createVoucherAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = voucherFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data voucher tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const row = await createVoucher(parsed.data);
    revalidateVouchers();
    return actionOk({ id: row.id });
  } catch (error) {
    console.error("[createVoucherAction]", error);
    return mapVoucherError(error);
  }
}

export async function updateVoucherAction(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();
  const parsed = voucherFormSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data voucher tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const row = await updateVoucher(id, parsed.data);
    revalidateVouchers();
    return actionOk({ id: row.id });
  } catch (error) {
    console.error("[updateVoucherAction]", error);
    return mapVoucherError(error);
  }
}

export async function deleteVoucherAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    await deleteVoucher(id);
    revalidateVouchers();
    return actionOk(undefined);
  } catch (error) {
    console.error("[deleteVoucherAction]", error);
    return mapVoucherError(error);
  }
}

