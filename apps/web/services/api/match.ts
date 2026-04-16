import type { MatchDetail, MatchSummary } from "@korum/types/match";

import { apiRequest } from "@/services/api/base";

type MatchDetailResponse = { match: MatchDetail };
type MatchesResponse = { matches: MatchSummary[] };
type DashboardResponse = {
  matches: MatchSummary[];
  pendingPayments: Array<{
    id: string;
    matchId: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
};

export type CreateMatchInput = {
  teamId: string;
  title: string;
  sport: string;
  venueName: string;
  venueAddress: string;
  startsAt: string;
  paymentDueAt?: string | null;
  lockAt?: string | null;
  squadSize: number;
  pricePerPlayer: number;
  visibility: "PRIVATE" | "TEAM" | "PUBLIC";
  notes?: string | null;
  publishNow?: boolean;
};

export const createMatch = (payload: CreateMatchInput) =>
  apiRequest<{ match: Record<string, unknown> }>("/api/match/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const joinMatch = (payload: { matchId?: string; joinCode?: string; inviteToken?: string }) =>
  apiRequest<{ match: Record<string, unknown>; participant: Record<string, unknown> }>("/api/match/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateMatch = (payload: Record<string, unknown>) =>
  apiRequest<{ match: Record<string, unknown> }>("/api/match/update", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const lockMatch = (matchId: string) =>
  apiRequest<{ match: Record<string, unknown> }>("/api/match/lock", {
    method: "POST",
    body: JSON.stringify({ matchId }),
  });

export const getMatchDetail = (payload: { matchId?: string; joinCode?: string }) => {
  const query = payload.matchId
    ? `matchId=${payload.matchId}`
    : `joinCode=${payload.joinCode ?? ""}`;

  return apiRequest<MatchDetailResponse>(`/api/match/status?${query}`);
};

export const getTeamMatches = (teamId: string) =>
  apiRequest<MatchesResponse>(`/api/match/status?teamId=${teamId}`);

export const getDashboardMatches = () =>
  apiRequest<DashboardResponse>("/api/match/status?scope=dashboard");
