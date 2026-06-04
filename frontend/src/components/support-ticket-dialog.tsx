"use client";

import { LifeBuoy, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

import { LoadingButton } from "@/components/harmony-loading";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SupportTicketDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setOpen = controlledOnOpenChange !== undefined ? controlledOnOpenChange : setUncontrolledOpen;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/support-tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success("Support ticket opened successfully!");
        setSuccess(true);
        setTitle("");
        setDescription("");
        router.refresh();
      } else {
        setError(data.error || "Could not open support ticket.");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    // Reset success/error state shortly after closing to avoid jarring visual jumps
    setTimeout(() => {
      setSuccess(false);
      setError(null);
    }, 200);
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        handleClose();
      } else {
        setOpen(true);
      }
    }}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="secondary" type="button" className="flex items-center gap-2">
            <LifeBuoy size={16} />
            Contact Support
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="w-[min(92vw,500px)] p-0 overflow-hidden">
        {success ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-11 items-center justify-center rounded-lg bg-[var(--hh-green-light)] text-[var(--hh-green-dark)] mb-4">
              <CheckCircle2 size={32} />
            </div>
            <DialogTitle className="text-xl font-bold text-[var(--hh-purple-dark)]">Ticket Opened Successfully!</DialogTitle>
            <DialogDescription className="mt-2 text-sm text-[#5c6a61]">
              We have received your issue. Our systems administrator is reviewing it and will assist you shortly.
            </DialogDescription>
            <div className="mt-6 flex justify-end w-full">
              <Button type="button" onClick={handleClose} className="w-full sm:w-auto bg-[var(--hh-purple)] text-white hover:bg-[var(--hh-purple-dark)]">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="border-b border-[var(--hh-border)] bg-[#fdfdfd] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--hh-border)] bg-[var(--hh-purple-light)] text-[var(--hh-purple)]">
                  <LifeBuoy size={20} />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[var(--hh-purple-dark)]">Open a Support Ticket</DialogTitle>
                  <DialogDescription className="text-xs text-[#66736d] mt-0.5">
                    Describe your issue, and our systems team will resolve it.
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6">
              {error && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-[#3f1d58]">Issue Title</span>
                <Input
                  className="hh-input h-10 text-sm border-[var(--hh-border)] focus:border-[var(--hh-purple)] focus:ring-1 focus:ring-[var(--hh-purple)]"
                  placeholder="e.g. Patient profile photo not uploading"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={loading}
                  required
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-[#3f1d58]">Description</span>
                <Textarea
                  className="min-h-32 text-sm border-[var(--hh-border)] focus:border-[var(--hh-purple)] focus:ring-1 focus:ring-[var(--hh-purple)] leading-relaxed resize-none"
                  placeholder="Describe exactly what happened, when it occurred, and any steps to reproduce the issue..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                  required
                />
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-[#fdfdfd] border-t border-[var(--hh-border)] px-6 py-4">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={loading} className="text-sm font-semibold">
                Cancel
              </Button>
              <LoadingButton type="submit" loading={loading} loadingText="Opening ticket..." className="bg-[var(--hh-purple)] text-white hover:bg-[var(--hh-purple-dark)] flex items-center justify-center gap-2">
                {!loading && <Send size={15} />}
                Submit Ticket
              </LoadingButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
