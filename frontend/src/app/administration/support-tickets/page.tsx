import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/session";
import { getSupportTickets } from "@/lib/api";
import { TicketsClient } from "./tickets-client";

export default async function SupportTicketsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; search?: string }>;
}) {
  const session = await getSessionUser();
  if (session.role !== "admin") {
    return (
      <AppShell title="Access Denied">
        <div className="hh-panel p-8 text-center max-w-md mx-auto my-12 border-red-200 bg-red-50">
          <h2 className="text-lg font-bold text-red-700">Access Denied</h2>
          <p className="mt-2 text-sm text-[#66736d]">
            Only administrators are authorized to access the Support Tickets dashboard.
          </p>
        </div>
      </AppShell>
    );
  }

  const params = await searchParams;
  const currentStatus = params.status || "open";
  const currentPage = params.page || "1";
  const currentSearch = params.search || "";

  const queryParts: string[] = [];
  // Ensure we send valid status query
  if (currentStatus) queryParts.push(`status=${encodeURIComponent(currentStatus)}`);
  if (currentPage) queryParts.push(`page=${encodeURIComponent(currentPage)}`);
  if (currentSearch) queryParts.push(`search=${encodeURIComponent(currentSearch)}`);
  const queryStr = queryParts.join("&");

  const tickets = await getSupportTickets(queryStr);

  return (
    <AppShell title="Support Tickets">
      <TicketsClient
        initialTickets={tickets}
        currentStatus={currentStatus as "open" | "resolved"}
        currentSearch={currentSearch}
      />
    </AppShell>
  );
}
