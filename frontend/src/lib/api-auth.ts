import { cookies } from "next/headers";

export const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

export async function refreshAccessToken() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("harmony_refresh")?.value;
  if (!refreshToken) return null;

  const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken })
  });
  if (!response.ok) return null;

  const tokens = (await response.json().catch(() => ({}))) as { access?: string };
  if (!tokens.access) return null;

  cookieStore.set("harmony_access", tokens.access, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: 60 * 30
  });
  return tokens.access;
}

export async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("harmony_access")?.value || refreshAccessToken();
}

export async function apiFetchWithAuth(path: string, init: RequestInit = {}) {
  let accessToken = await getAccessToken();
  if (!accessToken) return new Response(JSON.stringify({ detail: "Your session has expired. Please sign in again." }), { status: 401 });

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
  if (response.status !== 401) return response;

  accessToken = await refreshAccessToken();
  if (!accessToken) return response;

  const retryHeaders = new Headers(init.headers);
  retryHeaders.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers: retryHeaders });
}
