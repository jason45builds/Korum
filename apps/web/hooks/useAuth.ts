"use client";

import { useEffect, useRef, useState } from "react";

import { toErrorMessage } from "@/lib/helpers";
import { apiRequest } from "@/services/api/base";
import { getSupabaseBrowserClient } from "@/services/supabase/client";
import { useUserStore } from "@/store/userStore";
import type { UserProfile } from "@korum/types/user";

export const useAuth = () => {
  const [error, setError] = useState<string | null>(null);
  const initialised = useRef(false);
  const {
    accessToken, profile, loading,
    setLoading, setSession, setProfile, reset,
  } = useUserStore();

  const refreshProfile = async () => {
    const response = await apiRequest<{ profile: UserProfile }>("/api/auth");
    setProfile(response.profile);
    return response.profile;
  };

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    // Hard timeout: if Supabase doesn't resolve in 5s, stop loading
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const run = async () => {
      try {
        const client = getSupabaseBrowserClient();

        const { data: { session } } = await client.auth.getSession();
        setSession(session?.access_token ?? null);

        if (session?.access_token) {
          try {
            await refreshProfile();
          } catch (err) {
            setError(toErrorMessage(err));
          }
        }
      } catch (err) {
        // Supabase env vars missing or client failed — treat as logged out
        console.error("[Korum] Auth init failed:", toErrorMessage(err));
        setSession(null);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    void run();

    // Listen for auth state changes
    let unsubscribe: (() => void) | null = null;
    try {
      const client = getSupabaseBrowserClient();
      const { data: { subscription } } = client.auth.onAuthStateChange(
        (_event, session) => {
          setSession(session?.access_token ?? null);
          if (!session?.access_token) {
            reset();
            return;
          }
          void refreshProfile().catch((err) => setError(toErrorMessage(err)));
        }
      );
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      // ignore — already handled above
    }

    return () => {
      clearTimeout(timeout);
      unsubscribe?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signInWithOtp = async (phone: string, fullName?: string) => {
    setError(null);
    const client = getSupabaseBrowserClient();
    const { error: authError } = await client.auth.signInWithOtp({
      phone,
      options: {
        data: {
          full_name: fullName ?? phone,
          display_name: fullName ?? phone,
        },
      },
    });
    if (authError) throw authError;
  };

  const verifyOtp = async (phone: string, token: string) => {
    setError(null);
    const client = getSupabaseBrowserClient();
    const { error: verifyError, data } = await client.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (verifyError) throw verifyError;
    setSession(data.session?.access_token ?? null);
    if (data.session?.access_token) await refreshProfile();
  };

  const saveProfile = async (payload: {
    fullName: string;
    displayName?: string;
    defaultSport?: string | null;
    city?: string | null;
    role?: "captain" | "player";
  }) => {
    const response = await apiRequest<{ profile: UserProfile }>("/api/auth", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setProfile(response.profile);
    return response.profile;
  };

  const signOut = async () => {
    try {
      const client = getSupabaseBrowserClient();
      await client.auth.signOut();
    } catch { /* ignore */ }
    reset();
  };

  return {
    accessToken,
    profile,
    loading,
    error,
    isAuthenticated: Boolean(accessToken),
    refreshProfile,
    signInWithOtp,
    verifyOtp,
    saveProfile,
    signOut,
  };
};
