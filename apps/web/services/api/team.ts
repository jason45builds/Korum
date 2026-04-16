import type { TeamDetails } from "@korum/types/team";

import { apiRequest } from "@/services/api/base";

type TeamResponse = { team: TeamDetails };
type TeamsResponse = { teams: TeamDetails[] };

export const createTeam = (payload: { name: string; sport: string; city: string }) =>
  apiRequest<TeamResponse>("/api/team/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const joinTeam = (payload: { teamId?: string; inviteCode?: string }) =>
  apiRequest<TeamResponse>("/api/team/join", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getTeamDetails = (teamId: string) =>
  apiRequest<TeamResponse>(`/api/team/members?teamId=${teamId}`);

export const getMyTeams = () =>
  apiRequest<TeamsResponse>("/api/team/members?scope=mine");
