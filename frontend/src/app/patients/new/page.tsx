import { AppShell } from "@/components/app-shell";
import { PatientRegistrationForm } from "@/components/patient-registration-form";
import { getSessionUser } from "@/lib/session";

export default async function RegisterPatientPage() {
  const session = await getSessionUser();

  return (
    <AppShell title="Register patient">
      <PatientRegistrationForm role={session.role} />
    </AppShell>
  );
}
