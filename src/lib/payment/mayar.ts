import { env } from "@/lib/env";

// --- Types ---

export interface MayarInvoiceParams {
  orderNumber: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  description: string;
  items: Array<{ name: string; qty: number; price: number }>;
  redirectUrl: string;
}

export interface MayarInvoiceResult {
  invoiceId: string;
  paymentUrl: string;
  rawResponse: unknown;
}

export interface MayarWebhookPayload {
  event: string;
  data: {
    id: string;
    status: string;
    amount: number;
    transaction_id: string;
    payment_method?: string;
    [key: string]: unknown;
  };
}

// --- Error ---

export class MayarApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: unknown,
  ) {
    super(message);
    this.name = "MayarApiError";
  }
}

// --- Helpers ---

async function postWithRetry(url: string, body: unknown): Promise<Response> {
  const opts: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.MAYAR_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  };

  try {
    return await fetch(url, opts);
  } catch {
    // Retry once on network error
    return await fetch(url, opts);
  }
}

// --- Public API ---

export async function createMayarInvoice(
  params: MayarInvoiceParams,
): Promise<MayarInvoiceResult> {
  const res = await postWithRetry(`${env.MAYAR_BASE_URL}/invoice`, {
    orderNumber: params.orderNumber,
    amount: params.amount,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
    description: params.description,
    items: params.items,
    redirectUrl: params.redirectUrl,
  });

  const json = await res.json();

  if (!res.ok) {
    throw new MayarApiError(
      `Mayar API error: ${res.status}`,
      res.status,
      json,
    );
  }

  return {
    invoiceId: json.data?.id ?? json.id,
    paymentUrl: json.data?.paymentUrl ?? json.paymentUrl,
    rawResponse: json,
  };
}

export function verifyMayarWebhook(token: string): boolean {
  return token === env.MAYAR_WEBHOOK_TOKEN;
}
