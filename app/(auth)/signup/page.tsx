import { redirect } from "next/navigation";

/** Self-service signup disabled — use server redirect so the signup form is never shipped. */
export default function SignupPage() {
  redirect("/login?signup=closed");
}
