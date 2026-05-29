import { AppShell } from "@/components/app-shell";
import { CaseForm } from "@/components/case-form";
import { getPatient, getPatients } from "@/lib/api";

export default async function NewCasePage({ searchParams }: { searchParams: Promise<{ patient?: string; parent?: string }> }) {
  const [params, patients] = await Promise.all([searchParams, getPatients()]);

  let parentCase = null;
  if (params.parent) {
    const response = await fetch(`${process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api"}/cases/${params.parent}/`, {
      cache: "no-store"
    });
    if (response.ok) parentCase = await response.json();
  }

  let selectedPatient = null;
  if (params.patient) {
    const patient = await getPatient(params.patient);
    if (patient) selectedPatient = patient;
  }

  return (
    <AppShell title={params.parent ? "New follow-up case" : "New case"}>
      <CaseForm
        patients={patients.results}
        patientId={params.patient}
        parentCase={parentCase}
        selectedPatient={selectedPatient}
      />
    </AppShell>
  );
}
