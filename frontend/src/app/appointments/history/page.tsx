import { AppShell } from "@/components/app-shell";
import { getSchedulingResources } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { AppointmentHistoryClient } from "@/components/appointment-history-client";

export default async function AppointmentHistoryPage() {
  // Fetch required reference resources and session context server-side
  const [resources, session] = await Promise.all([
    getSchedulingResources(),
    getSessionUser(),
  ]);

  return (
    <AppShell title="Appointment History & Logs">
      <AppointmentHistoryClient resources={resources} session={session} />
    </AppShell>
  );
}
