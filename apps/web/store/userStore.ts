import type { UserProfile } from "@korum/types/user";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

type UserStore = {
  profile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  _hydrated: boolean;           // true once localStorage values have been read
  setLoading: (loading: boolean) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setProfile: (profile: UserProfile | null) => void;
  setHydrated: (v: boolean) => void;
  reset: () => void;
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      profile: null,
      isAuthenticated: false,
      loading: true,
      _hydrated: false,
      setLoading:        (loading) => set({ loading }),
      setAuthenticated:  (isAuthenticated) => set({ isAuthenticated }),
      setProfile:        (profile) => set({ profile }),
      setHydrated:       (v) => set({ _hydrated: v }),
      reset: () => set({ profile: null, isAuthenticated: false, loading: false }),
    }),
    {
      name: "korum-auth",
      storage: createJSONStorage(() => {
        // Safe localStorage access — returns no-op storage during SSR
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      // Only persist these two — never persist transient ui state
      partialize: (state) => ({
        profile: state.profile,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Called once localStorage values have been read into the store
        if (state) state.setHydrated(true);
      },
    }
  )
);
