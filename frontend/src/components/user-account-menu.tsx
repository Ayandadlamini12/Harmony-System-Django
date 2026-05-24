"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { KeyRound, Laptop, LogOut, UserCog } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

type UserAccountMenuProps = {
  avatarUrl?: string;
  name: string;
  title: string;
};

export function UserAccountMenu({ avatarUrl, name, title }: UserAccountMenuProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const itemClass = "flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-[#24302b] outline-none hover:bg-[#f7f0fb] focus:bg-[#f7f0fb]";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label={`${name || title} account menu`}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-[var(--hh-purple)] ring-1 ring-white/25 hover:bg-[#f7f0fb]"
          title={name || title}
          type="button"
        >
          <img alt="" className="h-9 w-9 rounded-md object-cover" src={avatarUrl || "/brand/harmony-icon-sm.webp"} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          className="z-50 w-72 rounded-lg border border-[var(--hh-border)] bg-white p-2 text-[#24302b] shadow-xl"
          sideOffset={8}
        >
          <div className="border-b border-[var(--hh-border)] px-3 py-3">
            <div className="truncate text-sm font-bold">{name || title}</div>
            <div className="mt-1 text-xs text-[#66736d]">Account settings</div>
          </div>

          <DropdownMenu.Item asChild>
            <Link className={itemClass} href="/account/profile">
              <UserCog size={17} /> Profile settings
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link className={itemClass} href="/account/password">
              <KeyRound size={17} /> Password management
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={cn(itemClass, "cursor-not-allowed text-[#8a9690] hover:bg-transparent focus:bg-transparent")}
            disabled
          >
            <Laptop size={17} /> Device management
            <span className="ml-auto rounded-full bg-[#f1f4f2] px-2 py-0.5 text-[10px] font-bold uppercase text-[#66736d]">Future</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-2 h-px bg-[var(--hh-border)]" />

          <DropdownMenu.Item
            className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-[#8a1f1f] outline-none hover:bg-red-50 focus:bg-red-50"
            disabled={signingOut}
            onSelect={(event) => {
              event.preventDefault();
              void signOut();
            }}
          >
            <LogOut size={17} /> {signingOut ? "Signing out..." : "Sign out"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
