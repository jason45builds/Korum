export const cn = (...values: Array<string | false | null | undefined>) =>
  values.filter(Boolean).join(" ");

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something went wrong.";
};

export const getInitials = (value: string) =>
  value
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const buildMatchJoinLink = (matchId: string, joinCode?: string) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://korum.vercel.app";
  const url = new URL("/match/join", appUrl);
  url.searchParams.set("matchId", matchId);
  if (joinCode) url.searchParams.set("joinCode", joinCode);
  return url.toString();
};

export const buildInviteLink = (token: string, matchId?: string) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://korum.vercel.app";
  const url = new URL("/match/join", appUrl);
  url.searchParams.set("invite", token);
  if (matchId) url.searchParams.set("matchId", matchId);
  return url.toString();
};

export const createReceiptId = (matchId: string, userId: string) =>
  `korum-${matchId.slice(0, 8)}-${userId.slice(0, 8)}-${Date.now()}`;

export const toPaisa = (amount: number) => Math.round(amount * 100);

export const parseJsonResponse = async <T>(response: Response): Promise<T> => {
  const payload = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw new Error(payload.error ?? "Request failed.");
  return payload;
};

export const copyToClipboard = async (value: string) => {
  if (typeof navigator === "undefined" || !navigator.clipboard) return false;
  await navigator.clipboard.writeText(value);
  return true;
};

export const getSearchParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;
