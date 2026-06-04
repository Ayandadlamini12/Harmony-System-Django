import { ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { getUsers } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { toggleUserStatus, updateUser } from "./actions";

const roleLabels: Record<string, string> = {
  admin: "Admin",
  clinician: "Clinician",
  receptionist: "Receptionist",
  supplier_contact: "Supplier contact",
  supplier_manager: "Supplier manager",
  partner_contact: "Partner contact",
  partner_manager: "Partner manager",
};

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ search?: string; error?: string }> }) {
  const params = await searchParams;
  const [data, session] = await Promise.all([getUsers(params.search || ""), getSessionUser()]);

  const editUser = params.search?.startsWith("edit:") ? Number(params.search.split(":")[1]) : null;
  const selectedUser = editUser ? data.results.find((u) => u.id === editUser) : null;
  const errorMsg = params.error;

  return (
    <AppShell title="User directory" action={<Link className="hh-button" href="/users/enrol">Create login account</Link>}>
      {errorMsg && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {errorMsg === "create_failed" && "Failed to create user. Please try again."}
          {errorMsg === "update_failed" && "Failed to update user. Please try again."}
        </div>
      )}

      <form className="mb-5 max-w-md">
        <input className="hh-input" name="search" defaultValue={selectedUser ? "" : params.search || ""} placeholder="Search by name, User ID, or email" />
      </form>

      {selectedUser && (
        <div className="mb-5 hh-panel p-5">
          <div className="mb-4 flex items-center gap-3">
            <UserRound className="text-[var(--hh-purple)]" size={22} />
            <h2 className="font-bold">Edit user: {selectedUser.name || selectedUser.username}</h2>
          </div>
          <form action={updateUser.bind(null, selectedUser.id)} method="post" className="grid gap-4 max-w-lg">
            <div className="grid grid-cols-2 gap-3">
              <label>
                <span className="hh-label">First name</span>
                <input className="hh-input" name="first_name" defaultValue={selectedUser.first_name} />
              </label>
              <label>
                <span className="hh-label">Last name</span>
                <input className="hh-input" name="last_name" defaultValue={selectedUser.last_name} />
              </label>
            </div>
            <label>
              <span className="hh-label">User ID</span>
              <input className="hh-input" name="user_id" defaultValue={selectedUser.username} required />
            </label>
            <label>
              <span className="hh-label">Email</span>
              <input className="hh-input" name="email" type="email" defaultValue={selectedUser.email} />
            </label>
            <label>
              <span className="hh-label">Role</span>
              <select className="hh-input" name="role" defaultValue={selectedUser.role}>
                <option value="receptionist">Receptionist</option>
                <option value="clinician">Clinician</option>
                <option value="admin">Admin</option>
                <option value="supplier_contact">Supplier contact</option>
                <option value="supplier_manager">Supplier manager</option>
                <option value="partner_contact">Partner contact</option>
                <option value="partner_manager">Partner manager</option>
              </select>
            </label>
            <label>
              <span className="hh-label">New password (leave blank to keep current)</span>
              <input className="hh-input" name="password" type="password" autoComplete="new-password" minLength={8} />
            </label>
            <div className="flex gap-3">
              <button className="hh-button" type="submit">Save changes</button>
              <Link className="hh-button hh-button-secondary" href="/users">Cancel</Link>
            </div>
          </form>
        </div>
      )}

      <div className="hh-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="hh-compact-table w-full text-left">
            <thead>
              <tr>
                <th>User</th>
                <th>User ID</th>
                <th>Role</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="font-bold">{user.name || user.username}</div>
                    <div className="text-xs text-[#66736d]">{user.email || "No email"}</div>
                  </td>
                  <td className="text-[#66736d]">{user.username}</td>
                  <td>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f5edfa] px-2 py-0.5 text-xs font-bold capitalize text-[var(--hh-purple)]">
                      <ShieldCheck size={12} />
                      {roleLabels[user.role] || user.role}
                    </span>
                  </td>
                  <td>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${user.is_active ? "bg-[var(--hh-green-light)] text-[var(--hh-green-dark)]" : "bg-red-100 text-red-700"}`}>
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="secondary" size="sm"><Link href={`/users?search=edit:${user.id}`}>Edit</Link></Button>
                      <form action={toggleUserStatus.bind(null, user.id)} method="post">
                        <Button variant="secondary" size="sm" type="submit">
                          {user.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {data.results.length === 0 && (
                <tr>
                  <td className="py-10 text-center text-[#66736d]" colSpan={5}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
