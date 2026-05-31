import { NextRequest, NextResponse } from "next/server";

import { apiFetchWithAuth } from "@/lib/api-auth";

function messageThreadPath(path?: string[]) {
  const pathStr = (path || []).join("/");
  return pathStr ? `/message-threads/${pathStr}/` : "/message-threads/";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const res = await apiFetchWithAuth(`${messageThreadPath(path)}${request.nextUrl.search}`);
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const body = await request.json().catch(() => ({}));
  const res = await apiFetchWithAuth(messageThreadPath(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const body = await request.json().catch(() => ({}));
  const res = await apiFetchWithAuth(messageThreadPath(path), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
