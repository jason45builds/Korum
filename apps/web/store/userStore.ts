import type { UserProfile } from "@korum/types/user";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type UserStore = {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setProfile: (profile: UserProfile | null) => void;
  reset: () => void;
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: null,
      isAuthenticated: false,
      // Start true — we're about to check. Components that gate on auth
      // will show a spinner rather than flashing the guest state.
      loading: true,
      setLoading: (loading) => set({ loading }),
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      setProfile: (profile) => set({ profile }),
      reset: () => set({ profile: null, isAuthenticated: false, loading: false }),
    }),
    {
      name: "korum-auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist profile + auth flag — never persist loading state
      partialize: (state) => ({
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
