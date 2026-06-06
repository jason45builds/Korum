import { redirect } from "next/navigation";

/**
 * /join — bare route linked from various menu items and the 404 recovery CTA.
 * The actual join-match logic lives at /match/join (with optional ?joinCode= params).
 */
export default function JoinRedirectPage() {
  redirect("/match/join");
}
