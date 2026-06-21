"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Search,
  Calendar,
  User,
  Filter,
  ArrowLeft,
  ArrowRight,
  FileText,
  AlertCircle,
  CheckCircle,
  Ban,
  Clock,
  MapPin,
  RefreshCw,
  Tag
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getAppointmentsHistoryAction } from "@/app/appointments/actions";
import type { BoardAppointment, SchedulingResources } from "@/types/scheduling";
import type { SessionUser } from "@/lib/session";

interface AppointmentHistoryClientProps {
  resources: SchedulingResources;
  session: SessionUser;
}

export function AppointmentHistoryClient({ resources, session }: AppointmentHistoryClientProps) {
  // Tabs: Cancelled, No Shows, Attended (which translates to backend completed)
  const [activeTab, setActiveTab] = useState<"cancelled" | "no_show" | "completed">("cancelled");

  // Filter States
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [practitionerId, setPractitionerId] = useState<string>(() => {
    // If clinician, default to their matched practitioner ID
    if (session.role === "clinician") {
      const match = resources.practitioners.find(
        (p) =>
          p.name.toLowerCase().includes(session.name.toLowerCase()) ||
          p.name.toLowerCase().includes(session.username.toLowerCase())
      );
      return match ? String(match.id) : "";
    }
    return "";
  });

  const [searchQuery, setSearchQuery] = useState<string>("");

  // Paginated Data States
  const [historyData, setHistoryData] = useState<BoardAppointment[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Load History Helper
  const loadHistory = () => {
    setIsLoading(true);
    const startAtIso = fromDate ? `${fromDate}T00:00:00` : undefined;
    const endAtIso = toDate ? `${toDate}T23:59:59` : undefined;

    startTransition(async () => {
      const res = await getAppointmentsHistoryAction({
        status: activeTab,
        start_at: startAtIso,
        end_at: endAtIso,
        practitioner: practitionerId || undefined,
        page,
      });

      if (res.success) {
        setHistoryData(res.results);
        setTotalCount(res.count);
      } else {
        toast.error(res.error || "Failed to load history.");
        setHistoryData([]);
        setTotalCount(0);
      }
      setIsLoading(false);
    });
  };

  // Trigger reloading on filter or page transitions
  useEffect(() => {
    setPage(1); // Reset page on tab or filter change
  }, [activeTab, fromDate, toDate, practitionerId]);

  useEffect(() => {
    loadHistory();
  }, [activeTab, fromDate, toDate, practitionerId, page]);

  // Client-side search filtration of results
  const filteredHistory = historyData.filter((item) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const patientName = (item.patient_name || "").toLowerCase();
    const patientCode = (item.patient_code || "").toLowerCase();
    const clinicianName = (item.practitioner_name || "").toLowerCase();
    const roomName = (item.room_name || "").toLowerCase();
    const reason = (item.cancel_reason || "").toLowerCase();

    return (
      patientName.includes(query) ||
      patientCode.includes(query) ||
      clinicianName.includes(query) ||
      roomName.includes(query) ||
      reason.includes(query)
    );
  });

  // Timings formatter
  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return "--";
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  };

  // Status badges config
  const statusBadges: Record<string, { label: string; style: string; icon: any }> = {
    cancelled: { label: "Cancelled", style: "border-red-200 bg-red-50 text-red-700", icon: Ban },
    no_show: { label: "No Show", style: "border-orange-200 bg-orange-50 text-orange-700", icon: AlertCircle },
    completed: { label: "Attended", style: "border-green-200 bg-green-50 text-green-800", icon: CheckCircle },
  };

  // Pagination navigation helpers
  const itemsPerPage = 20; // Default backend pagination limit
  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));

  return (
    <div className="space-y-6">
      {/* Upper Control Grid: Tabs and Filters */}
      <div className="rounded-xl border border-[var(--hh-border)] bg-white p-4 shadow-sm space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Main Status Category Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab("cancelled")}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wider ${
                activeTab === "cancelled"
                  ? "bg-white text-red-700 shadow-sm"
                  : "text-[#53605a] hover:text-[#3f1d58]"
              }`}
            >
              <Ban size={14} />
              Cancelled
            </button>
            <button
              onClick={() => setActiveTab("no_show")}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wider ${
                activeTab === "no_show"
                  ? "bg-white text-orange-700 shadow-sm"
                  : "text-[#53605a] hover:text-[#3f1d58]"
              }`}
            >
              <AlertCircle size={14} />
              No Shows
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wider ${
                activeTab === "completed"
                  ? "bg-white text-green-800 shadow-sm"
                  : "text-[#53605a] hover:text-[#3f1d58]"
              }`}
            >
              <CheckCircle size={14} />
              Attended
            </button>
          </div>

          {/* Search box */}
          <div className="relative max-w-sm w-full lg:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#66736d]" />
            <Input
              type="text"
              placeholder="Search by patient, code, room..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </div>

        {/* Detailed Filtering Parameters Row */}
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3 lg:grid-cols-4 pt-2 border-t border-[var(--hh-border)]">
          {/* Clinician selection */}
          <div className="grid gap-1">
            <span className="hh-label text-[10px] uppercase font-bold text-[#66736d] flex items-center gap-1">
              <User size={12} />
              Clinician
            </span>
            <Select
              value={practitionerId}
              onChange={(e) => setPractitionerId(e.target.value)}
              disabled={session.role === "clinician"}
              className="text-xs h-9"
            >
              {session.role !== "clinician" && <option value="">All Clinicians</option>}
              {resources.practitioners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.role})
                </option>
              ))}
            </Select>
          </div>

          {/* From Date */}
          <div className="grid gap-1">
            <span className="hh-label text-[10px] uppercase font-bold text-[#66736d] flex items-center gap-1">
              <Calendar size={12} />
              From Date
            </span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* To Date */}
          <div className="grid gap-1">
            <span className="hh-label text-[10px] uppercase font-bold text-[#66736d] flex items-center gap-1">
              <Calendar size={12} />
              To Date
            </span>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          {/* Reset Filters / Refresh Button */}
          <div className="flex items-end justify-end gap-2 md:col-span-3 lg:col-span-1">
            {(fromDate || toDate || (practitionerId && session.role !== "clinician") || searchQuery) && (
              <Button
                size="sm"
                variant="secondary"
                className="text-xs text-[#53605a]"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  if (session.role !== "clinician") setPractitionerId("");
                  setSearchQuery("");
                }}
              >
                Clear Filters
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              disabled={isLoading || isPending}
              onClick={loadHistory}
              className="border-[var(--hh-purple-light)] text-[var(--hh-purple)] bg-[var(--hh-purple-light)]/5 hover:bg-[var(--hh-purple-light)]/10 h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading || isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Main Records Table Display */}
      <div className="rounded-xl border border-[var(--hh-border)] bg-white overflow-hidden shadow-sm relative">
        {(isLoading || isPending) && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--hh-border)] bg-white shadow-sm">
              <RefreshCw className="h-4 w-4 animate-spin text-[var(--hh-purple)]" />
              <span className="text-xs font-bold text-[#3f1d58]">Fetching records...</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-[#3f1d58]">
            <thead className="bg-[#fcf9fe] border-b border-[var(--hh-border)] text-[#53605a] font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Clinician / Room</th>
                <th className="px-4 py-3">Timings</th>
                <th className="px-4 py-3">Status</th>
                {activeTab === "cancelled" && <th className="px-4 py-3 max-w-xs">Cancellation Reason</th>}
                <th className="px-4 py-3 text-right">Audit context</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--hh-border)]">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === "cancelled" ? 6 : 5}
                    className="px-4 py-12 text-center text-[#66736d]"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText size={32} className="text-[#c1ccc6]" />
                      <div className="font-bold">No terminal records found</div>
                      <p className="text-xs">Try selecting a different date range or category filter.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const BadgeConfig = statusBadges[item.status] || {
                    label: item.status_label || item.status,
                    style: "border-gray-200 bg-gray-50 text-gray-500",
                    icon: CheckCircle,
                  };
                  const StatusIcon = BadgeConfig.icon;

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Patient metadata */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-sm text-[#3f1d58]">
                          {item.patient_name || "--"}
                        </div>
                        <div className="font-mono text-[10px] text-[#66736d] mt-0.5">
                          {item.patient_code || "--"}
                        </div>
                      </td>

                      {/* Clinician and Room */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 font-semibold">
                          <User size={13} className="text-[#66736d]" />
                          {item.practitioner_name || "Unassigned"}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#66736d] mt-1">
                          <MapPin size={11} />
                          {item.room_name || "No Resource Room"}
                        </div>
                      </td>

                      {/* Timings */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 font-medium">
                          <Calendar size={13} className="text-[#66736d]" />
                          {item.appointment_date}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-[#66736d] mt-1 font-mono">
                          <Clock size={11} />
                          {item.start_at && item.end_at
                            ? `${new Date(item.start_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })} - ${new Date(item.end_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}`
                            : item.appointment_time?.slice(0, 5) || "Unset time"}
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3.5">
                        <Badge
                          className={`${BadgeConfig.style} text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full border flex items-center gap-1 w-fit`}
                        >
                          <StatusIcon size={11} />
                          {BadgeConfig.label}
                        </Badge>
                      </td>

                      {/* Cancellation reason (only for Cancelled tab) */}
                      {activeTab === "cancelled" && (
                        <td className="px-4 py-3.5 max-w-xs leading-relaxed text-red-900 bg-red-50/10">
                          <div className="font-medium italic border-l-2 border-red-200 pl-2 text-xs">
                            {item.cancel_reason || (
                              <span className="text-gray-400 italic font-normal">
                                No cancellation reason specified
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Last updated context */}
                      <td className="px-4 py-3.5 text-right font-mono text-[10px] text-[#66736d]">
                        {item.updated_by_name ? (
                          <div>
                            <div>By: {item.updated_by_name}</div>
                            <div className="mt-0.5">{formatDateTime(item.updated_at)}</div>
                          </div>
                        ) : (
                          <div>
                            <div>Created By: {item.created_by_name || "System"}</div>
                            <div className="mt-0.5">{formatDateTime(item.created_at)}</div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dense Table Footer & Pagination */}
        {totalPages > 1 && (
          <div className="bg-[#fcf9fe] border-t border-[var(--hh-border)] px-4 py-3 flex items-center justify-between text-xs text-[#53605a]">
            <div>
              Showing page <span className="font-bold text-[#3f1d58]">{page}</span> of{" "}
              <span className="font-bold text-[#3f1d58]">{totalPages}</span> (Total:{" "}
              <span className="font-bold text-[#3f1d58]">{totalCount}</span> entries)
            </div>
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1 || isLoading || isPending}
                onClick={() => setPage((prev) => prev - 1)}
                className="h-8 px-2"
              >
                <ArrowLeft size={14} className="mr-1" />
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages || isLoading || isPending}
                onClick={() => setPage((prev) => prev + 1)}
                className="h-8 px-2"
              >
                Next
                <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
