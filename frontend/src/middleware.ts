import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
const protectedPaths = ["/", "/patients", "/patient-flow", "/visits", "/vitals", "/drafts", "/check-ins", "/waiting-list", "/appointments", "/messages", "/account", "/users", "/employees", "/roles", "/teams", "/approvals", "/access-requests"];

function isProtected(pathname: string) {
  return protectedPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("harmony_access")?.value;
  const refreshToken = request.cookies.get("harmony_refresh")?.value;

  if (!accessToken && refreshToken && (isProtected(pathname) || pathname === "/login" || pathname === "/register")) {
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken })
      });

      if (refreshResponse.ok) {
        const tokens = (await refreshResponse.json()) as { access?: string };
        if (tokens.access) {
          const response = pathname === "/login" || pathname === "/register"
            ? NextResponse.redirect(new URL("/", request.url))
            : NextResponse.redirect(request.nextUrl);
          response.cookies.set("harmony_access", tokens.access, {
            httpOnly: true,
            sameSite: "lax",
            secure: COOKIE_SECURE,
            path: "/",
            maxAge: 60 * 30
          });
          response.headers.set("X-Robots-Tag", "noindex, nofollow");
          response.headers.set("Referrer-Policy", "no-referrer");
          return response;
        }
      }
    } catch {
      // Fall through to the normal login redirect when the refresh endpoint is unavailable.
    }
  }

  if (isProtected(pathname)) {
    if (!accessToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if ((pathname === "/login" || pathname === "/register") && accessToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
