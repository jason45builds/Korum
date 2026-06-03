"use client";

import { useEffect, useRef, useState } from "react";

import { toErrorMessage } from "@/lib/helpers";
import { apiRequest } from "@/services/api/base";
import { useUserStore } from "@/store/userStore";
import type { UserProfile } from "@korum/types/user";

export const useAuth = () => {
  const [error, setError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const initialised = useRef(false);
  const {
    profile,
    isAuthenticated,
    loading,
    _hydrated,
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
    if (!_hydrated) return;
    if (initialised.current) return;
    initialised.current = true;

    const skipSpinner = isAuthenticated && !!profile;
    if (!skipSpinner) setLoading(true);

    // If still loading after 8s, stop spinner and show a connection error
    const timeout = setTimeout(() => {
      setLoading(false);
      setTimedOut(true);
    }, 8000);

    const run = async () => {
      try {
        const { getSupabaseBrowserClient } = await import("@/services/supabase/client");
        const client = getSupabaseBrowserClient();

        const { data: { session }, error: sessionError } = await client.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.user) {
          reset();
          return;
        }

        setAuthenticated(true);
        setTimedOut(false);

        if (skipSpinner) {
          void refreshProfile().catch(() => {});
        } else {
          await refreshProfile();
        }
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
    void import("@/services/supabase/client").then(({ getSupabaseBrowserClient }) => {
      try {
        const client = getSupabaseBrowserClient();
        const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
          if (!session?.user) { reset(); return; }
          setAuthenticated(true);
          setTimedOut(false);
          void refreshProfile().catch((e) => setError(toErrorMessage(e)));
        });
        unsubscribe = () => subscription.unsubscribe();
      } catch { /* ignore */ }
    }).catch(() => {});

    return () => {
      clearTimeout(timeout);
      unsubscribe?.();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_hydrated]);

  const getClient = async () => {
    const { getSupabaseBrowserClient } = await import("@/services/supabase/client");
    return getSupabaseBrowserClient();
  };

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    const client = await getClient();
    const { error: err, data } = await client.auth.signInWithPassword({ email, password });
    if (err) throw err;
    if (data.session?.user) { setAuthenticated(true); await refreshProfile(); }
  };

  const signUpWithEmail = async (email: string, password: string, fullName?: string) => {
    setError(null);
    const client = await getClient();
    const { error: err, data } = await client.auth.signUp({
      email, password,
      options: { data: { full_name: fullName ?? email.split("@")[0], display_name: fullName ?? email.split("@")[0] } },
    });
    if (err) throw err;
    if (data.session?.user) { setAuthenticated(true); await refreshProfile(); }
  };

  const signInWithOtp = async (phone: string, fullName?: string) => {
    setError(null);
    const client = await getClient();
    const { error: err } = await client.auth.signInWithOtp({
      phone,
      options: { data: { full_name: fullName ?? phone, display_name: fullName ?? phone } },
    });
    if (err) throw err;
  };

  const verifyOtp = async (phone: string, token: string) => {
    setError(null);
    const client = await getClient();
    const { error: err, data } = await client.auth.verifyOtp({ phone, token, type: "sms" });
    if (err) throw err;
    if (data.session?.user) { setAuthenticated(true); await refreshProfile(); }
  };

  const saveProfile = async (payload: {
    fullName: string; displayName?: string; defaultSport?: string | null;
    city?: string | null; role?: "captain" | "player";
    upiId?: string | null; upiName?: string | null;
  }) => {
    const response = await apiRequest<{ profile: UserProfile }>("/api/auth", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setProfile(response.profile);
    return response.profile;
  };

  const signOut = async () => {
    try { const client = await getClient(); await client.auth.signOut(); } catch { /* ignore */ }
    reset();
  };

  return {
    profile,
    isAuthenticated,
    loading,
    timedOut,
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
