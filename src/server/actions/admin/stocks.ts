"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { requireAdmin } from "@/server/auth";
import {
  stockBulkImportSchema,
  stockCreateSchema,
  stockStatusUpdateSchema,
} from "@/lib/schemas/stocks";
import {
  StockValidationError,
  bulkImportStocks,
  createStock,
  deleteStock,
  updateStockStatus,
} from "@/server/services/stocks";

function revalidateStocks() {
  revalidatePath("/admin/stocks");
}

function mapStockError(error: unknown): ActionResult<never> {
  if (error instanceof StockValidationError) {
    return actionError(error.message, { code: error.code });
  }
  return actionError(error instanceof Error ? error.message : "Terjadi kesalahan.");
}

export async function createStockAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = stockCreateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data stok tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const row = await createStock(parsed.data);
    revalidateStocks();
    return actionOk({ id: row.id });
  } catch (error) {
    console.error("[createStockAction]", error);
    return mapStockError(error);
  }
}

export async function updateStockStatusAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = stockStatusUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data status tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const row = await updateStockStatus(parsed.data);
    revalidateStocks();
    return actionOk({ id: row.id });
  } catch (error) {
    console.error("[updateStockStatusAction]", error);
    return mapStockError(error);
  }
}

export async function deleteStockAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!id) return actionError("ID stok tidak valid.");

  try {
    await deleteStock(id);
    revalidateStocks();
    return actionOk(undefined);
  } catch (error) {
    console.error("[deleteStockAction]", error);
    return mapStockError(error);
  }
}

export async function bulkImportStocksAction(
  input: unknown,
): Promise<ActionResult<{ inserted: number }>> {
  await requireAdmin();

  const parsed = stockBulkImportSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("CSV tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const res = await bulkImportStocks(parsed.data);
    revalidateStocks();
    return actionOk({ inserted: res.inserted });
  } catch (error) {
    console.error("[bulkImportStocksAction]", error);
    return mapStockError(error);
  }
}
