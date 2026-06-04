"use client";

import { useState } from "react";
import { 
  Info, Mail, MapPin, Phone, Stethoscope, User, UserRound, Users, 
  Heart, ShieldAlert, Activity, FileText, CheckCircle, AlertTriangle, 
  Cigarette, GlassWater, Landmark, Shield, X, HelpCircle, Calendar,
  Briefcase, HeartHandshake, Baby
} from "lucide-react";
import type { Patient } from "@/types/clinic";
import { relationshipLabel } from "@/lib/relationships";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

function value(text?: string | null) {
  return text || "--";
}

function formatDate(text?: string | null) {
  if (!text) return "--";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(text));
}

function ageFromDate(date?: string | null) {
  if (!date) return "--";
  const dob = new Date(date);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) age -= 1;
  return `${age} years`;
}

interface InfoItemProps {
  label: string;
  val: string;
  icon?: any;
  theme?: "purple" | "blue" | "emerald" | "rose" | "amber";
  highlight?: boolean;
}

function InfoItem({ label, val, icon: Icon, theme = "purple", highlight = false }: InfoItemProps) {
  const itemThemes = {
    purple: {
      bg: "hover:bg-[#FAF5FF]/50 hover:border-[#F3E8FF]/80",
      iconBg: "bg-[#FAF5FF] text-[var(--hh-purple)] border-[#F3E8FF]/60 group-hover:bg-white group-hover:text-[var(--hh-purple)] group-hover:shadow-xs group-hover:scale-110",
      valText: "text-slate-800"
    },
    blue: {
      bg: "hover:bg-[#EFF6FF]/50 hover:border-[#DBEAFE]/80",
      iconBg: "bg-[#EFF6FF] text-blue-600 border-[#DBEAFE]/60 group-hover:bg-white group-hover:text-blue-700 group-hover:shadow-xs group-hover:scale-110",
      valText: "text-slate-800"
    },
    emerald: {
      bg: "hover:bg-[#ECFDF5]/50 hover:border-[#D1FAE5]/80",
      iconBg: "bg-[#ECFDF5] text-emerald-600 border-[#D1FAE5]/60 group-hover:bg-white group-hover:text-emerald-700 group-hover:shadow-xs group-hover:scale-110",
      valText: "text-slate-800"
    },
    rose: {
      bg: "hover:bg-[#FFF1F2]/50 hover:border-[#FFE4E6]/80",
      iconBg: "bg-[#FFF1F2] text-rose-600 border-[#FFE4E6]/60 group-hover:bg-white group-hover:text-rose-700 group-hover:shadow-xs group-hover:scale-110",
      valText: "text-slate-800"
    },
    amber: {
      bg: "bg-[#FFFBEB]/50 hover:bg-[#FFFBEB]/75 border-[#FEF3C7] shadow-2xs hover:shadow-xs",
      iconBg: "bg-[#FFFBEB] text-amber-700 border-[#FEF3C7] group-hover:bg-white group-hover:text-amber-800 group-hover:shadow-xs group-hover:scale-110",
      valText: "text-amber-900"
    }
  };

  const selected = highlight ? itemThemes.amber : itemThemes[theme];

  return (
    <div className={`group flex items-start gap-3 p-2.5 transition-all duration-300 rounded-xl border border-transparent ${selected.bg}`}>
      {Icon && (
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border shadow-2xs transition-all duration-300 ${selected.iconBg}`}>
          <Icon size={13} className={highlight ? "animate-pulse" : ""} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-slate-500 transition-colors">
          {label}
        </div>
        <div className={`mt-0.5 text-xs font-semibold leading-snug break-words ${selected.valText}`}>
          {val}
        </div>
      </div>
    </div>
  );
}

interface DetailSectionProps {
  title: string;
  icon: any;
  children: React.ReactNode;
  className?: string;
  badge?: string;
  theme?: "purple" | "blue" | "emerald" | "rose" | "amber";
}

function DetailSection({ 
  title, 
  icon: Icon, 
  children, 
  className = "", 
  badge,
  theme = "purple" 
}: DetailSectionProps) {
  
  const cardThemes = {
    purple: "bg-gradient-to-br from-[#FAF5FF]/20 to-white hover:from-[#FAF5FF]/40 border-[#F3E8FF] shadow-[0_4px_20px_-2px_rgba(112,48,160,0.02)] focus-within:border-[var(--hh-purple)]",
    blue: "bg-gradient-to-br from-[#EFF6FF]/20 to-white hover:from-[#EFF6FF]/40 border-[#DBEAFE] shadow-[0_4px_20px_-2px_rgba(59,130,246,0.02)] focus-within:border-blue-400",
    emerald: "bg-gradient-to-br from-[#ECFDF5]/20 to-white hover:from-[#ECFDF5]/40 border-[#D1FAE5] shadow-[0_4px_20px_-2px_rgba(16,185,129,0.02)] focus-within:border-emerald-400",
    rose: "bg-gradient-to-br from-[#FFF1F2]/20 to-white hover:from-[#FFF1F2]/40 border-[#FFE4E6] shadow-[0_4px_20px_-2px_rgba(244,63,94,0.02)] focus-within:border-rose-400",
    amber: "bg-gradient-to-br from-[#FFFBEB]/30 to-white hover:from-[#FFFBEB]/50 border-[#FEF3C7] shadow-[0_4px_20px_-2px_rgba(245,158,11,0.03)] focus-within:border-amber-400"
  };

  const badgeThemes = {
    purple: "bg-[#F3E8FF] text-[var(--hh-purple)]",
    blue: "bg-[#DBEAFE] text-blue-700",
    emerald: "bg-[#D1FAE5] text-emerald-700",
    rose: "bg-[#FFE4E6] text-rose-700",
    amber: "bg-[#FEF3C7] text-amber-700"
  };

  const iconBgThemes = {
    purple: "bg-[#FAF5FF] text-[var(--hh-purple)] border-[#F3E8FF]",
    blue: "bg-[#EFF6FF] text-blue-600 border-[#DBEAFE]",
    emerald: "bg-[#ECFDF5] text-emerald-600 border-[#D1FAE5]",
    rose: "bg-[#FFF1F2] text-rose-600 border-[#FFE4E6]",
    amber: "bg-[#FFFBEB] text-amber-600 border-[#FEF3C7]"
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01] ${cardThemes[theme]} ${className}`}>
      <div className="mb-3.5 flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex h-8 w-8 items-center justify-center rounded-xl border shadow-2xs ${iconBgThemes[theme]}`}>
            <Icon size={14} />
          </div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">{title}</h3>
        </div>
        {badge && (
          <Badge className={`border-none font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full ${badgeThemes[theme]}`}>
            {badge}
          </Badge>
        )}
      </div>
      <div className="grid gap-1">
        {children}
      </div>
    </div>
  );
}

export function PatientInfoDialog({ patient }: { patient: Patient }) {
  const [open, setOpen] = useState(false);
  const profile = patient.profile;
  const hasAllergies = !!(patient.allergies && patient.allergies.trim().toLowerCase() !== "none" && patient.allergies.trim() !== "");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label="View Patient Profile Info"
          className="group relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--hh-purple-light,#e8d5f3)] bg-[#fcf9fe] text-[var(--hh-purple)] transition-all duration-300 hover:bg-[var(--hh-purple)] hover:text-white hover:border-[var(--hh-purple)] hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--hh-purple)] focus-visible:outline-offset-2 active:scale-90 shadow-[0_2px_8px_-1px_rgba(112,48,160,0.12)] cursor-pointer"
        >
          <Info size={14} className="transition-transform duration-300 group-hover:rotate-6" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 scale-0 rounded bg-slate-800 px-2 py-1 text-[10px] font-bold text-white transition-all group-hover:scale-100 whitespace-nowrap shadow-md z-50">
            View Patient Info
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl rounded-2xl bg-[#fafbfe]">
        
        {/* Dynamic Premium Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#2e104e] via-[#481d64] to-[#7030a0] px-6 py-7 text-white">
          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl">
                <User size={26} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <DialogTitle className="text-xl font-extrabold tracking-tight text-white leading-tight">
                    {patient.full_name_display}
                  </DialogTitle>
                </div>
                
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  <Badge className="bg-white/15 hover:bg-white/25 text-white border-none font-mono text-[10px] font-bold tracking-wider px-2 py-0.5">
                    {patient.patient_code}
                  </Badge>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80">
                    <span className={`h-1.5 w-1.5 rounded-full ${patient.status === "active" ? "bg-[var(--hh-green)] animate-pulse" : "bg-slate-400"}`} />
                    <span className="capitalize">{patient.status} Profile</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats Header Pills */}
            <div className="flex flex-wrap gap-2 sm:self-center">
              <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-3.5 py-1 text-center">
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/50">Age</div>
                <div className="text-xs font-extrabold">{ageFromDate(patient.date_of_birth)}</div>
              </div>
              <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 px-3.5 py-1 text-center">
                <div className="text-[9px] font-extrabold uppercase tracking-widest text-white/50">Gender</div>
                <div className="text-xs font-extrabold capitalize">{patient.gender.replaceAll("_", " ")}</div>
              </div>
            </div>
          </div>

          {/* Luxury background decorations */}
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/5 blur-2xl" />
          <div className="absolute -left-12 -bottom-12 h-36 w-32 rounded-full bg-purple-500/10 blur-2xl" />
          
          <button 
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          <DialogDescription className="sr-only">
            Comprehensive details of patient demographics, contacts, medical history, and clinical profiles.
          </DialogDescription>

          {/* High Priority Alerts / Allergies Section */}
          {hasAllergies ? (
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FFF5F5] border border-[#FEB2B2]/60 shadow-[0_2px_12px_rgba(229,62,62,0.04)] animate-pulse-subtle">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E53E3E] text-white shadow-md shadow-red-100">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-black text-[#C53030] uppercase tracking-wider">Clinical Allergy Alert</h4>
                <p className="mt-1 text-sm font-bold text-[#9B2C2C] leading-relaxed">
                  {patient.allergies}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0]/60 shadow-[0_2px_10px_rgba(22,163,74,0.02)]">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--hh-green)] text-white shadow-sm shadow-green-100">
                <CheckCircle size={14} />
              </div>
              <div className="text-xs font-bold text-[var(--hh-green-dark)]">
                No active drug, food, or contact allergies recorded for this patient.
              </div>
            </div>
          )}

          {/* 4-Card Bento Grid */}
          <div className="grid gap-5 md:grid-cols-2">
            
            {/* 1. Personal & Demographics */}
            <DetailSection title="Demographics" icon={UserRound} badge="Identification" theme="purple">
              <div className="grid grid-cols-2 gap-1.5">
                <InfoItem label="First Name" val={patient.first_name} icon={User} theme="purple" />
                <InfoItem label="Last Name" val={patient.last_name} icon={User} theme="purple" />
                <InfoItem label="Date of Birth" val={formatDate(patient.date_of_birth)} icon={Calendar} theme="purple" />
                <InfoItem label="Gender" val={patient.gender.replaceAll("_", " ")} icon={Activity} theme="purple" />
                <InfoItem label="Marital Status" val={value(patient.marital_status)} icon={HeartHandshake} theme="purple" />
                <InfoItem label="Occupation" val={value(patient.occupation)} icon={Briefcase} theme="purple" />
              </div>
              <div className="mt-2 pt-2 border-t border-[#F3E8FF]/60">
                <InfoItem label="National ID / Passport" val={value(patient.national_id)} icon={Landmark} theme="purple" />
              </div>
            </DetailSection>

            {/* 2. Contact & Location Info */}
            <DetailSection title="Contact & Location" icon={MapPin} badge="Communication" theme="blue">
              <div className="grid grid-cols-1 gap-1">
                <InfoItem label="Primary Phone" val={value(patient.primary_phone)} icon={Phone} theme="blue" />
                <InfoItem label="Secondary Phone" val={value(patient.secondary_phone)} icon={Phone} theme="blue" />
                <InfoItem label="Email Address" val={value(patient.email)} icon={Mail} theme="blue" />
                <InfoItem label="Residential Address" val={
                  [patient.village, patient.town_or_locality, patient.region]
                    .filter(Boolean)
                    .join(", ") || "--"
                } icon={MapPin} theme="blue" />
              </div>
            </DetailSection>

            {/* 3. Clinical Profile & Lifestyle */}
            <DetailSection title="Clinical & Lifestyle" icon={Activity} badge="Clinical Vitals" theme="emerald">
              <div className="grid grid-cols-1 gap-1">
                <InfoItem 
                  label="Smoking Habits" 
                  val={patient.smoking_status 
                    ? `${patient.smoking_status.replaceAll("_", " ")}${patient.smoking_details ? ` (${patient.smoking_details})` : ""}${patient.smoking_years ? ` - ${patient.smoking_years} years` : ""}`
                    : "--"
                  } 
                  icon={Cigarette} 
                  theme="emerald"
                />
                <InfoItem 
                  label="Alcohol Habits" 
                  val={patient.alcohol_status
                    ? `${patient.alcohol_status.replaceAll("_", " ")}${patient.alcohol_details ? ` (${patient.alcohol_details})` : ""}`
                    : "--"
                  } 
                  icon={GlassWater} 
                  theme="emerald"
                />
                <InfoItem 
                  label="Allergies Summary" 
                  val={value(patient.allergies)} 
                  icon={AlertTriangle} 
                  theme="emerald"
                  highlight={hasAllergies}
                />
              </div>
            </DetailSection>

            {/* 4. Homeopathy History & Profile */}
            <DetailSection title="Homeopathy Profile" icon={Stethoscope} badge="Medical history" theme="purple">
              {profile ? (
                <div className="grid grid-cols-1 gap-1">
                  <InfoItem label="Past Medical History" val={value(profile.past_medical_history)} icon={FileText} theme="purple" />
                  <InfoItem label="Family Medical History" val={value(profile.family_medical_history)} icon={Users} theme="purple" />
                  <InfoItem label="Allopathic Medications" val={value(profile.allopathic_medication)} icon={Stethoscope} theme="purple" />
                  <div className="mt-2.5 flex items-center justify-between bg-purple-50/30 p-2.5 rounded-xl border border-purple-100/40">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <Baby size={14} className="text-[var(--hh-purple)]" />
                      Number of Children:
                    </span>
                    <Badge className="bg-purple-100 text-[var(--hh-purple)] hover:bg-purple-200 border-none font-extrabold px-2.5">
                      {profile.children_count?.toString() || "0"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-purple-200/40 p-6 text-center bg-purple-50/10">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-[var(--hh-purple)] border border-purple-100/40">
                    <Stethoscope size={18} />
                  </div>
                  <p className="text-xs font-extrabold text-slate-600">No homeopathy profile data recorded</p>
                  <p className="mt-0.5 text-[10px] text-slate-400 font-medium">Please edit patient profile to fill this section.</p>
                </div>
              )}
            </DetailSection>

            {/* 5. Emergency Contact / Next of Kin */}
            <DetailSection title="Next of Kin / Contact" icon={Heart} badge="Emergency" theme="rose" className="md:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <InfoItem label="Full Name" val={value(patient.next_of_kin_full_name)} icon={User} theme="rose" />
                <InfoItem label="Relationship" val={value(relationshipLabel(patient.next_of_kin_relationship, patient.next_of_kin_relationship_other))} icon={HeartHandshake} theme="rose" />
                <InfoItem label="Primary Contact Phone" val={value(patient.next_of_kin_phone)} icon={Phone} theme="rose" />
              </div>
            </DetailSection>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-6 py-4.5 rounded-b-2xl">
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-2xs transition-all hover:bg-slate-50 hover:text-slate-800 cursor-pointer active:scale-95"
          >
            Close Profile
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
