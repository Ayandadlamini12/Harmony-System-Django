"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { 
  LifeBuoy, 
  Search, 
  CheckCircle2, 
  Clock, 
  Mail, 
  Eye,
  Check
} from "lucide-react";
import { toast } from "sonner";

import { TablePagination } from "@/components/table-pagination";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/harmony-loading";
import { ZulipCoordinationCard } from "@/components/zulip-coordination-card";
import type { Paginated, SupportTicket } from "@/types/clinic";

interface TicketsClientProps {
  initialTickets: Paginated<SupportTicket>;
  currentStatus: "open" | "resolved";
  currentSearch: string;
}

export function TicketsClient({ initialTickets, currentStatus, currentSearch }: TicketsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = useState(currentSearch);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  
  // Selected ticket for the details dialog
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(window.location.search);
    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset page on new search
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleStatusChange = (status: "open" | "resolved") => {
    const params = new URLSearchParams(window.location.search);
    params.set("status", status);
    params.set("page", "1"); // Reset page on status switch
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleResolveTicket = async (ticketId: number) => {
    setLoadingId(ticketId);
    try {
      const response = await fetch(`/api/support-tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        toast.success(`Ticket #${ticketId} resolved successfully!`);
        router.refresh();
        // If the detail dialog is currently viewing this ticket, update its status
        if (selectedTicket && selectedTicket.id === ticketId) {
          setSelectedTicket({ ...selectedTicket, status: "resolved" });
        }
      } else {
        toast.error(data.error || "Could not resolve the ticket.");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred.");
    } finally {
      setLoadingId(null);
    }
  };

  const openTicketDetails = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setViewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel with Stats & Status Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-[#c7d7cd] p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          {/* Status Tabs */}
          <div className="inline-flex rounded-lg border border-[#c7d7cd] bg-slate-50/50 p-1">
            <button
              onClick={() => handleStatusChange("open")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                currentStatus === "open"
                  ? "bg-[var(--hh-purple)] text-white shadow-sm cursor-pointer"
                  : "text-[#53605a] hover:bg-slate-100 hover:text-[var(--hh-purple)] cursor-pointer"
              }`}
            >
              <Clock size={14} />
              Open Tickets
            </button>
            <button
              onClick={() => handleStatusChange("resolved")}
              className={`flex items-center gap-2 rounded-md px-3.5 py-1.5 text-xs font-bold transition-all ${
                currentStatus === "resolved"
                  ? "bg-[#225c2c] text-white shadow-sm cursor-pointer"
                  : "text-[#53605a] hover:bg-slate-100 hover:text-[#225c2c]"
              }`}
            >
              <CheckCircle2 size={14} />
              Resolved Tickets
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              className="hh-input pr-16 h-9 text-xs"
              placeholder="Search by title, description, submitter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {currentSearch && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  const params = new URLSearchParams(window.location.search);
                  params.delete("search");
                  params.set("page", "1");
                  router.push(`${pathname}?${params.toString()}`);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#225c2c] hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <button type="submit" className="hh-button min-h-[2.25rem] h-9 px-4 py-0 text-xs bg-[#225c2c] hover:bg-[#1a4a22] cursor-pointer">
            <Search size={14} />
            Search
          </button>
        </form>
      </div>

      {/* Main Panel with Tickets Table */}
      <div className="hh-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="hh-compact-table w-full text-left">
            <thead>
              <tr>
                <th className="w-16 text-center">ID</th>
                <th className="w-40">Created At</th>
                <th>Issue Details</th>
                <th className="w-64">Submitted By</th>
                <th className="w-28 text-center">Status</th>
                <th className="w-44 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialTickets.results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-sm text-[#66736d]">
                    No {currentStatus} support tickets found.
                  </td>
                </tr>
              ) : (
                initialTickets.results.map((ticket) => (
                  <tr key={ticket.id} className="cursor-pointer" onClick={() => openTicketDetails(ticket)}>
                    <td className="text-center font-mono font-bold text-[var(--hh-purple)]">
                      #{ticket.id}
                    </td>
                    <td className="text-[#66736d] whitespace-nowrap">
                      {new Date(ticket.created_at).toLocaleDateString()} at{" "}
                      {new Date(ticket.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td>
                      <div className="font-bold text-[var(--hh-purple-dark)] line-clamp-1">
                        {ticket.title}
                      </div>
                      <div className="text-[11px] text-[#66736d] line-clamp-1 mt-0.5">
                        {ticket.description}
                      </div>
                    </td>
                    <td>
                      <div className="font-bold text-[#24302b]">
                        {ticket.created_by_name || ticket.created_by_username || "Unknown Submitter"}
                      </div>
                      {ticket.created_by_email && (
                        <div className="text-[11px] text-[#66736d] flex items-center gap-1 mt-0.5 font-mono">
                          <Mail size={10} className="shrink-0 text-slate-400" />
                          {ticket.created_by_email}
                        </div>
                      )}
                    </td>
                    <td className="text-center" onClick={(e) => e.stopPropagation()}>
                      {ticket.status === "resolved" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] border border-[#cce4d1] px-2.5 py-0.5 text-xs font-bold text-[#2E7D32]">
                          <CheckCircle2 size={12} />
                          Resolved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                          <Clock size={12} />
                          Open
                        </span>
                      )}
                    </td>
                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs font-semibold text-[var(--hh-purple)] hover:bg-[var(--hh-purple-light)]"
                          onClick={() => openTicketDetails(ticket)}
                        >
                          <Eye size={13} className="mr-1" />
                          View
                        </Button>
                        {ticket.status === "open" && (
                          <LoadingButton
                            variant="secondary"
                            size="sm"
                            loading={loadingId === ticket.id}
                            loadingText="Resolving..."
                            className="h-7 px-2.5 text-xs font-bold border-green-200 bg-green-50 text-[#225c2c] hover:bg-[#e6f7e9]"
                            onClick={() => handleResolveTicket(ticket.id)}
                          >
                            <Check size={13} className="mr-1" />
                            Resolve
                          </LoadingButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Section */}
        <TablePagination count={initialTickets.count} pageSize={12} />
      </div>

      {/* Ticket Detail Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="w-[min(92vw,600px)] p-0 overflow-hidden">
          {selectedTicket && (
            <div className="flex flex-col">
              {/* Dialog Header */}
              <div className="border-b border-[var(--hh-border)] bg-[#fdfdfd] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--hh-border)] bg-[var(--hh-purple-light)] text-[var(--hh-purple)]">
                      <LifeBuoy size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--hh-purple)] bg-[var(--hh-purple-light)] px-1.5 py-0.5 rounded">
                          Ticket #{selectedTicket.id}
                        </span>
                        {selectedTicket.status === "resolved" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] border border-[#cce4d1] px-2 py-0.5 text-[11px] font-bold text-[#2E7D32]">
                            <CheckCircle2 size={10} />
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                            <Clock size={10} />
                            Open
                          </span>
                        )}
                      </div>
                      <DialogTitle className="text-base font-bold text-[var(--hh-purple-dark)] mt-1.5">
                        {selectedTicket.title}
                      </DialogTitle>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dialog Content */}
              <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                {/* Meta details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-100 p-3.5 rounded-lg text-xs leading-relaxed text-[#5c6a61]">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Submitted By</div>
                    <div className="font-bold text-[#24302b] text-[13px]">
                      {selectedTicket.created_by_name || selectedTicket.created_by_username || "Unknown"}
                    </div>
                    {selectedTicket.created_by_email && (
                      <div className="text-slate-500 font-mono mt-0.5">{selectedTicket.created_by_email}</div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">Timestamps</div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-500">Created:</span>
                      <span className="font-semibold text-[#24302b]">
                        {new Date(selectedTicket.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-slate-500">Last updated:</span>
                      <span className="font-semibold text-[#24302b]">
                        {new Date(selectedTicket.updated_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Main Issue Description */}
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-[#3f1d58] uppercase tracking-wider">Issue Description</div>
                  <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-[#2b2f38] whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto font-sans shadow-inner">
                    {selectedTicket.description}
                  </div>
                </div>

                {/* Zulip Contextual Coordination Surface */}
                <div className="space-y-1.5 pt-2">
                  <div className="text-xs font-bold text-[#3f1d58] uppercase tracking-wider">Zulip Contextual Coordination</div>
                  <ZulipCoordinationCard
                    channel="system-support"
                    topic={`TICKET | SUPPORT-${selectedTicket.id}`}
                    linkedEntityType="ticket"
                    linkedEntityId={selectedTicket.id}
                    linkedEntityName={selectedTicket.title}
                    userRole="admin"
                  />
                </div>
              </div>

              {/* Dialog Footer Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-[#fdfdfd] border-t border-[var(--hh-border)] px-6 py-4">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" className="text-sm font-semibold cursor-pointer">
                    Close
                  </Button>
                </DialogClose>
                {selectedTicket.status === "open" && (
                  <LoadingButton
                    type="button"
                    loading={loadingId === selectedTicket.id}
                    loadingText="Resolving..."
                    className="bg-green-700 hover:bg-green-800 text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    onClick={async () => {
                      await handleResolveTicket(selectedTicket.id);
                      setViewDialogOpen(false);
                    }}
                  >
                    <Check size={15} />
                    Resolve Ticket
                  </LoadingButton>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
