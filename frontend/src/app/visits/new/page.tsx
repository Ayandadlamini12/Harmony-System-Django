import { AppShell } from "@/components/app-shell";
import { VisitForm } from "@/components/visit-form";
import { getPatients } from "@/lib/api";

export default async function NewVisitPage({ searchParams }: { searchParams: Promise<{ error?: string; patient?: string }> }) {
  const [params, patients] = await Promise.all([searchParams, getPatients()]);
  return (
    <AppShell title="Add visit">
      <VisitForm patients={patients.results} patientId={params.patient} error={params.error} />
    </AppShell>
  );
}
