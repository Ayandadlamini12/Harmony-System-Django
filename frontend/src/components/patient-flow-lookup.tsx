"use client";

import Link from "next/link";
import { CalendarDays, CheckCircle2, Clock3, Hash, IdCard, ListChecks, Phone, Search, UserRound } from "lucide-react";
import type React from "react";
import { useState } from "react";

import { LoadingButton } from "@/components/harmony-loading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { showActionError } from "@/lib/action-error";
import type { PatientJourney } from "@/types/clinic";
import { ZulipCoordinationCard } from "@/components/zulip-coordination-card";

type LookupResponse = {
  patient: {
    id: number;
    public_id?: string;
    patient_code: string;
    full_name_display: string;
    primary_phone?: string;
    national_id?: string;
  };
  current_journey: PatientJourney | null;
  recent_journeys: PatientJourney[];
};

const identifierOptions = [
  { value: "cell_number", label: "Cell Number", icon: Phone, placeholder: "Enter cell number" },
  { value: "patient_code", label: "Patient ID", icon: Hash, placeholder: "Enter HHPAT patient ID" },
  { value: "national_passport_id", label: "National / Passport ID", icon: IdCard, placeholder: "Enter National or Passport ID" }
];

const stageOrder = [
  "registered",
  "queued",
  "checked_in",
  "vitals_recorded",
  "waiting_clinician",
  "in_consultation",
  "visit_recorded",
  "completed"
];

const stageLabels: Record<string, string> = {
  registered: "Registered",
  queued: "Queued",
  checked_in: "Checked in",
  vitals_recorded: "Vitals recorded",
  waiting_clinician: "Waiting clinician",
  in_consultation: "In consultation",
  visit_recorded: "Visit recorded",
  completed: "Completed",
  cancelled: "Cancelled"
};

function formatDate(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function PatientFlowLookup({ initialIdentifier = "", userRole }: { initialIdentifier?: string; userRole?: string }) {
  const inferredIdentifierType = initialIdentifier.toUpperCase().startsWith("HHPAT-") ? "patient_code" : identifierOptions[0].value;
  const [identifierType, setIdentifierType] = useState(inferredIdentifierType);
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResponse | null>(null);
  const selected = identifierOptions.find((option) => option.value === identifierType) || identifierOptions[0];

  async function handleLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!identifier.trim()) {
      showActionError({
        title: "Patient lookup missing identifier",
        message: "Enter a patient identifier first."
      });
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/patient-journeys/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, identifier_type: identifierType })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResult(null);
        showActionError({
          title: "Patient flow not found",
          message: data.detail || "No matching patient flow was found."
        });
        return;
      }
      setResult(data as LookupResponse);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader className="px-5 py-4">
          <div className="flex items-center gap-2 font-bold">
            <ListChecks size={18} />
            Find patient process stage
          </div>
          <p className="text-sm text-[#66736d]">Search the patient using the same identifiers used at check-in.</p>
        </CardHeader>
        <CardContent className="grid gap-5 p-5 pt-0">
          <div className="grid gap-3 md:grid-cols-3">
            {identifierOptions.map((option) => {
              const Icon = option.icon;
              const active = option.value === identifierType;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setIdentifierType(option.value)}
                  className={`flex min-h-20 items-center gap-3 rounded-lg border px-4 text-left transition ${
                    active
                      ? "border-[var(--hh-purple)] bg-white text-[var(--hh-purple)] shadow-sm ring-2 ring-[#e8d5f3]"
                      : "border-[var(--hh-border)] bg-[#f7faf8] text-[var(--hh-text)] hover:border-[#d1abe7] hover:bg-white"
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-bold">{option.label}</span>
                </button>
              );
            })}
          </div>

          <form className="grid gap-3 lg:grid-cols-[1fr_auto]" onSubmit={handleLookup}>
            <label className="grid gap-1.5">
              <span className="hh-label">{selected.label}</span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d]" size={18} />
                <Input className="pl-10" value={identifier} onChange={(event) => setIdentifier(event.currentTarget.value)} placeholder={selected.placeholder} />
              </div>
            </label>
            <LoadingButton className="self-end" loading={loading} loadingText="Searching..." type="submit">
              <Search size={17} />
              Track patient
            </LoadingButton>
          </form>
        </CardContent>
      </Card>

      {result && (
        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader className="px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#f7f0fb] text-[var(--hh-purple)]">
                    <UserRound size={26} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--hh-purple-dark)]">{result.patient.full_name_display}</h2>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-[#66736d]">
                      <span className="font-mono">{result.patient.patient_code}</span>
                      {result.patient.primary_phone && <span>{result.patient.primary_phone}</span>}
                      {result.patient.national_id && <span>ID: {result.patient.national_id}</span>}
                    </div>
                  </div>
                </div>
                <Button asChild variant="secondary">
                  <Link href={`/patients/${result.patient.public_id || result.patient.id}`}>Open patient</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              {result.current_journey ? <CurrentJourneyCard journey={result.current_journey} /> : <NoActiveJourney />}
            </CardContent>
          </Card>

          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader className="px-5 py-4">
                <div className="font-bold">Recent process history</div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="grid gap-3">
                  {result.recent_journeys.map((journey) => (
                    <div key={journey.id} className="rounded-lg border border-[var(--hh-border)] bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-bold">{journey.current_stage_label}</div>
                        <Badge variant={journey.is_active ? "success" : "default"}>{journey.is_active ? "Active" : "Closed"}</Badge>
                      </div>
                      <div className="mt-2 grid gap-1 text-sm text-[#66736d]">
                        <span>{formatDate(journey.service_date)}</span>
                        <span>{journey.flow_type_label}</span>
                        {journey.queue_number && <span>Queue #{journey.queue_number}</span>}
                      </div>
                    </div>
                  ))}
                  {result.recent_journeys.length === 0 && <p className="text-sm text-[#66736d]">No process history has been recorded for this patient.</p>}
                </div>
              </CardContent>
            </Card>

            <ZulipCoordinationCard
              channel="front-desk"
              topic={`PATIENT FLOW | ${result.patient.patient_code} | ${result.current_journey?.service_date || new Date().toISOString().split('T')[0]}`}
              linkedEntityType="patient"
              linkedEntityId={result.patient.patient_code}
              linkedEntityName={result.patient.full_name_display}
              patientCode={result.patient.patient_code}
              userRole={userRole as any}
              forceTemplateOnly={userRole === "receptionist"}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CurrentJourneyCard({ journey }: { journey: PatientJourney }) {
  const currentIndex = stageOrder.indexOf(journey.current_stage);
  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatusTile icon={<CheckCircle2 size={18} />} label="Current stage" value={journey.current_stage_label} />
        <StatusTile icon={<CalendarDays size={18} />} label="Service date" value={formatDate(journey.service_date)} />
        <StatusTile icon={<Hash size={18} />} label="Queue number" value={journey.queue_number ? `#${journey.queue_number}` : "Appointment"} />
      </div>

      <div className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="font-bold">Today&apos;s flow</div>
          <Badge variant={journey.appointment_matched ? "harmony" : "warning"}>{journey.flow_type_label}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {stageOrder.map((stage, index) => {
            const reached = currentIndex >= index || journey.current_stage === "completed";
            const active = journey.current_stage === stage;
            return (
              <div
                key={stage}
                className={`rounded-lg border px-3 py-3 text-sm font-bold ${
                  active
                    ? "border-[var(--hh-purple)] bg-white text-[var(--hh-purple)] ring-2 ring-[#e8d5f3]"
                    : reached
                      ? "border-[var(--hh-green)] bg-[var(--hh-green-light)] text-[var(--hh-green-dark)]"
                      : "border-[var(--hh-border)] bg-white text-[#66736d]"
                }`}
              >
                {stageLabels[stage]}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-[var(--hh-border)] bg-white">
        <div className="border-b border-[var(--hh-border)] px-4 py-3 font-bold">Stage events</div>
        <div className="divide-y divide-[var(--hh-border)]">
          {journey.events.map((event) => (
            <div key={event.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[170px_1fr]">
              <div className="flex items-center gap-2 text-sm text-[#66736d]">
                <Clock3 size={15} />
                {formatDateTime(event.created_at)}
              </div>
              <div>
                <div className="font-bold">{event.stage_label}</div>
                {event.note && <p className="mt-1 text-sm text-[#66736d]">{event.note}</p>}
              </div>
            </div>
          ))}
          {journey.events.length === 0 && <div className="px-4 py-6 text-sm text-[#66736d]">No events recorded yet.</div>}
        </div>
      </div>
    </div>
  );
}

function StatusTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[var(--hh-border)] bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-[#66736d]">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-lg font-bold">{value}</div>
    </div>
  );
}

function NoActiveJourney() {
  return (
    <div className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-5 text-sm leading-6 text-[#66736d]">
      This patient does not have an active process for today. Check them in first from the reception desk or tablet check-in screen.
    </div>
  );
}
