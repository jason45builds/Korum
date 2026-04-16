import type { MatchAvailability } from "@korum/types/match";

import { apiRequest } from "@/services/api/base";

export const updateAvailability = (payload: {
  matchId: string;
  entries: Array<{
    slotLabel: string;
    slotStartsAt: string;
    slotEndsAt: string;
    isAvailable: boolean;
  }>;
}) =>
  apiRequest<{ availability: MatchAvailability[] }>("/api/availability/update", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchAvailability = (matchId: string) =>
  apiRequest<{ availability: MatchAvailability[] }>(`/api/availability/fetch?matchId=${matchId}`);
