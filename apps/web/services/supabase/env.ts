const getMissingLabel = (value: string | undefined) => (value ? "present" : "MISSING");

export const getSupabasePublicEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      `Missing Supabase public environment variables.\n` +
      `NEXT_PUBLIC_SUPABASE_URL: ${getMissingLabel(url)}\n` +
      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY: ${getMissingLabel(publishableKey)}`,
    );
  }

  return { url, publishableKey };
};

export const getSupabaseServiceRoleKey = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return serviceRoleKey;
};
