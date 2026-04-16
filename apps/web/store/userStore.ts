import type { AuthState, UserProfile } from "@korum/types/user";
import { create } from "zustand";

type UserStore = AuthState & {
  setLoading: (loading: boolean) => void;
  setSession: (accessToken: string | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  reset: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
  accessToken: null,
  profile: null,
  loading: true,
  setLoading: (loading) => set({ loading }),
  setSession: (accessToken) => set({ accessToken }),
  setProfile: (profile) => set({ profile }),
  reset: () => set({ accessToken: null, profile: null, loading: false }),
}));
