import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { attachSignedDownloadUrls } from "@/lib/documents-download-urls";
import { enrichDocumentsWithBranchLabels } from "@/lib/documents-branch-labels";
import { BRANCH_DOCUMENTS_BUCKET, branchDocumentStoragePath } from "@/lib/branch-documents";
import { notifyDocumentUploaded } from "@/lib/notifications";
import {
  assertBranchUploadMatchesProfile,
  canDeleteBranchDocument,
  canUploadBranchDocumentRole,
  documentVisibleToProfile,
  type ProfileSlice,
} from "@/lib/utils/branch-document-access";

export const dynamic = "force-dynamic";

async function getAuthProfile() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return { user: null, profile: null as ProfileSlice | null, supabase };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, branch, department")
    .eq("id", user.id)
    .single();

  const p: ProfileSlice = {
    role: profile?.role ?? null,
    branch: profile?.branch ?? null,
    department: profile?.department ?? null,
  };

  return { user, profile: p, supabase };
}

/**
 * GET /api/documents
 * ?user_id=<uuid> — admins only: that user's employee-scope documents
 * Otherwise: all documents visible to the caller (personal employee + branch-shared by access rules)
 */
export async function GET(request: NextRequest) {
  const { user, profile, supabase } = await getAuthProfile();
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const targetUserId = url.searchParams.get("user_id");

  if (targetUserId && targetUserId !== user.id) {
    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can view other users' documents" }, { status: 403 });
    }
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", targetUserId)
      .eq("scope", "employee")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("GET /api/documents failed:", error);
      return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
    }

    return NextResponse.json(await attachSignedDownloadUrls(supabase, data ?? []));
  }

  const { data: rows, error } = await supabase.from("documents").select("*").order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("GET /api/documents failed:", error);
    return NextResponse.json({ error: "Failed to fetch documents" }, { status: 500 });
  }

  const withLabels = await enrichDocumentsWithBranchLabels(supabase, rows ?? []);

  const slice = profile as ProfileSlice;
  const filtered = withLabels.filter((doc: Record<string, unknown>) =>
    documentVisibleToProfile(slice, doc as never, user.id)
  );

  return NextResponse.json(await attachSignedDownloadUrls(supabase, filtered));
}

/**
 * POST /api/documents
 * multipart: upload_kind=employee|branch
 *
 * Employee (admin): file, user_id, document_title, document_type, description?, expiry_date?
 * Branch (admin | branch_lead | sub_branch_lead): file, branch_id, sub_branch_id?, document_title, document_type, description?, expiry_date?
 */
export async function POST(request: NextRequest) {
  const { user, profile, supabase } = await getAuthProfile();
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const uploadKind = String(formData.get("upload_kind") ?? "employee").trim() as "employee" | "branch";

  if (uploadKind === "branch") {
    return postBranchDocument(formData, user.id, profile, supabase);
  }

  if (profile.role !== "admin") {
    return NextResponse.json({ error: "Only admins can upload employee documents" }, { status: 403 });
  }

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

  const safeName = file.name
    .normalize("NFD")
    .replace(/[^\w.\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  const storagePath = `${targetUserId}/${Date.now()}_${safeName}`;
  const bucket = "employee-documents";

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
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
      scope: "employee",
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

async function postBranchDocument(
  formData: FormData,
  uploaderId: string,
  profile: ProfileSlice,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  if (!canUploadBranchDocumentRole(profile.role)) {
    return NextResponse.json({ error: "You are not allowed to upload branch documents" }, { status: 403 });
  }

  const file = formData.get("file") as File | null;
  const branchId = String(formData.get("branch_id") ?? "").trim();
  const subBranchRaw = String(formData.get("sub_branch_id") ?? "").trim();
  const subBranchId = subBranchRaw.length > 0 ? subBranchRaw : null;
  const documentTitle = String(formData.get("document_title") ?? "").trim();
  const documentType = String(formData.get("document_type") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const expiryDate = String(formData.get("expiry_date") ?? "").trim() || null;

  if (!file) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }
  if (!branchId) {
    return NextResponse.json({ error: "Branch is required" }, { status: 400 });
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

  const [{ data: branchRows }, { data: subRows }] = await Promise.all([
    supabase.from("branches").select("id, name").order("name"),
    supabase.from("sub_branches").select("id, name").order("name"),
  ]);

  const branches = (branchRows ?? []) as { id: string; name: string }[];
  const subBranches = (subRows ?? []) as { id: string; name: string }[];

  const permErr = assertBranchUploadMatchesProfile(
    profile,
    branchId,
    subBranchId,
    branches,
    subBranches
  );
  if (permErr) {
    return NextResponse.json({ error: permErr }, { status: 403 });
  }

  const safeName = file.name
    .normalize("NFD")
    .replace(/[^\w.\-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  const storagePath = branchDocumentStoragePath(branchId, subBranchId, safeName);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage.from(BRANCH_DOCUMENTS_BUCKET).upload(storagePath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    console.error("Branch storage upload failed:", uploadError);
    return NextResponse.json({ error: "Failed to upload file: " + uploadError.message }, { status: 500 });
  }

  const { data: doc, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: uploaderId,
      scope: "branch",
      branch_id: branchId,
      sub_branch_id: subBranchId,
      document_title: documentTitle,
      document_type: documentType,
      description,
      expiry_date: expiryDate,
      storage_bucket: BRANCH_DOCUMENTS_BUCKET,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type || null,
      file_size: file.size,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("Branch document insert failed:", insertError);
    await supabase.storage.from(BRANCH_DOCUMENTS_BUCKET).remove([storagePath]);
    return NextResponse.json({ error: "Failed to save document: " + insertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: doc?.id });
}

export async function DELETE(request: NextRequest) {
  const { user, profile, supabase } = await getAuthProfile();
  if (!user || !profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const id = Number(body.id);
  if (!id) {
    return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
  }

  const { data: raw, error: fetchErr } = await supabase
    .from("documents")
    .select("storage_bucket, storage_path, scope, user_id, branch_id, sub_branch_id")
    .eq("id", id)
    .single();

  if (fetchErr || !raw) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const [enriched] = await enrichDocumentsWithBranchLabels(supabase, [raw as Record<string, unknown>]);
  const doc = enriched ?? raw;

  const scope = (doc as { scope?: string }).scope ?? "employee";

  if (scope === "employee") {
    if (profile.role !== "admin") {
      return NextResponse.json({ error: "Only admins can delete employee documents" }, { status: 403 });
    }
  } else {
    if (!canDeleteBranchDocument(profile, doc as never, user.id)) {
      return NextResponse.json({ error: "Not allowed to delete this document" }, { status: 403 });
    }
  }

  const bucket = (doc as { storage_bucket: string }).storage_bucket;
  const path = (doc as { storage_path: string }).storage_path;
  await supabase.storage.from(bucket).remove([path]);

  const { error: deleteErr } = await supabase.from("documents").delete().eq("id", id);
  if (deleteErr) {
    return NextResponse.json({ error: deleteErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
