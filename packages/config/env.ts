// NOTE: For Next.js to inline NEXT_PUBLIC_* vars at build time, they must be
// referenced directly as process.env.NEXT_PUBLIC_* literals in the app code.
// This file handles server-only env vars and app URL only.

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || "",
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || "",
};

export const assertServerEnv = (keys: Array<keyof typeof env>) => {
  const missing = keys.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
};

// Keep assertPublicEnv as a no-op since Supabase clients now validate inline
export const assertPublicEnv = () => {};
