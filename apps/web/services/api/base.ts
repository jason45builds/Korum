"use client";

import { parseJsonResponse } from "@/lib/helpers";

export const apiRequest = async <T>(path: string, init: RequestInit = {}) => {
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...init,
    headers,
    cache: "no-store",
    credentials: "same-origin",
  });

  return parseJsonResponse<T>(response);
};
