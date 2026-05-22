import { cookies } from "next/headers";

export type UserRole = "admin" | "clinician" | "receptionist";

export type SessionUser = {
  signedIn: boolean;
  role: UserRole;
  name: string;
  username: string;
  avatarUrl?: string;
};

export async function getSessionUser(): Promise<SessionUser> {
  const cookieStore = await cookies();
  return {
    signedIn: Boolean(cookieStore.get("harmony_access")?.value),
    role: (cookieStore.get("harmony_role")?.value as UserRole) || "receptionist",
    name: cookieStore.get("harmony_name")?.value || "Local Admin",
    username: cookieStore.get("harmony_username")?.value || "localadmin",
    avatarUrl: cookieStore.get("harmony_avatar_url")?.value
  };
}
