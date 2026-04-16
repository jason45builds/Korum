"use client";

import { parseJsonResponse } from "@/lib/helpers";
import { getSupabaseBrowserClient } from "@/services/supabase/client";

export const apiRequest = async <T>(path: string, init: RequestInit = {}) => {
  const client = getSupabaseBrowserClient();
  const {
    data: { session },
  } = await client.auth.getSession();

  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
  });

  return parseJsonResponse<T>(response);
};
