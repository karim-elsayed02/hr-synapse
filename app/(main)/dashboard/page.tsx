"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Sparkles, Activity } from "lucide-react";

type ActivityItem = {
  id: string;
  type: "request" | "task" | "announcement" | "safeguarding" | "document";
  title: string;
  user: string;
  timestamp: string;
  status?: string;
};

type DashboardData = {
  stats: {
    totalStaff: number;
    tasksOpen: number;
    tasksInProgress: number;
    tasksCompleted: number;
  };
  activities: ActivityItem[];
};

async function safeCount(
  supabase: ReturnType<typeof createClient>,
  table: string,
  filter?: (query: any) => any
): Promise<number> {
  try {
    let query = supabase.from(table).select("*", { count: "estimated", head: true });

    if (filter) {
      query = filter(query);
    }

    const { count, error } = await query;

    if (error) {
      console.error(`Count failed for ${table}:`, error);
      return 0;
    }

    return count ?? 0;
  } catch (error) {
    console.error(`Count crashed for ${table}:`, error);
    return 0;
  }
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    stats: {
      totalStaff: 0,
      tasksOpen: 0,
      tasksInProgress: 0,
      tasksCompleted: 0,
    },
    activities: [],
  });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboardData() {
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);

      
        const DASHBOARD_FETCH_MS = 25000;

        const loadCore = async () => {
          const userIds = new Set<string>();
          const profileMap = new Map<string, string>();
          const requestsData = await fetch('/api/requests/my-requests');
          const requests = await requestsData.json();
          const tasksData = await fetch('/api/tasks/my-tasks');
          const tasks = await tasksData.json();
          const documentsData = await fetch('/api/documents/my-documents');
          const documents = await documentsData.json();
          const name = await fetch ('/api/profile/name');
          const nameData = await name.json();
          setDashboardData({
            stats: {
              totalStaff: nameData.length,
              tasksOpen: tasks.length,
              tasksInProgress: tasks.length,
              tasksCompleted: tasks.length,
            },
            activities: requests.map((request: any) => ({
              id: request.id,
              type: 'request',
              title: request.title,
            })),
          });

         
        };

        await Promise.race([
          loadCore(),
          new Promise<void>((_, reject) =>
            setTimeout(
              () => reject(new Error(`Dashboard data fetch timed out after ${DASHBOARD_FETCH_MS}ms`)),
              DASHBOARD_FETCH_MS
            )
          ),
        ]);
      } catch (error) {
        console.error("Dashboard crashed:", error);

        if (!cancelled) {
          setErrorMessage(
            error instanceof Error ? error.message : "Failed to load dashboard"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (user) {
      fetchDashboardData();
    }
  }, [authLoading, user, router]);

  if (!user) {
    return (
      <LoadingSpinner
        text={authLoading ? "Loading session..." : "Redirecting..."}
        className="min-h-screen"
      />
    );
  }

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." className="min-h-screen" />;
  }

  const firstName =
    profile?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";

  return (
    <div className="space-y-8 lg:space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#001A3D] sm:text-3xl md:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[#001A3D]/60 sm:text-base">
            Your SynapseUK dashboard is up to date for{" "}
            <span className="font-medium text-[#001A3D]/80">{format(new Date(), "EEEE, MMM d")}</span>.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200/60">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          System operational
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200/80">
          {errorMessage}
        </div>
      )}

      <StatsCards stats={dashboardData.stats} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="curator-card p-6 xl:col-span-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#001A3D]">Efficiency overview</h2>
              <p className="text-sm text-[#001A3D]/50">Weekly rhythm (illustrative)</p>
            </div>
            <div className="mt-2 flex gap-1 rounded-full bg-[#f3f4f5] p-1 sm:mt-0">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#001A3D] shadow-sm">
                Weekly
              </span>
              <span className="rounded-full px-3 py-1 text-xs font-medium text-[#001A3D]/45">Monthly</span>
            </div>
          </div>
          <div className="mt-8 flex h-44 items-end justify-between gap-2 px-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
              const heightsPx = [52, 72, 112, 60, 64, 120, 44];
              const active = i === 2 || i === 5;
              const h = heightsPx[i];
              return (
                <div key={d} className="flex min-h-0 flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full max-w-[2.75rem] rounded-t-lg transition-colors"
                    style={{
                      height: h,
                      minHeight: 24,
                      background: active
                        ? "linear-gradient(180deg, #001A3D 0%, #011b3e 100%)"
                        : "rgba(0, 26, 61, 0.08)",
                    }}
                  />
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#001A3D]/40">
                    {d}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-[#001A3D] to-[#011b3e] p-6 text-white shadow-[0_8px_24px_rgba(0,26,61,0.15)]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#FFB84D]" />
            <h2 className="font-display text-lg font-semibold text-[#FFB84D]">Curator insights</h2>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/80">
            Use branch and task data to spot capacity trends before they become bottlenecks. Full
            forecasting is on the roadmap.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Tip: keep task statuses current so the dashboard reflects real workload.
          </p>
          <div className="mt-6">
            <a
              href="/tasks"
              className="inline-flex items-center gap-2 rounded-full bg-[#FFB84D] px-4 py-2.5 text-sm font-semibold text-[#291800] transition-colors hover:bg-[#f5a84a]"
            >
              <Activity className="h-4 w-4" />
              Open task board
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentActivity activities={dashboardData.activities} />
        <QuickActions />
      </div>
    </div>
  );
}
