import type { Match } from "@korum/types/match";

import { formatDateTime } from "@korum/utils/date";

export const getPaymentDeadlineText = (match: Pick<Match, "paymentDueAt">) =>
  match.paymentDueAt ? `Pay by ${formatDateTime(match.paymentDueAt)}` : "No payment deadline set";

export const getLockDeadlineText = (match: Pick<Match, "lockAt">) =>
  match.lockAt ? `Captain locks the squad at ${formatDateTime(match.lockAt)}` : "Captain has not scheduled the lock time yet";

export const isDeadlinePassed = (value?: string | null) =>
  Boolean(value && new Date(value).getTime() <= Date.now());
