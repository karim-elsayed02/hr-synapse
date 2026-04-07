import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyDocumentUploaded } from "@/lib/notifications";

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
 * GET /api/documents
 * ?user_id=<uuid>  — admins can fetch any user's docs
 * Without user_id  — returns the caller's own documents
 */
export async function GET(request: NextRequest) {
  const { user, role, supabase } = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const targetUserId = url.searchParams.get("user_id");

  let query = supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (targetUserId && targetUserId !== user.id) {
    if (role !== "admin") {
      return NextResponse.json({ error: "Only admins can view other users' documents" }, { status: 403 });
    }
    query = query.eq("user_id", targetUserId);
  } else {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;
  if (error) {
    console.error("GET /api/documents failed:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const enriched = (data ?? []).map((doc: Record<string, unknown>) => ({
    ...doc,
    download_url: supabaseUrl
      ? `${supabaseUrl}/storage/v1/object/public/${doc.storage_bucket}/${doc.storage_path}`
      : null,
  }));

  return NextResponse.json(enriched);
}

/**
 * POST /api/documents
 * Admin-only: upload a file to employee-documents bucket and insert metadata.
 * Expects multipart/form-data with: file, user_id, document_title, document_type, description?, expiry_date?
 */
export async function POST(request: NextRequest) {
  const { user, role, supabase } = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can upload documents" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const targetUserId = String(formData.get("user_id") ?? "").trim();
  const documentTitle = String(formData.get("document_title") ?? "").trim();
  const documentType = String(formData.get("document_type") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const expiryDate = String(formData.get("expiry_date") ?? "").trim() || null;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (!targetUserId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }
  if (!documentTitle) {
    return NextResponse.json({ error: "Document title is required" }, { status: 400 });
  }
  if (!documentType) {
    return NextResponse.json({ error: "Document type is required" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 10 MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeName = file.name
    .normalize("NFD")
    .replace(/[^\w.\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const storagePath = `${targetUserId}/${Date.now()}_${safeName}`;
  const bucket = "employee-documents";

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload failed:", uploadError);
    return NextResponse.json({ error: "Failed to upload file: " + uploadError.message }, { status: 500 });
  }

  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: targetUserId,
      document_title: documentTitle,
      document_type: documentType,
      description,
      expiry_date: expiryDate,
      storage_bucket: bucket,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Document insert failed:", insertError);
    await supabase.storage.from(bucket).remove([storagePath]);
    return NextResponse.json({ error: "Failed to save document record: " + insertError.message }, { status: 500 });
  }

  if (targetUserId !== user.id) {
    await notifyDocumentUploaded(supabase, {
      targetUserId,
      documentId: String(doc?.id),
      documentTitle,
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, id: doc?.id });
}

/**
 * DELETE /api/documents
 * Admin-only: delete a document and its storage file.
 */
export async function DELETE(request: NextRequest) {
  const { user, role, supabase } = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (role !== "admin") {
    return NextResponse.json({ error: "Only admins can delete documents" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
  }

  const { data: doc, error: fetchErr } = await supabase
    .from("documents")
    .select("storage_bucket, storage_path")
    .eq("id", id)
    .single();

  if (fetchErr || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await supabase.storage.from(doc.storage_bucket).remove([doc.storage_path]);

  const { error: deleteErr } = await supabase.from("documents").delete().eq("id", id);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
