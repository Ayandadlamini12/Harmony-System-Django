import { AppShell } from "@/components/app-shell";
import { PatientRegistrationForm } from "@/components/patient-registration-form";

export default function RegisterPatientPage() {
  return (
    <AppShell title="Register patient">
      <PatientRegistrationForm />
    </AppShell>
  );
}
