import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { API_BASE_URL } from "@/lib/api";

const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";

function unauthorized() {
  return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
}

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get("harmony_access")?.value;
  if (!token) return unauthorized();

  const response = await fetch(`${API_BASE_URL}/users/me/avatar/`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });

  if (!response.ok || !response.body) {
    return new NextResponse(null, { status: response.status });
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/png",
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("harmony_access")?.value;
  if (!token) return unauthorized();

  const formData = await request.formData();
  const avatar = formData.get("avatar");
  if (!(avatar instanceof File)) {
    return NextResponse.json({ success: false, error: "avatar_required" }, { status: 400 });
  }

  const upload = new FormData();
  upload.set("avatar", avatar);

  const response = await fetch(`${API_BASE_URL}/users/me/avatar/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: upload
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ success: false, error: data }, { status: response.status });
  }

  const avatarUrl = `/api/account/avatar?v=${Date.now()}`;
  const nextResponse = NextResponse.json({ success: true, avatar_url: avatarUrl, user: data });
  nextResponse.cookies.set("harmony_avatar_url", avatarUrl, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
  return nextResponse;
}

export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get("harmony_access")?.value;
  if (!token) return unauthorized();

  const response = await fetch(`${API_BASE_URL}/users/me/avatar/`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  const nextResponse = NextResponse.json({ success: response.ok }, { status: response.status });
  nextResponse.cookies.delete("harmony_avatar_url");
  return nextResponse;
}
