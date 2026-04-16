"use client";

import { useEffect, useState } from "react";

import { toErrorMessage } from "@/lib/helpers";
import { apiRequest } from "@/services/api/base";
import { getSupabaseBrowserClient } from "@/services/supabase/client";
import { useUserStore } from "@/store/userStore";
import type { UserProfile } from "@korum/types/user";

export const useAuth = () => {
  const [error, setError] = useState<string | null>(null);
  const { accessToken, profile, loading, setLoading, setSession, setProfile, reset } = useUserStore();

  const refreshProfile = async () => {
    const response = await apiRequest<{ profile: UserProfile }>("/api/auth");
    setProfile(response.profile);
    return response.profile;
  };

  useEffect(() => {
    let client: ReturnType<typeof getSupabaseBrowserClient>;
    try {
      client = getSupabaseBrowserClient();
    } catch (err) {
      console.error(
        "[Korum] Supabase client failed to initialize. " +
        "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.",
        err,
      );
      setLoading(false);
      return;
    }

    const initialize = async () => {
      setLoading(true);

      const {
        data: { session },
      } = await client.auth.getSession();

      setSession(session?.access_token ?? null);

      if (session?.access_token) {
        try {
          await refreshProfile();
        } catch (currentError) {
          setError(toErrorMessage(currentError));
        }
      }

      setLoading(false);
    };

    void initialize();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      setSession(session?.access_token ?? null);

      if (!session?.access_token) {
        reset();
        return;
      }

      void refreshProfile().catch((currentError) => setError(toErrorMessage(currentError)));
    });

    return () => subscription.unsubscribe();
  }, [reset, setLoading, setProfile, setSession]);

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

    if (authError) {
      throw authError;
    }
  };

  const verifyOtp = async (phone: string, token: string) => {
    setError(null);
    const client = getSupabaseBrowserClient();
    const { error: verifyError, data } = await client.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    if (verifyError) {
      throw verifyError;
    }

    setSession(data.session?.access_token ?? null);

    if (data.session?.access_token) {
      await refreshProfile();
    }
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
    const client = getSupabaseBrowserClient();
    await client.auth.signOut();
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
