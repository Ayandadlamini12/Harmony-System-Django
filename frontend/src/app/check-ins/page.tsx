import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PatientCheckIn } from "@/components/patient-check-in";
import { Button } from "@/components/ui/button";
import { getPatients } from "@/lib/api";

export default async function CheckInsPage() {
  const patients = await getPatients();

  return (
    <AppShell
      title="Check-in desk"
      action={
        <>
          <Button asChild variant="secondary"><Link href="/tablet-check-in">Tablet view</Link></Button>
          <Button asChild variant="secondary"><Link href="/appointments">Appointments</Link></Button>
        </>
      }
    >
      <PatientCheckIn patients={patients.results} />
    </AppShell>
  );
}
