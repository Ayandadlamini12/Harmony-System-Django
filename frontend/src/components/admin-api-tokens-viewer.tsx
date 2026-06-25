"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  KeyRound,
  Search,
  Plus,
  Clock,
  User,
  Copy,
  Check,
  CheckCircle2,
  Calendar,
  Edit,
  ShieldAlert,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ApiToken, ApiTokenSummary } from "@/types/clinic";

function formatDateTime(text?: string | null) {
  if (!text) return "Never";
  try {
    return new Intl.DateTimeFormat("en", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(text));
  } catch {
    return "Invalid Date";
  }
}

export function AdminApiTokensViewer() {
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [summary, setSummary] = useState<ApiTokenSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination States
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "expired" | "revoked">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [ordering, setOrdering] = useState("-created_at");
  const [count, setCount] = useState(0);

  // Modals & Forms
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<ApiToken | null>(null);

  // Create Form fields
  const [createName, setCreateName] = useState("");
  const [createNotes, setCreateNotes] = useState("");
  const [createScopes, setCreateScopes] = useState<string[]>([]);
  const [createExpiryType, setCreateExpiryType] = useState<"30" | "90" | "365" | "never" | "custom">("90");
  const [createCustomExpiry, setCreateCustomExpiry] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit Form fields
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editScopes, setEditScopes] = useState<string[]>([]);
  const [editExpiryType, setEditExpiryType] = useState<"no-change" | "never" | "custom">("no-change");
  const [editCustomExpiry, setEditCustomExpiry] = useState("");
  const [updating, setUpdating] = useState(false);

  // Creation Plaintext Token Secure Drawer
  const [newPlaintextToken, setNewPlaintextToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [acknowledgedCopy, setAcknowledgedCopy] = useState(false);

  // Revocation fields
  const [revoking, setRevoking] = useState(false);

  // Fetch token list and count summaries
  const fetchSummary = useCallback(async () => {
    try {
      const response = await fetch("/api/system/api-tokens/summary");
      if (response.ok) {
        const data = await response.json();
        setSummary(data);
      }
    } catch (err) {
      console.error("Failed to fetch API token summary", err);
    }
  }, []);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (search) query.set("search", search);
      if (status !== "all") query.set("status", status);
      query.set("page", String(page));
      query.set("page_size", String(pageSize));
      query.set("ordering", ordering);

      const response = await fetch(`/api/system/api-tokens?${query.toString()}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to fetch API tokens.");
      }
      const data = await response.json();
      setTokens(data.results || []);
      setCount(data.count || 0);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [search, status, page, pageSize, ordering]);

  useEffect(() => {
    fetchTokens();
    fetchSummary();
  }, [fetchTokens, fetchSummary]);

  // Reset pagination helper
  const handleFilterChange = (newStatus: "all" | "active" | "expired" | "revoked") => {
    setStatus(newStatus);
    setPage(1);
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const totalPages = Math.ceil(count / pageSize) || 1;

  // Create API Token Submit
  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setNewPlaintextToken(null);
    setCopiedToken(false);
    setAcknowledgedCopy(false);

    try {
      let expires_at: string | null = null;
      if (createExpiryType !== "never") {
        if (createExpiryType === "custom") {
          expires_at = createCustomExpiry ? new Date(createCustomExpiry).toISOString() : null;
        } else {
          const days = parseInt(createExpiryType, 10);
          const date = new Date();
          date.setDate(date.getDate() + days);
          expires_at = date.toISOString();
        }
      }

      const response = await fetch("/api/system/api-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          notes: createNotes,
          scopes: createScopes,
          expires_at
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to generate token.");
      }

      const data = await response.json();
      setNewPlaintextToken(data.token);
      
      // Refresh list & summary
      fetchTokens();
      fetchSummary();
    } catch (err: any) {
      alert(err.message || "Failed to create token");
    } finally {
      setCreating(false);
    }
  };

  // Pre-fill Edit Modal
  const openEditModal = (token: ApiToken) => {
    setSelectedToken(token);
    setEditName(token.name);
    setEditNotes(token.notes || "");
    setEditScopes(token.scopes);
    setEditExpiryType("no-change");
    setEditCustomExpiry("");
    setIsEditOpen(true);
  };

  // Submit PATCH Token Update
  const handleEditToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedToken) return;
    setUpdating(true);

    try {
      let expires_at = selectedToken.expires_at;
      if (editExpiryType === "never") {
        expires_at = null;
      } else if (editExpiryType === "custom") {
        expires_at = editCustomExpiry ? new Date(editCustomExpiry).toISOString() : null;
      }

      const response = await fetch(`/api/system/api-tokens/${selectedToken.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          notes: editNotes,
          scopes: editScopes,
          expires_at
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to update token.");
      }

      setIsEditOpen(false);
      fetchTokens();
      fetchSummary();
    } catch (err: any) {
      alert(err.message || "Failed to update token.");
    } finally {
      setUpdating(false);
    }
  };

  // Submit POST Revoke Token
  const handleRevokeToken = async () => {
    if (!selectedToken) return;
    setRevoking(true);

    try {
      const response = await fetch(`/api/system/api-tokens/${selectedToken.id}/revoke`, {
        method: "POST"
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to revoke token.");
      }

      setIsRevokeOpen(false);
      fetchTokens();
      fetchSummary();
    } catch (err: any) {
      alert(err.message || "Failed to revoke token.");
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = (val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Close creation modal flow
  const closeCreateFlow = () => {
    setIsCreateOpen(false);
    setCreateName("");
    setCreateNotes("");
    setCreateScopes([]);
    setCreateExpiryType("90");
    setCreateCustomExpiry("");
    setNewPlaintextToken(null);
    setCopiedToken(false);
    setAcknowledgedCopy(false);
  };

  // Helper for scope styling colors
  const getScopeVariant = (scope: string): "default" | "success" | "harmony" | "warning" | "outline" => {
    switch (scope) {
      case "read": return "success";
      case "write": return "harmony";
      case "audit_read": return "default";
      case "calendar_sync": return "outline";
      case "n8n": return "warning";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Total Tokens Card */}
        <div className="rounded-xl border border-[var(--hh-border)] bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#66736d] uppercase">Total Keys</span>
            <div className="rounded-md bg-[#f7faf8] p-1.5 text-[#53605a]">
              <KeyRound size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-extrabold tracking-tight text-[#24302b]">
              {summary ? summary.total : <Loader2 className="animate-spin text-slate-400" size={18} />}
            </span>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">System configured tokens</p>
          </div>
        </div>

        {/* Active Tokens Card */}
        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#66736d] uppercase">Active</span>
            <div className="rounded-md bg-emerald-50 p-1.5 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-extrabold tracking-tight text-emerald-700">
              {summary ? summary.active : <Loader2 className="animate-spin text-slate-400" size={18} />}
            </span>
            <p className="text-[10px] text-emerald-600/80 font-semibold mt-1">Currently valid & active</p>
          </div>
        </div>

        {/* Expired Tokens Card */}
        <div className="rounded-xl border border-amber-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#66736d] uppercase">Expired</span>
            <div className="rounded-md bg-amber-50 p-1.5 text-amber-600">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-extrabold tracking-tight text-amber-700">
              {summary ? summary.expired : <Loader2 className="animate-spin text-slate-400" size={18} />}
            </span>
            <p className="text-[10px] text-amber-600/80 font-semibold mt-1">Past their expiry date</p>
          </div>
        </div>

        {/* Revoked Tokens Card */}
        <div className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#66736d] uppercase">Revoked</span>
            <div className="rounded-md bg-rose-50 p-1.5 text-rose-600">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="mt-2.5">
            <span className="text-2xl font-extrabold tracking-tight text-rose-700">
              {summary ? summary.revoked : <Loader2 className="animate-spin text-slate-400" size={18} />}
            </span>
            <p className="text-[10px] text-rose-600/80 font-semibold mt-1">Manually revoked keys</p>
          </div>
        </div>
      </div>

      {/* Control Bar: Search and Status Badges */}
      <div className="rounded-xl border border-[var(--hh-border-strong)] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          
          {/* Status Segment Filters */}
          <div className="flex flex-wrap gap-1.5">
            {(["all", "active", "expired", "revoked"] as const).map((s) => {
              const isActive = status === s;
              return (
                <button
                  key={s}
                  onClick={() => handleFilterChange(s)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all capitalize border ${
                    isActive
                      ? "bg-[var(--hh-purple)] text-white border-[var(--hh-purple)] shadow-sm"
                      : "bg-white text-[#53605a] border-[var(--hh-border)] hover:bg-[#f7faf8] hover:text-[#24302b]"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>

          {/* Search bar and Create Button */}
          <div className="flex flex-1 max-w-lg items-center gap-2 md:justify-end md:ml-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#53605a]" />
              <input
                type="text"
                placeholder="Search by key name or prefix..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-[#fcfdfe] border border-[var(--hh-border)] rounded-lg outline-none focus:border-[var(--hh-purple)] focus:ring-1 focus:ring-[#d1abe7] transition-all"
              />
            </div>

            <Button onClick={() => setIsCreateOpen(true)} className="gap-1.5 font-bold shrink-0">
              <Plus size={16} />
              <span>Generate Key</span>
            </Button>
          </div>

        </div>
      </div>

      {/* Token List Table / Loading State */}
      <div className="rounded-xl border border-[var(--hh-border)] bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="animate-spin text-[var(--hh-purple)]" size={32} />
            <span className="text-sm font-semibold">Loading API tokens database...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-rose-600 gap-2 px-4">
            <ShieldAlert size={36} />
            <span className="text-sm font-bold text-center">{error}</span>
            <Button variant="secondary" size="sm" onClick={() => fetchTokens()} className="mt-2">
              Retry Connection
            </Button>
          </div>
        ) : tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#53605a] gap-2 px-4 text-center">
            <div className="rounded-full bg-slate-50 border border-slate-100 p-4">
              <KeyRound className="text-slate-300" size={36} />
            </div>
            <h3 className="font-bold text-base mt-2 text-[#24302b]">No API Tokens Found</h3>
            <p className="text-xs text-slate-500 max-w-sm">
              {search || status !== "all"
                ? "No matching tokens found. Try adjusting your filters or search terms."
                : "Generate scoped API tokens to allow external clients (e.g. n8n workflows) to securely interact with the clinic MIS."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="hh-compact-table w-full">
              <thead>
                <tr>
                  <th className="text-left w-1/4">Name / Prefix</th>
                  <th className="text-left w-1/4">Allowed Scopes</th>
                  <th className="text-left w-1/5">Status</th>
                  <th className="text-left">Last Used</th>
                  <th className="text-left">Expires At</th>
                  <th className="text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Name / Prefix */}
                    <td>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-extrabold text-[#24302b]">{token.name}</span>
                        <div className="flex items-center gap-1">
                          <code className="text-[11px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded select-all">
                            {token.token_prefix}...
                          </code>
                          {token.notes && (
                            <span className="text-[10px] text-slate-400 font-medium max-w-[200px] truncate" title={token.notes}>
                              — {token.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Scopes */}
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {token.scopes.map((sc) => (
                          <Badge key={sc} variant={getScopeVariant(sc)} className="text-[10px] uppercase tracking-wide px-2 py-0">
                            {sc}
                          </Badge>
                        ))}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      {token.is_revoked ? (
                        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 font-extrabold">
                          Revoked
                        </Badge>
                      ) : token.is_expired ? (
                        <Badge variant="warning" className="font-extrabold">
                          Expired
                        </Badge>
                      ) : token.is_active ? (
                        <Badge variant="success" className="font-extrabold">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="default" className="font-extrabold">
                          Inactive
                        </Badge>
                      )}
                    </td>

                    {/* Last Used */}
                    <td className="text-xs text-slate-500 font-medium">
                      {token.last_used_at ? (
                        <div className="flex flex-col">
                          <span>{formatDateTime(token.last_used_at)}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Never used</span>
                      )}
                    </td>

                    {/* Expires At */}
                    <td className="text-xs text-slate-500 font-semibold">
                      {token.expires_at ? (
                        <span className={token.is_expired ? "text-rose-600" : ""}>
                          {formatDateTime(token.expires_at)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic font-medium">Never</span>
                      )}
                    </td>

                    {/* Actions buttons */}
                    <td className="text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(token)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-[var(--hh-purple)]"
                          title="Edit token settings"
                        >
                          <Edit size={14} />
                        </Button>

                        {!token.is_revoked && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setSelectedToken(token);
                              setIsRevokeOpen(true);
                            }}
                            className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300 px-2.5 py-0 text-xs font-extrabold"
                            title="Revoke access"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / Pagination Controls */}
        {!loading && tokens.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[var(--hh-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between bg-slate-50/50">
            <div className="text-xs font-semibold text-[#53605a]">
              Showing <span className="font-bold text-[#24302b]">{tokens.length}</span> of{" "}
              <span className="font-bold text-[#24302b]">{count}</span> tokens
            </div>

            <div className="flex items-center gap-4 ml-auto">
              {/* Page size select */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#53605a]">Page Size:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-[var(--hh-border)] rounded-md text-xs font-semibold p-1 outline-none text-[#24302b]"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex gap-1.5">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 px-2"
                >
                  <ChevronLeft size={16} />
                </Button>
                <div className="flex items-center text-xs font-bold text-[#24302b] px-2.5">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-8 px-2"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE API TOKEN DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        // Prevent clicking outside or pressing Escape to close if the secure token has been shown but not acknowledged
        if (!open && newPlaintextToken && !acknowledgedCopy) return;
        if (!open) closeCreateFlow();
        else setIsCreateOpen(open);
      }}>
        <DialogContent className="sm:max-w-xl max-h-[94vh] overflow-y-auto">
          {!newPlaintextToken ? (
            // Form Screen
            <form onSubmit={handleCreateToken} className="flex flex-col">
              <div className="border-b border-[var(--hh-border)] p-4 bg-slate-50/50">
                <DialogTitle className="text-lg font-bold text-[#24302b] flex items-center gap-2">
                  <KeyRound className="text-[var(--hh-purple)]" size={20} />
                  Generate API Scoped Token
                </DialogTitle>
                <DialogDescription className="text-xs text-[#53605a] mt-1">
                  Create a unique machine-to-machine key to integrate with third-party software securely.
                </DialogDescription>
              </div>

              <div className="p-5 space-y-4">
                {/* Token Name */}
                <div>
                  <label className="hh-label">Key Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. n8n automation integration"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="hh-input"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Use a descriptive name identifying the consuming client.</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="hh-label">Integration Notes (Optional)</label>
                  <textarea
                    placeholder="e.g. For appointment booking webhooks. Bound to cloud server workflow."
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    className="hh-input min-h-[60px]"
                    rows={2}
                  />
                </div>

                {/* Allowed Scopes */}
                <div>
                  <label className="hh-label">Assign Scopes</label>
                  <div className="mt-1.5 p-3 rounded-lg border border-[var(--hh-border)] bg-slate-50/30 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {summary?.available_scopes.map((sc) => {
                      const isChecked = createScopes.includes(sc.value);
                      return (
                        <label
                          key={sc.value}
                          className="flex items-start gap-2.5 p-2 rounded border border-slate-100 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded accent-[var(--hh-purple)]"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setCreateScopes((curr) => curr.filter((s) => s !== sc.value));
                              } else {
                                setCreateScopes((curr) => [...curr, sc.value]);
                              }
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[#24302b]">{sc.value}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{sc.label}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {createScopes.length === 0 && (
                    <p className="text-[10px] text-rose-500 mt-1 font-bold">Please select at least one scope to authorize access.</p>
                  )}
                </div>

                {/* Expiry Selector */}
                <div>
                  <label className="hh-label">Key Expiration</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <select
                      value={createExpiryType}
                      onChange={(e: any) => setCreateExpiryType(e.target.value)}
                      className="hh-input py-2 text-xs font-semibold"
                    >
                      <option value="30">30 Days</option>
                      <option value="90">90 Days (Recommended)</option>
                      <option value="365">1 Year</option>
                      <option value="never">No Expiration (Permanent)</option>
                      <option value="custom">Custom Date</option>
                    </select>

                    {createExpiryType === "custom" && (
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split("T")[0]}
                        value={createCustomExpiry}
                        onChange={(e) => setCreateCustomExpiry(e.target.value)}
                        className="hh-input py-1.5 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--hh-border)] p-4 flex items-center justify-end gap-2 bg-slate-50/50">
                <Button type="button" variant="secondary" onClick={closeCreateFlow}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating || createScopes.length === 0} className="font-bold min-w-[120px]">
                  {creating ? <Loader2 className="animate-spin" size={16} /> : "Generate Token"}
                </Button>
              </div>
            </form>
          ) : (
            // ONE-TIME plaintext token display secure screen
            <div className="flex flex-col">
              <div className="border-b border-amber-100 p-4 bg-amber-50/50">
                <DialogTitle className="text-lg font-bold text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="text-amber-600 animate-pulse" size={20} />
                  Secure Plaintext Token (View Once)
                </DialogTitle>
                <DialogDescription className="text-xs text-amber-700 mt-1 font-semibold leading-relaxed">
                  IMPORTANT: This token value is stored in the database as a cryptographic hash. It cannot be recovered.
                  We will show this plaintext token **EXACTLY ONCE**. Once closed, it is gone forever.
                </DialogDescription>
              </div>

              <div className="p-5 space-y-4">
                {/* Large Code Block Container */}
                <div className="rounded-lg border-2 border-dashed border-amber-200 bg-slate-950 p-4 shadow-inner relative group select-all">
                  <div className="text-center font-mono font-bold text-sm tracking-widest text-amber-400 break-all select-all py-3 px-1">
                    {newPlaintextToken}
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(newPlaintextToken)}
                    className="absolute top-2.5 right-2.5 rounded bg-slate-800 border border-slate-700 p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                    title="Copy token to clipboard"
                  >
                    {copiedToken ? <Check className="text-emerald-400 animate-scale" size={15} /> : <Copy size={15} />}
                  </button>
                </div>

                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-extrabold text-[#66736d] uppercase">Format Standard</span>
                  <span className="text-[10px] font-semibold text-slate-500">Prefix: <strong className="font-bold">hmis_</strong></span>
                </div>

                {/* Explicit Checklist / Acknowledge */}
                <div className="rounded-lg border border-amber-100 bg-amber-50/30 p-3.5 flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="ack"
                    className="mt-0.5 rounded border-amber-300 accent-amber-600"
                    checked={acknowledgedCopy}
                    onChange={(e) => setAcknowledgedCopy(e.target.checked)}
                  />
                  <label htmlFor="ack" className="text-xs font-bold text-amber-900 leading-normal select-none cursor-pointer">
                    I have copied this API token and saved it in a secure password manager. I acknowledge that I will never be shown this value again.
                  </label>
                </div>
              </div>

              <div className="border-t border-[var(--hh-border)] p-4 flex items-center justify-end bg-slate-50/50">
                <Button
                  onClick={closeCreateFlow}
                  disabled={!acknowledgedCopy}
                  variant={acknowledgedCopy ? "success" : "secondary"}
                  className="font-extrabold min-w-[140px]"
                >
                  Close & Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT API TOKEN DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-xl max-h-[94vh] overflow-y-auto">
          {selectedToken && (
            <form onSubmit={handleEditToken} className="flex flex-col">
              <div className="border-b border-[var(--hh-border)] p-4 bg-slate-50/50">
                <DialogTitle className="text-lg font-bold text-[#24302b] flex items-center gap-2">
                  <Edit className="text-[var(--hh-purple)]" size={18} />
                  Edit API Token Parameters
                </DialogTitle>
                <DialogDescription className="text-xs text-[#53605a] mt-1">
                  Update token identifier details, scopes, or modify/extend expiry dates.
                </DialogDescription>
              </div>

              <div className="p-5 space-y-4">
                {/* Prefix Label */}
                <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 flex items-center justify-between text-xs">
                  <span className="font-bold text-[#53605a]">Key Reference</span>
                  <code className="font-bold bg-white border border-slate-200 px-2 py-0.5 rounded text-[#24302b]">
                    {selectedToken.token_prefix}...
                  </code>
                </div>

                {/* Token Name */}
                <div>
                  <label className="hh-label">Key Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. n8n automation integration"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="hh-input"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="hh-label">Notes (Optional)</label>
                  <textarea
                    placeholder="Describe integration usage rules..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="hh-input min-h-[60px]"
                    rows={2}
                  />
                </div>

                {/* Allowed Scopes */}
                <div>
                  <label className="hh-label">Assign Scopes</label>
                  <div className="mt-1.5 p-3 rounded-lg border border-[var(--hh-border)] bg-slate-50/30 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {summary?.available_scopes.map((sc) => {
                      const isChecked = editScopes.includes(sc.value);
                      return (
                        <label
                          key={sc.value}
                          className="flex items-start gap-2.5 p-2 rounded border border-slate-100 bg-white hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 rounded accent-[var(--hh-purple)]"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setEditScopes((curr) => curr.filter((s) => s !== sc.value));
                              } else {
                                setEditScopes((curr) => [...curr, sc.value]);
                              }
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-[#24302b]">{sc.value}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{sc.label}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  {editScopes.length === 0 && (
                    <p className="text-[10px] text-rose-500 mt-1 font-bold">Please select at least one scope.</p>
                  )}
                </div>

                {/* Expiry Extension Selector */}
                <div>
                  <label className="hh-label">Modify Expiry State</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <select
                      value={editExpiryType}
                      onChange={(e: any) => setEditExpiryType(e.target.value)}
                      className="hh-input py-2 text-xs font-semibold"
                    >
                      <option value="no-change">Preserve Current Expiry</option>
                      <option value="never">Remove Expiration (Permanent)</option>
                      <option value="custom">Set Custom Date</option>
                    </select>

                    {editExpiryType === "custom" && (
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split("T")[0]}
                        value={editCustomExpiry}
                        onChange={(e) => setEditCustomExpiry(e.target.value)}
                        className="hh-input py-1.5 text-xs"
                      />
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                    Current Expiry: <strong className="font-bold text-[#24302b]">{formatDateTime(selectedToken.expires_at)}</strong>
                  </p>
                </div>
              </div>

              <div className="border-t border-[var(--hh-border)] p-4 flex items-center justify-end gap-2 bg-slate-50/50">
                <Button type="button" variant="secondary" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updating || editScopes.length === 0} className="font-bold min-w-[120px]">
                  {updating ? <Loader2 className="animate-spin" size={16} /> : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* REVOKE CONFIRMATION DIALOG */}
      <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <DialogContent className="sm:max-w-md">
          {selectedToken && (
            <div className="flex flex-col">
              <div className="border-b border-rose-100 p-4 bg-rose-50/50">
                <DialogTitle className="text-lg font-bold text-rose-800 flex items-center gap-2">
                  <ShieldAlert className="text-rose-600" size={20} />
                  Revoke API Scoped Key?
                </DialogTitle>
                <DialogDescription className="text-xs text-rose-700 mt-1 font-semibold leading-relaxed">
                  This action is permanent and cannot be undone. Read carefully.
                </DialogDescription>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-sm font-semibold text-[#24302b]">
                  Are you sure you want to revoke access for the token:
                </p>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs flex flex-col gap-1">
                  <div className="font-extrabold text-[#24302b]">{selectedToken.name}</div>
                  <div>Prefix: <code className="font-bold bg-slate-100 px-1">{selectedToken.token_prefix}...</code></div>
                </div>
                <p className="text-xs text-[#53605a] leading-relaxed">
                  Any external scripts, webhooks, or server-to-server workflows (such as n8n or automated messaging)
                  utilizing this token will immediately receive <code className="font-bold text-rose-600 bg-rose-50 px-1 rounded">401 Unauthorized</code> responses and fail.
                </p>
              </div>

              <div className="border-t border-[var(--hh-border)] p-4 flex items-center justify-end gap-2 bg-slate-50/50">
                <Button variant="secondary" onClick={() => setIsRevokeOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleRevokeToken}
                  disabled={revoking}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold min-w-[120px]"
                >
                  {revoking ? <Loader2 className="animate-spin" size={16} /> : "Revoke Access"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
