import type { UserProfile } from "@korum/types/user";
import { create } from "zustand";

type UserStore = {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setProfile: (profile: UserProfile | null) => void;
  reset: () => void;
};

export const useUserStore = create<UserStore>((set) => ({
  profile: null,
  isAuthenticated: false,
  // Start false — useAuth sets it true only during the session check.
  // This prevents permanent loading if Supabase env vars are missing.
  loading: false,
  setLoading: (loading) => set({ loading }),
  setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setProfile: (profile) => set({ profile }),
  reset: () => set({ profile: null, isAuthenticated: false, loading: false }),
}));
