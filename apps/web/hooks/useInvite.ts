"use client";

import { useState } from "react";

import { toErrorMessage } from "@/lib/helpers";
import { acceptInvite, expireInvites, sendInvite } from "@/services/api/invite";

export const useInvite = (matchId?: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async <T>(task: () => Promise<T>) => {
    setLoading(true);
    setError(null);

    try {
      return await task();
    } catch (currentError) {
      const message = toErrorMessage(currentError);
      setError(message);
      throw currentError;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    sendInvite: (payload: { invitedPhone: string; invitedName?: string | null; expiresAt?: string | null }) =>
      execute(() =>
        sendInvite({
          matchId: matchId ?? "",
          invitedPhone: payload.invitedPhone,
          invitedName: payload.invitedName,
          expiresAt: payload.expiresAt,
        }),
      ),
    acceptInvite: (token: string) => execute(() => acceptInvite(token)),
    expireInvites: () => execute(() => expireInvites(matchId)),
  };
};
