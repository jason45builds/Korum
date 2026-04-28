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
    Razorpay?: new (options: {
      key: string;
      amount: number;
      currency: string;
      name: string;
      description?: string;
      order_id: string;
      prefill?: { name?: string; email?: string; contact?: string };
      notes?: Record<string, string>;
      theme?: { color?: string; hide_topbar?: boolean };
      modal?: { ondismiss?: () => void; animation?: boolean; escape?: boolean; handleback?: boolean };
      handler: (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => void;
    }) => {
      open: () => void;
      close: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}
