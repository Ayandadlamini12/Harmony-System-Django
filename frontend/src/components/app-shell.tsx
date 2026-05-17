import { Activity, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { Footer } from "@/components/footer";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { SignOutButton } from "@/components/sign-out-button";
import { allowedForRole, navItems } from "@/lib/role-workflows";
import { getSessionUser } from "@/lib/session";

export async function AppShell({ children, title, action }: { children: React.ReactNode; title: string; action?: React.ReactNode }) {
  const session = await getSessionUser();
  const nav = allowedForRole(navItems, session.role);
  const navLinks = (
    <>
      {nav.map((item) => {
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/82 hover:bg-white/10">
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden bg-[var(--hh-purple-dark)] text-white lg:block">
        <div className="flex h-16 items-center gap-3 px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/12">
            <Activity size={22} />
          </div>
          <div>
            <div className="font-bold">Harmony Health</div>
            <div className="text-xs text-white/70">Clinic system</div>
          </div>
        </div>
        <div className="mx-3 mb-3 rounded-lg bg-white/8 px-3 py-3">
          <div className="text-sm font-bold">{session.name}</div>
          <div className="mt-1 text-xs capitalize text-white/65">{session.role} workspace</div>
        </div>
        <nav className="grid gap-1 px-3 pb-4 lg:pb-0">
          {navLinks}
        </nav>
      </aside>
      <main className="flex min-h-screen flex-col">
        <MobileSidebar role={session.role} name={session.name} />

        <header className="flex min-h-16 flex-col gap-3 border-b border-[var(--hh-border)] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-[#62706a]">
              <ShieldCheck size={14} />
              <span className="capitalize">{session.role}</span> workspace
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {action}
            {session.signedIn ? (
              <SignOutButton />
            ) : (
              <Link className="hh-button hh-button-secondary" href="/login">Sign in</Link>
            )}
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-6">{children}</div>
        <Footer />
      </main>
    </div>
  );
}
