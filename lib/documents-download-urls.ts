import type { SupabaseClient } from "@supabase/supabase-js";

const SIGNED_URL_TTL_SEC = 60 * 60; // 1 hour; refresh page to renew

/**
 * `/storage/v1/object/public/...` only works for buckets marked **Public** in the Storage UI.
 * Private buckets return 400 on that URL even when upload succeeds. After access is enforced
 * in the API (document list), use signed URLs so private buckets work.
 */
export async function attachSignedDownloadUrls(
  supabase: SupabaseClient,
  docs: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  return Promise.all(
    docs.map(async (doc) => {
      const bucket = doc.storage_bucket;
      const path = doc.storage_path;
      if (typeof bucket !== "string" || typeof path !== "string" || !bucket || !path) {
        return { ...doc, download_url: null };
      }
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, SIGNED_URL_TTL_SEC);
      if (error || !data?.signedUrl) {
        console.error("createSignedUrl failed:", error?.message, bucket, path);
        return { ...doc, download_url: null };
      }
      return { ...doc, download_url: data.signedUrl };
    })
  );
}
