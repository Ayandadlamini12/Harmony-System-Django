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

export interface ZulipOutboundEvent {
  id: number;
  actor: number;
  actor_name: string;
  actor_role?: "admin" | "clinician" | "receptionist" | string;
  channel: string;
  topic: string;
  linked_entity_type: "patient" | "ticket" | "appointment" | "consent" | "employee";
  linked_entity_id: string;
  raw_payload: string;
  sanitized_payload: string;
  template_key: string;
  status: "pending" | "success" | "failed" | "retry_buffered";
  response_metadata: Record<string, any>;
  retry_count: number;
  open_in_zulip_url?: string;
  created_at: string;
  updated_at: string;
}

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
  // Real dynamic states loaded from Next.js proxy endpoints
  const [messages, setMessages] = useState<ZulipOutboundEvent[]>([]);
  const [inputText, setInputText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  // Simulation & Failure States
  const [isZulipOffline, setIsZulipOffline] = useState(false);
  const [pendingPost, setPendingPost] = useState<string | null>(null);

  // Audit Log State
  const [auditLogs, setAuditLogs] = useState<ZulipOutboundEvent[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);

  // Fetch real messages from API proxy
  const fetchMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/zulip/messages/?channel=${encodeURIComponent(channel)}&topic=${encodeURIComponent(topic)}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.results || []);
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Failed to fetch coordination card messages:", errData.detail || res.statusText);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Fetch real audit logs from API proxy
  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/zulip/outbound-events/?channel=${encodeURIComponent(channel)}`);
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data) ? data : (data.results || []);
        setAuditLogs(results);
      } else {
        console.error("Failed to fetch audit logs:", res.statusText);
      }
    } catch (err) {
      console.error("Error fetching audit logs:", err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  // Trigger loads on mount or parameter changes
  useEffect(() => {
    fetchMessages();
    setPendingPost(null);
  }, [channel, topic]);

  useEffect(() => {
    if (showAuditLogs) {
      fetchAuditLogs();
    }
  }, [showAuditLogs, channel]);

  // Available formatted templates for current role
  const templates = useMemo(() => {
    return getTemplatesForChannel(channel, {
      entityId: linkedEntityId,
      entityName: linkedEntityName,
      patientCode
    });
  }, [channel, linkedEntityId, linkedEntityName, patientCode]);

  // Apply Policy Filter to input text in real-time (for UX display only, backend enforces)
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
    if (channel === "system-support") return userRole === "admin";
    if (channel === "clinical-handover") return userRole === "clinician" || userRole === "admin";
    return userRole === "receptionist" || userRole === "clinician" || userRole === "admin";
  }, [channel, userRole]);

  // Deep Link Navigation Resolver
  const handleOpenInZulip = () => {
    // If we have messages, we can use the open_in_zulip_url of the latest message
    const latestWithUrl = messages.find(m => m.open_in_zulip_url);
    const deepLinkUrl = latestWithUrl?.open_in_zulip_url || `https://chat.harmonyhealthsz.com/#narrow/stream/${channel}/topic/${encodeURIComponent(topic)}`;
    
    toast.success(`Opening Zulip stream: #${channel} > ${topic}`);
    window.open(deepLinkUrl, "_blank");
  };

  // Safe Outbound Posting Service
  const handlePostUpdate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasWritePermission) {
      toast.error(`Access Denied: Your role (${userRoleLabel}) is not authorized to post in #${channel}.`);
      return;
    }

    const payload = inputText.trim();
    if (!payload) return;

    setIsPosting(true);

    // Handle Mock Fail State (Failure and Retry simulation pattern)
    if (isZulipOffline) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setIsPosting(false);
      setPendingPost(payload);
      
      const mockFailedEvent: ZulipOutboundEvent = {
        id: -Date.now(), // negative id to denote mock offline local state
        actor: 0,
        actor_name: userRole === "admin" ? "Admin Ayanda" : userRole === "clinician" ? "Nurse Gcina" : "Receptionist Thandeka",
        actor_role: userRole,
        channel,
        topic,
        linked_entity_type: linkedEntityType,
        linked_entity_id: String(linkedEntityId),
        raw_payload: payload,
        sanitized_payload: sanitizedText, // client-side fallback
        template_key: selectedTemplateId || "generic_update",
        status: "retry_buffered",
        response_metadata: { error: "Simulated integration network loss." },
        retry_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setMessages(prev => [mockFailedEvent, ...prev]);
      toast.error("Network Error: Zulip Server is unreachable. Payload saved in retry buffer.");
      return;
    }

    // Real API Call
    try {
      const res = await fetch("/api/zulip/post-update/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
          topic,
          linked_entity_type: linkedEntityType,
          linked_entity_id: String(linkedEntityId),
          raw_payload: payload,
          template_key: selectedTemplateId || "generic_update",
        }),
      });

      if (res.ok || res.status === 202) {
        const newEvent = await res.json();
        setMessages(prev => [newEvent, ...prev]);
        setInputText("");
        setSelectedTemplateId("");
        toast.success("Operational update queued for delivery!");
        
        if (showAuditLogs) {
          fetchAuditLogs();
        }
        if (onPostSuccess) {
          onPostSuccess(payload);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Failed to queue operational update.");
      }
    } catch (err) {
      toast.error("Network Error: Could not connect to API proxy.");
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  // Retry Outbound Event
  const handleRetryPost = async (eventId: number) => {
    setIsPosting(true);

    // Mock Offline retry failure simulation
    if (isZulipOffline) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setIsPosting(false);
      toast.error("Retry Failed: Zulip Server remains offline. Please try again later.");
      return;
    }

    // Handle local mock failed event retrying (from offline simulation)
    if (eventId < 0) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      // Clear pending state and hit real post update
      setPendingPost(null);
      // Try posting the pending text for real
      const mockEvent = messages.find(m => m.id === eventId);
      if (mockEvent) {
        setIsPosting(false);
        setInputText(mockEvent.raw_payload);
        setSelectedTemplateId(mockEvent.template_key);
        // Remove the local mock event from list
        setMessages(prev => prev.filter(m => m.id !== eventId));
        toast.info("Mock event loaded back into composer. Click Post to deliver now.");
        return;
      }
    }

    // Real API Call to retry-post
    try {
      const res = await fetch("/api/zulip/retry-post/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: eventId,
        }),
      });

      if (res.ok || res.status === 202) {
        const updatedEvent = await res.json();
        setMessages(prev => prev.map(m => m.id === eventId ? updatedEvent : m));
        setAuditLogs(prev => prev.map(m => m.id === eventId ? updatedEvent : m));
        setPendingPost(null);
        toast.success("Delivery retry triggered successfully!");
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.detail || "Failed to trigger retry.");
      }
    } catch (err) {
      toast.error("Network Error: Could not connect to retry API.");
    } finally {
      setIsPosting(false);
    }
  };

  const getStatusBadge = (status: ZulipOutboundEvent["status"], retryCount?: number) => {
    switch (status) {
      case "success":
        return (
          <Badge variant="outline" className="h-4 text-[9px] px-1 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold flex items-center gap-0.5">
            <CheckCircle2 size={10} /> Delivered
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="h-4 text-[9px] px-1 bg-red-50 text-red-700 border-red-200 font-bold flex items-center gap-0.5">
            <ShieldAlert size={10} /> Failed
          </Badge>
        );
      case "retry_buffered":
        return (
          <Badge variant="outline" className="h-4 text-[9px] px-1 bg-amber-50 text-amber-700 border-amber-200 font-bold flex items-center gap-0.5" title={`Retry attempt: ${retryCount || 0}/5`}>
            <Clock size={10} className="animate-pulse" /> Retry Buffered ({retryCount || 0}/5)
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="outline" className="h-4 text-[9px] px-1 bg-blue-50 text-blue-700 border-blue-200 font-bold flex items-center gap-0.5">
            <RefreshCw size={10} className="animate-spin" /> Pending
          </Badge>
        );
    }
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

        {/* Diagnostic Simulator and Refresh Action */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchMessages}
            disabled={isLoadingMessages}
            className="h-7 w-7 p-0 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
            title="Refresh coordination activity"
          >
            <RefreshCw size={12} className={isLoadingMessages ? "animate-spin" : ""} />
          </Button>

          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-2 py-1">
            <button 
              type="button"
              onClick={() => {
                setIsZulipOffline(!isZulipOffline);
                toast.info(isZulipOffline ? "Zulip integration is back ONLINE." : "Zulip network disconnect simulated.");
              }}
              className={`flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 transition cursor-pointer ${
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
            onClick={() => {
              const mockEvent = messages.find(m => m.id < 0 && m.raw_payload === pendingPost);
              if (mockEvent) handleRetryPost(mockEvent.id);
            }}
            disabled={isPosting}
            className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold h-7 py-0 text-[10px] cursor-pointer"
          >
            <RefreshCw size={11} className={`mr-1 ${isPosting ? "animate-spin" : ""}`} />
            Load to retry
          </Button>
        </div>
      )}

      {/* 4. Timeline Stream of Coordination Events (CCS View) */}
      <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          <span>Recent Coordination Activity</span>
          {isLoadingMessages && <span className="text-[9px] animate-pulse normal-case font-normal text-slate-400">updating...</span>}
        </div>
        {messages.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400">
            {isLoadingMessages ? "Loading activity feed..." : "No active coordination events."}
          </div>
        ) : (
          messages.map((msg) => {
            const isSystem = !msg.actor || msg.actor_name?.toLowerCase().includes("bot") || msg.actor_name?.toLowerCase().includes("watchdog") || msg.actor_name?.toLowerCase().includes("daemon") || msg.actor_name?.toLowerCase().includes("system");
            const role = msg.actor_role || (isSystem ? "system" : "receptionist");
            
            return (
              <div 
                key={msg.id} 
                className={`p-2.5 rounded-lg text-xs leading-relaxed transition border ${
                  isSystem 
                    ? "bg-slate-100 border-slate-200/60 text-slate-600" 
                    : role === "clinician"
                      ? "bg-[#fcfaff] border-[#f0e8fc] text-slate-800"
                      : role === "admin"
                        ? "bg-slate-50 border-slate-200 text-slate-800"
                        : "bg-[#f4fbf5] border-[#e3f4e6] text-slate-800"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500 mb-1.5 border-b border-slate-100/50 pb-1">
                  <span className="flex items-center gap-1">
                    {isSystem ? (
                      <Badge variant="outline" className="h-4 text-[9px] px-1 bg-white text-slate-500 border-slate-200 font-bold">System Bot</Badge>
                    ) : (
                      <Badge variant="harmony" className="h-4 text-[9px] px-1 capitalize">{role}</Badge>
                    )}
                    <span className="font-semibold text-slate-700">{msg.actor_name}</span>
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    {getStatusBadge(msg.status, msg.retry_count)}
                    {(msg.status === "failed" || msg.status === "retry_buffered") && (
                      <button
                        type="button"
                        onClick={() => handleRetryPost(msg.id)}
                        disabled={isPosting}
                        className="text-[9px] font-extrabold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded px-1.5 py-0.2 select-none transition cursor-pointer"
                        title="Force Retry Outbound Posting"
                      >
                        Retry
                      </button>
                    )}
                    <span className="font-medium text-slate-400">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap font-sans text-slate-700 leading-normal">{msg.sanitized_payload}</p>
              </div>
            );
          })
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
                className="w-full text-xs h-9 rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)] cursor-pointer"
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
              placeholder="Post a customized update... (Clinical keywords will be scrubbed)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            {/* Privacy Compliance Scrubber Panel */}
            {inputText.trim() && (
              <div className="bg-[#fafbff] border border-slate-100 p-2.5 rounded-lg text-[11px] leading-relaxed animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-1 border-b border-slate-100 pb-1">
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
      <div className="pt-2 border-t border-slate-50">
        <button
          type="button"
          onClick={() => setShowAuditLogs(!showAuditLogs)}
          className="text-[10px] font-bold tracking-wider text-slate-500 hover:text-slate-700 uppercase flex items-center gap-1.5 focus:outline-none cursor-pointer"
        >
          <span>{showAuditLogs ? "▼ Hide" : "▶ Show"} Integration Audit Trail</span>
          <Badge variant="outline" className="h-4 text-[9px] px-1 font-mono text-slate-400">{auditLogs.length} Events</Badge>
        </button>

        {showAuditLogs && (
          <div className="mt-2 space-y-2 border border-[#c7d7cd]/60 rounded-lg p-2.5 bg-slate-50/30 max-h-40 overflow-y-auto animate-in slide-in-from-top-2 duration-200">
            {isLoadingAudit ? (
              <div className="text-center py-4 text-[10px] text-slate-400 font-mono">Loading integration logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center py-4 text-[10px] text-slate-400 font-medium">No session audit logs recorded.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="border-b border-slate-100 pb-1.5 last:border-0 last:pb-0 text-[10px] leading-relaxed font-mono">
                  <div className="flex items-center justify-between font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      {log.status === "success" ? (
                        <CheckCircle2 size={10} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={10} className="text-red-500" />
                      )}
                      <span>{log.actor_name} ({log.actor_role?.toUpperCase() || "STAFF"})</span>
                    </span>
                    <span>{new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 text-slate-400 mt-1">
                    <div><strong>Target Topic:</strong> #{log.channel} &gt; {log.topic}</div>
                    <div><strong>Reference:</strong> {log.linked_entity_type.toUpperCase()}:{log.linked_entity_id}</div>
                  </div>
                  <div className="bg-white/80 p-1.5 rounded border border-slate-200/50 mt-1 text-slate-600 line-clamp-2 leading-normal">
                    {log.sanitized_payload}
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
