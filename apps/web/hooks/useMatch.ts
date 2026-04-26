"use client";

/* eslint-disable react-hooks/exhaustive-deps */

import { useCallback, useEffect, useRef, useState } from "react";

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
import { useMatchStore } from "@/store/matchStore";

// Local loading per-hook instance to avoid global loading bleed
const useLocalLoading = () => {
  const [loading, setLoading] = useState(false);
  return { loading, setLoading };
};

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
  const { loading: localLoading, setLoading: setLocalLoading } = useLocalLoading();
  const fetchedRef = useRef<string | null>(null);

  const {
    activeMatch,
    dashboardMatches,
    loading: globalLoading,
    error,
    setActiveMatch,
    setDashboardMatches,
    setError,
    setLoading,
  } = useMatchStore();

  const loadMatch = useCallback(async (params: { matchId?: string; joinCode?: string }) => {
    setLocalLoading(true);
    try {
      const response = await getMatchDetail(params);
      setActiveMatch(response.match);
      setError(null);
      return response.match;
    } catch (currentError) {
      setError(toErrorMessage(currentError));
      throw currentError;
    } finally {
      setLocalLoading(false);
    }
  }, [setActiveMatch, setError, setLocalLoading]);

  const loadDashboard = useCallback(async () => {
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
  }, [setDashboardMatches, setError, setLoading]);

  const loadTeamMatches = useCallback(async (teamId: string) => {
    const response = await getTeamMatches(teamId);
    return response.matches;
  }, []);

  // Load match detail only once per matchId — no realtime loop
  useEffect(() => {
    if (!matchId) return;
    if (fetchedRef.current === matchId) return; // already fetched
    fetchedRef.current = matchId;
    void loadMatch({ matchId }).catch(() => undefined);
  }, [matchId]);

  // loading = local for match detail, global for dashboard
  const loading = matchId ? localLoading : globalLoading;

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
