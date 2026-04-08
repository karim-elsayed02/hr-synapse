"use server";

import { createClient } from "@/lib/supabase/server";

export async function getAnnouncementsAction() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`expires_at.is.null,expires_at.gte.${now}`)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
