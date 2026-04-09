import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function getAuthUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return { user: null, role: null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();

  return { user, role: profile?.role ?? null, supabase };
}

/**
 * GET /api/announcements
 * ?active=true  — only currently active, non-expired (default for non-admins)
 * ?all=true     — admins see everything including inactive/expired
 */
export async function GET(request: NextRequest) {
  const { user, role, supabase } = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const wantAll = url.searchParams.get("all") === "true" && role === "admin";
  const loginOnly = url.searchParams.get("show_on_login") === "true";

  let query = supabase
    .from("announcements")
    .select("*, creator:profiles!announcements_created_by_fkey(id, full_name)")
    .order("created_at", { ascending: false });

  if (!wantAll) {
    const now = new Date().toISOString();
    query = query
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`expires_at.is.null,expires_at.gte.${now}`);
  }

  if (loginOnly) {
    query = query.eq("show_on_login", true);

    const { data: views } = await supabase
      .from("announcement_views")
      .select("announcement_id")
      .eq("user_id", user.id);

    const viewedIds = new Set((views ?? []).map((v: { announcement_id: string }) => v.announcement_id));

    const { data: allData, error: loginError } = await query;
    if (loginError) {
      console.error("GET /api/announcements failed:", loginError);
      return NextResponse.json({ error: loginError.message }, { status: 500 });
    }

    const unseen = (allData ?? []).filter(
      (a: Record<string, unknown>) => !viewedIds.has(a.id as string)
    );

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const enriched = unseen.map((a: Record<string, unknown>) => ({
      ...a,
      image_url:
        a.image_bucket && a.image_path && supabaseUrl
          ? `${supabaseUrl}/storage/v1/object/public/${a.image_bucket}/${a.image_path}`
          : null,
    }));

    return NextResponse.json(enriched);
  }

  const { data, error } = await query;
  if (error) {
    console.error("GET /api/announcements failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const enriched = (data ?? []).map((a: Record<string, unknown>) => ({
    ...a,
    image_url:
      a.image_bucket && a.image_path && supabaseUrl
        ? `${supabaseUrl}/storage/v1/object/public/${a.image_bucket}/${a.image_path}`
        : null,
  }));

  return NextResponse.json(enriched);
}

/**
 * POST /api/announcements
 * Admin-only. Accepts multipart/form-data with optional image file.
 */
export async function POST(request: NextRequest) {
  const { user, role, supabase } = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can create announcements" }, { status: 403 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const showOnLogin = formData.get("show_on_login") === "true";
  const startsAt = String(formData.get("starts_at") ?? "").trim() || null;
  const expiresAt = String(formData.get("expires_at") ?? "").trim() || null;
  const imageAltText = String(formData.get("image_alt_text") ?? "").trim() || null;
  const file = formData.get("image") as File | null;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  let imageBucket: string | null = null;
  let imagePath: string | null = null;

  if (file && file.size > 0) {
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
    }

    const safeName = file.name
      .normalize("NFD")
      .replace(/[^\w.\-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    imageBucket = "announcement-images";
    imagePath = `${Date.now()}_${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await supabase.storage
      .from(imageBucket)
      .upload(imagePath, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadErr) {
      console.error("Announcement image upload failed:", uploadErr);
      return NextResponse.json({ error: "Image upload failed: " + uploadErr.message }, { status: 500 });
    }
  }

  const { data: row, error: insertErr } = await supabase
    .from("announcements")
    .insert({
      title,
      content,
      show_on_login: showOnLogin,
      is_active: true,
      created_by: user.id,
      starts_at: startsAt,
      expires_at: expiresAt,
      image_bucket: imageBucket,
      image_path: imagePath,
      image_alt_text: imageAltText,
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("Announcement insert failed:", insertErr);
    if (imageBucket && imagePath) {
      await supabase.storage.from(imageBucket).remove([imagePath]);
    }
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: row?.id });
}

/**
 * DELETE /api/announcements   body: { id }
 * Admin-only.
 */
export async function DELETE(request: NextRequest) {
  const { user, role, supabase } = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can delete announcements" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 });
  }

  const { data: row } = await supabase
    .from("announcements")
    .select("image_bucket, image_path")
    .eq("id", id)
    .single();

  if (row?.image_bucket && row?.image_path) {
    await supabase.storage.from(row.image_bucket).remove([row.image_path]);
  }

  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * PATCH /api/announcements   body: { id, is_active }
 * Admin-only: toggle active state.
 */
export async function PATCH(request: NextRequest) {
  const { user, role, supabase } = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can update announcements" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = body.id;
  if (!id) {
    return NextResponse.json({ error: "Announcement ID is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (typeof body.show_on_login === "boolean") updates.show_on_login = body.show_on_login;

  const { error } = await supabase.from("announcements").update(updates).eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
