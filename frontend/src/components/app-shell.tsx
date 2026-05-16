import { Activity, ClipboardList, HeartPulse, LayoutDashboard, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";

import { MobileSidebar } from "@/components/mobile-sidebar";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Search },
  { href: "/patients/new", label: "Register", icon: UserPlus },
  { href: "/visits", label: "Visits", icon: ClipboardList },
  { href: "/visits/new", label: "Add Visit", icon: HeartPulse },
  { href: "/staff", label: "Staff", icon: Users }
];

export async function AppShell({ children, title, action }: { children: React.ReactNode; title: string; action?: React.ReactNode }) {
  const signedIn = Boolean((await cookies()).get("harmony_access")?.value);
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
        <nav className="grid gap-1 px-3 pb-4 lg:pb-0">
          {navLinks}
        </nav>
      </aside>
      <main>
        <MobileSidebar />

        <header className="flex min-h-16 flex-col gap-3 border-b border-[var(--hh-border)] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-bold">{title}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-[#62706a]">
              <ShieldCheck size={14} />
              Role-based clinical workspace
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {action}
            {signedIn ? (
              <form action="/api/auth/logout" method="post">
                <button className="hh-button hh-button-secondary" type="submit">Sign out</button>
              </form>
            ) : (
              <Link className="hh-button hh-button-secondary" href="/login">Sign in</Link>
            )}
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-5 py-6">{children}</div>
      </main>
    </div>
  );
}
