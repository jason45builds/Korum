import { createClient } from "@supabase/supabase-js";

type AuthenticatedContext = {
  accessToken: string;
  user: {
    id: string;
    phone?: string | null;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  };
};

export const getBearerToken = (request: Request) => {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim();
};

export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      `Missing server environment variables.\n` +
      `NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? "✓" : "✗ MISSING"}\n` +
      `SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? "✓" : "✗ MISSING"}`
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export const createServerClient = (accessToken?: string) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
};

export const requireAuthenticatedUser = async (request: Request): Promise<AuthenticatedContext> => {
  const accessToken = getBearerToken(request);
  if (!accessToken) throw new Error("Missing access token.");

  const client = createServerClient(accessToken);
  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user) throw new Error("Authentication failed.");

  return { accessToken, user: data.user };
};

const expectBooleanRpc = async (
  resultPromise: PromiseLike<{ data: boolean | null; error: { message: string } | null }>,
  fallbackMessage: string,
) => {
  const { data, error } = await resultPromise;
  if (error) throw new Error(error.message || fallbackMessage);
  return Boolean(data);
};

export const assertTeamCaptain = async (
  admin: ReturnType<typeof createAdminClient>,
  teamId: string,
  userId: string,
) => {
  const isCaptain = await expectBooleanRpc(
    admin.rpc("is_team_captain", { p_team_id: teamId, p_user_id: userId }),
    "Could not verify captain access.",
  );
  if (!isCaptain) throw new Error("Captain access required.");
};

export const assertTeamMember = async (
  admin: ReturnType<typeof createAdminClient>,
  teamId: string,
  userId: string,
) => {
  const isMember = await expectBooleanRpc(
    admin.rpc("is_team_member", { p_team_id: teamId, p_user_id: userId }),
    "Could not verify team membership.",
  );
  if (!isMember) throw new Error("Team membership required.");
};

export const assertMatchActor = async (
  admin: ReturnType<typeof createAdminClient>,
  matchId: string,
  userId: string,
) => {
  const isActor = await expectBooleanRpc(
    admin.rpc("is_match_actor", { p_match_id: matchId, p_user_id: userId }),
    "Could not verify match access.",
  );
  if (!isActor) throw new Error("Match access required.");
};
