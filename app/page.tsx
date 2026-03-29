import { redirect } from "next/navigation"

/**
 * Landing `/` — middleware sends authenticated users to /dashboard first.
 * Everyone else: send straight to login (single entry for sign-in per spec).
 */
export default function HomePage() {
  redirect("/login")
}
