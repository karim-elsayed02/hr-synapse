import { redirect } from "next/navigation";

export default function NewAnnouncementRedirect() {
  redirect("/announcements");
}
