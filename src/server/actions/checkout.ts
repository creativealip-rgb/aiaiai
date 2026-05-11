"use server";

/**
 * Checkout Server Action — creates an order and returns the payment URL.
 */

import { checkoutSchema } from "@/lib/schemas/checkout";
import { actionError, actionOk, type ActionResult } from "@/server/actions/action-result";
import { getSession } from "@/server/auth";
import { CheckoutError, createOrder } from "@/server/services/orders";

export async function checkoutAction(
  input: unknown,
): Promise<ActionResult<{ orderNumber: string; paymentUrl: string | null }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Data checkout tidak valid.", {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    });
  }

  const session = await getSession();
  const userId = session?.user?.id ?? null;

  // If logged in, always trust session email over client payload.
  if (userId) {
    parsed.data.guestEmail = session!.user.email;
    if (!parsed.data.guestName) {
      parsed.data.guestName = session!.user.name || undefined;
    }
  }

  try {
    const { order, paymentUrl } = await createOrder(parsed.data, userId);
    return actionOk({ orderNumber: order.orderNumber, paymentUrl });
  } catch (error) {
    if (error instanceof CheckoutError) {
      return actionError(error.message, { code: error.code });
    }
    console.error("[checkoutAction]", error);
    return actionError("Terjadi kesalahan saat membuat order.");
  }
}
