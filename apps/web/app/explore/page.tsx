import { redirect } from "next/navigation";

/**
 * /explore — guest entry point linked from the landing page CTA.
 * Redirects to /dashboard which is the public-facing home.
 */
export default function ExplorePage() {
  redirect("/dashboard");
}
