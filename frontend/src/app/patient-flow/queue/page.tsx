import { AppShell } from "@/components/app-shell";
import { PatientFlowQueueClient } from "./patient-flow-queue-client";

export default function PatientFlowQueuePage() {
  return (
    <AppShell title="Today's Queue">
      <PatientFlowQueueClient />
    </AppShell>
  );
}
