"use client";

import { useEffect, useMemo, useState } from "react";

import { getSupabaseBrowserClient } from "@/services/supabase/client";

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
    if (!matchId) {
      return undefined;
    }

    const supabase = getSupabaseBrowserClient();
    const channel = supabase
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
      void supabase.removeChannel(channel);
      setConnected(false);
    };
  }, [channelName, matchId, onChange]);

  return { connected };
};
