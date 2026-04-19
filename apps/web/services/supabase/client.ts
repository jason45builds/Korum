"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv } from "@/services/supabase/env";

let browserClient: SupabaseClient | null = null;

export const getSupabaseBrowserClient = (): SupabaseClient => {
  if (browserClient) return browserClient;

  const { url, publishableKey } = getSupabasePublicEnv();

  browserClient = createBrowserClient(url, publishableKey, {
    isSingleton: true,
  });

  return browserClient;
};
