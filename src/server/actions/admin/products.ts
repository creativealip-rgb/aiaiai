"use server";

/**
 * Admin Server Actions — products & variants.
 *
 * Thin wrappers around the service layer: auth gate, schema parse,
 * call service, revalidate routes.
 */

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/server/auth";
import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import {
  LastVariantError,
  ProductNotFoundError,
  ProductValidationError,
  VariantNotFoundError,
  createProduct as createProductService,
  createVariant as createVariantService,
  deleteVariant as deleteVariantService,
  productCreateSchema,
  productUpdateSchema,
  restoreProduct as restoreProductService,
  softDeleteProduct as softDeleteProductService,
  updateProduct as updateProductService,
  updateVariant as updateVariantService,
  variantCreateSchema,
  variantUpdateSchema,
} from "@/server/services/products";

function revalidateCatalog(slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/products/${slug}`);
}

function mapError(error: unknown): ActionResult<never> {
  if (error instanceof ProductValidationError) {
    return actionError(error.message, { code: error.code });
  }
  if (error instanceof ProductNotFoundError) {
    return actionError(error.message, { code: error.code });
  }
  if (error instanceof VariantNotFoundError) {
    return actionError(error.message, { code: error.code });
  }
  if (error instanceof LastVariantError) {
    return actionError(error.message, { code: error.code });
  }
  return actionError(error instanceof Error ? error.message : "Terjadi kesalahan.");
}

// ----------------------------------------------------------------------------
// Products
// ----------------------------------------------------------------------------

export async function createProductAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const parsed = productCreateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data produk tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const product = await createProductService(parsed.data);
    revalidateCatalog(product.slug);
    return actionOk({ id: product.id, slug: product.slug });
  } catch (error) {
    console.error("[createProductAction]", error);
    return mapError(error);
  }
}

export async function updateProductAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  await requireAdmin();

  const parsed = productUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data produk tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const product = await updateProductService(parsed.data);
    revalidateCatalog(product.slug);
    revalidatePath(`/admin/products/${product.id}`);
    return actionOk({ id: product.id, slug: product.slug });
  } catch (error) {
    console.error("[updateProductAction]", error);
    return mapError(error);
  }
}

export async function softDeleteProductAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!id || typeof id !== "string") return actionError("ID produk tidak valid.");
  try {
    await softDeleteProductService(id);
    revalidateCatalog();
    return actionOk(undefined);
  } catch (error) {
    console.error("[softDeleteProductAction]", error);
    return mapError(error);
  }
}

export async function restoreProductAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  if (!id || typeof id !== "string") return actionError("ID produk tidak valid.");
  try {
    await restoreProductService(id);
    revalidateCatalog();
    return actionOk(undefined);
  } catch (error) {
    console.error("[restoreProductAction]", error);
    return mapError(error);
  }
}

// ----------------------------------------------------------------------------
// Variants
// ----------------------------------------------------------------------------

export async function createVariantAction(
  productId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = variantCreateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data varian tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const variant = await createVariantService(productId, parsed.data);
    revalidatePath(`/admin/products/${productId}`);
    revalidateCatalog();
    return actionOk({ id: variant.id });
  } catch (error) {
    console.error("[createVariantAction]", error);
    return mapError(error);
  }
}

export async function updateVariantAction(
  productId: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  await requireAdmin();

  const parsed = variantUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data varian tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  try {
    const variant = await updateVariantService(parsed.data);
    revalidatePath(`/admin/products/${productId}`);
    revalidateCatalog();
    return actionOk({ id: variant.id });
  } catch (error) {
    console.error("[updateVariantAction]", error);
    return mapError(error);
  }
}

export async function deleteVariantAction(
  productId: string,
  variantId: string,
): Promise<ActionResult> {
  await requireAdmin();
  if (!variantId || typeof variantId !== "string") return actionError("ID varian tidak valid.");
  try {
    await deleteVariantService(variantId);
    revalidatePath(`/admin/products/${productId}`);
    revalidateCatalog();
    return actionOk(undefined);
  } catch (error) {
    console.error("[deleteVariantAction]", error);
    return mapError(error);
  }
}
