import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { user_id: string };
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");

  const response = await fetch(`${API_BASE_URL}/auth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    return NextResponse.redirect(new URL("/login?error=invalid", APP_BASE_URL), 303);
  }

  const tokens = (await response.json()) as { access: string; refresh: string };
  let userProfile = { role: "receptionist", username, name: username };
  try {
    const payload = decodeJwtPayload(tokens.access);
    const usersResponse = await fetch(`${API_BASE_URL}/users/`, {
      headers: { Authorization: `Bearer ${tokens.access}` }
    });
    if (usersResponse.ok) {
      const usersPayload = await usersResponse.json();
      const users = Array.isArray(usersPayload.results) ? usersPayload.results : usersPayload;
      const currentUser = users.find((user: { id: number }) => String(user.id) === String(payload.user_id));
      if (currentUser) {
        userProfile = {
          role: currentUser.role || "receptionist",
          username: currentUser.username || username,
          name: currentUser.name || currentUser.email || currentUser.username || username
        };
      }
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

  return NextResponse.redirect(new URL("/", APP_BASE_URL), 303);
}
