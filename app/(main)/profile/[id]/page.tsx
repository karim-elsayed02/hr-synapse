import { ProfilePageClient } from "@/components/profile/profile-page-client";

export default function ProfileByIdPage({ params }: { params: { id: string } }) {
  return <ProfilePageClient profileId={params.id} />;
}
