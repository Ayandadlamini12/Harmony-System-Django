import { Clock, MailCheck, MailWarning, MessageCircle, UserPlus } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { EmployeeEnrollmentActions } from "@/components/employee-enrollment-actions";
import { Button } from "@/components/ui/button";
import { getEmployeeEnrollmentRequests } from "@/lib/api";

const statusClasses = {
  pending: "border-[#f6d58b] bg-[#fff8e6] text-[#875400]",
  approved: "border-[#b8e6c2] bg-[#ecfff0] text-[#057a28]",
  rejected: "border-[#f2b8b8] bg-[#fff0f0] text-[#9b1c1c]",
  cancelled: "border-[#d9e3dd] bg-[#f4f7f5] text-[#52635b]"
};

export default async function EmployeeEnrollmentPage() {
  const requests = await getEmployeeEnrollmentRequests();
  const pendingCount = requests.results.filter((request) => request.status === "pending").length;

  return (
    <AppShell title="Employee enrollment">
      <div className="space-y-5">
        <section className="hh-panel p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <UserPlus className="text-[var(--hh-purple)]" size={22} />
                <h2 className="font-bold">Employee onboarding</h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736d]">
                Telegram and internal onboarding requests land here as pending employee records. Admins review the details before the employee is prepared for Keycloak-based system access.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/users/enrol">Create login account</Link>
              </Button>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#d9e3dd] bg-white px-3 py-1 text-xs font-bold uppercase text-[#52635b]">
                <Clock size={14} />
                {pendingCount} pending
              </span>
            </div>
          </div>
        </section>

        <section className="hh-panel overflow-hidden">
          <div className="border-b border-[var(--hh-border-strong)] px-5 py-4">
            <h3 className="font-bold">Onboarding requests</h3>
          </div>
          {requests.results.length ? (
            <div className="divide-y divide-[var(--hh-border-strong)]">
              {requests.results.map((request) => (
                <article key={request.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1.3fr_1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-[#16211c]">{request.full_names}</h4>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold uppercase ${statusClasses[request.status]}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#52635b]">
                      <span>{request.email || "No email"}</span>
                      <span>{request.phone_number || "No phone"}</span>
                      {request.telegram_username ? <span>@{request.telegram_username}</span> : null}
                      {request.review_email_sent_at ? (
                        <span className="inline-flex items-center gap-1 text-[var(--hh-green-dark)]">
                          <MailCheck size={14} />
                          Under-review email sent
                        </span>
                      ) : request.email ? (
                        <span className="inline-flex items-center gap-1 text-[#875400]">
                          <MailWarning size={14} />
                          Review email pending
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid gap-1 text-sm">
                    <span>
                      <strong className="text-[#52635b]">Role:</strong> {request.requested_role || "Not set"}
                    </span>
                    <span>
                      <strong className="text-[#52635b]">Team:</strong> {request.requested_team || "Not set"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#52635b]">
                      <MessageCircle size={14} />
                      {request.source}
                    </span>
                  </div>
                  <EmployeeEnrollmentActions requestId={request.id} status={request.status} />
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-10 text-sm text-[#66736d]">No employee onboarding requests yet.</div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
