import { AppShell } from "@/components/app-shell";
import { getDeletedPatients } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { DeletedPatientsClient } from "./deleted-patients-client";

export const dynamic = "force-dynamic";

export default async function DeletedPatientsPage({
  searchParams
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const session = await getSessionUser();
  if (session.role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const queryParts: string[] = [];
  if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
  if (params.page) queryParts.push(`page=${encodeURIComponent(params.page)}`);
  const queryStr = queryParts.join("&");

  const deletedPatients = await getDeletedPatients(queryStr);

  return (
    <AppShell title="Deleted Patients dumpster">
      <div className="mb-6 max-w-2xl bg-[#fffcf5] border border-[#f5eacb] rounded-lg p-4 flex gap-3 text-sm text-[#8a6d1c] shadow-sm">
        <div className="mt-0.5 font-bold text-lg">⚠️</div>
        <p className="leading-6">
          The following patient records have been soft-deleted. They are safely retained with all historical visits, cases, and clinical data intact for a retention window of <strong>30 days</strong>. During this period, administrators can restore them back to the active directory. After 30 days, they will be subject to permanent cleanup.
        </p>
      </div>

      <DeletedPatientsClient initialData={deletedPatients} />
    </AppShell>
  );
}
