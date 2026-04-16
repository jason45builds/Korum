export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUND_PENDING"
  | "REFUNDED";

export type Payment = {
  id: string;
  matchId: string;
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  gatewaySignature: string | null;
  webhookEventId: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RazorpayOrderResponse = {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  receipt: string;
  matchId: string;
};

export type RazorpayVerificationPayload = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  paymentId: string;
  matchId: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}
