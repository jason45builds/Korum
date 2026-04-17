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

    // Hard timeout — never get stuck loading
    const timeout = setTimeout(() => setLoading(false), 5000);

    const run = async () => {
      try {
        const client = getSupabaseBrowserClient();
        const { data: { session } } = await client.auth.getSession();
        setSession(session?.access_token ?? null);
        if (session?.access_token) {
          try { await refreshProfile(); } catch (err) { setError(toErrorMessage(err)); }
        }
      } catch (err) {
        console.error("[Korum] Auth init failed:", toErrorMessage(err));
        setSession(null);
      } finally {
        clearTimeout(timeout);
        setLoading(false);
      }
    };

    void run();

    let unsubscribe: (() => void) | null = null;
    try {
      const client = getSupabaseBrowserClient();
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        setSession(session?.access_token ?? null);
        if (!session?.access_token) { reset(); return; }
        void refreshProfile().catch((err) => setError(toErrorMessage(err)));
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch { /* ignore */ }

    return () => { clearTimeout(timeout); unsubscribe?.(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Email/Password ──────────────────────────────────────────────────
  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    const client = getSupabaseBrowserClient();
    const { error: err, data } = await client.auth.signInWithPassword({ email, password });
    if (err) throw err;
    setSession(data.session?.access_token ?? null);
    if (data.session?.access_token) await refreshProfile();
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
    // If email confirmation is off, session is returned immediately
    if (data.session?.access_token) {
      setSession(data.session.access_token);
      await refreshProfile();
    }
  };

  // ── Phone OTP ───────────────────────────────────────────────────────
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
    setSession(data.session?.access_token ?? null);
    if (data.session?.access_token) await refreshProfile();
  };

  // ── Profile ─────────────────────────────────────────────────────────
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
    try { const client = getSupabaseBrowserClient(); await client.auth.signOut(); } catch { /* ignore */ }
    reset();
  };

  return {
    accessToken,
    profile,
    loading,
    error,
    isAuthenticated: Boolean(accessToken),
    refreshProfile,
    signInWithEmail,
    signUpWithEmail,
    signInWithOtp,
    verifyOtp,
    saveProfile,
    signOut,
  };
};
