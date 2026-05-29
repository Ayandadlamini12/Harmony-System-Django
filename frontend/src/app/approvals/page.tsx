import Link from "next/link";

import { ApprovalsList } from "@/components/approvals-list";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getAccessRequests } from "@/lib/api";

export default async function ApprovalsPage() {
  const requests = await getAccessRequests();
  const pending = requests.results.filter((request) => request.status === "pending");

  return (
    <AppShell title="Approvals" action={<Button asChild variant="secondary"><Link href="/patients/dashboard">Patient Hub</Link></Button>}>
      <ApprovalsList initialPending={pending} />
    </AppShell>
  );
}
