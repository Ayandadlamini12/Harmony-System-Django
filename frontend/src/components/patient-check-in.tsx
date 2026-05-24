"use client";

import Link from "next/link";
import { CheckCircle2, ClipboardPlus, RotateCcw, Search, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/harmony-loading";
import { Button } from "@/components/ui/button";
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

type LookupResult = {
  patient: number;
  patient_name: string;
  patient_code: string;
  primary_phone?: string;
};

export function PatientCheckIn({
  patients,
  mode = "staff"
}: {
  patients: Patient[];
  mode?: "staff" | "tablet";
}) {
  const [query, setQuery] = useState("");
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [remotePatients, setRemotePatients] = useState(patients);
  const [searching, setSearching] = useState(false);
  const [submittingType, setSubmittingType] = useState<string | null>(null);
  const [checkedInName, setCheckedInName] = useState("");
  const matches = useMemo(() => remotePatients.filter((patient) => matchesPatient(patient, query)).slice(0, 8), [remotePatients, query]);
  const hasQuery = query.trim().length > 0;
  const isTablet = mode === "tablet";

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
            body: JSON.stringify({ identifier: text }),
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
  }, [isTablet, patients, query]);

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
          identifier_type: "self_service_identifier",
          source_label: isTablet ? "Front desk tablet" : "Reception dashboard"
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(data.detail || "Check-in could not be completed");
        return;
      }
      setCheckedInName(data.patient_name || lookup?.patient_name || "Patient");
      setQuery("");
      setLookup(null);
      toast.success("Patient checked in");
    } finally {
      setSubmittingType(null);
    }
  }

  return (
    <div className={isTablet ? "mx-auto grid w-full max-w-5xl gap-6" : "grid gap-5"}>
      {checkedInName && (
        <div className="rounded-lg border border-[var(--hh-green)] bg-[var(--hh-green-light)] p-4 text-[var(--hh-green-dark)]">
          <div className="flex items-center gap-3">
            <CheckCircle2 size={22} />
            <div>
              <div className="font-bold">{checkedInName} is checked in.</div>
              <div className="text-sm">Please wait for the clinician or receptionist to call the patient.</div>
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
              Enter a cell number, Harmony patient ID, or National / Passport ID, then choose whether this is a new visit or follow-up.
            </p>
          </div>
          {!isTablet && (
            <Button asChild variant="secondary">
              <Link href="/patients/new">Register new patient</Link>
            </Button>
          )}
        </div>
        <label className="mt-5 grid gap-1.5">
          <span className="hh-label">Search patient</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#66736d]" size={18} />
            <Input
              className="pl-10"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Cell number, HHPAT number, or National / Passport ID"
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
              <div className="grid gap-3 sm:grid-cols-2">
                <LoadingButton
                  loading={submittingType === `${lookup.patient}-new_consultation`}
                  loadingText="Checking in..."
                  onClick={() => checkIn({ patient: lookup.patient, visitType: "new_consultation" })}
                  type="button"
                >
                  <ClipboardPlus size={18} />
                  New visit
                </LoadingButton>
                <LoadingButton
                  loading={submittingType === `${lookup.patient}-follow_up`}
                  loadingText="Checking in..."
                  onClick={() => checkIn({ patient: lookup.patient, visitType: "follow_up" })}
                  type="button"
                  variant="secondary"
                >
                  <RotateCcw size={18} />
                  Follow up
                </LoadingButton>
              </div>
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
        <div className="border-b border-[var(--hh-border)] px-5 py-4">
          <h2 className="text-sm font-bold uppercase text-[#66736d]">{searching ? "Searching patients..." : "Matched patients"}</h2>
        </div>
        <div className="divide-y divide-[var(--hh-border)]">
          {matches.map((patient) => (
            <div key={patient.id} className="grid gap-4 px-5 py-4 xl:grid-cols-[1fr_auto] xl:items-center">
              <div className="grid gap-1">
                <div className="font-bold">{patient.full_name_display}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#66736d]">
                  <span className="font-mono text-[var(--hh-purple)]">{patient.patient_code}</span>
                  {patient.primary_phone && <span>{patient.primary_phone}</span>}
                  {patient.national_id && <span>ID: {patient.national_id}</span>}
                  {patient.town_or_locality && <span>{patient.town_or_locality}</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <LoadingButton
                  loading={submittingType === `${patient.id}-new_consultation`}
                  loadingText="Checking in..."
                  onClick={() => checkIn({ patient: patient.id, visitType: "new_consultation" })}
                  type="button"
                >
                  <ClipboardPlus size={17} />
                  New visit
                </LoadingButton>
                <LoadingButton
                  loading={submittingType === `${patient.id}-follow_up`}
                  loadingText="Checking in..."
                  onClick={() => checkIn({ patient: patient.id, visitType: "follow_up" })}
                  type="button"
                  variant="secondary"
                >
                  <RotateCcw size={17} />
                  Follow up
                </LoadingButton>
              </div>
            </div>
          ))}
          {matches.length === 0 && (
            <div className="px-5 py-10 text-sm text-[#66736d]">
              {hasQuery ? "No matching patient was found. Confirm the number or ID, or register the patient first." : "Search to check in an existing patient."}
            </div>
          )}
        </div>
      </section>
      )}
    </div>
  );
}
