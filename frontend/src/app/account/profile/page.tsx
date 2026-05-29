import { AlertCircle, CheckCircle2 } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { ClinicianProfileForm } from "@/components/clinician-profile-form";
import { ProfilePhotoUploader } from "@/components/profile-photo-uploader";
import { Progress } from "@/components/ui/progress";
import { getMyClinicianProfile } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export default async function ProfileSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const params = await searchParams;
  const session = await getSessionUser();
  const canMaintainClinicianProfile = session.role === "admin" || session.role === "clinician";
  const clinicianProfile = canMaintainClinicianProfile ? await getMyClinicianProfile() : null;
  const completion = clinicianProfile?.profile_completion || 0;
  const missingSections = clinicianProfile?.missing_sections || [];

  return (
    <AppShell title="Profile settings">
      {params.saved === "profile" && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          <CheckCircle2 size={18} /> Clinician profile saved.
        </div>
      )}
      {params.error === "profile_save_failed" && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          <AlertCircle size={18} /> Clinician profile could not be saved. Check the form and try again.
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="hh-panel p-5">
          <img
            alt={`${session.name} profile`}
            className="h-16 w-16 rounded-2xl border border-[#d9c7e8] bg-white object-cover"
            src={session.avatarUrl || "/brand/harmony-icon-sm.webp"}
          />
          <h2 className="mt-4 text-xl font-bold">{session.name}</h2>
          <p className="mt-1 text-sm text-[#66736d]">{session.username}</p>
          <span className="mt-4 inline-flex rounded-full bg-[var(--hh-green-light)] px-3 py-1 text-xs font-bold capitalize text-[var(--hh-green-dark)]">
            {session.role}
          </span>
          <ProfilePhotoUploader avatarUrl={session.avatarUrl} name={session.name} />

          {canMaintainClinicianProfile && (
            <div className="mt-5 rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold">Clinician profile</h3>
                <span className="text-sm font-bold text-[var(--hh-purple)]">{completion}%</span>
              </div>
              <Progress className="mt-3" value={completion} label="Clinician profile completion" />
              {completion < 100 ? (
                <p className="mt-3 text-sm leading-6 text-[#66736d]">
                  Complete {missingSections.map((section) => section.label.toLowerCase()).join(", ") || "the remaining sections"} so the practice has a complete professional record.
                </p>
              ) : (
                <p className="mt-3 text-sm leading-6 text-[#66736d]">Your clinician profile is complete. Review it periodically so it stays current.</p>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="hh-panel p-5">
            <h2 className="text-lg font-bold">Profile management</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736d]">
              Update your photo and professional profile details here. Password and device security are managed from separate account pages.
            </p>
          </div>
          {canMaintainClinicianProfile && completion < 100 && (
            <div className="rounded-lg border border-[#ead7b8] bg-[#fff7e6] p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 text-[#9a5b00]" size={20} />
                <div>
                  <h2 className="font-bold text-[#4b2b00]">Profile reminder</h2>
                  <p className="mt-1 text-sm leading-6 text-[#6b4a1d]">
                    Your clinician profile is {completion}% complete. The system will keep reminding you until the core sections are filled.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {canMaintainClinicianProfile && (
        <section className="mt-6 grid gap-4">
          <div className="hh-panel p-5">
            <h2 className="text-lg font-bold">Clinician resume profile</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66736d]">
              Maintain a structured professional profile for clinician records, internal governance, and future public-facing doctor profiles.
            </p>
          </div>
          <ClinicianProfileForm profile={clinicianProfile} />
        </section>
      )}
    </AppShell>
  );
}
