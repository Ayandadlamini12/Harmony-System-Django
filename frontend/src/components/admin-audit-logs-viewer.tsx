"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  ChevronRight,
  Calendar,
  User,
  Globe,
  ShieldCheck,
  FileText,
  Heart,
  Clipboard,
  Activity,
  ArrowRight,
  CheckCircle2,
  PlusCircle,
  Trash2,
  Eye,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
  Download,
  ShieldAlert,
  Clock,
  Cpu,
  XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { UnifiedAuditLogEntry, AuditLogSummary } from "@/types/clinic";

// Technical metadata fields to exclude from before/after comparisons
const METADATA_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "patient",
  "patient_id",
  "visit",
  "visit_id",
  "recorded_by",
  "recorded_by_id",
  "user",
  "user_id",
  "checked_in_by",
  "checked_in_by_id",
  "is_deleted",
  "deleted_at",
  "updated_by",
  "updated_by_id",
]);

// Field snake_case translation dictionary
const FIELD_TRANSLATIONS: Record<string, string> = {
  bp_first_reading: "Blood Pressure (First)",
  bp_second_reading: "Blood Pressure (Second)",
  bp_systolic: "Systolic Blood Pressure",
  bp_diastolic: "Diastolic Blood Pressure",
  pulse: "Pulse (bpm)",
  resp_rate: "Respiratory Rate (breaths/min)",
  temperature: "Temperature (°C)",
  weight: "Weight (kg)",
  height: "Height (cm)",
  bmi: "Body Mass Index (BMI)",
  glucose_mmol_l: "Blood Glucose (mmol/L)",
  glucose_context: "Glucose Context",
  glucose_food_type: "Glucose Food Type",
  medication_taken_status: "Medication Status",
  hiv_status: "HIV Status",
  family_medical_history: "Family Medical History",
  past_medical_history: "Past Medical History",
  allopathic_medication: "Allopathic Medications",
  other_important_information: "Clinical Warnings/Notes",
  children_count: "Number of Children",
  notes: "Encounter Notes",
  main_complaint: "Main Complaint",
  diagnosis: "Diagnosis / Assessment",
  remedy: "Remedy / Treatment Plan",
  physical_examination: "Physical Examination Notes",
  dietary_lifestyle_recommendations: "Dietary & Lifestyle Recommendations",
  title: "Case Title",
  status: "Status",
  queue_number: "Queue Number",
  current_stage: "Current Stage",
  flow_type: "Flow Type",
  visit_type: "Visit Type",
  full_name: "Full Name",
  primary_phone: "Primary Phone",
  national_id: "National ID",
  gender: "Gender",
  date_of_birth: "Date of Birth",
  marital_status: "Marital Status",
  occupation: "Occupation",
  address: "Residential Address",
  emergency_contact_name: "Emergency Contact Name",
  emergency_contact_phone: "Emergency Contact Phone",
  emergency_contact_relation: "Emergency Contact Relation",
  allergies: "Allergies",
  chronic_medications: "Chronic Medications",
};

function translateFieldKey(field: string): string {
  if (FIELD_TRANSLATIONS[field]) {
    return FIELD_TRANSLATIONS[field];
  }
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function translateEntityName(entityType: string): string {
  const norm = entityType.toLowerCase().replace(/_/g, "");
  switch (norm) {
    case "patient": return "Patient Profile";
    case "patientprofile": return "Medical History";
    case "vital": return "Vitals Reading";
    case "case": return "Clinical Case";
    case "visit": return "Visit Encounter";
    case "patientdocument": return "Document / Consent";
    case "patientjourney": return "Queue Journey";
    case "patientcheckin": return "Check-In Event";
    case "appointment": return "Appointment";
    case "elevatedaccessrequest": return "Elevated Access Request";
    default: return entityType;
  }
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

// Translate database actions into clinical events
function getClinicalActivity(entityType: string, action: string) {
  const normEntity = entityType.toLowerCase().replace(/_/g, "");
  const normAction = action.toLowerCase();

  let label = `${action} ${entityType}`;
  let colorClass = "bg-slate-50 text-slate-700 border-slate-200";
  let iconName = "default";
  let defaultDesc = "System database update logged.";

  if (normEntity === "patient") {
    if (normAction === "view") {
      label = "Record Accessed";
      colorClass = "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/50";
      iconName = "eye";
      defaultDesc = "Patient medical record file was opened and viewed.";
    } else if (normAction === "create") {
      label = "Patient Registered";
      colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50";
      iconName = "register";
      defaultDesc = "New patient registered in the system.";
    } else if (normAction === "update" || normAction === "restore") {
      label = "Demographics Updated";
      colorClass = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50";
      iconName = "edit";
      defaultDesc = "Patient demographic fields were modified.";
    } else if (normAction === "delete") {
      label = "Patient Deleted";
      colorClass = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/50";
      iconName = "trash";
      defaultDesc = "Patient profile was soft-deleted.";
    }
  } else if (normEntity === "patientprofile") {
    label = "Medical History Updated";
    colorClass = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50";
    iconName = "edit";
    defaultDesc = "Patient clinical background and medical profile updated.";
  } else if (normEntity === "vital") {
    if (normAction === "create") {
      label = "Vitals Recorded";
      colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50";
      iconName = "vitals";
      defaultDesc = "Patient vital signs were measured and recorded.";
    } else if (normAction === "update") {
      label = "Vitals Updated";
      colorClass = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50";
      iconName = "edit";
      defaultDesc = "Patient vital signs record was modified.";
    } else if (normAction === "delete") {
      label = "Vitals Deleted";
      colorClass = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/50";
      iconName = "trash";
      defaultDesc = "Patient vital signs record was deleted.";
    }
  } else if (normEntity === "case") {
    if (normAction === "create") {
      label = "Clinical Case Opened";
      colorClass = "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100/50";
      iconName = "case";
      defaultDesc = "New active clinical case opened for this patient.";
    } else if (normAction === "update") {
      label = "Clinical Case Updated";
      colorClass = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50";
      iconName = "edit";
      defaultDesc = "Clinical case details, diagnosis, or remedy notes were updated.";
    } else if (normAction === "resolve" || normAction === "resolved") {
      label = "Clinical Case Resolved";
      colorClass = "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100/50";
      iconName = "resolve";
      defaultDesc = "Clinical case and related follow-up records resolved successfully.";
    } else if (normAction === "delete") {
      label = "Clinical Case Deleted";
      colorClass = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/50";
      iconName = "trash";
      defaultDesc = "Clinical case record was deleted.";
    }
  } else if (normEntity === "visit") {
    if (normAction === "create") {
      label = "Encounter Opened";
      colorClass = "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100/50";
      iconName = "visit";
      defaultDesc = "New visit/clinical encounter opened for this patient.";
    } else if (normAction === "update") {
      label = "Encounter Updated";
      colorClass = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50";
      iconName = "edit";
      defaultDesc = "Visit encounter record was updated.";
    } else if (normAction === "delete") {
      label = "Encounter Deleted";
      colorClass = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/50";
      iconName = "trash";
      defaultDesc = "Visit encounter record was deleted.";
    }
  } else if (normEntity === "patientdocument") {
    if (normAction === "create" || normAction === "generate") {
      label = "Document Generated";
      colorClass = "bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100/50";
      iconName = "doc";
      defaultDesc = "Patient clinical document or consent form generated.";
    } else if (normAction === "sign" || normAction === "signed") {
      label = "Consent Signed";
      colorClass = "bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100/50";
      iconName = "sign";
      defaultDesc = "Consent document digitally signed by patient/guardian.";
    } else if (normAction === "invalidate" || normAction === "invalidated") {
      label = "Document Invalidated";
      colorClass = "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/50";
      iconName = "trash";
      defaultDesc = "Consent document manually invalidated.";
    }
  } else if (normEntity === "patientjourney" || normEntity === "patientjourneyevent" || normEntity === "patientcheckin") {
    if (normAction === "create") {
      label = "Patient Checked-In";
      colorClass = "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/50";
      iconName = "journey";
      defaultDesc = "Patient checked in and entered the active waiting queue.";
    } else if (normAction === "transition") {
      label = "Queue Flow Advanced";
      colorClass = "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100/50";
      iconName = "transition";
      defaultDesc = "Patient queue status advanced in the clinical flow.";
    } else {
      label = "Journey Updated";
      colorClass = "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/50";
      iconName = "journey";
      defaultDesc = "Patient queue journey tracking details updated.";
    }
  } else if (normEntity === "appointment") {
    if (normAction === "create") {
      label = "Appointment Booked";
      colorClass = "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100/50";
      iconName = "calendar";
      defaultDesc = "A new clinical appointment was scheduled.";
    } else if (normAction === "update") {
      label = "Appointment Updated";
      colorClass = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50";
      iconName = "edit";
      defaultDesc = "Clinical appointment details or status updated.";
    } else if (normAction === "delete") {
      label = "Appointment Cancelled";
      colorClass = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/50";
      iconName = "trash";
      defaultDesc = "Clinical appointment was deleted/cancelled.";
    }
  } else if (normEntity === "authentication") {
    if (normAction === "success") {
      label = "Login Success";
      colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/50";
      iconName = "sign";
      defaultDesc = "User login session authenticated successfully.";
    } else if (normAction === "failure") {
      label = "Login Failure";
      colorClass = "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/50";
      iconName = "trash";
      defaultDesc = "Failed user login authentication attempt logged.";
    } else if (normAction === "blocked") {
      label = "Login Blocked";
      colorClass = "bg-rose-50 text-[#881337] border-rose-200 hover:bg-rose-100/50";
      iconName = "lock";
      defaultDesc = "Login attempt rejected due to active brute-force lockout.";
    }
  }

  return { label, colorClass, iconName, defaultDesc };
}

export function AdminAuditLogsViewer() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [logs, setLogs] = useState<UnifiedAuditLogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState<AuditLogSummary | null>(null);

  // Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // UI state for details drawer
  const [selectedLog, setSelectedLog] = useState<UnifiedAuditLogEntry | null>(null);

  // CSV Export state
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const renderLabelOrBadge = (val?: string | null, textStyle = "font-semibold text-slate-700") => {
    if (val === null || val === undefined) {
      return <span className="text-slate-400 italic">None</span>;
    }
    if (val === "[REDACTED]") {
      return (
        <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200 uppercase tracking-wider">
          Redacted
        </span>
      );
    }
    return <span className={textStyle}>{val}</span>;
  };


  // Search input debouncer
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Unified loader function
  const loadData = useCallback(async (targetPage: number) => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (sourceFilter) params.set("source", sourceFilter);
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (userFilter) params.set("user", userFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (searchQuery) params.set("search", searchQuery);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      params.set("page", String(targetPage));
      params.set("page_size", String(pageSize));

      const [timelineRes, summaryRes] = await Promise.all([
        fetch(`/api/audit-logs/unified?${params.toString()}`),
        fetch(`/api/audit-logs/summary?${params.toString()}`)
      ]);

      if (!timelineRes.ok) throw new Error("Failed to load unified timeline.");
      if (!summaryRes.ok) throw new Error("Failed to load audit summary.");

      const timelineData = await timelineRes.json();
      const summaryData = await summaryRes.json();

      if (timelineData.success) {
        setLogs(timelineData.results || []);
        setTotalCount(timelineData.count || 0);
      }
      if (summaryData.success) {
        setSummary(summaryData);
      }
    } catch (err) {
      console.error("Error fetching audit data:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load audit logs.");
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, categoryFilter, userFilter, actionFilter, searchQuery, dateFrom, dateTo, pageSize]);

  // Trigger refetch of page 1 when any filter/size changes
  useEffect(() => {
    setPage(1);
    loadData(1);
  }, [sourceFilter, categoryFilter, userFilter, actionFilter, searchQuery, dateFrom, dateTo, pageSize, loadData]);

  // Handle page navigation
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadData(newPage);
  };

  const handleRefresh = () => {
    loadData(page);
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const params = new URLSearchParams();
      if (sourceFilter) params.set("source", sourceFilter);
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (userFilter) params.set("user", userFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (searchQuery) params.set("search", searchQuery);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const url = `/api/audit-logs/export?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) {
        let errMsg = "CSV Export failed.";
        try {
          const errData = await res.json();
          if (errData?.detail) errMsg = errData.detail;
        } catch {}
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;

      const contentDisposition = res.headers.get("content-disposition");
      let filename = `harmony-audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: unknown) {
      console.error("Export error:", err);
      setExportError(err instanceof Error ? err.message : "Failed to download audit logs export CSV.");
    } finally {
      setExporting(false);
    }
  };

  const renderActivityIcon = (iconName: string, className = "shrink-0") => {
    switch (iconName) {
      case "eye":
        return <Eye size={13} className={`${className} text-blue-600`} />;
      case "register":
        return <PlusCircle size={13} className={`${className} text-emerald-600`} />;
      case "edit":
        return <FileText size={13} className={`${className} text-amber-600`} />;
      case "vitals":
        return <Heart size={13} className={`${className} text-rose-600`} />;
      case "case":
        return <Clipboard size={13} className={`${className} text-indigo-600`} />;
      case "resolve":
        return <CheckCircle2 size={13} className={`${className} text-purple-600`} />;
      case "visit":
        return <Calendar size={13} className={`${className} text-sky-600`} />;
      case "doc":
        return <FileText size={13} className={`${className} text-cyan-600`} />;
      case "sign":
        return <ShieldCheck size={13} className={`${className} text-teal-600`} />;
      case "journey":
        return <Activity size={13} className={`${className} text-rose-600`} />;
      case "transition":
        return <ArrowRight size={13} className={`${className} text-violet-600`} />;
      case "calendar":
        return <Calendar size={13} className={`${className} text-fuchsia-600`} />;
      case "trash":
        return <Trash2 size={13} className={`${className} text-red-600`} />;
      default:
        return <Activity size={13} className={`${className} text-slate-500`} />;
    }
  };

  const renderValue = (value: unknown) => {
    if (value === null || value === undefined) {
      return <span className="text-slate-400 italic">None</span>;
    }
    const strVal = String(value);
    if (strVal === "[REDACTED]") {
      return (
        <span className="inline-flex items-center rounded bg-amber-50 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-200 uppercase tracking-wider">
          Redacted
        </span>
      );
    }
    return <span className="font-mono text-[11px] break-all select-all">{strVal}</span>;
  };

  const renderChangesSection = (entry: UnifiedAuditLogEntry) => {
    if (!entry.changes) {
      return (
        <div className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded-lg p-3">
          No state changes recorded for this transaction.
        </div>
      );
    }

    if (typeof entry.changes !== "object" || Object.keys(entry.changes).length === 0) {
      return (
        <div className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded-lg p-3">
          No state changes recorded for this transaction.
        </div>
      );
    }

    if (entry.source === "authentication") {
      const authMeta = entry.changes as { method?: string; outcome?: string; reason_code?: string };
      return (
        <div className="rounded-xl border border-slate-200/50 bg-slate-50/50 p-4 space-y-3">
          <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Authentication Log Metadata</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[#66736d] block font-medium">Method</span>
              <span className="font-semibold text-slate-800 font-mono text-[10px] uppercase bg-white border border-slate-200 px-2.5 py-0.5 rounded mt-0.5 inline-block">
                {authMeta.method || "unknown"}
              </span>
            </div>
            <div>
              <span className="text-[#66736d] block font-medium">Outcome</span>
              <span className="font-semibold text-slate-800 font-mono text-[10px] uppercase bg-white border border-slate-200 px-2.5 py-0.5 rounded mt-0.5 inline-block">
                {authMeta.outcome || "unknown"}
              </span>
            </div>
            <div className="col-span-2 border-t border-slate-200/60 pt-2.5">
              <span className="text-[#66736d] block font-medium">Reason Code / Lockout Trigger</span>
              <span className="font-mono text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded mt-1 inline-block font-bold">
                {authMeta.reason_code || "—"}
              </span>
            </div>
          </div>
        </div>
      );
    }

    const entries = Object.entries(entry.changes).filter(([field]) => !METADATA_FIELDS.has(field));

    if (entries.length === 0) {
      return (
        <div className="text-xs text-slate-500 italic bg-slate-50 border border-slate-200 rounded-lg p-3">
          No non-metadata field changes to display.
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-slate-200/50 overflow-hidden bg-white shadow-2xs">
        <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
          <thead>
            <tr className="bg-slate-50/80 font-extrabold text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-100">
              <th className="px-4 py-2.5">Field / Attribute</th>
              <th className="px-4 py-2.5 bg-red-50/30 text-red-700">Before</th>
              <th className="px-4 py-2.5 bg-emerald-50/30 text-emerald-700">After</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {entries.map(([field, values]) => {
              const beforeVal = values && typeof values === "object" && "before" in values ? values.before : null;
              const afterVal = values && typeof values === "object" && "after" in values ? values.after : null;
              return (
                <tr key={field} className="hover:bg-slate-50/20 transition-colors">
                  <td className="px-4 py-2 font-mono font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                    {translateFieldKey(field)}
                  </td>
                  <td className="px-4 py-2 bg-red-50/10 text-red-600 line-through">
                    {renderValue(beforeVal)}
                  </td>
                  <td className="px-4 py-2 bg-emerald-50/10 text-emerald-800 font-bold">
                    {renderValue(afterVal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6 animate-fade-in relative">

      {/* 1. Summary Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Total Events */}
        <div className="rounded-xl border border-[var(--hh-border)] bg-white p-4 flex items-center gap-4 shadow-2xs">
          <div className="rounded-lg p-2.5 bg-purple-50 border border-purple-100 shrink-0">
            <Activity className="text-[var(--hh-purple)]" size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#66736d] uppercase tracking-wider block">Total Audited Events</span>
            {loading && !summary ? (
              <span className="h-4 w-12 animate-pulse bg-slate-100 rounded inline-block mt-0.5"></span>
            ) : (
              <span className="text-lg font-extrabold text-[#3f1d58]">{summary?.total_events ?? "—"}</span>
            )}
          </div>
        </div>

        {/* System Events */}
        <div className="rounded-xl border border-[var(--hh-border)] bg-white p-4 flex items-center gap-4 shadow-2xs">
          <div className="rounded-lg p-2.5 bg-blue-50 border border-blue-100 shrink-0">
            <Cpu className="text-blue-600" size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#66736d] uppercase tracking-wider block">Core System Events</span>
            {loading && !summary ? (
              <span className="h-4 w-12 animate-pulse bg-slate-100 rounded inline-block mt-0.5"></span>
            ) : (
              <span className="text-lg font-extrabold text-blue-900">{summary?.system_events ?? "—"}</span>
            )}
          </div>
        </div>

        {/* Authentication Events */}
        <div className="rounded-xl border border-[var(--hh-border)] bg-white p-4 flex items-center gap-4 shadow-2xs">
          <div className="rounded-lg p-2.5 bg-amber-50 border border-amber-100 shrink-0">
            <ShieldCheck className="text-amber-600" size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#66736d] uppercase tracking-wider block">Auth & Lockout Events</span>
            {loading && !summary ? (
              <span className="h-4 w-12 animate-pulse bg-slate-100 rounded inline-block mt-0.5"></span>
            ) : (
              <span className="text-lg font-extrabold text-amber-900">{summary?.authentication_events ?? "—"}</span>
            )}
          </div>
        </div>

        {/* Retention Policy */}
        <div className="rounded-xl border border-[var(--hh-border)] bg-white p-4 flex items-center gap-4 shadow-2xs">
          <div className="rounded-lg p-2.5 bg-emerald-50 border border-emerald-100 shrink-0">
            <Clock className="text-emerald-600" size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#66736d] uppercase tracking-wider block">Data Retention Policy</span>
            {loading && !summary ? (
              <span className="h-4 w-24 animate-pulse bg-slate-100 rounded inline-block mt-0.5"></span>
            ) : (
              <span className="text-[11px] font-extrabold text-emerald-800 leading-tight block mt-0.5">
                {summary ? `${summary.retention_days} days (Max ${summary.export_max_rows} Export)` : "Unavailable"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Category Tabs */}
      <div className="border-b border-[var(--hh-border)]">
        <Tabs value={categoryFilter} onValueChange={(val) => setCategoryFilter(val)} className="w-full">
          <TabsList className="flex overflow-x-auto h-auto p-0 bg-transparent space-x-6 border-b border-transparent rounded-none">
            <TabsTrigger
              value="all"
              className="font-bold text-xs uppercase tracking-wider text-[#66736d] px-1 py-3 border-b-2 border-transparent data-[state=active]:border-[var(--hh-purple)] data-[state=active]:text-[#3f1d58] bg-transparent rounded-none transition-all shadow-none"
            >
              All Categories
            </TabsTrigger>
            <TabsTrigger
              value="clinical"
              className="font-bold text-xs uppercase tracking-wider text-[#66736d] px-1 py-3 border-b-2 border-transparent data-[state=active]:border-[var(--hh-purple)] data-[state=active]:text-[#3f1d58] bg-transparent rounded-none transition-all shadow-none"
            >
              Clinical
            </TabsTrigger>
            <TabsTrigger
              value="administration"
              className="font-bold text-xs uppercase tracking-wider text-[#66736d] px-1 py-3 border-b-2 border-transparent data-[state=active]:border-[var(--hh-purple)] data-[state=active]:text-[#3f1d58] bg-transparent rounded-none transition-all shadow-none"
            >
              Administration
            </TabsTrigger>
            <TabsTrigger
              value="security"
              className="font-bold text-xs uppercase tracking-wider text-[#66736d] px-1 py-3 border-b-2 border-transparent data-[state=active]:border-[var(--hh-purple)] data-[state=active]:text-[#3f1d58] bg-transparent rounded-none transition-all shadow-none"
            >
              Security
            </TabsTrigger>
            <TabsTrigger
              value="integration"
              className="font-bold text-xs uppercase tracking-wider text-[#66736d] px-1 py-3 border-b-2 border-transparent data-[state=active]:border-[var(--hh-purple)] data-[state=active]:text-[#3f1d58] bg-transparent rounded-none transition-all shadow-none"
            >
              Integration
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="font-bold text-xs uppercase tracking-wider text-[#66736d] px-1 py-3 border-b-2 border-transparent data-[state=active]:border-[var(--hh-purple)] data-[state=active]:text-[#3f1d58] bg-transparent rounded-none transition-all shadow-none"
            >
              System / Core
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 3. Advanced Filters Row */}
      <div className="bg-white rounded-xl border border-[var(--hh-border)] p-4 space-y-4 shadow-3xs">

        {exportError && (
          <div className="text-xs bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 font-semibold flex items-center justify-between">
            <span>{exportError}</span>
            <button onClick={() => setExportError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">Close</button>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <SlidersHorizontal size={14} className="text-slate-500" />
          <span>Operational Logs Filtering Controls</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          {/* Debounced Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#66736d] uppercase tracking-wider">Search terms</label>
            <input
              type="text"
              placeholder="Search actors, details, IPs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 border border-[var(--hh-border)] hover:border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)]"
            />
          </div>

          {/* Source Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#66736d] uppercase tracking-wider">Event Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full text-xs font-bold text-slate-800 border border-[var(--hh-border)] hover:border-slate-300 px-3 py-2 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)] cursor-pointer"
            >
              <option value="">All Sources</option>
              <option value="system">System Timeline Only</option>
              <option value="authentication">Auth/Lockouts Only</option>
            </select>
          </div>

          {/* User ID */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#66736d] uppercase tracking-wider">Actor User ID</label>
            <input
              type="number"
              placeholder="Filter by numeric user ID"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 border border-[var(--hh-border)] hover:border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)]"
            />
          </div>

          {/* Action Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#66736d] uppercase tracking-wider">Logged Action</label>
            <input
              type="text"
              placeholder="e.g. view, create, update, success"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 border border-[var(--hh-border)] hover:border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)]"
            />
          </div>

          {/* Date From */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#66736d] uppercase tracking-wider">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 border border-[var(--hh-border)] hover:border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)]"
            />
          </div>

          {/* Date To */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#66736d] uppercase tracking-wider">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full text-xs font-semibold text-slate-800 border border-[var(--hh-border)] hover:border-slate-300 px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)]"
            />
          </div>

          {/* Export/Refresh Actions */}
          <div className="sm:col-span-2 flex items-end gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 text-xs font-bold text-slate-700 border-slate-200 hover:border-slate-300 h-9 shrink-0 gap-1.5"
            >
              {exporting ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              Export CSV Logs
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="flex-1 text-xs font-bold text-[#3f1d58] border-slate-200 hover:bg-purple-50/50 h-9 shrink-0 gap-1.5"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Force Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* 4. Timeline Events Table */}
      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {loadError}
        </div>
      )}

      <div className="rounded-xl border border-[var(--hh-border)] bg-white overflow-hidden shadow-2xs">
        <div className="border-b border-[var(--hh-border)] bg-slate-50/50 px-5 py-3 flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#66736d] uppercase tracking-wider">Unified Operational Timeline</span>
          <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 uppercase tracking-widest gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Audit System Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="hh-compact-table w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[#66736d]">
                <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider">Action & Category</th>
                <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider">Actor / Practitioner</th>
                <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider">Target Entity</th>
                <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider">Details / Description</th>
                <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider text-right">Timestamp</th>
                <th className="px-5 py-3 font-bold uppercase text-[9px] tracking-wider text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-[#66736d] italic font-semibold">
                    <Loader2 size={24} className="animate-spin text-[var(--hh-purple)] mx-auto mb-2" />
                    Querying secure compliance timeline...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-slate-500 italic">
                    <ShieldCheck size={36} className="text-slate-300 mx-auto mb-2" />
                    No matching audit logs or timeline events found.
                  </td>
                </tr>
              ) : (
                logs.map((entry) => {
                  const { label, colorClass, iconName, defaultDesc } = getClinicalActivity(entry.entity_type, entry.action);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/25 transition-colors">

                      {/* Action & Category */}
                      <td className="px-5 py-3">
                        <div className="space-y-1">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold border items-center gap-1.5 transition-all uppercase ${colorClass}`}>
                            {renderActivityIcon(iconName)}
                            {label}
                          </span>
                          <span className="block text-[9px] uppercase tracking-wider font-extrabold text-slate-400">
                            {entry.category}
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="px-5 py-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-slate-700 flex items-center gap-1">
                            <User size={12} className="text-slate-400" />
                            {renderLabelOrBadge(entry.actor_name, "font-semibold text-slate-700")}
                          </span>
                          {entry.actor_role && (
                            renderLabelOrBadge(
                              entry.actor_role,
                              "rounded bg-[#f0e7f3] border border-[#e7d7ef] text-[#3f1d58] text-[9px] font-extrabold px-1.5 py-0.5 uppercase tracking-wide"
                            )
                          )}
                        </div>
                        {entry.actor_id !== null && (
                          <span className="block text-[9px] font-mono text-[#66736d] mt-0.5">User ID: #{entry.actor_id}</span>
                        )}
                      </td>

                      {/* Target Entity */}
                      <td className="px-5 py-3">
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                          {translateEntityName(entry.entity_type)} #{entry.entity_id}
                        </span>
                      </td>

                      {/* Details */}
                      <td className="px-5 py-3 max-w-sm truncate text-[#66736d] font-medium leading-normal">
                        {renderLabelOrBadge(entry.details || defaultDesc, "text-[#66736d] font-medium leading-normal")}
                      </td>

                      {/* Timestamp */}
                      <td className="px-5 py-3 text-right text-slate-500 font-medium whitespace-nowrap text-3xs uppercase tracking-wide">
                        <span className="flex items-center justify-end gap-1.5 font-semibold">
                          <Calendar size={11} className="text-slate-400" />
                          {formatLogDateTime(entry.created_at)}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(entry)}
                          className="text-xs font-bold text-[var(--hh-purple)] hover:bg-purple-50 hover:text-[#3f1d58] p-1.5 h-auto rounded-lg"
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between border border-[var(--hh-border)] bg-white rounded-xl p-3 gap-3 shadow-3xs text-xs">
          <div className="text-slate-500 font-semibold">
            Showing Page <span className="font-bold text-slate-800">{page}</span> of <span className="font-bold text-slate-800">{totalPages}</span> ({totalCount} total events)
          </div>

          <div className="flex items-center gap-4">

            {/* Page Size Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="font-bold text-slate-700 bg-slate-50 border border-[var(--hh-border)] rounded-md p-1 focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)] cursor-pointer"
              >
                <option value={25}>25 entries</option>
                <option value={50}>50 entries</option>
                <option value={100}>100 entries</option>
              </select>
            </div>

            {/* Nav Arrows */}
            <div className="flex gap-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || loading}
                className="h-8 w-8 p-0 border-slate-200"
              >
                <ChevronLeft size={15} />
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || loading}
                className="h-8 w-8 p-0 border-slate-200"
              >
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Sliding Event Details Drawer (Responsive right-side panel / bottom-sheet) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:flex-row md:justify-end">

          {/* Backdrop Overlay */}
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity duration-200"
            onClick={() => setSelectedLog(null)}
          />

          {/* Responsive Sheet Container */}
          <div className="relative flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out
                          w-full h-[75vh] md:h-full md:w-[480px] rounded-t-2xl md:rounded-t-none md:rounded-l-2xl">

            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[var(--hh-border)] px-5 py-4 bg-[#fcf9fe] shrink-0">
              <div>
                <span className="rounded bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-extrabold px-1.5 py-0.5 uppercase tracking-wider block w-fit mb-1.5">
                  {selectedLog.source} log
                </span>
                <h3 className="text-sm font-bold text-[#3f1d58] uppercase tracking-wider leading-none">
                  Audit Activity Context
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Reference: {selectedLog.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                aria-label="Close audit event details"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus:outline-none"
              >
                <XCircle size={18} />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Event Overview Section */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Overview & Description</span>
                <div className="bg-slate-50 border border-slate-200/50 p-4 rounded-xl text-xs leading-relaxed font-semibold">
                  {renderLabelOrBadge(selectedLog.details || "System automated activity record logged.", "text-slate-700 leading-relaxed font-semibold")}
                </div>
              </div>

              {/* Core Context Rows */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Actor and Entity Parameters</span>
                <div className="rounded-xl border border-slate-200/50 bg-white overflow-hidden text-xs divide-y divide-slate-100 font-semibold text-slate-800">
                  <div className="flex justify-between p-3 items-center">
                    <span className="text-slate-500 font-medium">Actor Name</span>
                    {renderLabelOrBadge(selectedLog.actor_name, "font-bold text-slate-800")}
                  </div>
                  {selectedLog.actor_role && (
                    <div className="flex justify-between p-3 items-center">
                      <span className="text-slate-500 font-medium">Actor Role</span>
                      {renderLabelOrBadge(
                        selectedLog.actor_role,
                        "rounded bg-[#f0e7f3] border border-[#e7d7ef] text-[#3f1d58] text-[9px] font-extrabold px-1.5 py-0.5 uppercase tracking-wide"
                      )}
                    </div>
                  )}
                  {selectedLog.actor_id !== null && (
                    <div className="flex justify-between p-3 items-center">
                      <span className="text-slate-500 font-medium">Actor User ID</span>
                      <span className="font-mono text-slate-700">#{selectedLog.actor_id}</span>
                    </div>
                  )}
                  <div className="flex justify-between p-3 items-center">
                    <span className="text-slate-500 font-medium">Target Record Type</span>
                    <span>{translateEntityName(selectedLog.entity_type)}</span>
                  </div>
                  <div className="flex justify-between p-3 items-center">
                    <span className="text-slate-500 font-medium">Target Record Primary ID</span>
                    <span className="font-mono text-slate-700">#{selectedLog.entity_id}</span>
                  </div>
                  <div className="flex justify-between p-3 items-center">
                    <span className="text-slate-500 font-medium">Execution Category</span>
                    <span className="uppercase text-[9px] tracking-wider font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/50">
                      {selectedLog.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Network Context Cards */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Network Execution Context</span>
                <div className="rounded-xl border border-slate-200/50 overflow-hidden text-xs divide-y divide-slate-100 font-semibold text-slate-700">

                  {/* IP Address */}
                  <div className="flex justify-between p-3 items-center">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Globe size={13} className="text-slate-400" />
                      Client IP Address
                    </span>
                    {renderLabelOrBadge(
                      selectedLog.ip_address || "Internal Core Link",
                      "font-mono text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px]"
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="flex justify-between p-3 items-center">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      Recorded Timestamp
                    </span>
                    <span className="text-slate-800 text-[10px] font-semibold uppercase tracking-wider font-mono">
                      {new Date(selectedLog.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* User Agent Block */}
                  {selectedLog.user_agent && (
                    <div className="p-3 space-y-1 bg-slate-50/50">
                      <span className="text-slate-400 text-[9px] font-extrabold uppercase block tracking-wider">Browser User Agent Header</span>
                      {renderLabelOrBadge(
                        selectedLog.user_agent,
                        "font-mono text-[10px] text-slate-500 leading-normal break-all bg-white border border-slate-200/40 p-2.5 rounded-lg shadow-3xs select-all block"
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Changes & Audit Diffs Section */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">Transaction State Modifications</span>
                {renderChangesSection(selectedLog)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
