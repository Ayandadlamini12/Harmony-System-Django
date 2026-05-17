import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username || "";
  const password = body.password || "";

  const response = await fetch(`${API_BASE_URL}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    return NextResponse.json({ success: false, error: "invalid" }, { status: 401 });
  }

  const tokens = (await response.json()) as { access: string; refresh: string };
  let userProfile = { role: "receptionist", username, name: username };
  try {
    const userResponse = await fetch(`${API_BASE_URL}/users/me/`, {
      headers: { Authorization: `Bearer ${tokens.access}` }
    });
    if (userResponse.ok) {
      const currentUser = await userResponse.json();
      userProfile = {
        role: currentUser.role || "receptionist",
        username: currentUser.username || username,
        name: currentUser.name || currentUser.email || currentUser.username || username
      };
    }
  } catch {
    userProfile = { role: "receptionist", username, name: username };
  }

  const cookieStore = await cookies();
  cookieStore.set("harmony_access", tokens.access, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: 60 * 30
  });
  cookieStore.set("harmony_refresh", tokens.refresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  cookieStore.set("harmony_role", userProfile.role, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  cookieStore.set("harmony_username", userProfile.username, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  cookieStore.set("harmony_name", userProfile.name, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });

  return NextResponse.json({ success: true });
}
