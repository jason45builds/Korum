import type { MatchDetail, MatchSummary } from "@korum/types/match";
import { create } from "zustand";

type MatchStore = {
  activeMatch: MatchDetail | null;
  dashboardMatches: MatchSummary[];
  loading: boolean;
  error: string | null;
  setActiveMatch: (match: MatchDetail | null) => void;
  setDashboardMatches: (matches: MatchSummary[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

export const useMatchStore = create<MatchStore>((set) => ({
  activeMatch: null,
  dashboardMatches: [],
  loading: false,
  error: null,
  setActiveMatch: (activeMatch) => set({ activeMatch }),
  setDashboardMatches: (dashboardMatches) => set({ dashboardMatches }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
