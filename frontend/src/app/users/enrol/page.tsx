import { UserRoundCog } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { createUser } from "@/app/users/actions";

export default async function EnrolUserPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <AppShell title="Enrol user">
      {params.error === "create_failed" && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          Failed to enrol user. Check the details and try again.
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="hh-panel p-5">
          <div className="mb-5 flex items-center gap-3">
            <UserRoundCog className="text-[var(--hh-purple)]" size={22} />
            <div>
              <h2 className="font-bold">Create system user</h2>
              <p className="mt-1 text-sm text-[#66736d]">Create login access and assign the correct system role.</p>
            </div>
          </div>

          <form action={createUser} className="grid max-w-2xl gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label>
                <span className="hh-label">First name</span>
                <input className="hh-input" name="first_name" required />
              </label>
              <label>
                <span className="hh-label">Last name</span>
                <input className="hh-input" name="last_name" required />
              </label>
            </div>
            <label>
              <span className="hh-label">Username</span>
              <input className="hh-input" name="username" required />
            </label>
            <label>
              <span className="hh-label">Email</span>
              <input className="hh-input" name="email" type="email" />
            </label>
            <label>
              <span className="hh-label">Role</span>
              <select className="hh-input" name="role" defaultValue="receptionist">
                <option value="receptionist">Receptionist</option>
                <option value="clinician">Clinician</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label>
              <span className="hh-label">Temporary password</span>
              <input className="hh-input" name="password" type="password" autoComplete="new-password" minLength={8} required />
            </label>
            <div className="flex flex-wrap gap-3">
              <Button type="submit">Enrol user</Button>
              <Button asChild type="button" variant="secondary">
                <Link href="/users">Cancel</Link>
              </Button>
            </div>
          </form>
        </div>

        <div className="hh-panel p-5">
          <h3 className="font-bold">User enrolment</h3>
          <p className="mt-2 text-sm leading-6 text-[#66736d]">
            Use this for system login accounts. Employee HR onboarding will be separated under Employee Enrollment.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
