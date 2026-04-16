"use client";

import { useEffect, useState } from "react";

import { toErrorMessage } from "@/lib/helpers";
import { createPaymentOrder, verifyPayment } from "@/services/api/payment";
import type { UserProfile } from "@korum/types/user";

const loadRazorpayCheckout = async () => {
  if (typeof window === "undefined") {
    return false;
  }

  if (window.Razorpay) {
    return true;
  }

  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;

  const loaded = new Promise<boolean>((resolve) => {
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
  });

  document.body.appendChild(script);
  return loaded;
};

export const usePayment = (matchId?: string, profile?: UserProfile | null, onComplete?: () => void) => {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadRazorpayCheckout().then(setReady);
  }, []);

  const payAndConfirm = async () => {
    if (!matchId) {
      throw new Error("Match ID is required to pay.");
    }

    setLoading(true);
    setError(null);

    try {
      const order = await createPaymentOrder(matchId);

      if (order.alreadyPaid || order.freeMatch) {
        onComplete?.();
        return order;
      }

      if (!window.Razorpay) {
        throw new Error("Razorpay checkout is not available.");
      }

      await new Promise<void>((resolve, reject) => {
        const Razorpay = window.Razorpay;

        if (!Razorpay) {
          reject(new Error("Razorpay checkout is not available."));
          return;
        }

        const instance = new Razorpay({
          key: order.keyId,
          amount: order.amount * 100,
          currency: order.currency,
          name: "Korum",
          description: "Match confirmation payment",
          order_id: order.orderId,
          prefill: {
            name: profile?.fullName,
            contact: profile?.phone,
          },
          theme: {
            color: "#1f7a4d",
          },
          handler: async (response: Record<string, string>) => {
            try {
              await verifyPayment({
                paymentId: order.paymentId,
                matchId: order.matchId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              onComplete?.();
              resolve();
            } catch (currentError) {
              reject(currentError);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment was cancelled.")),
          },
        });

        instance.open();
      });

      return order;
    } catch (currentError) {
      const message = toErrorMessage(currentError);
      setError(message);
      throw currentError;
    } finally {
      setLoading(false);
    }
  };

  return {
    ready,
    loading,
    error,
    payAndConfirm,
  };
};
