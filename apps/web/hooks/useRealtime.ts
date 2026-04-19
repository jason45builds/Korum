"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

type UseRealtimeOptions = {
  matchId?: string | null;
  onChange?: () => void;
};

export const useRealtime = ({ matchId, onChange }: UseRealtimeOptions) => {
  const [connected, setConnected] = useState(false);
  const channelName = useMemo(
    () => (matchId ? `korum-match-${matchId}` : `korum-global-${Date.now()}`),
    [matchId],
  );

  useEffect(() => {
    if (!matchId) return;

    let supabase: SupabaseClient | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require("@/services/supabase/client") as { getSupabaseBrowserClient: () => SupabaseClient };
      supabase = mod.getSupabaseBrowserClient();
    } catch {
      // Env vars missing — realtime disabled, not a fatal error
      return;
    }

    if (!supabase) return;

    const client = supabase;
    const channel = client
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        () => onChange?.(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_participants",
          filter: `match_id=eq.${matchId}`,
        },
        () => onChange?.(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `match_id=eq.${matchId}`,
        },
        () => onChange?.(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "match_invites",
          filter: `match_id=eq.${matchId}`,
        },
        () => onChange?.(),
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      void client.removeChannel(channel);
      setConnected(false);
    };
  }, [channelName, matchId, onChange]);

  return { connected };
};
