"use server";

/**
 * Admin Server Actions — categories.
 *
 * Every action re-checks admin role via `requireAdmin()` even though the
 * admin routes also guard it in layout: security boundaries are enforced
 * server-side, never trusted to the UI shell (IMPLEMENTATION_PLAN.md §9).
 */

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/server/auth";
import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import {
  CategoryInUseError,
  CategoryNotFoundError,
  categoryCreateSchema,
  categoryUpdateSchema,
  createCategory as createCategoryService,
  deleteCategory as deleteCategoryService,
  updateCategory as updateCategoryService,
} from "@/server/services/categories";

function revalidateAll() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/", "layout");
}

export async function createCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const parsed = categoryCreateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data kategori tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const category = await createCategoryService(parsed.data);
    revalidateAll();
    return actionOk({ id: category.id, slug: category.slug });
  } catch (error) {
    console.error("[createCategoryAction]", error);
    return actionError(error instanceof Error ? error.message : "Gagal membuat kategori.");
  }
}

export async function updateCategoryAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const parsed = categoryUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data kategori tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const category = await updateCategoryService(parsed.data);
    revalidateAll();
    revalidatePath(`/admin/categories/${category.id}`);
    return actionOk({ id: category.id, slug: category.slug });
  } catch (error) {
    console.error("[updateCategoryAction]", error);
    if (error instanceof CategoryNotFoundError) {
      return actionError(error.message, { code: error.code });
    }
    return actionError(error instanceof Error ? error.message : "Gagal menyimpan kategori.");
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  await requireAdmin();

  if (!id || typeof id !== "string") {
    return actionError("ID kategori tidak valid.");
  }

  try {
    await deleteCategoryService(id);
    revalidateAll();
    return actionOk(undefined);
  } catch (error) {
    console.error("[deleteCategoryAction]", error);
    if (error instanceof CategoryInUseError) {
      return actionError(error.message, { code: error.code });
    }
    if (error instanceof CategoryNotFoundError) {
      return actionError(error.message, { code: error.code });
    }
    return actionError(error instanceof Error ? error.message : "Gagal menghapus kategori.");
  }
}
