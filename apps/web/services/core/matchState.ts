import type { MatchState } from "@korum/types/match";

import { MATCH_STATE_SEQUENCE } from "@/lib/constants";

const transitions: Record<MatchState, MatchState[]> = {
  DRAFT: ["RSVP_OPEN"],
  RSVP_OPEN: ["PAYMENT_PENDING"],
  PAYMENT_PENDING: ["LOCKED"],
  LOCKED: ["READY"],
  READY: [],
};

export const canTransitionMatchState = (current: MatchState, next: MatchState) =>
  transitions[current].includes(next);

export const getNextMatchState = (current: MatchState): MatchState | null => {
  const currentIndex = MATCH_STATE_SEQUENCE.indexOf(current);

  return MATCH_STATE_SEQUENCE[currentIndex + 1] ?? null;
};

export const describeMatchState = (state: MatchState) => {
  switch (state) {
    case "DRAFT":
      return "Match is drafted and hidden from player coordination.";
    case "RSVP_OPEN":
      return "Players can RSVP and join from links or invites.";
    case "PAYMENT_PENDING":
      return "Players can reserve a payment window and confirm their slot.";
    case "LOCKED":
      return "The captain has frozen the paid squad.";
    case "READY":
      return "The match is locked in and ready to happen.";
    default:
      return "Unknown match state.";
  }
};
