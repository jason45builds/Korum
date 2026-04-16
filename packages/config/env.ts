type AppEnv = {
  appUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  razorpayWebhookSecret: string;
};

const read = (value: string | undefined, fallback = "") => value?.trim() ?? fallback;

export const env: AppEnv = {
  appUrl: read(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"),
  supabaseUrl: read(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: read(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: read(process.env.SUPABASE_SERVICE_ROLE_KEY),
  razorpayKeyId: read(process.env.RAZORPAY_KEY_ID),
  razorpayKeySecret: read(process.env.RAZORPAY_KEY_SECRET),
  razorpayWebhookSecret: read(process.env.RAZORPAY_WEBHOOK_SECRET),
};

export const assertPublicEnv = () => {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error("Missing Supabase public environment variables.");
  }
};

export const assertServerEnv = (keys: Array<keyof AppEnv>) => {
  const missing = keys.filter((key) => !env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
};
