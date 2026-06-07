"use client";

import { useState, useEffect } from "react";
import { LockKeyhole, Loader2, ChevronDown, ChevronRight, Calendar, User, Globe, AlertTriangle, ShieldCheck, Printer, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Patient } from "@/types/clinic";

type AuditLogEntry = {
  id: number;
  user: number | null;
  user_name: string | null;
  entity_type: string;
  entity_id: number;
  action: string;
  change_summary: Record<string, any> | null;
  before_data: Record<string, any> | null;
  after_data: Record<string, any> | null;
  changed_fields: Record<string, { before: any; after: any }> | null;
  details: string;
  ip_address: string | null;
  user_agent: string;
  created_at: string;
};

type PaginatedAuditLogs = {
  success: boolean;
  count: number;
  next: string | null;
  previous: string | null;
  results: AuditLogEntry[];
};

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return decodeURIComponent(parts.pop()?.split(";").shift() || "");
  }
  return null;
}

function formatLogDateTime(text?: string | null) {
  if (!text) return "—";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(text));
}

export function PatientAccessLogDialog({ patient, userRole }: { patient: Patient; userRole?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Check authorization role (admin or clinician only)
  const role = userRole || getCookie("harmony_role") || "receptionist";
  const isAuthorized = role === "admin" || role === "clinician";

  // Fetch access logs
  const fetchLogs = async (pageNum: number, append = false) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/audit-logs/?entity_type=patient&entity_id=${patient.id}&page=${pageNum}`);
      if (!res.ok) throw new Error("Failed to fetch logs");
      
      const data: PaginatedAuditLogs = await res.json();
      if (data.success) {
        setLogs((prev) => (append ? [...prev, ...data.results] : data.results));
        setHasMore(Boolean(data.next));
        setTotalCount(data.count);
      }
    } catch (err) {
      console.error("Error loading patient access logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && isAuthorized) {
      setPage(1);
      fetchLogs(1, false);
    }
  }, [open]);

  if (!isAuthorized) {
    return null;
  }

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchLogs(nextPage, true);
  };

  const toggleExpand = (id: number) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const getActionBadgeStyle = (action: string) => {
    switch (action.toLowerCase()) {
      case "view":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "create":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "update":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "delete":
        return "bg-red-50 text-red-700 border-red-200";
      case "restore":
        return "bg-purple-50 text-purple-700 border-purple-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getActionLabel = (action: string) => {
    switch (action.toLowerCase()) {
      case "view":
        return "Profile Viewed";
      case "create":
        return "Profile Created";
      case "update":
        return "Profile Updated";
      case "delete":
        return "Profile Deleted";
      case "restore":
        return "Profile Restored";
      default:
        return action;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" type="button" className="text-xs flex items-center gap-1.5">
          <LockKeyhole size={15} />
          Access log
        </Button>
      </DialogTrigger>
      
      <DialogContent className="w-[min(96vw,840px)] flex flex-col max-h-[85vh] p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-md rounded-2xl border border-[var(--hh-border)] shadow-xl animate-fade-in">
        <div className="border-b border-[var(--hh-border)] px-6 py-5 bg-slate-50/50">
          <DialogTitle className="text-lg font-extrabold text-[var(--hh-purple-dark)] flex items-center gap-2">
            <span>🛡️</span> Patient Access & Security Log
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-xs font-semibold text-slate-500">
            Audit history tracking medical records access and updates for <strong className="text-[var(--hh-purple)]">{patient.full_name_display}</strong> ({patient.patient_code}).
          </DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {logs.length === 0 && loading && page === 1 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 size={36} className="animate-spin text-[var(--hh-purple)]" />
              <span className="text-xs font-bold uppercase tracking-wider">Loading security logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <ShieldCheck size={40} className="text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-500">No access logs recorded for this patient.</p>
              <p className="text-2xs text-slate-400 mt-1">Direct page retrieves and changes are logged securely in real time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-3xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                <span>Timeline Logs ({totalCount} total events)</span>
                <span>Actions & Diff Details</span>
              </div>
              
              <div className="divide-y divide-slate-100 overflow-hidden border border-[var(--hh-border)] bg-white rounded-xl shadow-xs">
                {logs.map((entry) => {
                  const isExpanded = expandedLogId === entry.id;
                  const hasChanges = entry.action === "update" && entry.changed_fields && Object.keys(entry.changed_fields).length > 0;
                  const hasDetails = entry.details || entry.user_agent;

                  return (
                    <div key={entry.id} className="transition-colors duration-150 hover:bg-slate-50/30">
                      <div 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 cursor-pointer ${isExpanded ? 'bg-slate-50/50' : ''}`}
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 shrink-0">
                            {isExpanded ? (
                              <ChevronDown size={16} className="text-slate-400" />
                            ) : (
                              <ChevronRight size={16} className="text-slate-400" />
                            )}
                          </div>
                          <div className="grid gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${getActionBadgeStyle(entry.action)}`}>
                                {getActionLabel(entry.action)}
                              </span>
                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                <User size={12} className="text-slate-400" />
                                {entry.user_name || "System Automated"}
                              </span>
                            </div>
                            <div className="text-3xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar size={11} />
                                {formatLogDateTime(entry.created_at)}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Globe size={11} />
                                IP: {entry.ip_address || "Internal Link"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end">
                          {hasChanges && (
                            <span className="text-3xs font-extrabold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 flex items-center gap-1 uppercase">
                              <FileText size={10} />
                              {Object.keys(entry.changed_fields!).length} changes
                            </span>
                          )}
                          {!hasChanges && entry.action === "update" && (
                            <span className="text-3xs font-extrabold text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 uppercase">
                              Profile Saved
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <div className="bg-slate-50/60 p-4 border-t border-slate-100/50 space-y-3">
                          {entry.details && (
                            <div className="text-xs text-slate-600 font-medium">
                              <strong className="font-bold text-slate-800">Detail Notes:</strong> {entry.details}
                            </div>
                          )}

                          {entry.user_agent && (
                            <div className="text-3xs font-semibold text-slate-400 tracking-wide font-mono break-all bg-slate-100/50 p-2 rounded-lg border border-slate-200/40">
                              UA: {entry.user_agent}
                            </div>
                          )}

                          {hasChanges && entry.changed_fields && (
                            <div className="rounded-xl border border-slate-200/60 overflow-hidden bg-white shadow-2xs">
                              <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                                <thead>
                                  <tr className="bg-slate-50/80 font-extrabold text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-100">
                                    <th className="px-3 py-2.5">Field Property</th>
                                    <th className="px-3 py-2.5 bg-red-50/30 text-red-700">Before Change</th>
                                    <th className="px-3 py-2.5 bg-emerald-50/30 text-emerald-700">After Change</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {Object.entries(entry.changed_fields).map(([field, values]) => (
                                    <tr key={field} className="hover:bg-slate-50/20 transition-colors">
                                      <td className="px-3 py-2 font-mono font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                                        {field.replace(/_/g, " ")}
                                      </td>
                                      <td className="px-3 py-2 bg-red-50/10 text-red-600 line-through font-medium text-[11px]">
                                        {values.before !== null && values.before !== undefined ? String(values.before) : "—"}
                                      </td>
                                      <td className="px-3 py-2 bg-emerald-50/10 text-emerald-800 font-bold text-[11px]">
                                        {values.after !== null && values.after !== undefined ? String(values.after) : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className="pt-2 text-center">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    disabled={loading} 
                    onClick={handleLoadMore}
                    className="text-xs font-bold uppercase tracking-wider px-6 border-slate-200 text-slate-600 hover:text-[var(--hh-purple)]"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={12} className="animate-spin mr-1.5" />
                        Loading more...
                      </>
                    ) : (
                      "Load more log entries"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-[var(--hh-border)] px-6 py-4 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Security Active
          </div>
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)} className="text-xs font-bold uppercase">
            Close log
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
