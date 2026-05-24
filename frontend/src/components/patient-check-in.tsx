"use client";

import Link from "next/link";
import { ClipboardPlus, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

export function PatientCheckIn({ patients }: { patients: Patient[] }) {
  const [query, setQuery] = useState("");
  const [remotePatients, setRemotePatients] = useState(patients);
  const [searching, setSearching] = useState(false);
  const matches = useMemo(() => remotePatients.filter((patient) => matchesPatient(patient, query)).slice(0, 8), [remotePatients, query]);
  const hasQuery = query.trim().length > 0;

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setRemotePatients(patients);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(`/api/patients/search?query=${encodeURIComponent(text)}`, {
          signal: controller.signal
        });
        if (response.ok) {
          const data = (await response.json()) as { results?: Patient[] };
          setRemotePatients(data.results || []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setRemotePatients([]);
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
  }, [patients, query]);

  return (
    <div className="grid gap-5">
      <section className="hh-panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold">Existing patient check-in</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#66736d]">
              Find a fully registered patient by cell number, Harmony patient ID, or National / Passport ID, then choose the visit flow.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/patients/new">Register new patient</Link>
          </Button>
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
                <Button asChild>
                  <Link href={`/visits/new?patient=${patient.id}&type=new_consultation`}>
                    <ClipboardPlus size={17} />
                    New visit
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={`/visits/new?patient=${patient.id}&type=follow_up`}>
                    <RotateCcw size={17} />
                    Follow up
                  </Link>
                </Button>
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
    </div>
  );
}
