const getMissingLabel = (value: string | undefined) => (value ? "present" : "MISSING");

export const getSupabasePublicEnv = () => {
  // Use NEXT_PUBLIC_SUPABASE_ANON_KEY only — this is the standard name
  // that must be set in Vercel environment variables.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      `Missing Supabase environment variables. ` +
      `URL: ${getMissingLabel(url)}, ANON_KEY: ${getMissingLabel(publishableKey)}`,
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
