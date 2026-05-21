"use client";

import {
  Activity,
  Bell,
  CalendarCheck,
  FileText,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Package,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  UserCog,
  Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

import { allowedForRole, type NavItem } from "@/lib/role-workflows";
import type { UserRole } from "@/lib/session";
import { cn } from "@/lib/utils";

export function AppSidebar({
  action,
  children,
  name,
  role,
  title,
  signedIn,
  signOut
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  name: string;
  role: UserRole;
  title: string;
  signedIn: boolean;
  signOut: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("harmony-sidebar-collapsed");
    if (saved) setCollapsed(saved === "true");
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      window.localStorage.setItem("harmony-sidebar-collapsed", String(!current));
      return !current;
    });
  }

  return (
    <div className={cn("min-h-screen bg-[#f7faf8] lg:grid", collapsed ? "lg:grid-cols-[76px_1fr]" : "lg:grid-cols-[260px_1fr]")}>
      <TopBar action={action} name={name} onToggle={toggleCollapsed} signedIn={signedIn} signOut={signOut} title={title} />
      <DesktopSidebar collapsed={collapsed} name={name} role={role} />
      <main className="min-w-0 lg:pt-16">
        <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6">{children}</div>
      </main>
    </div>
  );
}

function TopBar({
  action,
  name,
  onToggle,
  signedIn,
  signOut,
  title
}: {
  action?: React.ReactNode;
  name: string;
  onToggle: () => void;
  signedIn: boolean;
  signOut: React.ReactNode;
  title: string;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 hidden border-b border-[#63258d] bg-[var(--hh-purple)] text-white lg:block">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10"
            onClick={onToggle}
            type="button"
          >
            <Menu size={22} />
            <span className="sr-only">Toggle sidebar</span>
          </button>
          <Link href="/" className="flex min-w-0 items-center gap-2 font-bold">
            <Activity size={22} />
            <span className="hidden sm:inline">Harmony Health MIS</span>
          </Link>
        </div>

        <div className="hidden min-w-[280px] items-center gap-2 rounded-lg bg-white/12 px-3 py-2 text-sm text-white/90 md:flex">
          <Search size={17} />
          <span className="truncate">Search patients, visits, appointments</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white hover:bg-white/10" type="button">
            <Bell size={19} />
            <span className="sr-only">Notifications</span>
          </button>
          {action}
          {signedIn ? (
            <div className="hidden sm:block">{signOut}</div>
          ) : (
            <Link className="hh-button hh-button-secondary" href="/login">Sign in</Link>
          )}
          <div className="hidden min-h-10 items-center rounded-lg bg-white/12 px-3 text-sm font-bold sm:inline-flex">{name || title}</div>
        </div>
      </div>
    </header>
  );
}

function DesktopSidebar({ collapsed, name, role }: { collapsed: boolean; name: string; role: UserRole }) {
  const pathname = usePathname();
  const nav = allowedForRoleSidebar(role);

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-20 hidden border-r border-[var(--hh-border)] bg-white lg:block">
      <div className={cn("flex h-full flex-col transition-all", collapsed ? "w-[76px]" : "w-[260px]")}>
        <div className="border-b border-[var(--hh-border)] p-3">
          {!collapsed ? (
            <>
              <div className="text-xs font-bold uppercase text-[#66736d]">Workspace</div>
              <div className="mt-2 rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-3">
                <div className="font-bold text-[var(--hh-purple-dark)]">{role === "clinician" ? "Clinician dashboard" : `${role} dashboard`}</div>
                <div className="mt-1 text-xs capitalize text-[#66736d]">{role}-based navigation</div>
              </div>
            </>
          ) : (
            <div className="flex h-11 items-center justify-center rounded-lg bg-[#f7f0fb] text-[var(--hh-purple)]">
              <Activity size={22} />
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#24302b] hover:bg-[#f7faf8] hover:text-[var(--hh-purple)]",
                  active && "bg-[#f7f0fb] text-[var(--hh-purple)]",
                  collapsed && "justify-center px-0"
                )}
                href={item.href}
                key={item.href}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--hh-border)] p-3">
          <Link
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold text-[#24302b] hover:bg-[#f7faf8]",
              collapsed && "justify-center px-0"
            )}
            href="/account"
            title={collapsed ? "Profile & account" : undefined}
          >
            <UserCog size={18} />
            {!collapsed && <span>Profile & account</span>}
          </Link>
          {!collapsed && <div className="mt-2 truncate px-3 text-xs text-[#66736d]">{name}</div>}
        </div>
      </div>
    </aside>
  );
}

function allowedForRoleSidebar(role: UserRole): NavItem[] {
  return allowedForRole(
    [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "clinician", "receptionist"] },
      { href: "/patients", label: "Patients", icon: Users, roles: ["admin", "clinician", "receptionist"] },
      { href: "/visits", label: "Visits", icon: Stethoscope, roles: ["admin", "clinician"] },
      { href: "/appointments", label: "Appointments", icon: CalendarCheck, roles: ["admin", "clinician", "receptionist"] },
      { href: "/approvals", label: "Approvals", icon: ShieldCheck, roles: ["admin", "clinician"] },
      { href: "/messages", label: "Messages", icon: MessageSquare, roles: ["admin", "clinician", "receptionist"] },
      { href: "/inventory", label: "Inventory", icon: Package, roles: ["admin", "clinician"] },
      { href: "/reports", label: "Reports", icon: FileText, roles: ["admin", "clinician"] },
      { href: "/users", label: "Users", icon: UserCog, roles: ["admin"] },
      { href: "/account", label: "Settings", icon: Settings, roles: ["admin", "clinician", "receptionist"] }
    ] satisfies NavItem[],
    role
  );
}
