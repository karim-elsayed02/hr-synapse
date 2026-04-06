import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

type ActivityItem = {
  id: string;
  type: "request" | "task" | "document";
  title: string;
  user: string;
  timestamp: string;
  status?: string;
};

export async function GET() {
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
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            /* ignore when called from static context */
          }
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const [
    profilesCountRes,
    tasksOpenRes,
    tasksInProgressRes,
    tasksCompletedRes,
    recentRequestsRes,
    recentTasksRes,
    recentDocsRes,
    branchTasksRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("status", ["claimed", "in_progress"]),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .in("status", ["completed", "approved"]),
    supabase
      .from("requests")
      .select("id, title, status, created_at, profile_id")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, title, status, created_at, created_by")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("documents")
      .select("id, title, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tasks")
      .select("id, status, branch:branches(id, name)"),
  ]);

  const totalStaff = profilesCountRes.error ? 0 : profilesCountRes.count ?? 0;
  const tasksOpen = tasksOpenRes.error ? 0 : tasksOpenRes.count ?? 0;
  const tasksInProgress = tasksInProgressRes.error ? 0 : tasksInProgressRes.count ?? 0;
  const tasksCompleted = tasksCompletedRes.error ? 0 : tasksCompletedRes.count ?? 0;

  if (profilesCountRes.error) {
    console.warn("[dashboard] profiles count:", profilesCountRes.error.message);
  }
  if (tasksOpenRes.error) console.warn("[dashboard] tasks open count:", tasksOpenRes.error.message);
  if (tasksInProgressRes.error) {
    console.warn("[dashboard] tasks in progress count:", tasksInProgressRes.error.message);
  }
  if (tasksCompletedRes.error) {
    console.warn("[dashboard] tasks completed count:", tasksCompletedRes.error.message);
  }

  const requestsData = recentRequestsRes.error ? [] : recentRequestsRes.data ?? [];
  const tasksData = recentTasksRes.error ? [] : recentTasksRes.data ?? [];
  const documentsData = recentDocsRes.error ? [] : recentDocsRes.data ?? [];

  if (recentRequestsRes.error) {
    console.warn("[dashboard] recent requests:", recentRequestsRes.error.message);
  }
  if (recentTasksRes.error) console.warn("[dashboard] recent tasks:", recentTasksRes.error.message);
  if (recentDocsRes.error) console.warn("[dashboard] recent documents:", recentDocsRes.error.message);

  const userIds = new Set<string>();
  for (const row of requestsData) {
    if (row.profile_id) userIds.add(row.profile_id);
  }
  for (const row of tasksData) {
    if (row.created_by) userIds.add(row.created_by);
  }
  for (const row of documentsData) {
    if (row.user_id) userIds.add(row.user_id);
  }

  const profileMap = new Map<string, string>();
  if (userIds.size > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", Array.from(userIds));

    if (!profileError && profileRows) {
      for (const row of profileRows) {
        profileMap.set(row.id, row.full_name || row.email || "Unknown user");
      }
    }
  }

  const requestActivities: ActivityItem[] = requestsData.map((item) => ({
    id: item.id,
    type: "request",
    title: item.title ?? "Untitled request",
    user: profileMap.get(item.profile_id) || "Unknown user",
    timestamp: item.created_at,
    status: item.status ?? undefined,
  }));

  const taskActivities: ActivityItem[] = tasksData.map((item) => ({
    id: item.id,
    type: "task",
    title: item.title ?? "Untitled task",
    user: profileMap.get(item.created_by) || "Unknown user",
    timestamp: item.created_at,
    status: item.status ?? undefined,
  }));

  const documentActivities: ActivityItem[] = documentsData.map((item) => ({
    id: item.id,
    type: "document",
    title: item.title ?? "Untitled document",
    user: profileMap.get(item.user_id) || "Unknown user",
    timestamp: item.created_at,
  }));

  const activities = [...requestActivities, ...taskActivities, ...documentActivities]
    .filter((item) => item.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 6);

  const branchTasks = branchTasksRes.error ? [] : (branchTasksRes.data ?? []) as {
    id: string;
    status: string;
    branch: { id: string; name: string } | { id: string; name: string }[] | null;
  }[];

  const branchCompletedMap = new Map<string, number>();
  for (const t of branchTasks) {
    if (t.status !== "completed" && t.status !== "approved") continue;
    const branchRel = Array.isArray(t.branch) ? t.branch[0] : t.branch;
    const branchName = branchRel?.name ?? "Unassigned";
    branchCompletedMap.set(branchName, (branchCompletedMap.get(branchName) ?? 0) + 1);
  }

  const tasksByBranch = Array.from(branchCompletedMap.entries())
    .map(([branch, completed]) => ({ branch, completed }))
    .sort((a, b) => b.completed - a.completed);

  return NextResponse.json({
    stats: {
      totalStaff,
      tasksOpen,
      tasksInProgress,
      tasksCompleted,
    },
    activities,
    tasksByBranch,
  });
}
