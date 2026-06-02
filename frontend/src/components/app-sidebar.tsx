"use client";

import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  UserCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type React from "react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAccountMenu } from "@/components/user-account-menu";
import { allowedForRole, navItems } from "@/lib/role-workflows";
import type { UserRole } from "@/lib/session";
import { cn } from "@/lib/utils";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  clinician: "Clinician",
  receptionist: "Receptionist",
  supplier_contact: "Supplier contact",
  supplier_manager: "Supplier manager",
  partner_contact: "Partner contact",
  partner_manager: "Partner manager",
};

export function AppSidebar({
  children,
  avatarUrl,
  name,
  role,
  title,
  signedIn
}: {
  action?: React.ReactNode;
  avatarUrl?: string;
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
    <div className="min-h-screen bg-[#f7faf8]">
      <TopBar avatarUrl={avatarUrl} name={name} onToggle={toggleCollapsed} signedIn={signedIn} title={title} />
      <DesktopSidebar collapsed={collapsed} name={name} role={role} />
      <main className={cn("min-w-0 transition-[margin] duration-200 lg:pt-16", collapsed ? "lg:ml-[76px]" : "lg:ml-[260px]")}>
        <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-6">{children}</div>
      </main>
    </div>
  );
}

function TopBar({
  avatarUrl,
  name,
  onToggle,
  signedIn,
  title
}: {
  avatarUrl?: string;
  name: string;
  onToggle: () => void;
  signedIn: boolean;
  title: string;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 hidden border-b border-[#63258d] bg-[var(--hh-purple)] text-white lg:block">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <Button className="shrink-0 text-white hover:bg-white/10" onClick={onToggle} size="icon" type="button" variant="ghost">
            <Menu size={22} />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <Link href="/" className="flex min-w-0 items-center gap-2 font-bold">
            <img alt="" className="h-7 w-7 rounded-md bg-white object-cover" src="/brand/harmony-icon-sm.webp" />
            <span className="hidden sm:inline">Harmony Health MIS</span>
          </Link>
        </div>

        <div className="hidden min-w-[280px] items-center gap-2 rounded-lg bg-white/12 px-3 py-2 text-sm text-white/90 md:flex">
          <Search size={17} />
          <span className="truncate">Search patients, visits, appointments</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button className="text-white hover:bg-white/10" size="icon" type="button" variant="ghost">
            <Bell size={19} />
            <span className="sr-only">Notifications</span>
          </Button>
          {signedIn ? (
            <UserAccountMenu avatarUrl={avatarUrl} name={name} title={title} />
          ) : (
            <Link
              aria-label="Sign in"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-[var(--hh-purple)] ring-1 ring-white/25 hover:bg-[#f7f0fb]"
              href="/login"
              title="Sign in"
            >
              <img alt="" className="h-9 w-9 rounded-md object-cover" src="/brand/harmony-icon-sm.webp" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function DesktopSidebar({ collapsed, name, role }: { collapsed: boolean; name: string; role: UserRole }) {
  const pathname = usePathname();
  const nav = allowedForRole(navItems, role);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-20 hidden border-r border-[var(--hh-border)] bg-white lg:block">
      <div className={cn("flex h-full flex-col transition-all", collapsed ? "w-[76px]" : "w-[260px]")}>
        <div className="border-b border-[var(--hh-border)] p-3">
          {!collapsed ? (
            <>
              <div className="text-xs font-bold uppercase text-[#66736d]">Workspace</div>
              <div className="mt-2 rounded-lg border border-[var(--hh-border)] bg-[#f7faf8] p-3">
                <div className="font-bold text-[var(--hh-purple-dark)]">{roleLabels[role]} dashboard</div>
                <div className="mt-1 text-xs text-[#66736d]">{roleLabels[role]}-based navigation</div>
              </div>
            </>
          ) : (
            <div className="flex h-11 items-center justify-center rounded-lg bg-[#f7f0fb] text-[var(--hh-purple)]">
              <img alt="Harmony Health" className="h-9 w-9 rounded-md object-cover" src="/brand/harmony-icon-sm.webp" />
            </div>
          )}
        </div>

        <TooltipProvider delayDuration={150}>
          <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain p-3 pr-2 [scrollbar-gutter:stable]">
            {nav.map((item) => {
              const Icon = item.icon;
              const children = item.children ? allowedForRole(item.children, role) : [];
              const hasChildren = children.length > 0;
              const childActive = children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href) || childActive;
              const expanded = openGroups[item.href] ?? active;

              if (hasChildren) {
                return (
                  <div key={item.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className={cn(
                            "w-full justify-start gap-3 px-3 text-sm font-bold text-[#24302b] hover:text-[var(--hh-purple)]",
                            active && "bg-[#f7f0fb] text-[var(--hh-purple)]",
                            collapsed && "justify-center px-0"
                          )}
                          onClick={() => setOpenGroups((current) => ({ ...current, [item.href]: !expanded }))}
                          type="button"
                          variant="ghost"
                        >
                          <Icon size={18} />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">{item.label}</span>
                              <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} size={16} />
                            </>
                          )}
                        </Button>
                      </TooltipTrigger>
                      {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                    </Tooltip>

                    {!collapsed && expanded && (
                      <div className="mt-1 grid gap-1 pl-8">
                        {children.map((child) => {
                          const ChildIcon = child.icon;
                          const childCurrent = pathname === child.href || pathname.startsWith(`${child.href}/`);
                          return (
                            <Button
                              key={child.href}
                              asChild
                              className={cn(
                                "w-full justify-start gap-2 px-3 text-xs font-bold text-[#52615a] hover:text-[var(--hh-purple)]",
                                childCurrent && "bg-[#f7f0fb] text-[var(--hh-purple)]"
                              )}
                              variant="ghost"
                            >
                              <Link href={child.href}>
                                <ChildIcon size={15} />
                                <span>{child.label}</span>
                                {child.status === "planned" && <span className="ml-auto text-[10px] uppercase text-[#66736d]">Future</span>}
                              </Link>
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      className={cn(
                        "w-full justify-start gap-3 px-3 text-sm font-bold text-[#24302b] hover:text-[var(--hh-purple)]",
                        active && "bg-[#f7f0fb] text-[var(--hh-purple)]",
                        collapsed && "justify-center px-0"
                      )}
                      variant="ghost"
                    >
                      <Link href={item.href}>
                        <Icon size={18} />
                        {!collapsed && <span>{item.label}</span>}
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                </Tooltip>
              );
            })}
          </nav>
        </TooltipProvider>

        <div className="border-t border-[var(--hh-border)] p-3">
          <Button
            asChild
            className={cn(
              "w-full justify-start gap-3 px-3 text-sm font-bold text-[#24302b]",
              collapsed && "justify-center px-0"
            )}
            variant="ghost"
          >
            <Link href="/account" title={collapsed ? "Account" : undefined}>
              <UserCog size={18} />
              {!collapsed && <span>Account</span>}
            </Link>
          </Button>
          {!collapsed && <div className="mt-2 truncate px-3 text-xs text-[#66736d]">{name}</div>}
        </div>
      </div>
    </aside>
  );
}
