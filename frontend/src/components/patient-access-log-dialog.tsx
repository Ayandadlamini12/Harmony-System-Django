"use client";

import { useState, useEffect } from "react";
import { 
  LockKeyhole, 
  Loader2, 
  ChevronDown, 
  ChevronRight, 
  Calendar, 
  User, 
  Globe, 
  AlertTriangle, 
  ShieldCheck, 
  FileText, 
  Heart, 
  Clipboard, 
  Activity, 
  ArrowRight, 
  CheckCircle2, 
  PlusCircle, 
  Trash2, 
  Eye 
} from "lucide-react";
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

// Ignore redundant metadata fields in details/diff view
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

// Premium map to translate technical database snake_case keys into friendly medical terms
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

// Translate dry entity database actions into clear, professional clinical events
function getClinicalActivity(entityType: string, action: string) {
  const normEntity = entityType.toLowerCase().replace(/_/g, "");
  const normAction = action.toLowerCase();

  let label = `${action} ${entityType}`;
  let colorClass = "bg-slate-50 text-slate-700 border-slate-200";
  let iconName = "default";
  let defaultDesc = "System database update logged.";

  // 1. Patient demographics
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
  }
  // 2. Patient profile
  else if (normEntity === "patientprofile") {
    label = "Medical History Updated";
    colorClass = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/50";
    iconName = "edit";
    defaultDesc = "Patient clinical background and medical profile updated.";
  }
  // 3. Vitals
  else if (normEntity === "vital") {
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
  }
  // 4. Clinical Case
  else if (normEntity === "case") {
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
  }
  // 5. Visits
  else if (normEntity === "visit") {
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
  }
  // 6. Documents
  else if (normEntity === "patientdocument") {
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
  }
  // 7. Journey & Queue Check-In
  else if (normEntity === "patientjourney" || normEntity === "patientjourneyevent" || normEntity === "patientcheckin") {
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
  }
  // 8. Appointment
  else if (normEntity === "appointment") {
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
  }

  return { label, colorClass, iconName, defaultDesc };
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" type="button" className="text-xs flex items-center gap-1.5 transition-all active:scale-[0.98]">
          <LockKeyhole size={14} />
          Access log
        </Button>
      </DialogTrigger>
      
      <DialogContent className="w-[min(96vw,840px)] flex flex-col max-h-[85vh] p-0 gap-0 overflow-hidden bg-white/95 backdrop-blur-md rounded-2xl border border-[var(--hh-border)] shadow-xl animate-fade-in">
        <div className="border-b border-[var(--hh-border)] px-6 py-5 bg-slate-50/50">
          <DialogTitle className="text-lg font-extrabold text-[var(--hh-purple-dark)] flex items-center gap-2">
            <span>🛡️</span> Patient Clinical Security Log
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-xs font-semibold text-slate-500">
            Real-time chronological timeline tracking all accesses, vital readings, clinical cases, and demographic updates for <strong className="text-[var(--hh-purple)]">{patient.full_name_display}</strong> ({patient.patient_code}).
          </DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {logs.length === 0 && loading && page === 1 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 size={36} className="animate-spin text-[var(--hh-purple)]" />
              <span className="text-xs font-bold uppercase tracking-wider">Compiling security logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <ShieldCheck size={40} className="text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-500">No activity logs recorded for this patient.</p>
              <p className="text-2xs text-slate-400 mt-1">Record views, updates, vitals, cases, and check-ins are registered securely in real time.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-3xs font-extrabold text-slate-400 uppercase tracking-widest mb-1">
                <span>Clinical Timeline Logs ({totalCount} events)</span>
                <span>Security Actor & Context</span>
              </div>
              
              <div className="divide-y divide-slate-100 overflow-hidden border border-[var(--hh-border)] bg-white rounded-xl shadow-xs">
                {logs.map((entry) => {
                  const isExpanded = expandedLogId === entry.id;
                  
                  // Filter out redundant metadata fields
                  const filteredChangedFields = entry.changed_fields 
                    ? Object.entries(entry.changed_fields).filter(([field]) => !METADATA_FIELDS.has(field))
                    : [];

                  const hasChanges = (entry.action === "update" || entry.action === "create") && filteredChangedFields.length > 0;
                  const { label, colorClass, iconName, defaultDesc } = getClinicalActivity(entry.entity_type, entry.action);

                  return (
                    <div key={entry.id} className="transition-colors duration-150 hover:bg-slate-50/15">
                      <div 
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 cursor-pointer select-none ${isExpanded ? 'bg-slate-50/30' : ''}`}
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 shrink-0 bg-slate-100/60 p-1.5 rounded-lg border border-slate-200/50">
                            {isExpanded ? (
                              <ChevronDown size={14} className="text-slate-500" />
                            ) : (
                              <ChevronRight size={14} className="text-slate-500" />
                            )}
                          </div>
                          <div className="grid gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 transition-all ${colorClass}`}>
                                {renderActivityIcon(iconName)}
                                {label}
                              </span>
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
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

                        <div className="flex items-center justify-end sm:pl-0 pl-8">
                          {hasChanges ? (
                            <span className="text-3xs font-extrabold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 flex items-center gap-1 uppercase tracking-wider">
                              <FileText size={10} />
                              {filteredChangedFields.length} values altered
                            </span>
                          ) : (
                            <span className="text-3xs font-extrabold text-slate-400 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 uppercase tracking-wider">
                              Snapshot Log
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Section */}
                      {isExpanded && (
                        <div className="bg-slate-50/50 p-4 pl-12 border-t border-slate-100/50 space-y-3 animate-slide-down">
                          <div className="text-xs text-slate-600 font-medium">
                            <strong className="font-bold text-slate-800">Activity Detail:</strong> {entry.details || defaultDesc}
                          </div>

                          {entry.user_agent && (
                            <div className="text-[10px] font-semibold text-slate-400 tracking-wide font-mono break-all bg-white p-2.5 rounded-lg border border-slate-200/40 shadow-2xs">
                              <strong className="text-[9px] uppercase font-bold text-slate-500 mr-2 font-sans">User Agent:</strong> {entry.user_agent}
                            </div>
                          )}

                          {hasChanges && filteredChangedFields.length > 0 && (
                            <div className="rounded-xl border border-slate-200/60 overflow-hidden bg-white shadow-2xs">
                              <table className="min-w-full divide-y divide-slate-100 text-xs text-left">
                                <thead>
                                  <tr className="bg-slate-50/80 font-extrabold text-slate-500 uppercase tracking-widest text-[9px] border-b border-slate-100">
                                    <th className="px-3 py-2.5">Field / Metric</th>
                                    <th className="px-3 py-2.5 bg-red-50/30 text-red-700">Before Change</th>
                                    <th className="px-3 py-2.5 bg-emerald-50/30 text-emerald-700">After Change</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {filteredChangedFields.map(([field, values]) => (
                                    <tr key={field} className="hover:bg-slate-50/20 transition-colors">
                                      <td className="px-3 py-2 font-mono font-bold text-slate-700 text-[11px] uppercase tracking-wide">
                                        {translateFieldKey(field)}
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
                    className="text-xs font-bold uppercase tracking-wider px-6 border-slate-200 text-slate-600 hover:text-[var(--hh-purple)] active:scale-[0.98]"
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
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Security Logging Active
          </div>
          <Button variant="secondary" size="sm" onClick={() => setOpen(false)} className="text-xs font-bold uppercase active:scale-[0.98]">
            Close log
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
