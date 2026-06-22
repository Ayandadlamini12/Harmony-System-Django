import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

export async function POST(request: Request) {
  let userId = "", password = "";
  try {
    const body = (await request.json()) as { user_id?: string; username?: string; password?: string };
    userId = body.user_id || body.username || "";
    password = body.password || "";
  } catch {
    return NextResponse.json({ success: false, error: "invalid" }, { status: 401 });
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/token/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, password })
    });
  } catch {
    return NextResponse.json({ success: false, error: "backend_unavailable" }, { status: 503 });
  }

  if (!response.ok) {
    if (response.status === 429) {
      try {
        const errData = await response.json().catch(() => ({}));
        if (errData?.code === "temporary_lockout") {
          return NextResponse.json(
            { success: false, error: "temporary_lockout", detail: "Too many failed login attempts. Please wait before trying again." },
            { status: 429 }
          );
        }
      } catch {
        // Unknown backend errors remain generic.
      }
      return NextResponse.json({ success: false, error: "invalid" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: "invalid" }, { status: 401 });
  }

  const tokens = (await response.json()) as { access: string; refresh: string };
  let userProfile = { role: "receptionist", username: userId, name: userId, avatarUrl: null as string | null };
  try {
    const userResponse = await fetch(`${API_BASE_URL}/users/me/`, {
      headers: { Authorization: `Bearer ${tokens.access}` }
    });
    if (userResponse.ok) {
      const currentUser = await userResponse.json();
      userProfile = {
        role: currentUser.role || "receptionist",
        username: currentUser.username || userId,
        name: currentUser.name || currentUser.email || currentUser.username || userId,
        avatarUrl: currentUser.avatar_url || null
      };
    }
  } catch {
    userProfile = { role: "receptionist", username: userId, name: userId, avatarUrl: null };
  }

  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    return NextResponse.json({ success: false, error: "invalid" }, { status: 500 });
  }
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
  if (userProfile.avatarUrl) {
    cookieStore.set("harmony_avatar_url", `${userProfile.avatarUrl}?v=${Date.now()}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: COOKIE_SECURE,
      path: "/",
      maxAge: 60 * 60 * 24 * 7
    });
  } else {
    cookieStore.delete("harmony_avatar_url");
  }

  return NextResponse.json({ success: true });
}
