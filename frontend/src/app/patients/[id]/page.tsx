import { ClipboardList, Pencil, UserRound } from "lucide-react";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { PatientRecordWorkspace } from "@/components/patient-record-workspace";
import { Badge } from "@/components/ui/badge";
import { getPatient } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

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

export default async function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSessionUser()]);

  const patient = await getPatient(id);
  if (!patient) notFound();

  const canCreateVisit = session.role === "admin" || session.role === "clinician";
  const clinicalAccessActive = patient.clinical_access === "active";
  const latestVisit = patient.visits?.[0];

  return (
    <AppShell title={patient.full_name_display}>
      <section className="overflow-hidden rounded-lg border border-[var(--hh-border)] bg-white shadow-sm">
        <div className="border-b border-[var(--hh-border)] bg-white px-4 py-5 sm:px-6">
          <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-[#f7f0fb] text-[var(--hh-purple)]">
                <UserRound size={42} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-[var(--hh-purple-dark)]">{patient.full_name_display}</h1>
                  <span className="font-mono text-sm font-bold text-[#66736d]">{patient.patient_code}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#53605a]">
                  <span className="capitalize">{patient.gender.replaceAll("_", " ")}</span>
                  <span>{ageFromDate(patient.date_of_birth)}</span>
                  <span>{value(patient.primary_phone)}</span>
                  <span>{value(patient.town_or_locality || patient.region)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="success">{patient.status === "active" ? "Active patient" : patient.status}</Badge>
                  <Badge variant={clinicalAccessActive ? "harmony" : "default"}>
                    {clinicalAccessActive ? "Clinician access active" : "Approval required"}
                  </Badge>
                  {latestVisit && <Badge variant="warning">Last visit {formatDate(latestVisit.visit_date)}</Badge>}
                </div>
              </div>
            </div>

            <aside className="rounded-lg border border-[var(--hh-border)] bg-[#f7faf8]">
              <div className="flex items-center justify-between border-b border-[var(--hh-border)] px-4 py-2">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <ClipboardList size={17} />
                  Key notes
                </div>
                <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#53605a] hover:bg-white" type="button">
                  <Pencil size={15} />
                </button>
              </div>
              <p className="px-4 py-3 text-sm leading-6 text-[#3f4d47]">
                {patient.profile?.other_important_information || latestVisit?.main_complaint || "No key notes recorded yet."}
              </p>
            </aside>
          </div>
        </div>

        <PatientRecordWorkspace patient={patient} canCreateVisit={canCreateVisit} />
      </section>
    </AppShell>
  );
}
