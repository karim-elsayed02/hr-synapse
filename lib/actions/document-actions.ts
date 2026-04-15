"use server";

import { attachSignedDownloadUrls } from "@/lib/documents-download-urls";
import { createClient } from "@/lib/supabase/server";

export async function getDocumentsAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: documents, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Failed to fetch documents");

  return attachSignedDownloadUrls(supabase, (documents ?? []) as Record<string, unknown>[]);
}
