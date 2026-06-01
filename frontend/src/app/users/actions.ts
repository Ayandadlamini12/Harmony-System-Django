"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

async function authHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get("harmony_access")?.value;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createUser(formData: FormData) {
  const userId = String(formData.get("user_id") || formData.get("username") || "");
  const body = {
    username: userId,
    email: String(formData.get("email") || ""),
    first_name: String(formData.get("first_name") || ""),
    last_name: String(formData.get("last_name") || ""),
    role: String(formData.get("role") || "receptionist"),
    password: String(formData.get("password") || ""),
  };

  const response = await fetch(`${API_BASE_URL}/users/`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });

  revalidatePath("/users");
  if (!response.ok) {
    redirect("/users?error=create_failed");
  }
  redirect("/users");
}

export async function updateUser(id: number, formData: FormData) {
  const userId = String(formData.get("user_id") || formData.get("username") || "");
  const body: Record<string, unknown> = {
    username: userId,
    email: String(formData.get("email") || ""),
    first_name: String(formData.get("first_name") || ""),
    last_name: String(formData.get("last_name") || ""),
    role: String(formData.get("role") || "receptionist"),
  };
  const password = String(formData.get("password") || "");
  if (password) body.password = password;

  const response = await fetch(`${API_BASE_URL}/users/${id}/`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });

  revalidatePath("/users");
  if (!response.ok) {
    redirect("/users?error=update_failed");
  }
  redirect("/users");
}

export async function toggleUserStatus(id: number) {
  const response = await fetch(`${API_BASE_URL}/users/${id}/toggle_status/`, {
    method: "POST",
    headers: await authHeaders(),
  });

  revalidatePath("/users");
}
