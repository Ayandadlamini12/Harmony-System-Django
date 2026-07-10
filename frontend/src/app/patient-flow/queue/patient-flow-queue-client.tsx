"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { 
  Activity, 
  Calendar, 
  Clock, 
  Filter, 
  Layers, 
  RefreshCw, 
  ArrowRight, 
  User, 
  HelpCircle,
  TrendingUp,
  Inbox,
  CheckCircle,
  AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PatientJourneyQueueItem, PatientJourneyQueueResponse } from "@/types/clinic";

export function PatientFlowQueueClient() {
  const [queue, setQueue] = useState<PatientJourneyQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [selectedStage, setSelectedStage] = useState<string>("all");
  const [selectedFlowType, setSelectedFlowType] = useState<string>("all");
  
  const [isPending, startTransition] = useTransition();

  // Polling / fetching queue data
  async function fetchQueue(dateVal: string, stageVal = selectedStage, flowTypeVal = selectedFlowType) {
    try {
      const url = new URL("/api/patient-flow/today-queue", window.location.origin);
      if (dateVal) url.searchParams.set("date", dateVal);
      if (stageVal !== "all") url.searchParams.set("stage", stageVal);
      if (flowTypeVal !== "all") url.searchParams.set("flow_type", flowTypeVal);
      
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error("Failed to retrieve queue data");
      }
      const data = (await res.json()) as PatientJourneyQueueResponse;
      setQueue(Array.isArray(data.items) ? data.items : []);
      setError(null);
    } catch (err: any) {
      console.error("Queue fetch error:", err);
      setError("Unable to connect to patient flow service. Retrying...");
    } finally {
      setLoading(false);
    }
  }

  // Initial load & Polling schedule (every 30 seconds)
  useEffect(() => {
    setLoading(true);
    void fetchQueue(selectedDate, selectedStage, selectedFlowType);

    const interval = setInterval(() => {
      void fetchQueue(selectedDate, selectedStage, selectedFlowType);
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedDate, selectedStage, selectedFlowType]);

  // Handle manual refresh
  const handleRefresh = () => {
    startTransition(async () => {
      await fetchQueue(selectedDate, selectedStage, selectedFlowType);
    });
  };

  // KPI Calculations (Always based on full selectedDate queue array for overall context)
  const totalActive = queue.length;
  const queuedCount = queue.filter(q => q.current_stage === "queued" || q.current_stage === "checked_in").length;
  const vitalsCount = queue.filter(q => q.current_stage === "vitals_recorded").length;
  const waitingClinicianCount = queue.filter(q => q.current_stage === "waiting_clinician").length;
  const inConsultationCount = queue.filter(q => q.current_stage === "in_consultation").length;

  // Filtered queue items for list display
  const filteredQueue = queue.filter(item => {
    const matchesStage = selectedStage === "all" || item.current_stage === selectedStage;
    const matchesFlowType = selectedFlowType === "all" || item.flow_type === selectedFlowType;
    return matchesStage && matchesFlowType;
  });

  const getStageBadgeClass = (stage: string) => {
    switch (stage) {
      case "queued":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "checked_in":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "vitals_recorded":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "waiting_clinician":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "in_consultation":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getActionHref = (actionId: string, patientHref: string) => {
    switch (actionId) {
      case "record_vitals":
        return `${patientHref}${patientHref.includes("?") ? "&" : "?"}tab=vitals`;
      case "assign_or_handover":
        return patientHref;
      case "start_consultation":
      case "open_consultation":
        return `${patientHref}${patientHref.includes("?") ? "&" : "?"}tab=visits`;
      default:
        return patientHref;
    }
  };

  return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            onClick={handleRefresh}
            variant="ghost"
            size="sm"
            className="gap-2 h-9 border-[#c7d7cd] bg-white text-[#24302b]"
            disabled={isPending}
          >
            <RefreshCw size={15} className={cn(isPending && "animate-spin")} />
            Refresh
          </Button>
          <Button asChild variant="secondary" size="sm" className="h-9">
            <Link href="/patient-flow">Patient flow tracking</Link>
          </Button>
        </div>
        {/* Subtitle Header context */}
        <div className="-mt-3 mb-2">
          <p className="text-sm text-[#66736d]">
            Active patients currently moving through today's clinic flow.
          </p>
        </div>

        {/* Error Alert bar */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Filters Panel */}
        <div className="rounded-xl border border-[#c7d7cd] bg-white p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--hh-purple-dark)]">
              <Filter size={16} />
              <span>Queue Filters</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto md:min-w-[600px]">
              {/* Date Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#66736d]">Service Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-[#c7d7cd] bg-white rounded-lg px-3 py-1.5 text-xs text-[#24302b] focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)]"
                />
              </div>

              {/* Stage Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#66736d]">Journey Stage</label>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full border border-[#c7d7cd] bg-white rounded-lg px-3 py-1.5 text-xs text-[#24302b] focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)] cursor-pointer"
                >
                  <option value="all">All stages</option>
                  <option value="queued">Queued</option>
                  <option value="checked_in">Checked in</option>
                  <option value="vitals_recorded">Vitals recorded</option>
                  <option value="waiting_clinician">Waiting clinician</option>
                  <option value="in_consultation">In consultation</option>
                </select>
              </div>

              {/* Flow Type Filter */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#66736d]">Flow Type</label>
                <select
                  value={selectedFlowType}
                  onChange={(e) => setSelectedFlowType(e.target.value)}
                  className="w-full border border-[#c7d7cd] bg-white rounded-lg px-3 py-1.5 text-xs text-[#24302b] focus:outline-none focus:ring-1 focus:ring-[var(--hh-purple)] cursor-pointer"
                >
                  <option value="all">All flows</option>
                  <option value="walk_in_queue">Walk-in queue</option>
                  <option value="appointment_checkin">Appointment check-in</option>
                  <option value="manual">Manual</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Aggregate KPI Summary Row (unfiltered context for selected date) */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          {/* Total Active */}
          <div className="rounded-xl border border-[#c7d7cd] bg-white p-4 shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-[#66736d] flex items-center justify-between">
              <span>Total Active</span>
              <Activity size={14} className="text-slate-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#24302b]">
              {loading ? "..." : totalActive}
            </div>
            <div className="mt-1 text-[10px] text-slate-400">Patients in workspace</div>
          </div>

          {/* Queued / Checked in */}
          <div className="rounded-xl border border-purple-100 bg-purple-50/15 p-4 shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-purple-700 flex items-center justify-between">
              <span>Queued</span>
              <Layers size={14} className="text-purple-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-purple-900">
              {loading ? "..." : queuedCount}
            </div>
            <div className="mt-1 text-[10px] text-purple-600/75">Waiting for vitals</div>
          </div>

          {/* Vitals Recorded */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/15 p-4 shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center justify-between">
              <span>Vitals Taken</span>
              <CheckCircle size={14} className="text-amber-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-amber-900">
              {loading ? "..." : vitalsCount}
            </div>
            <div className="mt-1 text-[10px] text-amber-600/75">Awaiting allocation</div>
          </div>

          {/* Waiting Clinician */}
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/15 p-4 shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
              <span>Waiting Doctor</span>
              <TrendingUp size={14} className="text-emerald-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-900">
              {loading ? "..." : waitingClinicianCount}
            </div>
            <div className="mt-1 text-[10px] text-emerald-600/75">Ready for consultations</div>
          </div>

          {/* In Consultation */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/15 p-4 shadow-sm flex flex-col justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-700 flex items-center justify-between">
              <span>In Consult</span>
              <User size={14} className="text-blue-400" />
            </div>
            <div className="mt-2 text-3xl font-extrabold text-blue-900">
              {loading ? "..." : inConsultationCount}
            </div>
            <div className="mt-1 text-[10px] text-blue-600/75">Active visits</div>
          </div>
        </div>

        {/* Board Main List */}
        <div className="space-y-4">
          <div className="text-sm font-bold text-[#24302b] flex items-center justify-between">
            <span>Queue Board ({filteredQueue.length} items)</span>
            <span className="text-xs font-medium text-slate-400">
              {loading ? "Refreshing board..." : `Last updated: ${new Date().toLocaleTimeString()}`}
            </span>
          </div>

          {loading && queue.length === 0 ? (
            <div className="rounded-xl border border-[#c7d7cd] bg-white p-12 text-center text-slate-400">
              <RefreshCw size={24} className="animate-spin mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-medium">Loading clinical queue board...</p>
            </div>
          ) : filteredQueue.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {filteredQueue.map((item) => (
                <div 
                  key={item.id}
                  className="rounded-xl border border-[#c7d7cd] bg-white p-5 shadow-sm hover:border-[var(--hh-purple)]/40 transition-all flex flex-col md:flex-row justify-between gap-5"
                >
                  {/* Left block: Patient Info & Core Specs */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {/* Queue Tag */}
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--hh-purple)] text-white font-extrabold text-base shadow-sm shrink-0">
                        {item.queue_number || "-"}
                      </span>
                      
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link 
                            href={item.href}
                            className="font-bold text-slate-800 hover:text-[var(--hh-purple)] hover:underline truncate"
                          >
                            {item.patient_name}
                          </Link>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider shrink-0">
                            {item.patient_code}
                          </span>
                        </div>

                        {/* Muted Patient details and Wait timers */}
                        <div className="flex items-center gap-3 text-xs text-[#66736d] mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            <span>Wait: <b>{item.wait_minutes}m</b></span>
                          </span>
                          <span>•</span>
                          <span className="capitalize">Flow: {item.flow_type_label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Backend-provided Allocation Fields (Responsive grid) */}
                    {item.stage_context.allocation_visibility !== "minimal" && (
                      <div className={cn(
                        "mt-4 p-3 rounded-lg border text-xs grid grid-cols-2 sm:grid-cols-4 gap-3",
                        item.stage_context.allocation_visibility === "partial" 
                          ? "bg-slate-50/50 border-slate-100" 
                          : "bg-purple-50/20 border-purple-100/30"
                      )}>
                        {/* Clinician Field */}
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clinician</div>
                          <div className={cn(
                            "mt-0.5 font-semibold text-slate-700",
                            item.stage_context.allocation.clinician.status === "pending" && "text-slate-400 italic font-normal"
                          )}>
                            {item.stage_context.allocation.clinician.label}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">{item.stage_context.allocation.clinician.hint}</div>
                        </div>

                        {/* Room Field */}
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Room</div>
                          <div className={cn(
                            "mt-0.5 font-semibold text-slate-700",
                            item.stage_context.allocation.room.status === "pending" && "text-slate-400 italic font-normal"
                          )}>
                            {item.stage_context.allocation.room.label}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">{item.stage_context.allocation.room.hint}</div>
                        </div>

                        {/* Visit Type Field */}
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Visit Type</div>
                          <div className={cn(
                            "mt-0.5 font-semibold text-slate-700",
                            item.stage_context.allocation.visit_type.status === "pending" && "text-slate-400 italic font-normal"
                          )}>
                            {item.stage_context.allocation.visit_type.label}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">{item.stage_context.allocation.visit_type.hint}</div>
                        </div>

                        {/* Appointment Time Field */}
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Appt Time</div>
                          <div className={cn(
                            "mt-0.5 font-semibold text-slate-700",
                            item.stage_context.allocation.appointment_time.status === "pending" && "text-slate-400 italic font-normal"
                          )}>
                            {item.stage_context.allocation.appointment_time.label}
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">{item.stage_context.allocation.appointment_time.hint}</div>
                        </div>
                      </div>
                    )}

                    {item.stage_context.allocation_visibility === "minimal" && (
                      <div className="mt-4 text-[11px] text-slate-400 italic flex items-center gap-1.5">
                        <HelpCircle size={13} className="text-slate-300 shrink-0" />
                        <span>Allocation details are minimal at this stage. Assignments occur post-vitals.</span>
                      </div>
                    )}
                  </div>

                  {/* Right block: Stage context, details, and action block */}
                  <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-5 flex flex-col justify-between shrink-0">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current workflow</span>
                        <span className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0",
                          getStageBadgeClass(item.current_stage)
                        )}>
                          {item.current_stage_label}
                        </span>
                      </div>
                      
                      <div className="mt-2">
                        <div className="text-xs font-bold text-slate-800">
                          {item.stage_context.current_step.title}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                          {item.stage_context.current_step.detail}
                        </p>
                      </div>
                    </div>

                    {/* Primary action CTA button */}
                    {item.stage_context.current_step.primary_action && (
                      <div className="mt-4">
                        <Button 
                          asChild
                          className="w-full h-8 px-3 text-xs bg-[var(--hh-purple)] text-white hover:bg-[var(--hh-purple-dark)] flex items-center justify-center gap-1 shadow-sm font-bold"
                        >
                          <Link href={getActionHref(item.stage_context.current_step.primary_action.id, item.href)}>
                            <span>{item.stage_context.current_step.primary_action.label}</span>
                            <ArrowRight size={13} />
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#c7d7cd] bg-white p-12 text-center text-[#66736d]">
              <Inbox size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-bold">No active patients match selected filters</p>
              <p className="text-xs text-[#818e87] mt-1">Adjust filters or select a different service date to view entries.</p>
            </div>
          )}
        </div>
      </div>
  );
}
