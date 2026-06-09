import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { PatientFlowLookup } from "@/components/patient-flow-lookup";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/session";

export default async function PatientFlowPage({ searchParams }: { searchParams: Promise<{ identifier?: string }> }) {
  const params = await searchParams;
  const session = await getSessionUser();
  
  return (
    <AppShell
      title="Patient flow tracking"
      action={
        <>
          <Button asChild variant="secondary">
            <Link href="/check-ins">Check-in desk</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/waiting-list">Waiting list</Link>
          </Button>
        </>
      }
    >
      <PatientFlowLookup initialIdentifier={params.identifier || ""} userRole={session.role} />
    </AppShell>
  );
}

