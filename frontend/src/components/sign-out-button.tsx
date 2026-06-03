"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { LoadingButton } from "@/components/harmony-loading";
import { clearAllLocalDrafts } from "@/lib/draft-utils";

export function SignOutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    clearAllLocalDrafts();
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <LoadingButton type="button" onClick={handleLogout} loading={loading} loadingText="Signing out..." variant="secondary">
      Sign out
    </LoadingButton>
  );
}
