"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { createUser } from "@/app/users/actions";
import { Button } from "@/components/ui/button";

const accountTypes = [
  { value: "employee", label: "Employee - HH200 range" },
  { value: "supplier", label: "Supplier - HH300 range" },
  { value: "external_partner", label: "External partner - HH400 range" },
] as const;

const rolesByAccountType = {
  employee: [
    { value: "receptionist", label: "Receptionist" },
    { value: "clinician", label: "Clinician" },
    { value: "admin", label: "Admin" },
  ],
  supplier: [
    { value: "supplier_contact", label: "Supplier contact" },
    { value: "supplier_manager", label: "Supplier manager" },
  ],
  external_partner: [
    { value: "partner_contact", label: "Partner contact" },
    { value: "partner_manager", label: "Partner manager" },
  ],
} as const;

type AccountType = keyof typeof rolesByAccountType;

export function CreateLoginAccountForm() {
  const [accountType, setAccountType] = useState<AccountType>("employee");
  const roleOptions = useMemo(() => rolesByAccountType[accountType], [accountType]);

  return (
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
        <span className="hh-label">Account type</span>
        <select
          className="hh-input"
          name="identity_type"
          value={accountType}
          onChange={(event) => setAccountType(event.target.value as AccountType)}
        >
          {accountTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="hh-label">Email</span>
        <input className="hh-input" name="email" type="email" />
      </label>
      <label>
        <span className="hh-label">Role</span>
        <select className="hh-input" name="role" defaultValue={roleOptions[0].value} key={accountType}>
          {roleOptions.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span className="hh-label">Temporary password</span>
        <input className="hh-input" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <div className="flex flex-wrap gap-3">
        <Button type="submit">Create account</Button>
        <Button asChild type="button" variant="secondary">
          <Link href="/users">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
