"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { RequestList, type RequestRow } from "@/components/requests/request-list";
import { approveRequestAction } from "@/lib/actions/request-actions";
import { toast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";

function profileFromRow(req: Record<string, unknown>) {
  const p = req.profiles;
  if (!p) return null;
  return Array.isArray(p) ? p[0] : p;
}

function transformRequest(req: Record<string, unknown>): RequestRow {
  const prof = profileFromRow(req) as { full_name?: string; email?: string; position?: string } | null;
  return {
    id: String(req.id),
    type: req.type as RequestRow["type"],
    title: String(req.title ?? ""),
    description: String(req.description ?? ""),
    status: req.status as RequestRow["status"],
    priority: String(req.priority ?? "normal"),
    created_date: String(req.created_at ?? ""),
    requested_date: req.start_date ? String(req.start_date) : req.current_shift_date ? String(req.current_shift_date) : undefined,
    start_date: req.start_date ? String(req.start_date) : null,
    end_date: req.end_date ? String(req.end_date) : null,
    leave_type: req.leave_type ? String(req.leave_type) : null,
    current_shift_date: req.current_shift_date ? String(req.current_shift_date) : null,
    requested_shift_date: req.requested_shift_date ? String(req.requested_shift_date) : null,
    amount: req.expense_amount != null ? Number(req.expense_amount) : undefined,
    requester: {
      id: String(req.profile_id ?? ""),
      name: prof?.full_name || "Unknown User",
      role: prof?.position || "Staff",
    },
    approver: req.approved_by
      ? {
          id: String(req.approved_by),
          name: "Approver",
        }
      : undefined,
    approved_date: req.approved_at ? String(req.approved_at) : undefined,
  };
}

export default function RequestsPage() {
  const { user } = useAuth();
  const [myRequests, setMyRequests] = useState<RequestRow[]>([]);
  const [requestsForMe, setRequestsForMe] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"my-requests" | "for-approval">("my-requests");

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;

    try {
      const myRequestsResponse = await fetch("/api/requests/my-requests");
      const myRequestsData = myRequestsResponse.ok ? await myRequestsResponse.json() : [];

      const requestsForMeResponse = await fetch("/api/requests/for-approval");
      const requestsForMeData = requestsForMeResponse.ok ? await requestsForMeResponse.json() : [];

      setMyRequests(
        (Array.isArray(myRequestsData) ? myRequestsData : []).map((r: Record<string, unknown>) =>
          transformRequest(r)
        )
      );
      setRequestsForMe(
        (Array.isArray(requestsForMeData) ? requestsForMeData : []).map((r: Record<string, unknown>) =>
          transformRequest(r)
        )
      );
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      setMyRequests([]);
      setRequestsForMe([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const pendingForApproval = useMemo(
    () => requestsForMe.filter((r) => r.status === "pending").length,
    [requestsForMe]
  );

  const handleApprove = async (requestId: string) => {
    try {
      await approveRequestAction(requestId, true);
      toast({ title: "Approved", description: "Request approved successfully." });
      await fetchRequests();
    } catch {
      toast({
        title: "Error",
        description: "Failed to approve request.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await approveRequestAction(requestId, false, "Request rejected");
      toast({ title: "Rejected", description: "Request was rejected." });
      await fetchRequests();
    } catch {
      toast({
        title: "Error",
        description: "Failed to reject request.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#001A3D]/20 border-t-[#FFB84D]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-[#001A3D]/45">
            Directory <span className="text-[#001A3D]/30">›</span> Request management
          </p>
          <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-[#001A3D] sm:text-4xl">
            Request management
          </h1>
          <p className="mt-2 text-sm text-[#001A3D]/55">
            Workforce management <span className="text-[#001A3D]/35">•</span> leave, expenses, and approvals
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/requests/new"
            className="inline-flex h-11 items-center gap-2 rounded-3xl bg-[#FFB84D] px-5 text-sm font-semibold text-[#291800] shadow-[0_8px_24px_rgba(0,26,61,0.06)] transition hover:bg-[#f5a84a]"
          >
            <PlusCircle className="h-4 w-4" strokeWidth={2} />
            Create new request
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Tabs */}
          <div className="flex gap-1 rounded-2xl bg-[#f3f4f5] p-1">
            <button
              type="button"
              onClick={() => setTab("my-requests")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === "my-requests"
                  ? "bg-white text-[#001A3D] shadow-sm"
                  : "text-[#001A3D]/50 hover:text-[#001A3D]/70"
              }`}
            >
              My requests ({myRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("for-approval")}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === "for-approval"
                  ? "bg-white text-[#001A3D] shadow-sm"
                  : "text-[#001A3D]/50 hover:text-[#001A3D]/70"
              }`}
            >
              For my approval ({requestsForMe.length})
            </button>
          </div>

          {tab === "my-requests" &&
            (myRequests.length === 0 ? (
              <div className="curator-card flex flex-col items-center justify-center gap-4 py-16 text-center shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
                <p className="text-sm font-medium text-[#001A3D]/70">No requests yet</p>
                <p className="max-w-sm text-sm text-[#001A3D]/45">
                  You haven&apos;t submitted any requests. Create one to get started.
                </p>
                <Link
                  href="/requests/new"
                  className="inline-flex h-11 items-center rounded-full bg-[#001A3D] px-6 text-sm font-semibold text-white transition hover:bg-[#011b3e]"
                >
                  Create your first request
                </Link>
              </div>
            ) : (
              <RequestList requests={myRequests} canApprove={false} onUpdate={fetchRequests} />
            ))}

          {tab === "for-approval" &&
            (requestsForMe.length === 0 ? (
              <div className="curator-card flex flex-col items-center justify-center gap-2 py-16 text-center shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
                <p className="text-sm font-medium text-[#001A3D]/70">Nothing to approve</p>
                <p className="max-w-sm text-sm text-[#001A3D]/45">
                  No requests are assigned to you for approval right now.
                </p>
              </div>
            ) : (
              <RequestList
                requests={requestsForMe}
                canApprove
                onApprove={handleApprove}
                onReject={handleReject}
                onUpdate={fetchRequests}
              />
            ))}
        </div>

        {/* Pending summary — Digital Curator dark card */}
        <aside className="space-y-6">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-[#001A3D] to-[#011b3e] p-6 text-white shadow-[0_8px_24px_rgba(0,26,61,0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FFB84D]/90">
              Approvals queue
            </p>
            <p className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">
              {pendingForApproval}
            </p>
            <p className="mt-1 text-sm text-white/70">Total pending requests (for you)</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
