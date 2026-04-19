import { cookies } from "next/headers";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getSupabasePublicEnv, getSupabaseServiceRoleKey } from "@/services/supabase/env";

type AuthenticatedContext = {
  accessToken: string | null;
  user: {
    id: string;
    phone?: string | null;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  };
};

export const getBearerToken = (request: Request) => {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
};

export const createAdminClient = () => {
  const { url } = getSupabasePublicEnv();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const createCookieServerClient = (): SupabaseClient => {
  const { url, publishableKey } = getSupabasePublicEnv();
  const cookieStore = cookies();

  return createSupabaseServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server components cannot mutate cookies. Middleware handles refresh persistence.
        }
      },
    },
  });
};

const createAccessTokenServerClient = (accessToken: string): SupabaseClient => {
  const { url, publishableKey } = getSupabasePublicEnv();

  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
};

export const createServerClient = (accessToken?: string) =>
  accessToken ? createAccessTokenServerClient(accessToken) : createCookieServerClient();

export const requireAuthenticatedUser = async (request: Request): Promise<AuthenticatedContext> => {
  const accessToken = getBearerToken(request);
  const client = createServerClient(accessToken ?? undefined);

  const { data, error } = accessToken
    ? await client.auth.getUser(accessToken)
    : await client.auth.getUser();

  if (error || !data.user) {
    throw new Error("Authentication failed.");
  }

  return { accessToken, user: data.user };
};

const expectBooleanRpc = async (
  resultPromise: PromiseLike<{ data: boolean | null; error: { message: string } | null }>,
  fallbackMessage: string,
) => {
  const { data, error } = await resultPromise;

  if (error) {
    throw new Error(error.message || fallbackMessage);
  }

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

  if (!isCaptain) {
    throw new Error("Captain access required.");
  }
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

  if (!isMember) {
    throw new Error("Team membership required.");
  }
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

  if (!isActor) {
    throw new Error("Match access required.");
  }
};
