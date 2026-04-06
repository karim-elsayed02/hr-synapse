"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Check,
  CheckCircle,
  Clock,
  Filter,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  completeRequestAction,
  addCommentAction,
  getRequestCommentsAction,
} from "@/lib/actions/request-actions";
import { toast } from "@/hooks/use-toast";

const PAGE_SIZE = 8;

export interface RequestRow {
  id: string;
  type: "leave" | "expense" | "shift_swap" | "general";
  title: string;
  description: string;
  requester: {
    id: string;
    name: string;
    role: string;
  };
  status: "pending" | "approved" | "rejected" | "cancelled" | "completed";
  priority: string;
  created_date: string;
  requested_date?: string;
  start_date?: string | null;
  end_date?: string | null;
  leave_type?: string | null;
  current_shift_date?: string | null;
  requested_shift_date?: string | null;
  amount?: number;
  approver?: { id: string; name: string };
  approved_date?: string;
}

interface RequestListProps {
  requests: RequestRow[];
  canApprove?: boolean;
  onApprove?: (requestId: string) => void;
  onReject?: (requestId: string) => void;
  onUpdate?: () => void;
}

function syntheticStaffId(uuid: string) {
  const hex = uuid.replace(/-/g, "");
  const n = parseInt(hex.slice(0, 8), 16) % 9000;
  return `SYN-${(8000 + n).toString().padStart(4, "0")}`;
}

function initials(name: string) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function formatDateRange(request: RequestRow): string {
  if (request.start_date && request.end_date) {
    return `${fmtDate(request.start_date)} – ${fmtDate(request.end_date)}`;
  }
  if (request.start_date) return fmtDate(request.start_date);
  if (request.type === "shift_swap") {
    const a = request.current_shift_date;
    const b = request.requested_shift_date;
    if (a && b) return `${fmtDate(a)} → ${fmtDate(b)}`;
    if (a) return fmtDate(a);
  }
  if (request.requested_date) return fmtDate(request.requested_date);
  return "—";
}

function requestTypeLabel(request: RequestRow): string {
  if (request.type === "leave") {
    const lt = request.leave_type;
    const map: Record<string, string> = {
      annual: "Annual leave",
      sick: "Sick leave",
      personal: "Personal leave",
      maternity: "Maternity",
      paternity: "Paternity",
      compassionate: "Compassionate leave",
    };
    if (lt && map[lt]) return map[lt];
    return "Leave";
  }
  const labels: Record<RequestRow["type"], string> = {
    expense: "Expense",
    shift_swap: "Shift swap",
    general: "General",
    leave: "Leave",
  };
  return labels[request.type] ?? request.type;
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-800 border border-amber-200/80";
    case "approved":
      return "bg-emerald-50 text-emerald-800 border border-emerald-200/80";
    case "rejected":
      return "bg-red-50 text-red-800 border border-red-200/80";
    case "cancelled":
      return "bg-[#f3f4f5] text-[#001A3D]/60 border border-[#001A3D]/10";
    case "completed":
      return "bg-sky-50 text-sky-900 border border-sky-200/80";
    default:
      return "bg-[#f3f4f5] text-[#001A3D]/70";
  }
}

function statusLabel(status: string) {
  if (status === "rejected") return "Denied";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function RequestList({
  requests,
  canApprove = false,
  onApprove,
  onReject,
  onView,
  onUpdate,
}: RequestListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<RequestRow | null>(null);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [comments, setComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const filteredRequests = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return requests.filter((request) => {
      const typeLabel = requestTypeLabel(request).toLowerCase();
      const matchesSearch =
        !q ||
        request.title.toLowerCase().includes(q) ||
        request.requester.name.toLowerCase().includes(q) ||
        typeLabel.includes(q);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "rejected" ? request.status === "rejected" : request.status === statusFilter);
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paginated = filteredRequests.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const handleComplete = async (requestId: string) => {
    try {
      await completeRequestAction(requestId);
      toast({ title: "Success", description: "Request marked as completed." });
      onUpdate?.();
    } catch {
      toast({
        title: "Error",
        description: "Failed to complete request.",
        variant: "destructive",
      });
    }
  };

  const loadComments = async (requestId: string) => {
    setIsLoadingComments(true);
    try {
      const commentsData = await getRequestCommentsAction(requestId);
      setComments(commentsData);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const handleReply = async () => {
    if (!selectedRequest || !replyMessage.trim()) return;
    try {
      await addCommentAction(selectedRequest.id, replyMessage);
      setReplyMessage("");
      toast({ title: "Success", description: "Reply added." });
      loadComments(selectedRequest.id);
    } catch {
      toast({
        title: "Error",
        description: "Failed to add reply.",
        variant: "destructive",
      });
    }
  };

  const openReplyDialog = (request: RequestRow) => {
    setSelectedRequest(request);
    setReplyMessage("");
    setCommentsOpen(true);
    loadComments(request.id);
  };

  return (
    <div className="space-y-6">
      {/* Search + status chips */}
      <div className="curator-card p-6 shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#001A3D]/35" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Search by staff name, title, or request type…"
              className="h-12 w-full rounded-2xl bg-[#f3f4f5] pl-11 pr-4 text-sm text-[#001A3D] outline-none transition placeholder:text-[#001A3D]/40 focus:bg-white focus:shadow-[0_0_0_2px_rgba(255,184,77,0.35)]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#f3f4f5] p-1">
            {(
              [
                ["all", "All"],
                ["pending", "Pending"],
                ["approved", "Approved"],
                ["rejected", "Denied"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStatusFilter(value);
                  setPage(1);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  statusFilter === value
                    ? "bg-white text-[#001A3D] shadow-sm"
                    : "text-[#001A3D]/50 hover:text-[#001A3D]/75"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-[#001A3D]/45">
          <Filter className="h-3.5 w-3.5" />
          {filteredRequests.length} of {requests.length} requests
        </p>
      </div>

      {/* Table */}
      <div className="curator-card overflow-hidden shadow-[0_8px_24px_rgba(0,26,61,0.06)]">
        <div className="overflow-x-auto">
          <table className="min-w-[880px] w-full border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-[#001A3D]/45">
                <th className="px-6 py-4">Staff member</th>
                <th className="px-4 py-4">Request type</th>
                <th className="px-4 py-4">Date range</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-sm text-[#001A3D]/50">
                    No requests match your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((request) => {
                  const syn = syntheticStaffId(request.requester.id || request.id);
                  return (
                    <tr
                      key={request.id}
                      className="transition-colors hover:bg-[#f8f9fa]/90"
                    >
                      <td className="px-6 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm">
                            <AvatarFallback className="bg-gradient-to-br from-[#001A3D] to-[#011b3e] text-xs font-semibold text-[#FFB84D]">
                              {initials(request.requester.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-[#001A3D] truncate">
                              {request.requester.name}
                            </p>
                            <p className="text-xs text-[#001A3D]/45">ID: {syn}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <p className="text-sm font-medium text-[#001A3D]/90">{requestTypeLabel(request)}</p>
                        <p className="mt-0.5 line-clamp-1 text-xs text-[#001A3D]/45">{request.title}</p>
                      </td>
                      <td className="px-4 py-4 align-middle text-sm text-[#001A3D]/80">
                        {formatDateRange(request)}
                      </td>
                      <td className="px-4 py-4 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${statusBadgeClass(request.status)}`}
                        >
                          {request.status === "pending" ? (
                            <Clock className="h-3.5 w-3.5" />
                          ) : request.status === "approved" || request.status === "completed" ? (
                            <CheckCircle className="h-3.5 w-3.5" />
                          ) : null}
                          {statusLabel(request.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-middle text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {canApprove && request.status === "pending" && (
                            <>
                              <button
                                type="button"
                                onClick={() => onApprove?.(request.id)}
                                className="inline-flex items-center gap-1 rounded-xl border border-emerald-300/80 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-50"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => onReject?.(request.id)}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#001A3D]/12 bg-white px-3 py-1.5 text-xs font-semibold text-[#8b2e2e] transition hover:bg-red-50"
                              >
                                <X className="h-3.5 w-3.5" />
                                Reject
                              </button>
                            </>
                          )}
                          {canApprove && request.status === "approved" && (
                            <button
                              type="button"
                              onClick={() => handleComplete(request.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#4DB8FF]/40 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 transition hover:bg-sky-100"
                            >
                              Complete
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openReplyDialog(request)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#001A3D]/10 bg-[#f8f9fa] px-3 py-1.5 text-xs font-medium text-[#001A3D]/70 transition hover:bg-[#f3f4f5]"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Comments
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredRequests.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-[#001A3D]/[0.06] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#001A3D]/50">
              Showing{" "}
              <span className="font-medium text-[#001A3D]/70">{pageStart + 1}</span> to{" "}
              <span className="font-medium text-[#001A3D]/70">
                {Math.min(pageStart + PAGE_SIZE, filteredRequests.length)}
              </span>{" "}
              of <span className="font-medium text-[#001A3D]/70">{filteredRequests.length}</span>{" "}
              entries
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-full px-3 py-1.5 text-sm font-medium text-[#001A3D] transition hover:bg-[#f3f4f5] disabled:opacity-40"
              >
                Prev
              </button>
              <span className="text-sm text-[#001A3D]/45">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-full bg-[#FFB84D] px-4 py-1.5 text-sm font-semibold text-[#291800] transition hover:bg-[#f5a84a] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-[#001A3D]/10 bg-white text-[#001A3D]">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">Request & comments</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#f8f9fa] px-4 py-3 text-sm">
                <p className="font-semibold">{selectedRequest.title}</p>
                <p className="mt-1 text-[#001A3D]/65">{selectedRequest.description}</p>
              </div>
              <div className="max-h-48 space-y-2 overflow-y-auto">
                {isLoadingComments ? (
                  <p className="text-sm text-[#001A3D]/45">Loading…</p>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="text-sm">
                      <p className="rounded-lg bg-[#f3f4f5] px-3 py-2">{comment.message}</p>
                      <p className="mt-1 text-xs text-[#001A3D]/45">
                        {comment.profiles?.full_name} ·{" "}
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[#001A3D]/45">No comments yet.</p>
                )}
              </div>
              <Textarea
                placeholder="Add a comment…"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={3}
                className="rounded-xl border-[#001A3D]/15"
              />
              <Button
                type="button"
                onClick={handleReply}
                disabled={!replyMessage.trim()}
                className="rounded-full bg-[#001A3D] text-white hover:bg-[#011b3e]"
              >
                Send
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
