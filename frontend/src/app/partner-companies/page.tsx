import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/session";
import { getPartnerCompanies } from "@/lib/api";
import { PartnerCompaniesDashboard } from "@/components/partner-companies-dashboard";

export const dynamic = "force-dynamic";

export default async function PartnerCompaniesPage() {
  const session = await getSessionUser();
  const isAuthorized = session.role === "admin" || session.role === "clinician" || session.role === "receptionist";

  if (!isAuthorized) {
    return (
      <AppShell title="Partner Companies">
        <section className="hh-panel p-6">
          <h2 className="text-lg font-bold text-red-700">Access Denied</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#66736d]">
            You do not have permission to view or manage partner companies.
          </p>
        </section>
      </AppShell>
    );
  }

  const initialCompanies = await getPartnerCompanies();

  return (
    <AppShell title="Partner Companies">
      <PartnerCompaniesDashboard initialCompanies={initialCompanies} userRole={session.role} />
    </AppShell>
  );
}
