"use client";

import { useState, useMemo, useEffect } from "react";
import { 
  Send, 
  ExternalLink, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  RefreshCw, 
  Users, 
  UserCheck, 
  Activity, 
  HelpCircle,
  FileText,
  Lock,
  MessageSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// ==========================================
// 1. Core Interfaces & Mock Data Types
// ==========================================

export interface ZulipMessage {
  id: string;
  senderName: string;
  senderRole: "clinician" | "receptionist" | "admin" | "system";
  body: string;
  sentAt: string;
  isSystem: boolean;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  role: string;
  entityType: string;
  entityId: string | number;
  channel: string;
  topic: string;
  sanitizedPayload: string;
  timestamp: string;
  status: "success" | "failed" | "queued";
}

interface ZulipCoordinationCardProps {
  channel: string; // e.g., "front-desk", "system-support", "clinical-handover", "appointments"
  topic: string; // e.g., "PATIENT FLOW | Zahara Dlamini | 2026-06-08"
  linkedEntityType: "patient" | "ticket" | "appointment" | "consent" | "employee";
  linkedEntityId: string | number;
  linkedEntityName?: string;
  patientCode?: string;
  userRole?: "clinician" | "receptionist" | "admin" | "other";
  onPostSuccess?: (msg: string) => void;
}

// Default initial seeds for the Communication Context Service (recent messages)
const INITIAL_CHANNEL_SEEDS: Record<string, ZulipMessage[]> = {
  "front-desk": [
    {
      id: "fd-1",
      senderName: "Clinic Dispatcher",
      senderRole: "system",
      body: "⏱️ **QUEUE ASSIGNMENT**: Patient Zahara Dlamini assigned Queue #14 for consultation. (Method: Reception Desk)",
      sentAt: "10:15 AM",
      isSystem: true
    },
    {
      id: "fd-2",
      senderName: "Nurse Gcina",
      senderRole: "clinician",
      body: "✅ **VITALS RECORDED** for Queue #14. BP: 120/80 | Temp: 36.6°C. Ready for clinical review. No urgent flags.",
      sentAt: "10:22 AM",
      isSystem: false
    }
  ],
  "system-support": [
    {
      id: "ss-1",
      senderName: "Harmony Watchdog",
      senderRole: "system",
      body: "🚨 **SYSTEM TICKET CREATED**: Ticket #SUPPORT-0142 submitted. Service: Redis connection speed warning.",
      sentAt: "09:30 AM",
      isSystem: true
    },
    {
      id: "ss-2",
      senderName: "Admin Ayanda",
      senderRole: "admin",
      body: "🔧 I am investigating the latency spikes on the cache. I have restarted Redis on port 6379 on the ARM64 server.",
      sentAt: "09:41 AM",
      isSystem: false
    }
  ],
  "clinical-handover": [
    {
      id: "ch-1",
      senderName: "Shift Scheduler",
      senderRole: "system",
      body: "📝 **SHIFT HANDOVER**: Clinical handover group initialized for clinical ward check-in reset.",
      sentAt: "08:00 AM",
      isSystem: true
    },
    {
      id: "ch-2",
      senderName: "Dr. Dlamini",
      senderRole: "clinician",
      body: "🩺 Patient PAT-2026-000412 stabilized. Routine follow-up scheduled for Wednesday. Notes written in MIS file.",
      sentAt: "08:15 AM",
      isSystem: false
    }
  ],
  "appointments": [
    {
      id: "ap-1",
      senderName: "Calendar Daemon",
      senderRole: "system",
      body: "📅 **APPOINTMENT CREATED**: Follow-up visit scheduled for PAT-2026-000001 on 2026-06-10.",
      sentAt: "11:00 AM",
      isSystem: true
    }
  ]
};

// ==========================================
// 2. Policy Filtering & Formatting Logic
// ==========================================

// Medical/sensitive keywords to scan for
const SENSITIVE_KEYWORDS = [
  "hiv", "aids", "cancer", "tuberculosis", "tb", "diabetes", "diabetic", "hypertension", 
  "asthma", "pregnancy", "pregnant", "flu", "syphilis", "gonorrhea", "hepatitis", "depression",
  "anxiety", "schizophrenia", "pneumonia", "bipolar", "diagnosis", "diagnosed", "remedy"
];

/**
 * Policy Filter: Decides what category of data may leave the secure MIS.
 * Sanitizes input to protect patient confidentiality.
 */
function applyPolicyFilter(text: string): { sanitizedText: string; isScrubbed: boolean } {
  let isScrubbed = false;
  let result = text;

  // Scan and redact clinical keywords with strict privacy notices
  for (const keyword of SENSITIVE_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    if (regex.test(result)) {
      result = result.replace(regex, "[CLINICAL DETAIL REDACTED FOR PRIVACY]");
      isScrubbed = true;
    }
  }

  return { sanitizedText: result, isScrubbed };
}

/**
 * Message Formatter: Transforms sanitized operational data into Zulip markdown templates
 */
function getTemplatesForChannel(channel: string, context: { entityId?: string | number; entityName?: string; patientCode?: string }) {
  const patientInitials = context.entityName 
    ? context.entityName.split(" ").map(n => n[0]).join("") 
    : "PAT";
    
  switch (channel) {
    case "front-desk":
      return [
        {
          id: "fd_ready",
          label: "Mark Patient Ready",
          roleRequired: ["receptionist", "admin"],
          text: `📢 **PATIENT READY**: Queue #${context.entityId || "XX"} is ready for clinician room handover. Initials: ${patientInitials}.`
        },
        {
          id: "fd_vitals",
          label: "Request Vitals Update",
          roleRequired: ["receptionist", "clinician", "admin"],
          text: `⏱️ **VITALS REQUESTED**: Please record vitals for Queue #${context.entityId || "XX"} (${patientInitials}).`
        },
        {
          id: "fd_checkout",
          label: "Notify Checkout",
          roleRequired: ["receptionist", "admin"],
          text: `✅ **FLOW COMPLETE**: Patient Queue #${context.entityId || "XX"} checked out. Folder archived.`
        }
      ];
    case "system-support":
      return [
        {
          id: "ss_escalate",
          label: "Escalate Ticket",
          roleRequired: ["admin"],
          text: `🚨 **TICKET ESCALATION**: Ticket #SUPPORT-${context.entityId || "XXXX"} escalated to Senior DevOps.`
        },
        {
          id: "ss_alert",
          label: "Notify Specialist",
          roleRequired: ["admin"],
          text: `⚠️ **ATTENTION NEEDED**: Ticket #SUPPORT-${context.entityId || "XXXX"} requires priority intervention. [Secure MIS Link](https://mis.harmonyhealthsz.com/administration/support-tickets)`
        }
      ];
    case "appointments":
      return [
        {
          id: "ap_confirm",
          label: "Confirm Follow-Up",
          roleRequired: ["receptionist", "admin"],
          text: `📅 **CONFIRMED**: Follow-up scheduled for patient ${context.patientCode || "PAT"} on today's coordination board.`
        },
        {
          id: "ap_missed",
          label: "Log Missed Appt",
          roleRequired: ["receptionist", "admin"],
          text: `⚠️ **MISSED APPOINTMENT**: Patient ${context.patientCode || "PAT"} did not check in for 2026-06-08. Triggering recall list.`
        }
      ];
    default:
      return [
        {
          id: "gen_update",
          label: "Post Operational Update",
          roleRequired: ["receptionist", "clinician", "admin"],
          text: `📝 **COORDINATION UPDATE**: Operational update on topic ${context.entityId || "X"}.`
        }
      ];
  }
}

// ==========================================
// 3. Component Definition
// ==========================================

export function ZulipCoordinationCard({
  channel,
  topic,
  linkedEntityType,
  linkedEntityId,
  linkedEntityName,
  patientCode,
  userRole = "receptionist",
  onPostSuccess
}: ZulipCoordinationCardProps) {
  // Communication Context Service (CCS) States
  const [messages, setMessages] = useState<ZulipMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  
  // Simulation and Failure States
  const [isZulipOffline, setIsZulipOffline] = useState(false);
  const [isPosting, setIsZposted] = useState(false);
  const [pendingPost, setPendingPost] = useState<string | null>(null);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // Initialize Messages from CCS seeds
  useEffect(() => {
    if (INITIAL_CHANNEL_SEEDS[channel]) {
      setMessages(INITIAL_CHANNEL_SEEDS[channel]);
    } else {
      setMessages([
        {
          id: "gen-1",
          senderName: "System Daemon",
          senderRole: "system",
          body: `ℹ️ Channel #${channel} topic initiated for this operational workspace.`,
          sentAt: "08:00 AM",
          isSystem: true
        }
      ]);
    }
  }, [channel]);

  // Available formatted templates for current role
  const templates = useMemo(() => {
    const rawTemplates = getTemplatesForChannel(channel, {
      entityId: linkedEntityId,
      entityName: linkedEntityName,
      patientCode
    });
    return rawTemplates;
  }, [channel, linkedEntityId, linkedEntityName, patientCode]);

  // Apply Policy Filter to input text in real-time
  const { sanitizedText, isScrubbed } = useMemo(() => {
    return applyPolicyFilter(inputText);
  }, [inputText]);

  // Role Permission Verification
  const userRoleLabel = useMemo(() => {
    switch (userRole) {
      case "admin": return "Administrator";
      case "clinician": return "Clinician";
      case "receptionist": return "Receptionist";
      default: return "Staff Operator";
    }
  }, [userRole]);

  const hasWritePermission = useMemo(() => {
    // Basic verification gate
    if (channel === "system-support") return userRole === "admin";
    if (channel === "clinical-handover") return userRole === "clinician" || userRole === "admin";
    return userRole === "receptionist" || userRole === "clinician" || userRole === "admin";
  }, [channel, userRole]);

  // Deep Link Navigation Resolver (Strictly Navigation)
  const handleOpenInZulip = () => {
    const safeTopic = encodeURIComponent(topic);
    const deepLinkUrl = `https://zulip.harmonyhealthsz.com/#narrow/stream/${channel}/topic/${safeTopic}`;
    
    toast.success(`Opening Zulip in external tab: #[${channel}] > ${topic}`);
    window.open(deepLinkUrl, "_blank");
  };

  // Safe Outbound Posting Service
  const handlePostUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasWritePermission) {
      toast.error(`Access Denied: Your role (${userRoleLabel}) is not authorized to post in #${channel}.`);
      return;
    }

    const payload = sanitizedText.trim();
    if (!payload) return;

    setIsZposted(true);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Handle Fail State (Failure and Retry pattern)
    if (isZulipOffline) {
      setIsZposted(false);
      setPendingPost(payload);
      
      const failedLog: AuditLogEntry = {
        id: `aud-${Date.now()}`,
        actor: userRoleLabel,
        role: userRole,
        entityType: linkedEntityType,
        entityId: linkedEntityId,
        channel,
        topic,
        sanitizedPayload: payload,
        timestamp: new Date().toLocaleTimeString(),
        status: "failed"
      };
      setAuditLogs(prev => [failedLog, ...prev]);
      toast.error("Network Error: Zulip Server is unreachable. Payload saved in retry buffer.");
      return;
    }

    // Success State posting to mock server
    const newMessage: ZulipMessage = {
      id: `msg-${Date.now()}`,
      senderName: userRole === "admin" ? "Admin Ayanda" : userRole === "clinician" ? "Nurse Gcina" : "Receptionist Thandeka",
      senderRole: userRole === "other" ? "receptionist" : userRole,
      body: payload,
      sentAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSystem: false
    };

    const successLog: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      actor: newMessage.senderName,
      role: userRole,
      entityType: linkedEntityType,
      entityId: linkedEntityId,
      channel,
      topic,
      sanitizedPayload: payload,
      timestamp: new Date().toLocaleTimeString(),
      status: "success"
    };

    setMessages(prev => [...prev, newMessage]);
    setAuditLogs(prev => [successLog, ...prev]);
    setInputText("");
    setSelectedTemplateId("");
    setPendingPost(null);
    setIsZposted(false);

    toast.success("Operational update posted successfully to Zulip topic.");
    if (onPostSuccess) onPostSuccess(payload);
  };

  // Retry Buffer Post
  const handleRetryPendingPost = async () => {
    if (!pendingPost) return;
    setIsZposted(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (isZulipOffline) {
      setIsZposted(false);
      toast.error("Retry Failed: Zulip Server remains offline. Please try again later.");
      return;
    }

    const newMessage: ZulipMessage = {
      id: `msg-${Date.now()}`,
      senderName: userRole === "admin" ? "Admin Ayanda" : userRole === "clinician" ? "Nurse Gcina" : "Receptionist Thandeka",
      senderRole: userRole === "other" ? "receptionist" : userRole,
      body: pendingPost,
      sentAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSystem: false
    };

    const successLog: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      actor: newMessage.senderName,
      role: userRole,
      entityType: linkedEntityType,
      entityId: linkedEntityId,
      channel,
      topic,
      sanitizedPayload: pendingPost,
      timestamp: new Date().toLocaleTimeString(),
      status: "success"
    };

    setMessages(prev => [...prev, newMessage]);
    setAuditLogs(prev => [successLog, ...prev]);
    setPendingPost(null);
    setIsZposted(false);
    toast.success("Retry Success: Buffer payload cleared and sent!");
  };

  return (
    <div className="rounded-xl border border-[#c7d7cd] bg-white p-5 shadow-sm space-y-4">
      {/* 1. Header with Topic Resolution & Connection Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0ecfc] text-[var(--hh-purple)]">
            <MessageSquare size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-bold tracking-wider text-[var(--hh-purple)] uppercase bg-[#f5f1fd] px-1.5 py-0.5 rounded">
                #{channel}
              </span>
              <span className="text-[10px] font-bold text-slate-400">Deterministic Mapping</span>
            </div>
            <h3 className="text-xs font-bold text-[var(--hh-purple-dark)] line-clamp-1 mt-0.5" title={topic}>
              {topic}
            </h3>
          </div>
        </div>

        {/* Diagnostic Simulator Pill */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-2 py-1">
          <button 
            type="button"
            onClick={() => {
              setIsZulipOffline(!isZulipOffline);
              toast.info(isZulipOffline ? "Zulip integration is back ONLINE." : "Zulip network disconnect simulated.");
            }}
            className={`flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 transition ${
              isZulipOffline 
                ? "bg-red-50 text-red-600 border border-red-200" 
                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            }`}
          >
            <Activity size={10} className={isZulipOffline ? "" : "animate-pulse"} />
            {isZulipOffline ? "Offline Sim" : "Online"}
          </button>
        </div>
      </div>

      {/* 2. Permission Indicator */}
      <div className="flex items-center justify-between bg-[#f8fbfa] border border-slate-100 p-2.5 rounded-lg text-xs">
        <div className="flex items-center gap-1.5 text-slate-600">
          <UserCheck size={14} className="text-emerald-600" />
          <span>Active Role: <strong className="text-slate-800">{userRoleLabel}</strong></span>
        </div>
        {hasWritePermission ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
            <ShieldCheck size={11} /> Authorized to Post
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
            <Lock size={11} /> Restricted View
          </span>
        )}
      </div>

      {/* 3. Connection Loss Retry Buffer Banner */}
      {pendingPost && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 text-amber-600 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold">Outgoing payload saved in offline queue.</p>
              <p className="text-[11px] text-amber-700 line-clamp-1 mt-0.5 font-mono">{pendingPost}</p>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleRetryPendingPost}
            disabled={isPosting}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold h-7 py-0 text-[10px]"
          >
            <RefreshCw size={11} className={`mr-1 ${isPosting ? "animate-spin" : ""}`} />
            Retry Sent
          </Button>
        </div>
      )}

      {/* 4. Timeline Stream of Coordination Events (CCS View) */}
      <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Coordination Activity</div>
        {messages.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">No active coordination events.</div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`p-2.5 rounded-lg text-xs leading-relaxed transition ${
                msg.isSystem 
                  ? "bg-slate-100 border border-slate-200/60 text-slate-600" 
                  : msg.senderRole === "clinician"
                    ? "bg-[#fcfaff] border border-[#f0e8fc] text-slate-800"
                    : msg.senderRole === "admin"
                      ? "bg-slate-50 border border-slate-200 text-slate-800"
                      : "bg-[#f4fbf5] border border-[#e3f4e6] text-slate-800"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500 mb-1.5">
                <span className="flex items-center gap-1">
                  {msg.isSystem ? (
                    <Badge variant="outline" className="h-4 text-[9px] px-1 bg-white text-slate-500 border-slate-200">System Bot</Badge>
                  ) : (
                    <Badge variant="harmony" className="h-4 text-[9px] px-1 capitalize">{msg.senderRole}</Badge>
                  )}
                  <span className="font-semibold text-slate-700">{msg.senderName}</span>
                </span>
                <span>{msg.sentAt}</span>
              </div>
              <p className="whitespace-pre-wrap font-sans">{msg.body}</p>
            </div>
          ))
        )}
      </div>

      {/* 5. Outbound Post Forms (Controlled Templates & Policy Filters) */}
      {hasWritePermission ? (
        <form onSubmit={handlePostUpdate} className="space-y-3 pt-1 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Template Selection */}
            <div className="flex-1">
              <label htmlFor={`tmpl-${channel}`} className="sr-only">Choose Action Template</label>
              <select
                id={`tmpl-${channel}`}
                className="w-full text-xs h-9 rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)]"
                value={selectedTemplateId}
                onChange={(e) => {
                  const tid = e.target.value;
                  setSelectedTemplateId(tid);
                  const selected = templates.find(t => t.id === tid);
                  if (selected) {
                    setInputText(selected.text);
                  }
                }}
              >
                <option value="">-- Choose Template Action --</option>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Form Actions */}
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="ghost"
                onClick={handleOpenInZulip}
                className="text-xs font-semibold h-9 px-3 border border-slate-200 text-slate-600 cursor-pointer"
                title="Open in Zulip App"
              >
                <ExternalLink size={14} className="mr-1" />
                Open Zulip
              </Button>
              <Button
                type="submit"
                disabled={isPosting || !inputText.trim()}
                className="bg-[var(--hh-purple)] hover:bg-[var(--hh-purple-dark)] text-white font-bold h-9 px-4 text-xs cursor-pointer"
              >
                <Send size={13} className="mr-1" />
                Post
              </Button>
            </div>
          </div>

          {/* Custom Message Input */}
          <div className="space-y-1.5">
            <textarea
              className="w-full min-h-[50px] p-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)] leading-normal"
              placeholder="Post a customized update... (Scrubbed against Policy Filter rules)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            {/* Privacy Compliance Scrubber Panel */}
            {inputText.trim() && (
              <div className="bg-[#fafbff] border border-slate-100 p-2.5 rounded-lg text-[11px] leading-relaxed">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-1">
                  <span className="text-slate-400 tracking-wider">Policy Compliance Scrubber Output</span>
                  {isScrubbed ? (
                    <span className="text-amber-600 flex items-center gap-1 bg-amber-50 px-1 rounded font-bold">
                      <AlertTriangle size={10} /> Clinical Notes Redacted
                    </span>
                  ) : (
                    <span className="text-emerald-700 flex items-center gap-1 bg-emerald-50 px-1 rounded font-bold">
                      <ShieldCheck size={10} /> Safe to Post
                    </span>
                  )}
                </div>
                <div className="font-mono text-slate-600 border border-slate-200/50 bg-white p-2 rounded max-h-16 overflow-y-auto whitespace-pre-wrap">
                  {sanitizedText}
                </div>
                {isScrubbed && (
                  <p className="text-[10px] text-amber-700 mt-1 leading-normal">
                    ⚠️ <strong>Clinical Warning</strong>: Diagnoses/medical terms are strictly barred. Payloads are scrubbed to secure links only.
                  </p>
                )}
              </div>
            )}
          </div>
        </form>
      ) : (
        <div className="p-3 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-center text-xs text-slate-500">
          🔒 You do not have permissions to trigger posts on this channel. Access limited to read-only timelines.
        </div>
      )}

      {/* 6. Irreversible Session Integration Audit Trail */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowAuditLogs(!showAuditLogs)}
          className="text-[10px] font-bold tracking-wider text-slate-500 hover:text-slate-700 uppercase flex items-center gap-1.5 focus:outline-none"
        >
          <span>{showAuditLogs ? "▼ Hide" : "▶ Show"} Integration Audit Trail</span>
          <Badge variant="outline" className="h-4 text-[9px] px-1 font-mono text-slate-400">{auditLogs.length} Events</Badge>
        </button>

        {showAuditLogs && (
          <div className="mt-2 space-y-2 border border-[#c7d7cd]/60 rounded-lg p-2.5 bg-slate-50/30 max-h-40 overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="text-center py-4 text-[10px] text-slate-400 font-medium">No session audit logs recorded.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="border-b border-slate-100 pb-1.5 last:border-0 text-[10px] leading-relaxed font-mono">
                  <div className="flex items-center justify-between font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      {log.status === "success" ? (
                        <CheckCircle2 size={10} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={10} className="text-red-500" />
                      )}
                      <span>{log.actor} ({log.role.toUpperCase()})</span>
                    </span>
                    <span>{log.timestamp}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-slate-400 mt-1">
                    <div><strong>Target Topic:</strong> #{log.channel} &gt; {log.topic}</div>
                    <div><strong>Entity Reference:</strong> {log.entityType.toUpperCase()}:{log.entityId}</div>
                  </div>
                  <div className="bg-white/80 p-1.5 rounded border border-slate-200/50 mt-1 text-slate-600 line-clamp-2">
                    {log.sanitizedPayload}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
