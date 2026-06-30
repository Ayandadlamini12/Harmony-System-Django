import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const path = searchParams.get("path") || "";

  // 1. Fetch from Django anonymously by default
  let backendData: any = {};
  try {
    const backendUrl = `${API_BASE_URL}/system/not-found-context/?path=${encodeURIComponent(path)}`;
    const response = await fetch(backendUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (response.ok) {
      backendData = await response.json();
    }
  } catch (error) {
    console.error("Failed to fetch not-found-context from backend", error);
  }

  // 2. Read local session server-side to determine signed_in state
  let signedIn = false;
  try {
    const session = await getSessionUser();
    signedIn = session.signedIn;
  } catch (error) {
    console.error("Failed to read session user", error);
  }

  // 3. Merge backend context and append signed_in, using sensible local fallbacks if backend call fails
  const finalData = {
    module: backendData.module || "general",
    eyebrow: backendData.eyebrow || "Harmony MIS",
    title: backendData.title || "This page is not on the current map",
    message: backendData.message || "The link may be old, incomplete, or no longer part of the MIS workspace.",
    primary_label: backendData.primary_label || "Go to dashboard",
    primary_href: backendData.primary_href || "/",
    login_href: backendData.login_href || `/login?redirect=${encodeURIComponent(path || "/")}`,
    dashboard_href: backendData.dashboard_href || "/",
    support_label: backendData.support_label || "Contact support",
    support_href: backendData.support_href || "/administration/support-tickets",
    requested_path: path,
    secret_values_exposed: backendData.secret_values_exposed ?? false,
    signed_in: signedIn,
  };

  return NextResponse.json(finalData);
}
