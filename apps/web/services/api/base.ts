"use client";

import { parseJsonResponse } from "@/lib/helpers";
import { getSupabaseBrowserClient } from "@/services/supabase/client";

export const apiRequest = async <T>(path: string, init: RequestInit = {}) => {
  let accessToken: string | null = null;

  try {
    const client = getSupabaseBrowserClient();
    const { data: { session } } = await client.auth.getSession();
    accessToken = session?.access_token ?? null;
  } catch {
    // Supabase not initialised — proceed unauthenticated
  }

  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  return parseJsonResponse<T>(response);
};
