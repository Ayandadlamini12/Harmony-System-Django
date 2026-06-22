import { NextRequest, NextResponse } from "next/server";

import { apiFetchWithAuth } from "@/lib/api-auth";

function authEventsPath(path?: string[]) {
  const pathStr = (path || []).join("/");
  return pathStr ? `/authentication-events/${pathStr}/` : "/authentication-events/";
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path } = await params;
  const queryString = request.nextUrl.search;

  const res = await apiFetchWithAuth(`${authEventsPath(path)}${queryString}`);

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
