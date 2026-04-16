import type { PaymentStatus } from "./payment";

export type MatchState = "DRAFT" | "RSVP_OPEN" | "PAYMENT_PENDING" | "LOCKED" | "READY";

export type MatchVisibility = "PRIVATE" | "TEAM" | "PUBLIC";

export type ParticipantStatus =
  | "INVITED"
  | "RSVP"
  | "PAYMENT_PENDING"
  | "CONFIRMED"
  | "LOCKED"
  | "DECLINED"
  | "EXPIRED"
  | "WAITLISTED";

export type Match = {
  id: string;
  teamId: string;
  captainId: string;
  title: string;
  sport: string;
  venueName: string;
  venueAddress: string;
  startsAt: string;
  paymentDueAt: string | null;
  lockAt: string | null;
  squadSize: number;
  pricePerPlayer: number;
  status: MatchState;
  visibility: MatchVisibility;
  joinCode: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchParticipant = {
  id: string;
  matchId: string;
  userId: string;
  inviteId: string | null;
  status: ParticipantStatus;
  paymentStatus: PaymentStatus;
  holdExpiresAt: string | null;
  joinedAt: string;
  updatedAt: string;
};

export type MatchAvailability = {
  id: string;
  matchId: string;
  userId: string;
  slotLabel: string;
  slotStartsAt: string;
  slotEndsAt: string;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MatchSummary = Match & {
  confirmedCount: number;
  pendingCount: number;
  paidCount: number;
  readinessRatio: number;
};

export type MatchDetail = Match & {
  teamName: string;
  captainName: string;
  participants: Array<{
    participantId: string;
    userId: string;
    fullName: string;
    phone: string;
    status: ParticipantStatus;
    paymentStatus: PaymentStatus;
    reliabilityScore: number;
    joinedAt: string;
    holdExpiresAt: string | null;
  }>;
  invites: Array<{
    id: string;
    invitedPhone: string;
    invitedName: string | null;
    status: string;
    expiresAt: string;
  }>;
};
