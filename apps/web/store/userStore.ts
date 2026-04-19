import type { AuthState, UserProfile } from "@korum/types/user";
import { create } from "zustand";

type UserStore = AuthState & {
  setLoading: (loading: boolean) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setProfile: (profile: UserProfile | null) => void;
  reset: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  isAuthenticated: false,
  loading: true,
  setLoading: (loading) => set({ loading }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setProfile: (profile) => set({ profile }),
  reset: () => set({ profile: null, isAuthenticated: false, loading: false }),
}));
