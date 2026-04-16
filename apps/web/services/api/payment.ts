import type { RazorpayOrderResponse, RazorpayVerificationPayload } from "@korum/types/payment";

import { apiRequest } from "@/services/api/base";

export type CreateOrderResult = RazorpayOrderResponse & {
  alreadyPaid?: boolean;
  freeMatch?: boolean;
  result?: Record<string, unknown>;
};

export const createPaymentOrder = (matchId: string) =>
  apiRequest<CreateOrderResult>("/api/payment/create-order", {
    method: "POST",
    body: JSON.stringify({ matchId }),
  });

export const verifyPayment = (payload: RazorpayVerificationPayload) =>
  apiRequest<{ result: Record<string, unknown> }>("/api/payment/verify", {
    method: "POST",
    body: JSON.stringify(payload),
  });
