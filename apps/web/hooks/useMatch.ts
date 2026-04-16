"use client";

import { useEffect, useState } from "react";

import { toErrorMessage } from "@/lib/helpers";
import {
  createMatch,
  getDashboardMatches,
  getMatchDetail,
  getTeamMatches,
  joinMatch,
  lockMatch,
  updateMatch,
  type CreateMatchInput,
} from "@/services/api/match";
import { useRealtime } from "@/hooks/useRealtime";
import { useMatchStore } from "@/store/matchStore";

export const useMatch = (matchId?: string | null) => {
  const [pendingPayments, setPendingPayments] = useState<
    Array<{
      id: string;
      matchId: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: string;
    }>
  >([]);

  const {
    activeMatch,
    dashboardMatches,
    loading,
    error,
    setActiveMatch,
    setDashboardMatches,
    setError,
    setLoading,
  } = useMatchStore();

  const loadMatch = async (params: { matchId?: string; joinCode?: string }) => {
    setLoading(true);

    try {
      const response = await getMatchDetail(params);
      setActiveMatch(response.match);
      setError(null);
      return response.match;
    } catch (currentError) {
      setError(toErrorMessage(currentError));
      throw currentError;
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const response = await getDashboardMatches();
      setDashboardMatches(response.matches);
      setPendingPayments(response.pendingPayments);
      setError(null);
      return response;
    } catch (currentError) {
      setError(toErrorMessage(currentError));
      throw currentError;
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMatches = async (teamId: string) => {
    const response = await getTeamMatches(teamId);
    return response.matches;
  };

  useRealtime({
    matchId,
    onChange: () => {
      if (matchId) {
        void loadMatch({ matchId });
      }
    },
  });

  useEffect(() => {
    if (matchId) {
      void loadMatch({ matchId }).catch(() => undefined);
    }
  }, [matchId]);

  return {
    activeMatch,
    dashboardMatches,
    pendingPayments,
    loading,
    error,
    loadMatch,
    loadDashboard,
    loadTeamMatches,
    createMatch: (payload: CreateMatchInput) => createMatch(payload),
    joinMatch,
    updateMatch,
    lockMatch,
  };
};
