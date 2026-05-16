import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete("harmony_access");
  cookieStore.delete("harmony_refresh");
  cookieStore.delete("harmony_role");
  cookieStore.delete("harmony_username");
  cookieStore.delete("harmony_name");

  return NextResponse.redirect(new URL("/login", APP_BASE_URL), 303);
}
