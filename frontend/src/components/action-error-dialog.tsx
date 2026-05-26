"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export function ActionErrorDialog({
  open,
  title,
  description = "The requested action was not completed.",
  message,
  onOpenChange
}: {
  open: boolean;
  title: string;
  description?: string;
  message: string;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,520px)] overflow-hidden">
        <div className="border-b border-[var(--hh-border-strong)] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-[#f6d58b] bg-[#fff8e6] text-[#875400]">
              <AlertTriangle size={22} />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-[#3f1d58]">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-[#66736d]">{description}</DialogDescription>
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5">
          <div className="rounded-lg border border-[#f6d58b] bg-[#fff8e6] p-4 text-sm font-semibold leading-6 text-[#875400]">{message}</div>
          <div className="flex justify-end">
            <DialogClose asChild>
              <Button type="button">OK</Button>
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
