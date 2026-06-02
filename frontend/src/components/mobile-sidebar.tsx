"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { allowedForRole, navItems } from "@/lib/role-workflows";
import type { UserRole } from "@/lib/session";
import { cn } from "@/lib/utils";

function SidebarContent({ name, role, onNavigate }: { name: string; role: UserRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const nav = allowedForRole(navItems, role);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--hh-purple-dark)] text-white">
      <div className="flex h-16 shrink-0 items-center gap-3 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/12">
          <img alt="" className="h-9 w-9 rounded-md object-cover" src="/brand/harmony-icon-sm.webp" />
        </div>
        <div>
          <div className="font-bold">Harmony Health</div>
          <div className="text-xs text-white/70">Clinic system</div>
        </div>
      </div>
      <div className="mx-3 mb-3 shrink-0 rounded-lg bg-white/8 px-3 py-3">
        <div className="text-sm font-bold">{name}</div>
        <div className="mt-1 text-xs capitalize text-white/65">{role} workspace</div>
      </div>
      <nav className="grid min-h-0 flex-1 gap-1 overflow-y-auto overscroll-contain px-3 pb-5 pr-2 [scrollbar-gutter:stable]">
        {nav.map((item) => {
          const Icon = item.icon;
          const children = item.children ? allowedForRole(item.children, role) : [];
          const hasChildren = children.length > 0;
          const childActive = children.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`));
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href) || childActive;
          if (hasChildren) {
            return (
              <details key={item.href} className="rounded-lg" open={active}>
                <summary
                  className={cn(
                    "flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/82 transition-colors hover:bg-white/10 [&::-webkit-details-marker]:hidden",
                    active && "bg-white/14 text-white"
                  )}
                >
                  <Icon size={18} />
                  <span className="flex-1">{item.label}</span>
                  <ChevronDown size={16} />
                </summary>
                <div className="mt-1 grid gap-1 pl-7">
                  {children.map((child) => {
                    const ChildIcon = child.icon;
                    const childCurrent = pathname === child.href || pathname.startsWith(`${child.href}/`);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white/75 transition-colors hover:bg-white/10",
                          childCurrent && "bg-white/14 text-white"
                        )}
                      >
                        <ChildIcon size={15} />
                        {child.label}
                        {child.status === "planned" && <span className="ml-auto text-[10px] uppercase text-white/55">Future</span>}
                      </Link>
                    );
                  })}
                </div>
              </details>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/82 transition-colors hover:bg-white/10",
                active && "bg-white/14 text-white"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function MobileSidebar({ name, role }: { name: string; role: UserRole }) {
  return (
    <Sheet>
      <div className="flex h-16 items-center justify-between border-b border-[var(--hh-border)] bg-white px-4 lg:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--hh-purple)] text-white">
            <img alt="" className="h-9 w-9 rounded-md object-cover" src="/brand/harmony-icon-sm.webp" />
          </div>
          <div>
            <div className="font-bold">Harmony Health</div>
            <div className="text-xs text-[#66736d]">Clinic system</div>
          </div>
        </div>
        <SheetTrigger asChild>
          <Button size="icon" type="button" variant="secondary">
            <Menu size={21} />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
      </div>

      <SheetContent className="lg:hidden overflow-hidden">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <SheetClose className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white">
          <X size={18} />
          <span className="sr-only">Close menu</span>
        </SheetClose>
        <SidebarContent name={name} role={role} />
      </SheetContent>
    </Sheet>
  );
}
