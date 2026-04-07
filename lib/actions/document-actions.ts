"use server";

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return (documents ?? []).map((doc: Record<string, unknown>) => ({
    ...doc,
    download_url: supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/${doc.storage_bucket}/${doc.storage_path}`
      : null,
  }));
}
