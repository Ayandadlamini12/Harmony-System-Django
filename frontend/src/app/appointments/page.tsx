import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getSchedulingBoard, getSchedulingResources, getUserCapabilities } from "@/lib/api";
import { SchedulingBoard } from "@/components/scheduling-board";

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view_by?: string; patient?: string }>;
}) {
  const params = await searchParams;
  const targetDate = params.date || new Date().toISOString().slice(0, 10);
  const targetViewBy = params.view_by || "practitioners";

  // Parallel fetches to minimize network waterfalls and load data extremely fast
  const [boardData, resources, capabilities] = await Promise.all([
    getSchedulingBoard(targetDate, targetViewBy),
    getSchedulingResources(),
    getUserCapabilities(),
  ]);

  return (
    <AppShell
      title="Appointment Operations Board"
      action={
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/check-ins">Open Check-Ins</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/patient-flow">Track Patient Flow</Link>
          </Button>
        </div>
      }
    >
      <SchedulingBoard
        initialBoardData={boardData}
        resources={resources}
        capabilities={capabilities}
      />
    </AppShell>
  );
}

