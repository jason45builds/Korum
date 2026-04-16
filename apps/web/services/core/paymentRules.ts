import type { Match, MatchParticipant } from "@korum/types/match";
import type { PaymentStatus } from "@korum/types/payment";

import { DEFAULT_PAYMENT_HOLD_MINUTES } from "@/lib/constants";

export const paymentSettledStatuses: PaymentStatus[] = ["PAID"];

export const isPaymentSettled = (status: PaymentStatus) => paymentSettledStatuses.includes(status);

export const isMatchPayable = (match: Match) =>
  match.status === "RSVP_OPEN" || match.status === "PAYMENT_PENDING";

export const createPaymentHoldExpiry = () =>
  new Date(Date.now() + DEFAULT_PAYMENT_HOLD_MINUTES * 60 * 1000).toISOString();

export const canUserPayForMatch = (match: Match, participant?: MatchParticipant | null) => {
  if (!isMatchPayable(match)) {
    return false;
  }

  if (!participant) {
    return true;
  }

  return !["CONFIRMED", "LOCKED"].includes(participant.status);
};
