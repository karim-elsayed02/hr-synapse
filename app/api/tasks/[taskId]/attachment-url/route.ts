import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { TASK_ATTACHMENTS_BUCKET } from "@/lib/task-attachments";

export const dynamic = "force-dynamic";

/**
 * Returns a time-limited signed URL for the task attachment.
 * Avoids GET 400 on `/object/public/...` when the bucket is private or misconfigured.
 */
export async function GET(_request: Request, context: { params: { taskId: string } }) {
  const taskId = context.params.taskId?.trim();
  if (!taskId) {
    return NextResponse.json({ error: "Missing task id" }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* ignore */
          }
        },
      },
    },
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("attachment_path")
    .eq("id", taskId)
    .maybeSingle();

  if (taskErr || !task?.attachment_path?.trim()) {
    return NextResponse.json({ error: "No attachment for this task" }, { status: 404 });
  }

  const path = task.attachment_path.trim();
  const expiresIn = 3600;

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signed, error: signErr } = await admin.storage
      .from(TASK_ATTACHMENTS_BUCKET)
      .createSignedUrl(path, expiresIn);

    if (!signErr && signed?.signedUrl) {
      return NextResponse.json({ url: signed.signedUrl, expiresIn });
    }
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from(TASK_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (signErr || !signed?.signedUrl) {
    console.error("[attachment-url] createSignedUrl:", signErr);
    return NextResponse.json(
      {
        error:
          signErr?.message ||
          "Could not create download link. Add SUPABASE_SERVICE_ROLE_KEY to the server env or allow storage access for authenticated users.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: signed.signedUrl, expiresIn });
}
