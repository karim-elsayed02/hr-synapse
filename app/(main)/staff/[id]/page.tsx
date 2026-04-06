import { redirect } from "next/navigation";

export default function StaffProfileRedirectPage({ params }: { params: { id: string } }) {
  redirect(`/profile/${params.id}`);
}
