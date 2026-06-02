import { Check, LockKeyhole, ShieldCheck } from "lucide-react";

import { updateRoleModules } from "@/app/roles/actions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getRoleModuleMatrix } from "@/lib/api";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  clinician: "Clinician",
  receptionist: "Receptionist",
  supplier_contact: "Supplier contact",
  supplier_manager: "Supplier manager",
  partner_contact: "Partner contact",
  partner_manager: "Partner manager"
};

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [matrix, params] = await Promise.all([getRoleModuleMatrix(), searchParams]);
  const categories = Array.from(new Set(matrix.modules.map((module) => module.category)));

  return (
    <AppShell title="Roles">
      <form action={updateRoleModules} className="grid gap-5">
        <input type="hidden" name="roles" value={matrix.roles.join(",")} />
        <input type="hidden" name="modules" value={matrix.modules.map((module) => module.key).join(",")} />

        <div className="hh-panel p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-3">
                <ShieldCheck className="text-[var(--hh-purple)]" size={22} />
                <h2 className="font-bold">Role module management</h2>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#66736d]">
                Activate or deactivate Harmony modules for each role. These module keys will drive the patient process actions, sidebar access, and workflow eligibility.
              </p>
            </div>
            <Button type="submit">Save role modules</Button>
          </div>
          {params.saved && (
            <div className="mt-4 rounded-lg border border-[#b7e2c0] bg-[#f2fbf4] px-4 py-3 text-sm font-semibold text-[var(--hh-green-dark)]">
              Role modules saved.
            </div>
          )}
          {params.error === "save_failed" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              Role modules could not be saved.
            </div>
          )}
        </div>

        {categories.map((category) => (
          <section key={category} className="hh-panel overflow-hidden">
            <div className="border-b border-[var(--hh-border)] bg-[#f7faf8] px-5 py-4">
              <h3 className="font-bold text-[var(--hh-purple-dark)]">{category}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="text-xs uppercase text-[#66736d]">
                  <tr>
                    <th className="w-[42%] px-5 py-3">Module</th>
                    {matrix.roles.map((role) => (
                      <th key={role} className="px-5 py-3 text-center">{roleLabels[role] || role}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.modules.filter((module) => module.category === category).map((module) => (
                    <tr key={module.key} className="border-t border-[var(--hh-border)]">
                      <td className="px-5 py-4">
                        <div className="font-bold">{module.label}</div>
                        <div className="mt-1 text-xs leading-5 text-[#66736d]">{module.description}</div>
                        <div className="mt-2 font-mono text-[11px] text-[#66736d]">{module.key}</div>
                      </td>
                      {matrix.roles.map((role) => {
                        const locked = Boolean(module.locked_admin && role === "admin");
                        const checked = matrix.permissions[role]?.[module.key] ?? module.default_roles.includes(role);
                        return (
                          <td key={`${role}-${module.key}`} className="px-5 py-4 text-center">
                            <label className="inline-flex cursor-pointer items-center justify-center">
                              <input
                                className="peer sr-only"
                                defaultChecked={checked || locked}
                                disabled={locked}
                                name={`permission_${role}_${module.key}`}
                                type="checkbox"
                              />
                              <span className="inline-flex h-10 min-w-24 items-center justify-center gap-2 rounded-lg border border-[var(--hh-border)] bg-white px-3 text-xs font-bold text-[#66736d] peer-checked:border-[var(--hh-purple)] peer-checked:bg-[#f7f0fb] peer-checked:text-[var(--hh-purple)] peer-disabled:cursor-not-allowed peer-disabled:opacity-80">
                                {locked ? <LockKeyhole size={14} /> : <Check size={14} />}
                                {locked ? "Locked" : "Enabled"}
                              </span>
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </form>
    </AppShell>
  );
}
