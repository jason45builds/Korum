import { apiRequest } from "@/services/api/base";

export const sendInvite = (payload: {
  matchId: string;
  invitedPhone: string;
  invitedName?: string | null;
  expiresAt?: string | null;
}) =>
  apiRequest<{ invite: Record<string, unknown>; shareLink: string }>("/api/invite/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const acceptInvite = (token: string) =>
  apiRequest<{ accepted: boolean; result?: Record<string, unknown>; matchId?: string }>("/api/invite/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

export const expireInvites = (matchId?: string) =>
  apiRequest<{ expiredCount: number }>("/api/invite/expire", {
    method: "POST",
    body: JSON.stringify(matchId ? { matchId } : {}),
  });
