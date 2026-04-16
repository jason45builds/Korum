export type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

export type MatchInvite = {
  id: string;
  matchId: string;
  invitedUserId: string | null;
  invitedPhone: string;
  invitedName: string | null;
  invitedBy: string;
  token: string;
  status: InviteStatus;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};
