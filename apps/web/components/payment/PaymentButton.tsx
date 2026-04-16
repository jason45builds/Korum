"use client";

import { Button } from "@/components/ui/Button";
import { usePayment } from "@/hooks/usePayment";
import type { UserProfile } from "@korum/types/user";

export function PaymentButton({
  matchId,
  profile,
  onComplete,
}: {
  matchId: string;
  profile?: UserProfile | null;
  onComplete?: () => void;
}) {
  const { payAndConfirm, loading, ready } = usePayment(matchId, profile, onComplete);

  return (
    <Button onClick={() => void payAndConfirm()} loading={loading} disabled={!ready} block>
      Pay & Confirm
    </Button>
  );
}
