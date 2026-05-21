import { AppSidebar } from "@/components/app-sidebar";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { SignOutButton } from "@/components/sign-out-button";
import { getSessionUser } from "@/lib/session";
import type React from "react";

export async function AppShell({ children, title, action }: { children: React.ReactNode; title: string; action?: React.ReactNode }) {
  const session = await getSessionUser();

  return (
    <>
      <MobileSidebar role={session.role} name={session.name} />
      <AppSidebar
        action={action}
        name={session.name}
        role={session.role}
        signedIn={session.signedIn}
        signOut={<SignOutButton />}
        title={title}
      >
        {children}
      </AppSidebar>
    </>
  );
}
