import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { assertPublicEnv, env } from "@korum/config/env";

let browserClient: SupabaseClient | null = null;

export const getSupabaseBrowserClient = () => {
  if (browserClient) {
    return browserClient;
  }

  assertPublicEnv();

  browserClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
};
