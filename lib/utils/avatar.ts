/**
 * Resolves an avatar_path (from the `profiles` table) to a public URL
 * served from the Supabase `avatars` storage bucket.
 *
 * Returns `null` when no path is stored.
 */
export function getAvatarUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/avatars/${avatarPath}`;
}
