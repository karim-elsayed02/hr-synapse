import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function getExtension(mimeType: string) {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return map[mimeType] || "jpg";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WEBP, and GIF images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size must be less than 5 MB" },
        { status: 400 }
      );
    }

    const ext = getExtension(file.type);
    const avatarPath = `${user.id}/avatar.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(avatarPath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Supabase storage upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_path: avatarPath, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      console.error("Profile avatar_path update error:", updateError);
      return NextResponse.json({ error: "Upload succeeded but profile update failed" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      avatar_path: avatarPath,
    });
  } catch (error) {
    console.error("Profile picture upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
