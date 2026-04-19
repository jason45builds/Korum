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
    profile,
    isAuthenticated,
    loading,
    setLoading,
    setAuthenticated,
    setProfile,
    reset,
  } = useUserStore();

  const refreshProfile = async () => {
    const response = await apiRequest<{ profile: UserProfile }>("/api/auth");
    setProfile(response.profile);
    setAuthenticated(true);
    return response.profile;
  };

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    const timeout = setTimeout(() => setLoading(false), 5000);
    const client = getSupabaseBrowserClient();

    const run = async () => {
      try {
        const { data: { session }, error: sessionError } = await client.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session?.user) {
          reset();
          return;
        }

        setAuthenticated(true);
        await refreshProfile();
      } catch (err) {
        console.error("[Korum] Auth init failed:", toErrorMessage(err));
        setError(toErrorMessage(err));
        reset();
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    void run();

    let unsubscribe: (() => void) | null = null;

    try {
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (!session?.user) {
          reset();
          return;
        }

        setAuthenticated(true);
        void refreshProfile().catch((err) => setError(toErrorMessage(err)));
      });

      unsubscribe = () => subscription.unsubscribe();
    } catch {
      // Ignore subscription setup failures and rely on explicit refreshes.
    }

    return () => {
      clearTimeout(timeout);
      unsubscribe?.();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    const client = getSupabaseBrowserClient();
    const { error: err, data } = await client.auth.signInWithPassword({ email, password });

    if (err) throw err;

    if (data.session?.user) {
      setAuthenticated(true);
      await refreshProfile();
    }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    setError(null);
    const client = getSupabaseBrowserClient();
    const { error: err, data } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName ?? email.split("@")[0],
          display_name: fullName ?? email.split("@")[0],
        },
      },
    });

    if (err) throw err;

    if (data.session?.user) {
      setAuthenticated(true);
      await refreshProfile();
    }
  };

  const signInWithOtp = async (phone: string, fullName?: string) => {
    setError(null);
    const client = getSupabaseBrowserClient();
    const { error: err } = await client.auth.signInWithOtp({
      phone,
      options: { data: { full_name: fullName ?? phone, display_name: fullName ?? phone } },
    });

    if (err) throw err;
  };

  const verifyOtp = async (phone: string, token: string) => {
    setError(null);
    const client = getSupabaseBrowserClient();
    const { error: err, data } = await client.auth.verifyOtp({ phone, token, type: "sms" });

    if (err) throw err;

    if (data.session?.user) {
      setAuthenticated(true);
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
    try {
      const client = getSupabaseBrowserClient();
      await client.auth.signOut();
    } catch {
      // Ignore sign-out cleanup issues and clear local state anyway.
    }

    reset();
  };

  return {
    profile,
    isAuthenticated,
    loading,
    error,
    refreshProfile,
    signInWithEmail,
    signUpWithEmail,
    signInWithOtp,
    verifyOtp,
    saveProfile,
    signOut,
  };
};
