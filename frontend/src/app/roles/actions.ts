"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";

export async function updateRoleModules(formData: FormData) {
  const accessToken = (await cookies()).get("harmony_access")?.value;
  if (!accessToken) redirect("/login");

  const roles = String(formData.get("roles") || "").split(",").filter(Boolean);
  const modules = String(formData.get("modules") || "").split(",").filter(Boolean);
  const permissions: Record<string, Record<string, boolean>> = {};

  for (const role of roles) {
    permissions[role] = {};
    for (const moduleKey of modules) {
      permissions[role][moduleKey] = formData.get(`permission_${role}_${moduleKey}`) === "on";
    }
  }

  const response = await fetch(`${API_BASE_URL}/role-module-permissions/matrix/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ permissions })
  });

  if (!response.ok) {
    redirect("/roles?error=save_failed");
  }

  redirect("/roles?saved=1");
}
