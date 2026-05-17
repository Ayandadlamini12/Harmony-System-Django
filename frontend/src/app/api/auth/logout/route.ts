import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("harmony_access");
  cookieStore.delete("harmony_refresh");
  cookieStore.delete("harmony_role");
  cookieStore.delete("harmony_username");
  cookieStore.delete("harmony_name");

  return NextResponse.json({ success: true });
}
