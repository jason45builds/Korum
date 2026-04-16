import type { MatchState, ParticipantStatus } from "@korum/types/match";
import type { PaymentStatus } from "@korum/types/payment";

export const APP_NAME = "Korum";
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_PAYMENT_HOLD_MINUTES = 15;
export const DEFAULT_INVITE_EXPIRY_HOURS = 12;
export const DEFAULT_SQUAD_SIZE = 10;

export const MATCH_STATE_SEQUENCE: MatchState[] = [
  "DRAFT",
  "RSVP_OPEN",
  "PAYMENT_PENDING",
  "LOCKED",
  "READY",
];

export const PARTICIPANT_STATUS_TONE: Record<ParticipantStatus, "success" | "warning" | "danger" | "neutral"> = {
  INVITED: "neutral",
  RSVP: "neutral",
  PAYMENT_PENDING: "warning",
  CONFIRMED: "success",
  LOCKED: "success",
  DECLINED: "danger",
  EXPIRED: "danger",
  WAITLISTED: "warning",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, "success" | "warning" | "danger" | "neutral"> = {
  CREATED: "neutral",
  PENDING: "warning",
  PAID: "success",
  FAILED: "danger",
  REFUND_PENDING: "warning",
  REFUNDED: "neutral",
};

export const SPORT_OPTIONS = ["Football", "Cricket", "Badminton", "Basketball", "Futsal"];
