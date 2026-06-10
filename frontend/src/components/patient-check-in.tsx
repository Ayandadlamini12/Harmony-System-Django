"use client";

import Link from "next/link";
import { CheckCircle2, ClipboardPlus, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/harmony-loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Patient } from "@/types/clinic";

function normalizeDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}

function matchesPatient(patient: Patient, query: string) {
  const text = query.trim().toLowerCase();
  const digits = normalizeDigits(query);
  if (!text) return true;

  const searchableText = [
    patient.full_name_display,
    patient.patient_code,
    patient.national_id,
    patient.primary_phone,
    patient.secondary_phone
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const searchableDigits = [patient.primary_phone, patient.secondary_phone, patient.national_id, patient.patient_code]
    .map(normalizeDigits)
    .join(" ");

  return searchableText.includes(text) || (digits.length >= 4 && searchableDigits.includes(digits));
}

function todayKey() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function hasTodayActivation(patient: Patient, activatedPatientIds: Set<number>) {
  return activatedPatientIds.has(patient.id) || patient.current_journey?.service_date === todayKey();
}

type LookupResult = {
  patient: number;
  patient_name: string;
  patient_code: string;
  primary_phone?: string;
  current_journey?: Patient["current_journey"];
};

type CheckInConfirmation = {
  patientName: string;
  patientCode?: string;
  statusLabel?: string;
  queueNumber?: number | null;
  appointmentMatched?: boolean;
  visitType: "new_consultation" | "follow_up";
  nextAction?: string;
};

type CheckInError = {
  title: string;
  message: string;
  statusLabel?: string;
  queueNumber?: number | null;
};

const identifierOptions = [
  {
    value: "cell_number",
    label: "Cell Number",
    description: "Use your phone number",
    placeholder: "Enter cell number",
    inputMode: "tel" as const
  },
  {
    value: "patient_code",
    label: "Patient ID",
    description: "Use your HHPAT number",
    placeholder: "Enter HHPAT patient ID",
    inputMode: "text" as const
  },
  {
    value: "national_passport_id",
    label: "National / Passport ID",
    description: "Letters and numbers accepted",
    placeholder: "Enter National or Passport ID",
    inputMode: "text" as const
  }
];

export function PatientCheckIn({
  patients,
  mode = "staff"
}: {
  patients: Patient[];
  mode?: "staff" | "tablet";
}) {
  const [query, setQuery] = useState("");
  const [identifierType, setIdentifierType] = useState(identifierOptions[0].value);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [remotePatients, setRemotePatients] = useState(patients);
  const [searching, setSearching] = useState(false);
  const [submittingType, setSubmittingType] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<CheckInConfirmation | null>(null);
  const [activatedPatientIds, setActivatedPatientIds] = useState<Set<number>>(new Set());
  const [checkInError, setCheckInError] = useState<CheckInError | null>(null);
  const matches = useMemo(() => remotePatients.filter((patient) => matchesPatient(patient, query)).slice(0, 8), [remotePatients, query]);
  const hasQuery = query.trim().length > 0;
  const isTablet = mode === "tablet";
  const selectedIdentifier = identifierOptions.find((option) => option.value === identifierType) || identifierOptions[0];

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setRemotePatients(patients);
      setLookup(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        if (isTablet) {
          const response = await fetch("/api/check-ins/lookup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: text, identifier_type: identifierType }),
            signal: controller.signal
          });
          setLookup(response.ok ? ((await response.json()) as LookupResult) : null);
        } else {
          const response = await fetch(`/api/patients/search?query=${encodeURIComponent(text)}`, {
            signal: controller.signal
          });
          if (response.ok) {
            const data = (await response.json()) as { results?: Patient[] };
            setRemotePatients(data.results || []);
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setRemotePatients([]);
          setLookup(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [identifierType, isTablet, patients, query]);

  async function checkIn({
    patient,
    visitType,
    identifier = query,
    method = isTablet ? "tablet" : "reception"
  }: {
    patient?: number;
    visitType: "new_consultation" | "follow_up";
    identifier?: string;
    method?: "reception" | "tablet";
  }) {
    setSubmittingType(`${patient || "lookup"}-${visitType}`);
    try {
      const response = await fetch("/api/check-ins/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient,
          identifier,
          visit_type: visitType,
          method,
          identifier_type: patient && !isTablet ? "reception_selected_patient" : identifierType,
          source_label: isTablet ? "Front desk tablet" : "Reception dashboard"
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setCheckInError({
          title: response.status === 409 ? "Visit already activated" : "Check-in could not be completed",
          message: data.detail || "The patient could not be checked in. Please review the details and try again.",
          statusLabel: data.flow_status_label,
          queueNumber: data.queue_number
        });
        return;
      }
      if (patient || lookup?.patient) {
        setActivatedPatientIds((current) => new Set(current).add(patient || lookup!.patient));
      }
      setConfirmation({
        patientName: data.patient_name || lookup?.patient_name || "Patient",
        patientCode: data.patient_code || lookup?.patient_code,
        statusLabel: data.flow_status_label,
        queueNumber: data.queue_number,
        appointmentMatched: data.appointment_matched,
        visitType,
        nextAction: data.next_action
      });
      setQuery("");
      setLookup(null);
      toast.success(data.appointment_matched ? "Appointment checked in" : "Patient added to waiting list");
    } finally {
      setSubmittingType(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="space-y-5">
        <Dialog open={Boolean(checkInError)} onOpenChange={(open) => !open && setCheckInError(null)}>
        <DialogContent className="w-[min(92vw,520px)] overflow-hidden">
          <div className="border-b border-[var(--hh-border-strong)] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#f6d58b] bg-[#fff8e6] text-[#875400]">
                <ShieldCheck size={22} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#3f1d58]">{checkInError?.title}</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-[#66736d]">Patient flow activation was not completed.</DialogDescription>
              </div>
            </div>
          </div>
          <div className="grid gap-4 p-5">
            <div className="rounded-lg border border-[#f6d58b] bg-[#fff8e6] p-4 text-sm font-semibold leading-6 text-[#875400]">
              {checkInError?.message}
            </div>
            {(checkInError?.statusLabel || checkInError?.queueNumber) && (
              <div className="flex flex-wrap gap-2 text-sm">
                {checkInError.statusLabel && <span className="rounded-full border border-[var(--hh-border)] bg-white px-3 py-1 font-bold">{checkInError.statusLabel}</span>}
                {checkInError.queueNumber ? <span className="rounded-full border border-[var(--hh-border)] bg-white px-3 py-1 font-bold">Queue #{checkInError.queueNumber}</span> : null}
              </div>
            )}
            <div className="flex justify-end">
              <DialogClose asChild>
                <Button type="button">OK</Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {confirmation && (
        <div className="rounded-lg border border-[var(--hh-green)] bg-[var(--hh-green-light)] p-4 text-[var(--hh-green-dark)]">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} />
            <div className="grid gap-2">
              <div className="font-bold">{confirmation.patientName} has been checked in.</div>
              <div className="flex flex-wrap gap-2 text-sm">
                {confirmation.patientCode && <span className="rounded-full bg-white px-2.5 py-1 font-mono text-[var(--hh-purple)]">{confirmation.patientCode}</span>}
                <span className="rounded-full bg-white px-2.5 py-1 font-bold">
                  Visit activated
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 font-bold">
                  {confirmation.appointmentMatched ? "Appointment check-in" : "Waiting list"}
                </span>
                {confirmation.queueNumber ? <span className="rounded-full bg-white px-2.5 py-1 font-bold">Queue #{confirmation.queueNumber}</span> : null}
              </div>
              <div className="text-sm">{confirmation.nextAction || "Record vitals, then wait for the clinician."}</div>
            </div>
          </div>
        </div>
      )}

      <section className={isTablet ? "rounded-xl border border-[var(--hh-border)] bg-white p-6 shadow-sm sm:p-8" : "hh-panel p-5"}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className={isTablet ? "text-3xl font-bold text-[var(--hh-purple-dark)]" : "text-lg font-bold"}>
              {isTablet ? "Patient self check-in" : "Existing patient check-in"}
            </h2>
            <p className={isTablet ? "mt-2 max-w-3xl text-base leading-7 text-[#66736d]" : "mt-1 max-w-2xl text-sm leading-6 text-[#66736d]"}>
              {isTablet
                ? "Choose what you want to use, enter the details, then select whether this is a new visit or follow-up."
                : "Search for the patient, choose New visit or Follow up, and the system will activate today's visit flow. If there is no appointment, the patient is added to the waiting list with a queue number."}
            </p>
          </div>
          {!isTablet && (
            <Button asChild variant="secondary">
              <Link href="/patients/new">Register new patient</Link>
            </Button>
          )}
        </div>
        {isTablet && (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {identifierOptions.map((option) => {
              const active = option.value === identifierType;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setIdentifierType(option.value);
                    setQuery("");
                    setLookup(null);
                  }}
                  className={`min-h-24 rounded-lg border px-4 py-3 text-left transition ${
                    active
                      ? "border-[var(--hh-purple)] bg-white text-[var(--hh-purple)] shadow-sm ring-2 ring-[#e8d5f3]"
                      : "border-[var(--hh-border)] bg-[#f7faf8] text-[var(--hh-text)] hover:border-[#d1abe7] hover:bg-white"
                  }`}
                  aria-pressed={active}
                >
                  <span className="block text-base font-bold">{option.label}</span>
                  <span className="mt-1 block text-sm text-[#66736d]">{option.description}</span>
                </button>
              );
            })}
          </div>
        )}

        <label className="mt-5 grid gap-1.5">
          <span className="hh-label">{isTablet ? selectedIdentifier.label : "Search patient"}</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d]" size={18} />
            <Input
              className="pl-10"
              inputMode={isTablet ? selectedIdentifier.inputMode : "search"}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={isTablet ? selectedIdentifier.placeholder : "Cell number, HHPAT number, or National / Passport ID"}
            />
          </div>
        </label>
      </section>

      {isTablet && (
        <section className="rounded-xl border border-[var(--hh-border)] bg-white p-6 shadow-sm">
          {lookup ? (
            <div className="grid gap-5">
              <div className="rounded-lg border border-[#e7d7ef] bg-[#f7f0fb] p-4">
                <div className="text-sm font-bold uppercase text-[var(--hh-purple)]">Confirm patient</div>
                <div className="mt-2 text-2xl font-bold">{lookup.patient_name}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-sm text-[#66736d]">
                  <span className="font-mono">{lookup.patient_code}</span>
                  {lookup.primary_phone && <span>{lookup.primary_phone}</span>}
                </div>
              </div>
              <div className="grid gap-3">
                <LoadingButton
                  disabled={lookup.current_journey?.service_date === todayKey() || activatedPatientIds.has(lookup.patient)}
                  loading={submittingType === `${lookup.patient}-new_consultation`}
                  loadingText="Checking in..."
                  onClick={() => checkIn({ patient: lookup.patient, visitType: "new_consultation" })}
                  type="button"
                  className="w-full bg-[var(--hh-purple)] hover:bg-[var(--hh-purple-dark)] text-white text-lg py-6 font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <ClipboardPlus size={20} />
                  Check In
                </LoadingButton>
              </div>
              {(lookup.current_journey?.service_date === todayKey() || activatedPatientIds.has(lookup.patient)) && (
                <div className="rounded-lg border border-[#f6d58b] bg-[#fff8e6] p-3 text-sm font-semibold text-[#875400]">
                  This patient already has an active visit flow today. Activations reset at 00:00.
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4 text-[#66736d]">
              <ShieldCheck className="mt-0.5 text-[var(--hh-purple)]" size={22} />
              <p className="text-sm leading-6">
                Your details are used only to find your existing record. If your record is not found, please ask reception for help.
              </p>
            </div>
          )}
        </section>
      )}

      {!isTablet && (
        <section className="hh-panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--hh-border)] bg-[var(--hh-section)] px-4 py-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-[#53605a]">{searching ? "Searching patients..." : "Matched patients"}</h2>
            <span className="rounded-full border border-[var(--hh-border)] bg-white px-2.5 py-1 text-xs font-bold text-[#66736d]">
              {matches.length} shown
            </span>
          </div>
          {matches.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="hh-compact-table min-w-[820px] text-left">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Phone</th>
                    <th>National / Passport ID</th>
                    <th>Locality</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((patient) => {
                    const alreadyActivated = hasTodayActivation(patient, activatedPatientIds);
                    return (
                      <tr key={patient.id}>
                        <td>
                          <div className="font-bold text-[var(--hh-text)]">{patient.full_name_display}</div>
                          <div className="mt-0.5 font-mono text-xs text-[var(--hh-purple)]">{patient.patient_code}</div>
                        </td>
                        <td>{patient.primary_phone || "-"}</td>
                        <td>{patient.national_id || "-"}</td>
                        <td>{patient.town_or_locality || "-"}</td>
                        <td>
                          {alreadyActivated ? (
                            <span className="rounded-full border border-[#f6d58b] bg-[#fff8e6] px-2.5 py-1 text-xs font-bold text-[#875400]">
                              Activated today
                            </span>
                          ) : (
                            <span className="rounded-full border border-[#cce4d1] bg-[#f2fbf4] px-2.5 py-1 text-xs font-bold text-[#225c2c]">
                              Ready
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <LoadingButton
                            disabled={alreadyActivated}
                            loading={submittingType === `${patient.id}-new_consultation`}
                            loadingText="Checking in..."
                            onClick={() => checkIn({ patient: patient.id, visitType: "new_consultation" })}
                            type="button"
                            variant="secondary"
                            className="min-h-8 rounded-md bg-white px-3 py-1.5 text-xs font-bold text-[var(--hh-purple)] shadow-none ring-1 ring-[var(--hh-purple)] hover:bg-[#f7f0fb] hover:text-[var(--hh-purple-dark)] disabled:text-[#66736d] disabled:ring-[var(--hh-border)]"
                          >
                            <ClipboardPlus size={15} />
                            Check In
                          </LoadingButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10 text-sm text-[#66736d]">
              {hasQuery ? "No matching patient was found. Confirm the number or ID, or register the patient first." : "Search to check in an existing patient."}
            </div>
          )}
        </section>
      )}
      </div>
    </div>
  );
}
