import type { TeamDetails } from "@korum/types/team";
import { create } from "zustand";

type TeamStore = {
  activeTeam: TeamDetails | null;
  myTeams: TeamDetails[];
  loading: boolean;
  error: string | null;
  setActiveTeam: (team: TeamDetails | null) => void;
  setMyTeams: (teams: TeamDetails[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

export const useTeamStore = create<TeamStore>((set) => ({
  activeTeam: null,
  myTeams: [],
  loading: false,
  error: null,
  setActiveTeam: (activeTeam) => set({ activeTeam }),
  setMyTeams: (myTeams) => set({ myTeams }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
