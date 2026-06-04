"use client";

import { useState, useEffect } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Eye,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Printer,
  Scale,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  UserCheck,
  UserCog,
  UserRound,
  Users,
  X
} from "lucide-react";

// Types matching clinic
interface VitalReading {
  label: string;
  value: string;
  status: "normal" | "elevated" | "high" | "low" | "crisis";
  statusLabel: string;
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeColor: string;
  percentage: number; // For progress bars
  unit: string;
  trend?: "up" | "down" | "stable";
  trendText?: string;
  extraInfo?: string;
  ranges: { label: string; min: number; max: number; color: string }[];
}

const mockVitalsHistory = [
  { date: "Today 10:22", bp: "118/76", hr: 74, temp: 36.8, weight: 58.4, glucose: 5.4, context: "Fasting" },
  { date: "May 10", bp: "128/82", hr: 82, temp: 37.1, weight: 58.9, glucose: 6.8, context: "After meals" },
  { date: "Apr 22", bp: "135/88", hr: 79, temp: 36.9, weight: 59.2, glucose: 5.2, context: "Fasting" }
];

export default function UiMockupPage() {
  const [activeTab, setActiveTab] = useState<string>("Overview");
  const [isLocked, setIsLocked] = useState<boolean>(true);
  const [password, setPassword] = useState<string>("");
  const [showPasswordError, setShowPasswordError] = useState<boolean>(false);
  const [vitalsExpanded, setVitalsExpanded] = useState<boolean>(false);
  const [selectedVital, setSelectedVital] = useState<string | null>(null);

  // Vitals definitions and computations
  const bpReading: VitalReading = {
    label: "Blood Pressure",
    value: "118 / 76",
    unit: "mmHg",
    status: "normal",
    statusLabel: "Optimal",
    icon: Activity,
    color: "var(--hh-green-dark)",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    badgeColor: "bg-emerald-500 text-white",
    percentage: 45, // Map 118 systolic onto scale
    trend: "down",
    trendText: "-10 mmHg systolic vs May 10",
    extraInfo: "Both systolic (<120) and diastolic (<80) are in optimal clinical ranges.",
    ranges: [
      { label: "Normal", min: 90, max: 120, color: "bg-emerald-500" },
      { label: "Elevated", min: 120, max: 130, color: "bg-amber-400" },
      { label: "Stage 1", min: 130, max: 140, color: "bg-orange-500" },
      { label: "Stage 2", min: 140, max: 180, color: "bg-red-500" }
    ]
  };

  const hrReading: VitalReading = {
    label: "Heart Rate",
    value: "74",
    unit: "bpm",
    status: "normal",
    statusLabel: "Normal",
    icon: HeartPulse,
    color: "text-rose-600",
    bgColor: "bg-rose-50/50",
    borderColor: "border-rose-100",
    badgeColor: "bg-rose-500 text-white",
    percentage: 60, // Map 74 on scale 40-140
    trend: "down",
    trendText: "-8 bpm vs May 10",
    extraInfo: "Stable rest rate. Patient reports less stress and regular breathing exercises.",
    ranges: [
      { label: "Low", min: 40, max: 60, color: "bg-sky-400" },
      { label: "Normal", min: 60, max: 100, color: "bg-emerald-500" },
      { label: "High", min: 100, max: 150, color: "bg-rose-500" }
    ]
  };

  const tempReading: VitalReading = {
    label: "Temperature",
    value: "36.8",
    unit: "°C",
    status: "normal",
    statusLabel: "Normal",
    icon: Thermometer,
    color: "text-sky-600",
    bgColor: "bg-sky-50/50",
    borderColor: "border-sky-100",
    badgeColor: "bg-sky-500 text-white",
    percentage: 55, // Map 36.8 on scale 35-41
    trend: "stable",
    trendText: "Stable",
    extraInfo: "Perfect body temperature. No feverish symptom triggers.",
    ranges: [
      { label: "Hypothermia", min: 34, max: 36, color: "bg-blue-400" },
      { label: "Normal", min: 36, max: 37.3, color: "bg-emerald-500" },
      { label: "Fever", min: 37.3, max: 38.5, color: "bg-amber-400" },
      { label: "High Fever", min: 38.5, max: 42, color: "bg-rose-500" }
    ]
  };

  const weightReading: VitalReading = {
    label: "Weight",
    value: "58.4",
    unit: "kg",
    status: "normal",
    statusLabel: "Stable",
    icon: Scale,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50/50",
    borderColor: "border-indigo-100",
    badgeColor: "bg-indigo-500 text-white",
    percentage: 42,
    trend: "down",
    trendText: "-0.5 kg in 24 days",
    extraInfo: "Slight downward fluctuation. Consistent with active lifestyle adjustments.",
    ranges: [
      { label: "Underweight", min: 35, max: 48, color: "bg-sky-300" },
      { label: "Normal", min: 48, max: 68, color: "bg-emerald-500" },
      { label: "Overweight", min: 68, max: 88, color: "bg-amber-400" }
    ]
  };

  const glucoseReading: VitalReading = {
    label: "Blood Glucose",
    value: "5.4",
    unit: "mmol/L",
    status: "normal",
    statusLabel: "Normal (Fasting)",
    icon: Activity,
    color: "text-violet-600",
    bgColor: "bg-violet-50/50",
    borderColor: "border-violet-100",
    badgeColor: "bg-violet-500 text-white",
    percentage: 50,
    trend: "down",
    trendText: "-1.4 mmol/L (fasting vs fed)",
    extraInfo: "Recorded as Fasting. Optimal glycaemic range (4.0 - 5.6 mmol/L).",
    ranges: [
      { label: "Low", min: 2.0, max: 4.0, color: "bg-rose-400" },
      { label: "Normal", min: 4.0, max: 5.6, color: "bg-emerald-500" },
      { label: "Pre-Diabetes", min: 5.7, max: 6.9, color: "bg-amber-400" },
      { label: "Diabetes", min: 7.0, max: 15.0, color: "bg-rose-600" }
    ]
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "clinician123") {
      setIsLocked(false);
      setShowPasswordError(false);
    } else {
      setShowPasswordError(true);
    }
  };

  return (
    <main className="min-h-screen bg-[#edf3ef] text-[#1a221d] antialiased">
      {/* Top Banner */}
      <header className="sticky top-0 z-40 border-b border-[#cfe1d4] bg-[var(--hh-purple)] px-4 py-3 text-white shadow-md">
        <div className="mx-auto flex max-w-[1540px] items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Activity size={20} className="text-[#a4f9b8] animate-pulse" />
            </div>
            <div>
              <h1 className="text-md font-extrabold tracking-wide sm:text-lg">Harmony Health MIS</h1>
              <p className="hidden text-[10px] text-white/70 sm:block">Clinical Management & Record System</p>
            </div>
          </div>
          <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs md:flex">
            <Search size={14} className="text-white/60" />
            <span className="text-white/50">Search patient records (Press "/" to focus)...</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10">
                <Bell size={18} />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--hh-green)] ring-2 ring-[var(--hh-purple)]"></span>
              </button>
            </div>
            <div className="h-5 w-[1px] bg-white/20"></div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs font-bold text-white">Dr. A. Maseko</div>
                <div className="text-[9px] text-[#c5a1f2]">Chief Homeopath</div>
              </div>
              <ChevronDown size={14} className="text-white/60" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto max-w-[1540px] px-3 py-5 sm:px-6">
        {/* Navigation Breadcrumb & Action Row */}
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--hh-green-dark)] uppercase tracking-wider">
              <span>Patient Records</span>
              <span>/</span>
              <span className="text-slate-500 font-medium">Zahara Dlamini Workspace</span>
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--hh-purple-dark)] sm:text-2xl">
              Two-Column Clinical Workspace
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="flex min-h-10 items-center gap-2 rounded-lg bg-[var(--hh-purple)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[var(--hh-purple-dark)] transition-all">
              <Plus size={15} />
              New Visit
            </button>
            <button className="flex min-h-10 items-center gap-2 rounded-lg border border-[#b8cabe] bg-white px-4 py-2 text-xs font-bold text-[#3a443e] shadow-sm hover:bg-[#f7faf8] transition-all">
              <Printer size={15} />
              Print Chart
            </button>
            <button className="flex min-h-10 items-center gap-2 rounded-lg border border-[#b8cabe] bg-white px-4 py-2 text-xs font-bold text-[#3a443e] shadow-sm hover:bg-[#f7faf8] transition-all">
              <CalendarCheck size={15} />
              Book Appointment
            </button>
          </div>
        </div>

        {/* Two-Column Responsive Layout */}
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          
          {/* Left Column (Sticky Sidebar): Patient Card & active clinical journey */}
          <div className="space-y-6 lg:sticky lg:top-[84px] lg:h-[calc(100vh-110px)] lg:overflow-y-auto">
            {/* Patient Header Card */}
            <div className="rounded-2xl border border-[#b8cabe] bg-white p-5 shadow-sm relative overflow-hidden">
              {/* Premium background accent */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[var(--hh-purple)] via-[#a45cd6] to-[var(--hh-green)]"></div>
              
              <div className="flex gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f8f2fd] to-[#f0e4fc] text-[var(--hh-purple)] shadow-inner">
                  <UserRound size={32} />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <h3 className="text-xl font-extrabold text-[var(--hh-purple-dark)] leading-tight">
                      Zahara Dlamini
                    </h3>
                  </div>
                  <span className="inline-block mt-1 font-mono text-xs font-bold text-[#5c6861] bg-[#f0f5f1] px-2 py-0.5 rounded">
                    PAT-2026-000184
                  </span>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      Active
                    </span>
                    <span className="inline-flex rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-[var(--hh-purple)]">
                      Premium Clinician Access
                    </span>
                  </div>
                </div>
              </div>

              {/* Patient Basic Info List */}
              <div className="mt-6 space-y-3.5 border-t border-[#e1ebd3]/50 pt-5">
                <div className="grid grid-cols-[110px_1fr] text-xs">
                  <span className="font-bold text-[#627167] uppercase tracking-wider">Gender / Age</span>
                  <span className="font-semibold text-[#1a221d]">Female / 22 years</span>
                </div>
                <div className="grid grid-cols-[110px_1fr] text-xs">
                  <span className="font-bold text-[#627167] uppercase tracking-wider">Date of Birth</span>
                  <span className="font-semibold text-[#1a221d]">May 20, 2004</span>
                </div>
                <div className="grid grid-cols-[110px_1fr] text-xs">
                  <span className="font-bold text-[#627167] uppercase tracking-wider">Primary Phone</span>
                  <span className="font-semibold text-[#1a221d]">+268 7600 1840</span>
                </div>
                <div className="grid grid-cols-[110px_1fr] text-xs">
                  <span className="font-bold text-[#627167] uppercase tracking-wider">Locality</span>
                  <span className="font-semibold text-[#1a221d]">Mbabane, Eswatini</span>
                </div>
                <div className="grid grid-cols-[110px_1fr] text-xs">
                  <span className="font-bold text-[#627167] uppercase tracking-wider">Next of Kin</span>
                  <span className="font-semibold text-[#1a221d]">Mother (Nokuthula)</span>
                </div>
              </div>
            </div>

            {/* Today Journey Panel */}
            <div className="rounded-2xl border border-[#b8cabe] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#f0f5f1] pb-3">
                <div className="flex items-center gap-2 font-bold text-[var(--hh-purple-dark)] text-sm sm:text-base">
                  <ClipboardList size={18} className="text-[var(--hh-purple)]" />
                  <span>Establishment Process</span>
                </div>
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800 uppercase animate-pulse">
                  Checked-in
                </span>
              </div>
              
              <p className="mt-3 text-xs leading-5 text-[#5c6a61]">
                Patient was checked in today at 10:15 AM via receptionist tablet flow. Currently in wait queue.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-[#b8cabe] bg-[#f7faf8] p-2.5 text-center">
                  <div className="text-[10px] font-bold text-[#5c6a61] uppercase">Stage</div>
                  <div className="mt-1 text-xs font-extrabold text-[var(--hh-purple)]">Visits / Note</div>
                </div>
                <div className="rounded-lg border border-[#b8cabe] bg-[#f7faf8] p-2.5 text-center">
                  <div className="text-[10px] font-bold text-[#5c6a61] uppercase">Flow</div>
                  <div className="mt-1 text-xs font-extrabold text-[var(--hh-purple)]">Follow-up</div>
                </div>
                <div className="rounded-lg border border-[#b8cabe] bg-[#f7faf8] p-2.5 text-center">
                  <div className="text-[10px] font-bold text-[#5c6a61] uppercase">Queue</div>
                  <div className="mt-1 text-xs font-extrabold text-emerald-800">#4 (Ready)</div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <button className="w-full flex justify-center items-center gap-2 rounded-lg bg-[var(--hh-purple-dark)] py-2 text-xs font-bold text-white shadow-inner hover:bg-slate-900 transition-all">
                  Track full queue flow
                </button>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="rounded-2xl border border-[#b8cabe] bg-[#f7faf8] p-5 shadow-sm">
              <h4 className="text-xs font-extrabold text-[#3b4740] uppercase tracking-wider mb-3">
                Key Notes
              </h4>
              <div className="rounded-xl border border-[#ccd9d0] bg-white p-3.5 text-xs text-[#2f3b33] leading-relaxed shadow-sm">
                "Patient reported nasal congestion, fatigue, and disturbed sleep. Chronic sinus pressure with frontal headaches. Symptoms worse under exam stress."
              </div>
            </div>
          </div>

          {/* Right Column: Bento Grid of Medical Records */}
          <div className="space-y-6">
            
            {/* Horizontal Workspace Tabs */}
            <div className="sticky top-16 z-20 border-b border-[#cfe1d4] bg-white/90 backdrop-blur-md rounded-xl p-1 flex gap-1 overflow-x-auto shadow-sm">
              {["Overview", "Cases", "Assessments", "Remedies", "Vitals History", "Documents", "Notes"].map((tab) => {
                const active = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`min-h-10 shrink-0 rounded-lg px-4 text-xs font-extrabold tracking-wide transition-all ${
                      active
                        ? "bg-[var(--hh-purple)] text-white shadow-sm"
                        : "text-[#3b4740] hover:bg-[#f3f7f4] hover:text-[#1a221d]"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Overview Tab Content */}
            {activeTab === "Overview" && (
              <div className="grid gap-6">
                
                {/* 1. VISUAL VITALS DASHBOARD GRID */}
                <section className="rounded-2xl border border-[#b8cabe] bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-2 border-b border-[#f0f5f1] pb-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-[var(--hh-green-dark)]">
                        <HeartPulse size={16} />
                      </div>
                      <h3 className="font-extrabold text-[var(--hh-purple-dark)] text-base">
                        Vitals Visual Dashboard
                      </h3>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        100% Normalized
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-[#5c6a61]">Recorded Today 10:22 AM by Dr. Maseko</span>
                    </div>
                  </div>

                  {/* Vitals Grid */}
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    
                    {/* BP Metric */}
                    <div 
                      onClick={() => setSelectedVital(selectedVital === "bp" ? null : "bp")}
                      className={`group relative rounded-xl border p-4 shadow-xs transition-all duration-300 cursor-pointer ${
                        selectedVital === "bp" 
                          ? "border-emerald-500 ring-2 ring-emerald-100 bg-emerald-50/20" 
                          : "border-[#d8e5dd] bg-white hover:border-emerald-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-100">
                          <Activity size={18} />
                        </div>
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                          {bpReading.statusLabel}
                        </span>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-2xl font-black text-[#1a221d] tracking-tight">
                          {bpReading.value} <span className="text-xs font-bold text-[#5c6a61]">{bpReading.unit}</span>
                        </div>
                        <div className="text-[11px] font-bold text-[#445048] mt-0.5 uppercase tracking-wider">
                          Blood Pressure
                        </div>
                      </div>

                      {/* BP Custom Gauge Meter */}
                      <div className="mt-4">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
                          <div className="h-full w-[45%] bg-emerald-500 rounded-l-full"></div>
                          <div className="h-full w-[15%] bg-amber-300"></div>
                          <div className="h-full w-[20%] bg-orange-400"></div>
                          <div className="h-full w-[20%] bg-red-500 rounded-r-full"></div>
                          
                          {/* Indicator Dot representing current value */}
                          <div className="absolute top-1/2 left-[40%] -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-emerald-800 border-2 border-white shadow-sm ring-2 ring-emerald-100 animate-pulse"></div>
                        </div>
                        <div className="mt-1.5 flex justify-between text-[10px] font-bold text-[#627167]">
                          <span>Normal</span>
                          <span>Elevated</span>
                          <span>Stage 1</span>
                          <span>Stage 2</span>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-[#f0f5f1] pt-2.5 flex justify-between items-center text-xs text-[#526057]">
                        <span className="flex items-center gap-1 font-bold text-emerald-700">
                          <ArrowDown size={12} />
                          {bpReading.trendText}
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${selectedVital === "bp" ? "rotate-180 text-emerald-600" : ""}`} />
                      </div>

                      {selectedVital === "bp" && (
                        <div className="mt-3 text-xs bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg text-emerald-950 animate-fade-in">
                          {bpReading.extraInfo}
                        </div>
                      )}
                    </div>

                    {/* HR Metric */}
                    <div 
                      onClick={() => setSelectedVital(selectedVital === "hr" ? null : "hr")}
                      className={`group relative rounded-xl border p-4 shadow-xs transition-all duration-300 cursor-pointer ${
                        selectedVital === "hr" 
                          ? "border-rose-400 ring-2 ring-rose-100 bg-rose-50/20" 
                          : "border-[#d8e5dd] bg-white hover:border-rose-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-500 transition-colors group-hover:bg-rose-100">
                          <HeartPulse size={18} className="animate-pulse duration-1000" />
                        </div>
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                          {hrReading.statusLabel}
                        </span>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-2xl font-black text-[#1a221d] tracking-tight">
                          {hrReading.value} <span className="text-xs font-bold text-[#5c6a61]">{hrReading.unit}</span>
                        </div>
                        <div className="text-[11px] font-bold text-[#445048] mt-0.5 uppercase tracking-wider">
                          Heart Rate
                        </div>
                      </div>

                      {/* HR Custom Gauge Meter */}
                      <div className="mt-4">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
                          <div className="h-full w-[30%] bg-sky-400 rounded-l-full"></div>
                          <div className="h-full w-[45%] bg-emerald-500"></div>
                          <div className="h-full w-[25%] bg-rose-500 rounded-r-full"></div>
                          
                          {/* Indicator Dot representing current value */}
                          <div className="absolute top-1/2 left-[55%] -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-emerald-800 border-2 border-white shadow-sm ring-2 ring-emerald-100"></div>
                        </div>
                        <div className="mt-1.5 flex justify-between text-[10px] font-bold text-[#627167]">
                          <span>Low (&lt;60)</span>
                          <span>Normal (60-100)</span>
                          <span>High (&gt;100)</span>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-[#f0f5f1] pt-2.5 flex justify-between items-center text-xs text-[#526057]">
                        <span className="flex items-center gap-1 font-bold text-emerald-700">
                          <ArrowDown size={12} />
                          {hrReading.trendText}
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${selectedVital === "hr" ? "rotate-180 text-rose-600" : ""}`} />
                      </div>

                      {selectedVital === "hr" && (
                        <div className="mt-3 text-xs bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-rose-950 animate-fade-in">
                          {hrReading.extraInfo}
                        </div>
                      )}
                    </div>

                    {/* Temperature Metric */}
                    <div 
                      onClick={() => setSelectedVital(selectedVital === "temp" ? null : "temp")}
                      className={`group relative rounded-xl border p-4 shadow-xs transition-all duration-300 cursor-pointer ${
                        selectedVital === "temp" 
                          ? "border-sky-400 ring-2 ring-sky-100 bg-sky-50/20" 
                          : "border-[#d8e5dd] bg-white hover:border-sky-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 transition-colors group-hover:bg-sky-100">
                          <Thermometer size={18} />
                        </div>
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                          {tempReading.statusLabel}
                        </span>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-2xl font-black text-[#1a221d] tracking-tight">
                          {tempReading.value} <span className="text-xs font-bold text-[#5c6a61]">{tempReading.unit}</span>
                        </div>
                        <div className="text-[11px] font-bold text-[#445048] mt-0.5 uppercase tracking-wider">
                          Temperature
                        </div>
                      </div>

                      {/* Temperature Custom Meter */}
                      <div className="mt-4">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
                          <div className="h-full w-[25%] bg-blue-400 rounded-l-full"></div>
                          <div className="h-full w-[35%] bg-emerald-500"></div>
                          <div className="h-full w-[20%] bg-amber-400"></div>
                          <div className="h-full w-[20%] bg-rose-500 rounded-r-full"></div>
                          
                          {/* Indicator Dot representing current value */}
                          <div className="absolute top-1/2 left-[48%] -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-emerald-800 border-2 border-white shadow-sm ring-2 ring-emerald-100"></div>
                        </div>
                        <div className="mt-1.5 flex justify-between text-[10px] font-bold text-[#627167]">
                          <span>Cold</span>
                          <span>Normal</span>
                          <span>Fever</span>
                          <span>High</span>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-[#f0f5f1] pt-2.5 flex justify-between items-center text-xs text-[#526057]">
                        <span className="flex items-center gap-1 font-semibold text-[#5c6a61]">
                          Stable
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${selectedVital === "temp" ? "rotate-180 text-sky-600" : ""}`} />
                      </div>

                      {selectedVital === "temp" && (
                        <div className="mt-3 text-xs bg-sky-50 border border-sky-100 p-2.5 rounded-lg text-sky-950 animate-fade-in">
                          {tempReading.extraInfo}
                        </div>
                      )}
                    </div>

                    {/* Weight Metric */}
                    <div 
                      onClick={() => setSelectedVital(selectedVital === "weight" ? null : "weight")}
                      className={`group relative rounded-xl border p-4 shadow-xs transition-all duration-300 cursor-pointer ${
                        selectedVital === "weight" 
                          ? "border-indigo-400 ring-2 ring-indigo-100 bg-indigo-50/20" 
                          : "border-[#d8e5dd] bg-white hover:border-indigo-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100">
                          <Scale size={18} />
                        </div>
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                          {weightReading.statusLabel}
                        </span>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-2xl font-black text-[#1a221d] tracking-tight">
                          {weightReading.value} <span className="text-xs font-bold text-[#5c6a61]">{weightReading.unit}</span>
                        </div>
                        <div className="text-[11px] font-bold text-[#445048] mt-0.5 uppercase tracking-wider">
                          Weight
                        </div>
                      </div>

                      {/* Weight Custom Meter */}
                      <div className="mt-4">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
                          <div className="h-full w-[25%] bg-sky-300 rounded-l-full"></div>
                          <div className="h-full w-[45%] bg-emerald-500"></div>
                          <div className="h-full w-[30%] bg-amber-400 rounded-r-full"></div>
                          
                          {/* Indicator Dot representing current value */}
                          <div className="absolute top-1/2 left-[48%] -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-emerald-800 border-2 border-white shadow-sm ring-2 ring-emerald-100"></div>
                        </div>
                        <div className="mt-1.5 flex justify-between text-[10px] font-bold text-[#627167]">
                          <span>Under</span>
                          <span>Normal Range</span>
                          <span>Over</span>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-[#f0f5f1] pt-2.5 flex justify-between items-center text-xs text-[#526057]">
                        <span className="flex items-center gap-1 font-bold text-emerald-700">
                          <ArrowDown size={12} />
                          {weightReading.trendText}
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${selectedVital === "weight" ? "rotate-180 text-indigo-600" : ""}`} />
                      </div>

                      {selectedVital === "weight" && (
                        <div className="mt-3 text-xs bg-indigo-50 border border-indigo-100 p-2.5 rounded-lg text-indigo-950 animate-fade-in">
                          {weightReading.extraInfo}
                        </div>
                      )}
                    </div>

                    {/* Blood Glucose Metric */}
                    <div 
                      onClick={() => setSelectedVital(selectedVital === "glucose" ? null : "glucose")}
                      className={`group relative rounded-xl border p-4 shadow-xs transition-all duration-300 cursor-pointer ${
                        selectedVital === "glucose" 
                          ? "border-violet-400 ring-2 ring-violet-100 bg-violet-50/20" 
                          : "border-[#d8e5dd] bg-white hover:border-violet-300 hover:shadow-md"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 transition-colors group-hover:bg-violet-100">
                          <Activity size={18} />
                        </div>
                        <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                          {glucoseReading.statusLabel}
                        </span>
                      </div>
                      
                      <div className="mt-3">
                        <div className="text-2xl font-black text-[#1a221d] tracking-tight">
                          {glucoseReading.value} <span className="text-xs font-bold text-[#5c6a61]">{glucoseReading.unit}</span>
                        </div>
                        <div className="text-[11px] font-bold text-[#445048] mt-0.5 uppercase tracking-wider">
                          Blood Glucose (Fasting)
                        </div>
                      </div>

                      {/* Glucose Custom Meter */}
                      <div className="mt-4">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 flex">
                          <div className="h-full w-[20%] bg-rose-400 rounded-l-full"></div>
                          <div className="h-full w-[35%] bg-emerald-500"></div>
                          <div className="h-full w-[20%] bg-amber-400"></div>
                          <div className="h-full w-[25%] bg-rose-600 rounded-r-full"></div>
                          
                          {/* Indicator Dot representing current value */}
                          <div className="absolute top-1/2 left-[48%] -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-emerald-800 border-2 border-white shadow-sm ring-2 ring-emerald-100"></div>
                        </div>
                        <div className="mt-1.5 flex justify-between text-[10px] font-bold text-[#627167]">
                          <span>Low</span>
                          <span>Normal</span>
                          <span>Pre-Diab</span>
                          <span>Diabetes</span>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-[#f0f5f1] pt-2.5 flex justify-between items-center text-xs text-[#526057]">
                        <span className="flex items-center gap-1 font-bold text-emerald-700">
                          <ArrowDown size={12} />
                          {glucoseReading.trendText}
                        </span>
                        <ChevronDown size={14} className={`text-slate-400 transition-transform ${selectedVital === "glucose" ? "rotate-180 text-violet-600" : ""}`} />
                      </div>

                      {selectedVital === "glucose" && (
                        <div className="mt-3 text-xs bg-violet-50 border border-violet-100 p-2.5 rounded-lg text-violet-950 animate-fade-in">
                          {glucoseReading.extraInfo}
                        </div>
                      )}
                    </div>

                    {/* Vitals History Sparkline Proposal Card */}
                    <div 
                      onClick={() => setVitalsExpanded(!vitalsExpanded)}
                      className="rounded-xl border border-dashed border-[#b8cabe] bg-slate-50/50 p-4 hover:bg-[#f3f8f4] hover:border-[var(--hh-purple)] transition-all flex flex-col justify-between cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <ClipboardList size={16} className="text-[var(--hh-purple)]" />
                          <h4 className="text-xs font-extrabold text-[#3a443e] uppercase">
                            Clinical Vitals Log
                          </h4>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-[#5c6a61]">
                          Analyze structural trends over the previous {mockVitalsHistory.length} clinic visits. Click to toggle tabular history.
                        </p>
                      </div>
                      
                      <div className="mt-4 flex items-center justify-between text-xs font-bold text-[var(--hh-purple)]">
                        <span>{vitalsExpanded ? "Collapse History" : "Expand Full History"}</span>
                        <ChevronDown size={15} className={`transition-transform duration-200 ${vitalsExpanded ? "rotate-180" : ""}`} />
                      </div>
                    </div>

                  </div>

                  {/* Tabular History Dropdown (Standard clinical audit log) */}
                  {vitalsExpanded && (
                    <div className="mt-5 border-t border-[#f0f5f1] pt-4 overflow-x-auto animate-fade-in">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#f7faf8] uppercase tracking-wider text-[#627167]">
                            <th className="px-3 py-2 border border-[#d8e5dd]">Recorded At</th>
                            <th className="px-3 py-2 border border-[#d8e5dd]">Blood Pressure</th>
                            <th className="px-3 py-2 border border-[#d8e5dd]">Pulse</th>
                            <th className="px-3 py-2 border border-[#d8e5dd]">Temp</th>
                            <th className="px-3 py-2 border border-[#d8e5dd]">Weight</th>
                            <th className="px-3 py-2 border border-[#d8e5dd]">Glucose</th>
                            <th className="px-3 py-2 border border-[#d8e5dd]">Context</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mockVitalsHistory.map((item) => (
                            <tr key={item.date} className="bg-white hover:bg-slate-50">
                              <td className="px-3 py-2.5 border border-[#d8e5dd] font-bold text-[#5c6a61]">{item.date}</td>
                              <td className="px-3 py-2.5 border border-[#d8e5dd] font-extrabold text-[var(--hh-purple-dark)]">{item.bp}</td>
                              <td className="px-3 py-2.5 border border-[#d8e5dd] font-semibold">{item.hr} bpm</td>
                              <td className="px-3 py-2.5 border border-[#d8e5dd] font-semibold">{item.temp} °C</td>
                              <td className="px-3 py-2.5 border border-[#d8e5dd] font-semibold">{item.weight} kg</td>
                              <td className="px-3 py-2.5 border border-[#d8e5dd] font-semibold">{item.glucose} mmol/L</td>
                              <td className="px-3 py-2.5 border border-[#d8e5dd]">
                                <span className={`inline-block px-2 py-0.5 rounded font-extrabold ${item.context === "Fasting" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
                                  {item.context}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* 2. CLINICAL BENTO GRID AREA: Left-side Clinical Assessments, Right-side Active Cases & Timeline */}
                <div className="grid gap-6 md:grid-cols-2">
                  
                  {/* Active Cases Block */}
                  <div className="rounded-2xl border border-[#b8cabe] bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#f0f5f1] pb-3">
                      <div className="flex items-center gap-2 font-extrabold text-[var(--hh-purple-dark)] text-sm sm:text-base">
                        <ClipboardList size={18} className="text-[var(--hh-purple)]" />
                        <span>Active Patient Cases</span>
                      </div>
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        1 Open Case
                      </span>
                    </div>

                    <div className="mt-4 space-y-4">
                      <div className="rounded-xl border border-[#b8cabe] bg-[#f7faf8] p-4 relative overflow-hidden">
                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-amber-500"></div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-extrabold text-sm text-[var(--hh-purple-dark)]">
                              Chronic Allergic Rhinitis & Sinusitis
                            </h4>
                            <p className="text-[11px] text-[#5c6a61] mt-0.5">
                              Created on April 22, 2026 • Managed by Dr. Maseko
                            </p>
                          </div>
                          <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-bold text-amber-800 uppercase">
                            Open
                          </span>
                        </div>
                        
                        <div className="mt-3.5 space-y-2.5 border-t border-[#ccdcd1]/50 pt-3 text-xs leading-relaxed text-[#3b4740]">
                          <div>
                            <span className="font-extrabold uppercase text-[10px] text-[#5c6a61] block">Main Complaint</span>
                            <span>Severe congestion, post-nasal drip, frontal headache worse morning and with exam stress.</span>
                          </div>
                          <div>
                            <span className="font-extrabold uppercase text-[10px] text-[#5c6a61] block">Current Remedy</span>
                            <span className="font-bold text-[var(--hh-purple)]">Pulsatilla 30C (5 pellets daily)</span>
                          </div>
                        </div>

                        <div className="mt-4 flex gap-2 justify-end">
                          <button className="rounded-lg border border-[#b8cabe] bg-white px-3 py-1.5 text-xs font-bold text-[#3a443e] hover:bg-[#f3faf5] transition-all">
                            Add Follow-up Visit
                          </button>
                          <button className="rounded-lg bg-[var(--hh-purple)] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--hh-purple-dark)] transition-all">
                            Resolve Case
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Visit Timeline Pipeline */}
                  <div className="rounded-2xl border border-[#b8cabe] bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-[#f0f5f1] pb-3">
                      <div className="flex items-center gap-2 font-extrabold text-[var(--hh-purple-dark)] text-sm sm:text-base">
                        <Activity size={18} className="text-[var(--hh-purple)]" />
                        <span>Visit Pipeline Timeline</span>
                      </div>
                      <span className="text-xs font-semibold text-[#5c6a61]">3 Total Encounters</span>
                    </div>

                    <div className="mt-5 relative border-l-2 border-dashed border-[#ccd9d0] pl-5 ml-2.5 space-y-5">
                      {/* Encounter 1 */}
                      <div className="relative">
                        {/* Pipeline indicator node */}
                        <div className="absolute -left-[27.5px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-[var(--hh-purple)] ring-2 ring-[var(--hh-purple)] ring-offset-1"></div>
                        
                        <span className="text-[10px] font-bold text-[#5c6a61] bg-[#f0f5f1] px-2 py-0.5 rounded uppercase">
                          Today 10:15
                        </span>
                        <h4 className="mt-1 text-xs font-extrabold text-[var(--hh-purple-dark)]">
                          Encounter Checked In (In Queue)
                        </h4>
                        <p className="text-[11px] leading-relaxed text-[#5c6a61]">
                          Registered for routine remedy response review and sinus assessment.
                        </p>
                      </div>

                      {/* Encounter 2 */}
                      <div className="relative">
                        <div className="absolute -left-[27.5px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-600 ring-2 ring-emerald-100"></div>
                        
                        <span className="text-[10px] font-bold text-[#5c6a61] bg-[#f0f5f1] px-2 py-0.5 rounded uppercase">
                          May 10, 2026
                        </span>
                        <h4 className="mt-1 text-xs font-extrabold text-emerald-950">
                          Follow-up consultation
                        </h4>
                        <p className="text-[11px] leading-relaxed text-[#5c6a61]">
                          Headache reduced, sleep slightly improved. Nasal discharges changed from thick yellow to clear. Remedy adjusted.
                        </p>
                      </div>

                      {/* Encounter 3 */}
                      <div className="relative">
                        <div className="absolute -left-[27.5px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-slate-400"></div>
                        
                        <span className="text-[10px] font-bold text-[#5c6a61] bg-[#f0f5f1] px-2 py-0.5 rounded uppercase">
                          April 22, 2026
                        </span>
                        <h4 className="mt-1 text-xs font-extrabold text-slate-800">
                          First consultation (New Case)
                        </h4>
                        <p className="text-[11px] leading-relaxed text-[#5c6a61]">
                          Detailed homeopathy profiling complete. Prescribed Pulsatilla 30C dry dose.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 3. HOMEOPATHY PROFILE PANEL */}
                <section className="rounded-2xl border border-[#b8cabe] bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 border-b border-[#f0f5f1] pb-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                      <Stethoscope size={16} />
                    </div>
                    <h3 className="font-extrabold text-[var(--hh-purple-dark)] text-base">
                      Homeopathy Profile & Modalities
                    </h3>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-xl border border-[#d8e5dd] p-4 bg-[#fbfdfc]">
                      <div className="text-[10px] font-extrabold uppercase text-[#627167] tracking-wider">
                        Thermal Modality
                      </div>
                      <p className="mt-1 text-sm font-bold text-[var(--hh-purple-dark)]">
                        Chilly (Extremely sensitive to cold & drafts)
                      </p>
                    </div>
                    
                    <div className="rounded-xl border border-[#d8e5dd] p-4 bg-[#fbfdfc]">
                      <div className="text-[10px] font-extrabold uppercase text-[#627167] tracking-wider">
                        Constitution / Miasm
                      </div>
                      <p className="mt-1 text-sm font-bold text-[var(--hh-purple-dark)]">
                        Psoric (Sinus-centric focus, stress reactive)
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#d8e5dd] p-4 bg-[#fbfdfc]">
                      <div className="text-[10px] font-extrabold uppercase text-[#627167] tracking-wider">
                        Sleep Pattern
                      </div>
                      <p className="mt-1 text-sm font-bold text-[var(--hh-purple-dark)]">
                        Restless sleep, wakes frequently around 03:00 AM
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#d8e5dd] p-4 bg-[#fbfdfc]">
                      <div className="text-[10px] font-extrabold uppercase text-[#627167] tracking-wider">
                        Food Modalities
                      </div>
                      <p className="mt-1 text-sm font-bold text-[var(--hh-purple-dark)]">
                        Desires cold drinks, worse after rich/fatty foods
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#d8e5dd] p-4 bg-[#fbfdfc]">
                      <div className="text-[10px] font-extrabold uppercase text-[#627167] tracking-wider">
                        Family Medical History
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#1a221d]">
                        Maternal asthma, Paternal history of high blood pressure
                      </p>
                    </div>

                    <div className="rounded-xl border border-[#d8e5dd] p-4 bg-[#fbfdfc]">
                      <div className="text-[10px] font-extrabold uppercase text-[#627167] tracking-wider">
                        Current Allopathic Meds
                      </div>
                      <p className="mt-1 text-sm font-semibold text-[#1a221d]">
                        Occasional over-the-counter antihistamines
                      </p>
                    </div>
                  </div>
                </section>

                {/* 4. CONFIDENTIAL CLINIC RECORD & HIV STATUS */}
                <section className="rounded-2xl border border-[#b8cabe] bg-white p-5 shadow-sm relative overflow-hidden">
                  <div className="flex items-center justify-between border-b border-[#f0f5f1] pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-[var(--hh-purple)]">
                        <LockKeyhole size={16} />
                      </div>
                      <h3 className="font-extrabold text-[var(--hh-purple-dark)] text-base">
                        Protected Clinical & Confidential Records
                      </h3>
                    </div>
                    {isLocked ? (
                      <span className="inline-flex rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 uppercase">
                        Encrypted / Locked
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase">
                        Decrypted / Unlocked
                      </span>
                    )}
                  </div>

                  {isLocked ? (
                    <div className="my-5 flex flex-col items-center justify-center text-center p-6 border border-dashed border-[#ccd9d0] rounded-xl bg-slate-50/50">
                      <LockKeyhole size={36} className="text-amber-500 animate-bounce duration-1000 mb-3" />
                      <h4 className="text-sm font-bold text-[var(--hh-purple-dark)]">
                        Clinician Password Verification Required
                      </h4>
                      <p className="text-xs text-[#5c6a61] mt-1 max-w-sm leading-relaxed">
                        To view protected medical disclosures, HIV history status, or chronic conditions, please confirm your access passcode.
                      </p>
                      
                      <form onSubmit={handleUnlock} className="mt-4 flex gap-2 max-w-xs w-full">
                        <input
                          type="password"
                          placeholder="Type 'clinician123' to unlock..."
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-10 rounded-lg border border-[#b8cabe] px-3 text-xs flex-1 text-center bg-white shadow-inner focus:outline-none focus:border-[var(--hh-purple)]"
                        />
                        <button 
                          type="submit"
                          className="rounded-lg bg-[var(--hh-purple-dark)] px-4 text-xs font-bold text-white hover:bg-slate-900 transition-all"
                        >
                          Verify
                        </button>
                      </form>
                      {showPasswordError && (
                        <p className="text-[10px] text-[var(--hh-red)] font-bold mt-2">
                          Incorrect clinical authorization key. Try "clinician123".
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-5 space-y-4 animate-fade-in">
                      {/* HIV Status Card */}
                      <div className="rounded-xl border border-[#d8c0e8] bg-[#fbf9fd] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-[var(--hh-purple)]">
                            <ShieldCheck size={16} />
                            Confidential HIV Status
                          </div>
                          <div className="mt-3.5 flex gap-2">
                            {["Reactive", "Non-Reactive", "Unknown"].map((status) => {
                              const active = status === "Non-Reactive";
                              return (
                                <span 
                                  key={status} 
                                  className={`rounded-full px-3.5 py-1 text-xs font-bold ${
                                    active 
                                      ? "bg-[var(--hh-green)] text-white border-2 border-[var(--hh-green)]" 
                                      : "bg-white text-slate-400 border border-slate-200"
                                  }`}
                                >
                                  {status}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <button 
                            onClick={() => setIsLocked(true)}
                            className="text-xs font-bold text-slate-500 hover:text-red-500 underline"
                          >
                            Re-lock Records
                          </button>
                        </div>
                      </div>

                      {/* Chronic/Protected disclosures grid */}
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                          ["Tuberculosis (TB)", "No history of exposure or symptoms"],
                          ["Epilepsy", "Family history, patient non-symptomatic"],
                          ["Injuries / Surgeries", "Left wrist fracture reset in 2021"],
                          ["Neurological disease", "Normal, minor tension headaches"],
                          ["Cardiovascular disease", "Stable, no heart murmur history"],
                          ["Gynecological disease", "Irregular cycles, managed natively"]
                        ].map(([title, detail]) => (
                          <div key={title} className="rounded-xl border border-[#ccd9d0] p-3.5 bg-white shadow-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-xs text-[var(--hh-purple-dark)]">{title}</span>
                              <Check className="text-emerald-500" size={16} />
                            </div>
                            <p className="text-[11px] text-[#5c6a61] mt-1 leading-relaxed">{detail}</p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-lg border border-[#ccd9d0] bg-slate-50 p-3 text-[10px] text-[#5c6a61]">
                        <strong>Security Audit Log:</strong> Access unlocked by Dr. A. Maseko on {new Date().toLocaleString()}. IP address logged.
                      </div>
                    </div>
                  )}
                </section>

              </div>
            )}

            {/* Other static tabs */}
            {activeTab !== "Overview" && (
              <div className="rounded-2xl border border-[#b8cabe] bg-white p-6 shadow-sm text-center">
                <ClipboardList size={40} className="text-slate-300 mx-auto mb-3 animate-bounce" />
                <h3 className="font-extrabold text-base text-[var(--hh-purple-dark)]">
                  {activeTab} Tab Interactive Mockup
                </h3>
                <p className="text-xs text-[#5c6a61] mt-2 max-w-sm mx-auto leading-relaxed">
                  This mock page demonstrates the clinical dashboard restructures and vital indicators. Switch back to <strong>Overview</strong> to inspect the premium dashboard widgets.
                </p>
                <button 
                  onClick={() => setActiveTab("Overview")}
                  className="mt-4 rounded-lg bg-[var(--hh-purple)] px-4 py-2 text-xs font-bold text-white hover:bg-[var(--hh-purple-dark)]"
                >
                  Return to Overview
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
