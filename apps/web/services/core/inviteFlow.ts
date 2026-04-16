import type { MatchInvite } from "@korum/types/invite";

import { DEFAULT_INVITE_EXPIRY_HOURS } from "@/lib/constants";

export const createInviteExpiry = (hours = DEFAULT_INVITE_EXPIRY_HOURS) =>
  new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

export const isInviteExpired = (invite: Pick<MatchInvite, "expiresAt" | "status">) =>
  invite.status === "EXPIRED" || new Date(invite.expiresAt).getTime() <= Date.now();

export const getInviteStatusCopy = (status: MatchInvite["status"]) => {
  switch (status) {
    case "PENDING":
      return "Waiting for the player to respond.";
    case "ACCEPTED":
      return "Invite accepted. Payment is the next step.";
    case "EXPIRED":
      return "Invite expired and the slot reopened.";
    case "REVOKED":
      return "Invite was revoked by the captain.";
    default:
      return "Unknown invite status.";
  }
};
