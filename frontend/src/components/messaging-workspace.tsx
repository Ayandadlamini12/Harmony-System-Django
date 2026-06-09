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
  MessageSquare,
  Calendar,
  ClipboardList,
  AlertCircle,
  TrendingUp,
  SlidersHorizontal
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { MessageRecipient, MessageThread } from "@/types/clinic";

interface Props {
  initialThreads: MessageThread[];
  recipients: MessageRecipient[];
}

// ==========================================
// Types & Channel Definitions
// ==========================================

interface ChannelContext {
  id: string;
  name: string;
  icon: any;
  category: "operational" | "administrative" | "support";
  unreadCount: number;
  lastActivityTime: string;
  lastMessagePreview: string;
  topic: string;
  // Associated Entity Details
  entityType: "patient" | "ticket" | "appointment" | "consent" | "employee";
  entityId: string | number;
  entityName: string;
  patientCode?: string;
  details: Record<string, string>;
  // Initial messages
  messages: Array<{
    id: string;
    senderName: string;
    senderRole: "clinician" | "receptionist" | "admin" | "system";
    body: string;
    sentAt: string;
    isSystem: boolean;
  }>;
}

// Medical keywords to filter
const SENSITIVE_KEYWORDS = [
  "hiv", "aids", "cancer", "tuberculosis", "tb", "diabetes", "diabetic", "hypertension", 
  "asthma", "pregnancy", "pregnant", "flu", "syphilis", "gonorrhea", "hepatitis", "depression",
  "anxiety", "schizophrenia", "pneumonia", "bipolar", "diagnosis", "diagnosed", "remedy"
];

function applyPolicyFilter(text: string): { sanitizedText: string; isScrubbed: boolean } {
  let isScrubbed = false;
  let result = text;
  for (const keyword of SENSITIVE_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    if (regex.test(result)) {
      result = result.replace(regex, "[CLINICAL DETAIL REDACTED FOR PRIVACY]");
      isScrubbed = true;
    }
  }
  return { sanitizedText: result, isScrubbed };
}

export function MessagingWorkspace({ initialThreads, recipients }: Props) {
  // 1. Role Selection for Simulation
  const [selectedRole, setSelectedRole] = useState<"clinician" | "receptionist" | "admin">("receptionist");
  
  // 2. Active Channel & Filter States
  const [activeFilter, setActiveFilter] = useState<"all" | "operational" | "action" | "unread">("all");
  const [activeChannelId, setActiveChannelId] = useState("front-desk");

  // 3. Simulation & Failure States
  const [isZulipOffline, setIsZulipOffline] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [pendingPost, setPendingPost] = useState<{ channelId: string; body: string } | null>(null);

  // 4. Session Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // 5. Input text
  const [inputText, setInputText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");

  // 6. Dynamic Channels Database (State-driven CCS)
  const [channels, setChannels] = useState<ChannelContext[]>([
    {
      id: "front-desk",
      name: "Front Desk",
      icon: ClipboardList,
      category: "operational",
      unreadCount: 1,
      lastActivityTime: "10:22 AM",
      lastMessagePreview: "Vitals recorded for Queue #14. Ready for review.",
      topic: "PATIENT FLOW | Zahara Dlamini | 2026-06-08",
      entityType: "patient",
      entityId: "14",
      entityName: "Zahara Dlamini",
      patientCode: "PAT-2026-000001",
      details: {
        "Queue Number": "#14",
        "Check-In Time": "10:15 AM",
        "Flow Stage": "Vitals Completed",
        "Assigned Room": "Consultation Room 2",
        "Visit Type": "New Consultation"
      },
      messages: [
        {
          id: "fd-1",
          senderName: "Front Desk Tablet",
          senderRole: "system",
          body: "⏱️ **QUEUE ASSIGNMENT**: Patient Zahara Dlamini activated. Assigned Queue #14. (Method: Tablet Self Check-In)",
          sentAt: "10:15 AM",
          isSystem: true
        },
        {
          id: "fd-2",
          senderName: "Nurse Gcina",
          senderRole: "clinician",
          body: "✅ **VITALS RECORDED** for Queue #14. BP: 120/80 | Temp: 36.6°C. Patient is resting in the lounge. Ready for clinician.",
          sentAt: "10:22 AM",
          isSystem: false
        }
      ]
    },
    {
      id: "clinical-handover",
      name: "Clinical Handover",
      icon: Users,
      category: "operational",
      unreadCount: 2,
      lastActivityTime: "08:15 AM",
      lastMessagePreview: "Patient PAT-2026-000412 stabilized.",
      topic: "HANDOVER | PAT-2026-000412 | 2026-06-08",
      entityType: "patient",
      entityId: "412",
      entityName: "Thabo Maseko",
      patientCode: "PAT-2026-000412",
      details: {
        "Patient ID": "PAT-2026-000412",
        "Discharge Status": "Stabilized",
        "Ward Location": "Observation Ward A",
        "Attending Clinician": "Dr. Dlamini",
        "Next Handover Shift": "Evening Handover (18:00)"
      },
      messages: [
        {
          id: "ch-1",
          senderName: "Shift Scheduler",
          senderRole: "system",
          body: "📝 **SHIFT COMPLETED**: Clinical shift transition. Observe Ward A checks initialized.",
          sentAt: "08:00 AM",
          isSystem: true
        },
        {
          id: "ch-2",
          senderName: "Dr. Dlamini",
          senderRole: "clinician",
          body: "🩺 Patient PAT-2026-000412 stabilized. Routine follow-up scheduled for Wednesday. Folder notes updated in MIS.",
          sentAt: "08:15 AM",
          isSystem: false
        }
      ]
    },
    {
      id: "appointments",
      name: "Appointments",
      icon: Calendar,
      category: "operational",
      unreadCount: 0,
      lastActivityTime: "11:00 AM",
      lastMessagePreview: "Follow-up visit scheduled for PAT-2026-000001.",
      topic: "FOLLOW-UP | PAT-2026-000001 | 2026-06-10",
      entityType: "appointment",
      entityId: "APP-0412",
      entityName: "Zahara Dlamini Follow-Up",
      patientCode: "PAT-2026-000001",
      details: {
        "Appointment Date": "2026-06-10",
        "Scheduled Time": "09:00 AM",
        "Clinician Assigned": "Dr. Dlamini",
        "Status": "Scheduled",
        "Reminder Sent": "SMS & Whatsapp Sent (08:30)"
      },
      messages: [
        {
          id: "ap-1",
          senderName: "Calendar Daemon",
          senderRole: "system",
          body: "📅 **APPOINTMENT CREATED**: Follow-up visit scheduled for PAT-2026-000001 on 2026-06-10.",
          sentAt: "11:00 AM",
          isSystem: true
        }
      ]
    },
    {
      id: "consent-forms",
      name: "Consent Forms",
      icon: FileText,
      category: "operational",
      unreadCount: 1,
      lastActivityTime: "Yesterday",
      lastMessagePreview: "Pending signature reminder sent to patient.",
      topic: "CONSENT | HH-CONS-041",
      entityType: "consent",
      entityId: "HH-CONS-041",
      entityName: "Electronic Medical Consent",
      details: {
        "Consent ID": "HH-CONS-041",
        "Form Type": "General Discretionary",
        "Signature Status": "Pending Signature",
        "Recipient Cell": "+268 7604 1234",
        "Triggered By": "Receptionist Thandeka"
      },
      messages: [
        {
          id: "cf-1",
          senderName: "WeasyPrint Service",
          senderRole: "system",
          body: "📄 **DOCUMENT GENERATED**: Consent form PDF compiled successfully.",
          sentAt: "Yesterday",
          isSystem: true
        },
        {
          id: "cf-2",
          senderName: "Receptionist Thandeka",
          senderRole: "receptionist",
          body: "✉️ Reminded patient Zahara to sign the form electronically. She is looking for her cell number verification code.",
          sentAt: "Yesterday",
          isSystem: false
        }
      ]
    },
    {
      id: "system-support",
      name: "Support Tickets",
      icon: HelpCircle,
      category: "support",
      unreadCount: 0,
      lastActivityTime: "09:41 AM",
      lastMessagePreview: "Investigating the latency spikes on Redis.",
      topic: "TICKET | SUPPORT-0142",
      entityType: "ticket",
      entityId: "142",
      entityName: "Cache latency on production ARM64 host",
      details: {
        "Ticket ID": "SUPPORT-0142",
        "Priority": "High Critical",
        "Assigned Group": "DevOps",
        "Status": "Open",
        "Stack ID": "69"
      },
      messages: [
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
      ]
    },
    {
      id: "management",
      name: "Clinic Management",
      icon: Lock,
      category: "administrative",
      unreadCount: 0,
      lastActivityTime: "06/07/26",
      lastMessagePreview: "Audited access requests for new ward terminals.",
      topic: "EMPLOYEE | HH2005341",
      entityType: "employee",
      entityId: "HH2005341",
      entityName: "Nurse Enrollment Audits",
      details: {
        "Department": "Clinical Wards",
        "Terminal Scope": "Station 2 Desk",
        "Superuser Checked": "Approved",
        "Status": "Role Matched"
      },
      messages: [
        {
          id: "m-1",
          senderName: "Security Audit Monitor",
          senderRole: "system",
          body: "🔐 **ACCESS LOG**: Terminal credentials matched for Station 2 Ward Desk.",
          sentAt: "06/07/26",
          isSystem: true
        }
      ]
    }
  ]);

  // Find currently selected channel
  const activeChannel = useMemo(() => {
    return channels.find(c => c.id === activeChannelId) || channels[0];
  }, [activeChannelId, channels]);

  // Real-time policy sanitizer previews
  const { sanitizedText, isScrubbed } = useMemo(() => {
    return applyPolicyFilter(inputText);
  }, [inputText]);

  // Get template actions for active channel
  const templates = useMemo(() => {
    const context = {
      entityId: activeChannel.entityId,
      entityName: activeChannel.entityName,
      patientCode: activeChannel.patientCode
    };
    
    switch (activeChannel.id) {
      case "front-desk":
        return [
          {
            id: "fd_ready",
            label: "Mark Patient Ready",
            roleRequired: ["receptionist", "admin"],
            text: `📢 **PATIENT READY**: Queue #${context.entityId || "XX"} is ready for clinician room handover. Initials: ${context.entityName.split(" ").map(n => n[0]).join("")}.`
          },
          {
            id: "fd_vitals",
            label: "Request Vitals Update",
            roleRequired: ["receptionist", "clinician", "admin"],
            text: `⏱️ **VITALS REQUESTED**: Please record vitals for Queue #${context.entityId || "XX"} (${context.entityName.split(" ").map(n => n[0]).join("")}).`
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
      case "clinical-handover":
        return [
          {
            id: "ch_shift",
            label: "Handover Shift Log",
            roleRequired: ["clinician", "admin"],
            text: `🩺 **CLINICAL HANDOVER**: Patient ${context.patientCode || "PAT"} stabilized. Care handoff initiated for evening ward shift.`
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
  }, [activeChannel]);

  // Role Gate checker
  const hasWritePermission = useMemo(() => {
    if (activeChannel.id === "system-support" || activeChannel.id === "management") return selectedRole === "admin";
    if (activeChannel.id === "clinical-handover") return selectedRole === "clinician" || selectedRole === "admin";
    return true; // Front Desk, Appointments, Consent Forms open to receptionist/clinicians/admins
  }, [activeChannel, selectedRole]);

  // Channel Filtering (Top Filter Pills)
  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      if (activeFilter === "all") return true;
      if (activeFilter === "operational") return c.category === "operational";
      if (activeFilter === "unread") return c.unreadCount > 0;
      if (activeFilter === "action") {
        return c.id === "system-support" || c.id === "consent-forms" || c.unreadCount > 0;
      }
      return true;
    });
  }, [activeFilter, channels]);

  // Deep Link Launch point (Strictly Navigation)
  const handleOpenZulipDeepLink = () => {
    const safeTopic = encodeURIComponent(activeChannel.topic);
    const zulipUrl = `https://zulip.harmonyhealthsz.com/#narrow/stream/${activeChannel.id}/topic/${safeTopic}`;
    toast.success(`Resolving deep-link path: #${activeChannel.id} > ${activeChannel.topic}`);
    window.open(zulipUrl, "_blank");
  };

  // Safe Server-Side Simulated Outbound Posting Service
  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasWritePermission) {
      toast.error(`Access Denied: Your simulated role is not authorized to write in #${activeChannel.id}.`);
      return;
    }

    const payload = sanitizedText.trim();
    if (!payload) return;

    setIsPosting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Offline / Connection loss handler
    if (isZulipOffline) {
      setIsPosting(false);
      setPendingPost({ channelId: activeChannel.id, body: payload });
      
      const failedLog = {
        id: `aud-${Date.now()}`,
        actor: selectedRole.toUpperCase(),
        entityType: activeChannel.entityType,
        entityId: activeChannel.entityId,
        channel: activeChannel.id,
        topic: activeChannel.topic,
        sanitizedPayload: payload,
        timestamp: new Date().toLocaleTimeString(),
        status: "failed"
      };
      setAuditLogs(prev => [failedLog, ...prev]);
      toast.error("Downstream Zulip is offline. Payload saved to local buffer.");
      return;
    }

    // Success State
    const newMessage = {
      id: `msg-${Date.now()}`,
      senderName: selectedRole === "admin" ? "Admin Ayanda" : selectedRole === "clinician" ? "Nurse Gcina" : "Receptionist Thandeka",
      senderRole: selectedRole,
      body: payload,
      sentAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSystem: false
    };

    const successLog = {
      id: `aud-${Date.now()}`,
      actor: newMessage.senderName,
      role: selectedRole,
      entityType: activeChannel.entityType,
      entityId: activeChannel.entityId,
      channel: activeChannel.id,
      topic: activeChannel.topic,
      sanitizedPayload: payload,
      timestamp: new Date().toLocaleTimeString(),
      status: "success"
    };

    // Update state channels messages array
    setChannels(prev => prev.map(ch => {
      if (ch.id === activeChannel.id) {
        return {
          ...ch,
          lastActivityTime: newMessage.sentAt,
          lastMessagePreview: payload.replace(/\*\*|\*/g, "").substring(0, 42) + "...",
          messages: [...ch.messages, newMessage]
        };
      }
      return ch;
    }));

    setAuditLogs(prev => [successLog, ...prev]);
    setInputText("");
    setSelectedTemplateId("");
    setPendingPost(null);
    setIsPosting(false);

    toast.success("Outbound event synchronized with Zulip Server.");
  };

  // Retry buffer posting
  const handleRetryPost = async () => {
    if (!pendingPost) return;
    setIsPosting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (isZulipOffline) {
      setIsPosting(false);
      toast.error("Retry Failed: Zulip Server remains unreachable.");
      return;
    }

    const payload = pendingPost.body;
    const newMessage = {
      id: `msg-${Date.now()}`,
      senderName: selectedRole === "admin" ? "Admin Ayanda" : selectedRole === "clinician" ? "Nurse Gcina" : "Receptionist Thandeka",
      senderRole: selectedRole,
      body: payload,
      sentAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isSystem: false
    };

    const successLog = {
      id: `aud-${Date.now()}`,
      actor: newMessage.senderName,
      role: selectedRole,
      entityType: activeChannel.entityType,
      entityId: activeChannel.entityId,
      channel: activeChannel.id,
      topic: activeChannel.topic,
      sanitizedPayload: payload,
      timestamp: new Date().toLocaleTimeString(),
      status: "success"
    };

    setChannels(prev => prev.map(ch => {
      if (ch.id === pendingPost.channelId) {
        return {
          ...ch,
          lastActivityTime: newMessage.sentAt,
          lastMessagePreview: payload.replace(/\*\*|\*/g, "").substring(0, 42) + "...",
          messages: [...ch.messages, newMessage]
        };
      }
      return ch;
    }));

    setAuditLogs(prev => [successLog, ...prev]);
    setPendingPost(null);
    setIsPosting(false);
    toast.success("Retry Buffer successfully dispatched to Zulip!");
  };

  // Reset unread count when clicking a channel
  useEffect(() => {
    setChannels(prev => prev.map(ch => {
      if (ch.id === activeChannelId) {
        return { ...ch, unreadCount: 0 };
      }
      return ch;
    }));
    setInputText("");
    setSelectedTemplateId("");
  }, [activeChannelId]);

  return (
    <div className="grid min-h-[calc(100vh-160px)] gap-4 grid-cols-1 lg:grid-cols-[280px_1fr_320px] xl:grid-cols-[320px_1fr_360px]">
      
      {/* ==========================================
          COLUMN 1: OPERATIONAL CHANNELS (LEFT)
          ========================================== */}
      <aside className="hh-panel flex flex-col overflow-hidden bg-white border border-[#c7d7cd]">
        
        {/* Channel Header Panel */}
        <div className="border-b border-[#e1ece4] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#65736d]">Zulip Mapping</p>
              <h2 className="text-sm font-bold text-[#1f2723]">Clinic Workstreams</h2>
            </div>
            
            {/* Role Simulation Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <span className="text-[9px] font-bold text-slate-400 pl-1 uppercase">Role:</span>
              <select 
                className="text-[10px] font-bold bg-transparent border-0 cursor-pointer text-[#482b68] outline-none"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
              >
                <option value="receptionist">Receptionist</option>
                <option value="clinician">Clinician</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* TOP FILTER BAR */}
          <div className="mt-4 flex flex-wrap gap-1 bg-[#f4f7f5] p-1 rounded-lg border border-[#e1ece4]">
            <button
              onClick={() => setActiveFilter("all")}
              className={`flex-1 text-center text-[10px] font-bold py-1 rounded transition-all cursor-pointer ${
                activeFilter === "all" ? "bg-white text-[#225c2c] shadow-sm" : "text-[#5e6b64] hover:text-[#225c2c]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveFilter("operational")}
              className={`flex-1 text-center text-[10px] font-bold py-1 rounded transition-all cursor-pointer ${
                activeFilter === "operational" ? "bg-white text-[#225c2c] shadow-sm" : "text-[#5e6b64] hover:text-[#225c2c]"
              }`}
            >
              Ops
            </button>
            <button
              onClick={() => setActiveFilter("action")}
              className={`flex-1 text-center text-[10px] font-bold py-1 rounded transition-all cursor-pointer ${
                activeFilter === "action" ? "bg-white text-amber-800 shadow-sm" : "text-[#5e6b64] hover:text-amber-800"
              }`}
            >
              Alerts
            </button>
            <button
              onClick={() => setActiveFilter("unread")}
              className={`flex-1 text-center text-[10px] font-bold py-1 rounded transition-all cursor-pointer ${
                activeFilter === "unread" ? "bg-white text-[var(--hh-purple)] shadow-sm" : "text-[#5e6b64] hover:text-[var(--hh-purple)]"
              }`}
            >
              Unread
            </button>
          </div>
        </div>

        {/* Channel Rows */}
        <div className="flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
          {filteredChannels.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No channels match filter.</div>
          ) : (
            filteredChannels.map((ch) => {
              const Icon = ch.icon;
              const isSelected = activeChannelId === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                  className={`flex w-full items-start gap-3 border-b border-[#eff5f1] p-3.5 text-left transition hover:bg-[#f6faf7] cursor-pointer ${
                    isSelected ? "bg-[#f2f8f4] border-l-4 border-l-[#225c2c]" : "bg-white"
                  }`}
                >
                  <div className={`mt-0.5 rounded-lg p-2 ${
                    isSelected ? "bg-white text-[#225c2c] shadow-sm" : "bg-slate-50 text-[#5c6861]"
                  }`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-[#1f2521] line-clamp-1">{ch.name}</span>
                      <span className="text-[9px] text-[#717d76] whitespace-nowrap font-medium">{ch.lastActivityTime}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="font-mono text-[8px] font-bold text-[#65736d] uppercase bg-slate-100 px-1 py-0.2 rounded truncate">
                        #{ch.id}
                      </span>
                      {ch.unreadCount > 0 && (
                        <Badge variant="harmony" className="h-4 text-[9px] px-1 font-bold animate-pulse">
                          {ch.unreadCount}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-[10px] text-[#5e6b64] truncate leading-normal">
                      {ch.lastMessagePreview}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Simulation Settings Board */}
        <div className="border-t border-[#e1ece4] bg-[#fafcfb] p-4 text-xs">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            <span>Downstream Diagnostic</span>
          </div>
          <div className="flex items-center justify-between bg-white border border-[#e1ece4] p-2 rounded-lg">
            <span className="font-medium text-slate-600 flex items-center gap-1">
              <Activity size={12} className={isZulipOffline ? "text-slate-400" : "text-emerald-600 animate-pulse"} />
              Zulip Integration
            </span>
            <button
              onClick={() => {
                setIsZulipOffline(!isZulipOffline);
                toast.info(isZulipOffline ? "Zulip API services ONLINE." : "Zulip API connection drops simulated.");
              }}
              className={`text-[9px] font-bold rounded-full px-2 py-0.5 border cursor-pointer transition ${
                isZulipOffline 
                  ? "bg-red-50 text-red-600 border-red-200" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-100"
              }`}
            >
              {isZulipOffline ? "Offline Sim" : "Online"}
            </button>
          </div>
        </div>
      </aside>

      {/* ==========================================
          COLUMN 2: TIMELINE TIMELINE FEED (CENTER)
          ========================================== */}
      <section className="hh-panel flex flex-col overflow-hidden bg-white border border-[#c7d7cd] rounded-xl shadow-sm">
        
        {/* Coordination Stream Header */}
        <div className="border-b border-[#e1ece4] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#65736d]">Zulip Channel Thread</span>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded">
                  <CheckCircle2 size={10} /> Active Connection
                </span>
              </div>
              <h2 className="text-base font-bold text-[#1a221f] mt-1 font-sans">{activeChannel.name} Stream</h2>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="font-mono text-[9px] text-[#225c2c] border-[#c7d7cd] bg-[#fcfdfc]">
                  #{activeChannel.id}
                </Badge>
                <span className="text-xs text-[#627068] font-medium font-sans">
                  Topic: <strong>{activeChannel.topic}</strong>
                </span>
              </div>
            </div>
            
            {/* Quick Action Navigation resolver */}
            <Button
              onClick={handleOpenZulipDeepLink}
              variant="secondary"
              size="sm"
              className="text-xs font-bold border-[#c7d7cd] hover:bg-[#f6faf7] h-8 px-3 cursor-pointer text-[#225c2c]"
            >
              <ExternalLink size={13} className="mr-1" />
              Open in Zulip
            </Button>
          </div>
        </div>

        {/* Stream Messages Container */}
        <div className="flex-1 overflow-y-auto bg-[#f8faf9]/50 p-5 space-y-4 max-h-[calc(100vh-380px)]">
          {activeChannel.messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">No events found in this thread.</div>
          ) : (
            activeChannel.messages.map((msg) => (
              <div
                key={msg.id}
                className={`border rounded-lg p-4 shadow-sm transition max-w-3xl ${
                  msg.isSystem
                    ? "bg-slate-50 border-slate-200/70 text-slate-600 border-l-4 border-l-slate-400"
                    : msg.senderRole === "clinician"
                      ? "bg-[#faf7fe] border-[#ebe0fb] text-slate-800 border-l-4 border-l-[var(--hh-purple)]"
                      : msg.senderRole === "admin"
                        ? "bg-slate-50 border-slate-200 text-slate-800 border-l-4 border-l-slate-600"
                        : "bg-[#f4faf6] border-[#dfefe3] text-slate-800 border-l-4 border-l-[#225c2c]"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs mb-1.5 font-bold">
                  <div className="flex items-center gap-2">
                    {msg.isSystem ? (
                      <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-mono">SYSTEM BOT</span>
                    ) : (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono uppercase ${
                        msg.senderRole === "clinician"
                          ? "bg-[var(--hh-purple-light)] text-[var(--hh-purple)]"
                          : msg.senderRole === "admin"
                            ? "bg-slate-200 text-slate-800"
                            : "bg-[#e2f3e6] text-[#225c2c]"
                      }`}>
                        {msg.senderRole}
                      </span>
                    )}
                    <span className="text-slate-800 font-sans text-[11px]">{msg.senderName}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal font-mono">{msg.sentAt}</span>
                </div>
                <p className="text-xs leading-relaxed font-sans whitespace-pre-wrap">{msg.body}</p>
              </div>
            ))
          )}
        </div>

        {/* Controlled Post Form */}
        <div className="border-t border-[#e1ece4] bg-white p-4">
          {hasWritePermission ? (
            <form onSubmit={handlePostUpdate} className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
                <div className="flex items-center gap-2 text-xs">
                  <UserCheck size={14} className="text-[#225c2c]" />
                  <span className="text-slate-600 font-sans">
                    Post on behalf of: <strong className="text-slate-800 capitalize">{selectedRole}</strong>
                  </span>
                </div>

                {/* Templates Dropdown selector */}
                <div className="w-full sm:w-60">
                  <select
                    className="w-full text-[11px] h-8 rounded-lg border border-slate-200 bg-white px-3 focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)]"
                    value={selectedTemplateId}
                    onChange={(e) => {
                      const tid = e.target.value;
                      setSelectedTemplateId(tid);
                      const selected = templates.find(t => t.id === tid);
                      if (selected) setInputText(selected.text);
                    }}
                  >
                    <option value="">-- Post Template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Retry bar if pending post exists */}
              {pendingPost && pendingPost.channelId === activeChannel.id && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 flex items-center justify-between gap-3 text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <span>Post pending in buffer queue</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleRetryPost}
                    disabled={isPosting}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-6 py-0 text-[10px]"
                  >
                    <RefreshCw size={10} className={`mr-1 ${isPosting ? "animate-spin" : ""}`} />
                    Retry Now
                  </Button>
                </div>
              )}

              {/* Message inputs & Scrubber Output */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3">
                <div className="space-y-1">
                  <textarea
                    className="w-full min-h-[64px] p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)] leading-normal font-sans"
                    placeholder="Type an operational update... (Clinical keywords will be scrubbed)"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                </div>

                {/* Posting Actions */}
                <div className="flex flex-col gap-1.5 justify-end">
                  <Button
                    type="submit"
                    disabled={isPosting || !inputText.trim()}
                    className="bg-[#225c2c] hover:bg-[#1a4a22] text-white font-bold h-10 w-full text-xs cursor-pointer"
                  >
                    <Send size={13} className="mr-1" />
                    Post Update
                  </Button>
                  <span className="text-[10px] text-[#65736d] text-center">
                    Enforces privacy rules.
                  </span>
                </div>
              </div>

              {/* Real-time policy scrubbing preview */}
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
                  <div className="font-mono text-slate-600 border border-slate-200/50 bg-white p-2 rounded whitespace-pre-wrap leading-normal">
                    {sanitizedText}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <div className="p-4 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-center text-xs text-slate-500 font-medium">
              🔒 GATED ACCESS: Your active role ({selectedRole.toUpperCase()}) does not have permissions to post in #{activeChannel.id}. Access restricted to read-only views.
            </div>
          )}
        </div>
      </section>

      {/* ==========================================
          COLUMN 3: LINKED WORKFLOW CONTEXT (RIGHT)
          ========================================== */}
      <aside className="hh-panel flex flex-col overflow-hidden bg-white border border-[#c7d7cd] rounded-xl shadow-sm p-4 space-y-4">
        
        {/* Linked Workflow Title */}
        <div className="border-b border-[#e1ece4] pb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#65736d]">Linked MIS Workflow Context</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="rounded-full bg-slate-100 p-1.5 text-slate-700">
              <UserCheck size={14} />
            </span>
            <h3 className="text-sm font-bold text-[#1e2521] truncate font-sans">
              {activeChannel.entityName}
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mt-1">
            Linked Entity: {activeChannel.entityType.toUpperCase()}:{activeChannel.entityId}
          </p>
        </div>

        {/* Entity details grid list */}
        <div className="space-y-2.5 flex-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Entity Meta-Data</div>
          
          <div className="grid grid-cols-1 gap-2.5 bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs leading-relaxed text-slate-600 font-sans">
            {Object.entries(activeChannel.details).map(([key, val]) => (
              <div key={key} className="flex justify-between gap-2 border-b border-dashed border-slate-200 pb-1.5 last:border-0 last:pb-0">
                <span className="font-semibold text-slate-500">{key}:</span>
                <span className="font-bold text-slate-800 text-right">{val}</span>
              </div>
            ))}
          </div>

          <div className="p-3 border border-[#c7d7cd]/60 bg-emerald-50/20 text-emerald-800 text-xs rounded-lg space-y-2 leading-relaxed font-sans">
            <p className="font-bold text-[#225c2c] flex items-center gap-1">
              <ShieldCheck size={14} /> Operational Privacy Policy
            </p>
            <p className="text-[11px] text-[#55695f]">
              Harmony Clinical Directives block sensitive details from entering external servers. Previews only reflect safe operational routing.
            </p>
          </div>
        </div>

        {/* Collapsible Session integration log */}
        <div className="border-t border-[#e1ece4] pt-3">
          <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
            Session Outbound Event Logs
          </div>
          
          <div className="space-y-2 max-h-40 overflow-y-auto border border-[#c7d7cd]/60 rounded-lg p-2.5 bg-slate-50/50">
            {auditLogs.length === 0 ? (
              <div className="text-center py-5 text-[10px] text-slate-400 font-mono">No outbound sync actions triggered.</div>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="border-b border-slate-100 pb-1.5 last:border-0 text-[9px] leading-relaxed font-mono">
                  <div className="flex items-center justify-between font-bold text-slate-500">
                    <span className="flex items-center gap-1">
                      {log.status === "success" ? (
                        <CheckCircle2 size={9} className="text-emerald-600" />
                      ) : (
                        <AlertTriangle size={9} className="text-red-500" />
                      )}
                      <span>{log.actor} ({log.role?.toUpperCase() || "OP"})</span>
                    </span>
                    <span>{log.timestamp}</span>
                  </div>
                  <div className="text-slate-400 mt-0.5">Topic: #{log.channel} &gt; {log.topic}</div>
                  <div className="bg-white/80 p-1 rounded border border-slate-200/50 mt-1 text-slate-600 line-clamp-2 leading-normal">
                    {log.sanitizedPayload}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </aside>

    </div>
  );
}
