"use client";

import React, { useState, useTransition } from "react";
import { 
  Building2, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Briefcase,
  Layers,
  Percent,
  CreditCard,
  Eye
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { PartnerCompany, Paginated } from "@/types/clinic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { LoadingButton } from "@/components/harmony-loading";

interface PartnerCompaniesDashboardProps {
  initialCompanies: Paginated<PartnerCompany>;
  userRole: string;
}

export function PartnerCompaniesDashboard({ initialCompanies, userRole }: PartnerCompaniesDashboardProps) {
  const router = useRouter();
  const [companies, setCompanies] = useState<PartnerCompany[]>(initialCompanies.results);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "supplier" | "medical_aid" | "affiliate">("all");
  const [isPending, startTransition] = useTransition();

  // Form Drawer (Dialog) State
  const [formOpen, setFormOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<PartnerCompany | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Field Specific Validation Errors (Direct from DRF)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Read-only Details View State
  const [viewOpen, setViewOpen] = useState(false);
  const [viewingCompany, setViewingCompany] = useState<PartnerCompany | null>(null);

  const handleViewOpen = (company: PartnerCompany) => {
    setViewingCompany(company);
    setViewOpen(true);
  };

  // Form Fields State
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"supplier" | "medical_aid" | "affiliate">("supplier");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  
  // Banking details fields
  const [bankName, setBankName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // Delete Dialog State
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<PartnerCompany | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Open creation form
  const handleCreateOpen = () => {
    setEditingCompany(null);
    setName("");
    setCategory("supplier");
    setAddress("");
    setEmail("");
    setWebsite("");
    setPhoneNumber("");
    setTaxNumber("");
    setBankName("");
    setBranchCode("");
    setAccountHolder("");
    setAccountNumber("");
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  };

  // Open edit form
  const handleEditOpen = (company: PartnerCompany) => {
    setEditingCompany(company);
    setName(company.name || "");
    setCategory(company.category || "supplier");
    setAddress(company.address || "");
    setEmail(company.email || "");
    setWebsite(company.website || "");
    setPhoneNumber(company.phone_number || "");
    setTaxNumber(company.tax_number || "");
    setBankName(company.bank_name || "");
    setBranchCode(company.branch_code || "");
    setAccountHolder(company.account_holder || "");
    setAccountNumber(company.account_number || "");
    setFormError(null);
    setFieldErrors({});
    setFormOpen(true);
  };

  // Save / Update company handler
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Company Legal Name is a required field.");
      return;
    }

    setFormLoading(true);
    setFormError(null);
    setFieldErrors({});

    let websiteUrl = website.trim();
    if (websiteUrl && !/^https?:\/\//i.test(websiteUrl)) {
      websiteUrl = `https://${websiteUrl}`;
    }

    const payload: any = {
      name: name.trim(),
      category,
      address: address.trim(),
      email: email.trim(),
      website: websiteUrl,
      phone_number: phoneNumber.trim(),
      tax_number: taxNumber.trim(),
      bank_name: bankName,
      branch_code: branchCode.trim(),
      account_holder: accountHolder.trim(),
      account_number: accountNumber.trim(),
    };

    // If editing, preserve the original company code
    if (editingCompany) {
      payload.company_code = editingCompany.company_code;
    }

    try {
      const url = editingCompany 
        ? `/api/partner-companies/${editingCompany.public_id}/` 
        : `/api/partner-companies/`;
      
      const method = editingCompany ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(editingCompany 
          ? `Partner company '${name}' updated successfully.` 
          : `Partner company '${name}' registered successfully.`
        );
        setFormOpen(false);
        
        // Refresh server-side state in transition
        startTransition(() => {
          router.refresh();
          fetch("/api/partner-companies/")
            .then(r => r.json())
            .then((resData: Paginated<PartnerCompany>) => {
              if (resData && resData.results) {
                setCompanies(resData.results);
              }
            });
        });
      } else {
        // High-specificity validation errors parser
        if (data && typeof data === "object" && !data.detail) {
          setFieldErrors(data);
          setFormError("Please correct the highlighted errors below.");
        } else {
          let errorMsg = data.detail || data.non_field_errors?.[0];
          if (!errorMsg) {
            const keys = Object.keys(data);
            if (keys.length > 0) {
              errorMsg = `${keys[0].replaceAll("_", " ")}: ${data[keys[0]][0] || data[keys[0]]}`;
            } else {
              errorMsg = "An error occurred while saving the partner company.";
            }
          }
          setFormError(errorMsg);
        }
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected network error occurred.");
    } finally {
      setFormLoading(false);
    }
  };

  // Open deletion modal
  const handleDeleteOpen = (company: PartnerCompany) => {
    setCompanyToDelete(company);
    setDeleteOpen(true);
  };

  // Confirm delete company
  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(`/api/partner-companies/${companyToDelete.public_id}/`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(`Partner company '${companyToDelete.name}' has been successfully deleted.`);
        setDeleteOpen(false);
        setCompanyToDelete(null);

        startTransition(() => {
          router.refresh();
          setCompanies(companies.filter(c => c.public_id !== companyToDelete.public_id));
        });
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.detail || "Unable to delete partner company at this time.");
      }
    } catch {
      toast.error("A network error occurred while deleting the partner company.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Filter list based on search state and active category tab selection
  const filteredCompanies = companies.filter(company => {
    const matchesSearch = 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.company_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.tax_number && company.tax_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.account_number && company.account_number.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || company.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categoryLabels: Record<string, string> = {
    all: "All",
    supplier: "Supplier",
    medical_aid: "Medical Aid",
    affiliate: "Affiliate",
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case "supplier":
        return "bg-purple-100 text-[var(--hh-purple)]";
      case "medical_aid":
        return "bg-emerald-100 text-emerald-800";
      case "affiliate":
        return "bg-sky-100 text-sky-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Actions Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[#66736d]">
            Manage, record, and review clinic partner companies, suppliers, medical aid providers, and clinic affiliates.
          </p>
        </div>
        <Button onClick={handleCreateOpen} className="bg-[var(--hh-purple)] text-white hover:bg-[var(--hh-purple-dark)] flex items-center gap-2">
          <Plus size={16} />
          Add Partner Company
        </Button>
      </div>

      {/* 2. Interactive Search & Categorization Row */}
      <div className="hh-panel p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-[#66736d]">
            <Search size={16} />
          </span>
          <Input 
            className="pl-9 h-10 border-[var(--hh-border)] focus:border-[var(--hh-purple)] focus:ring-1 focus:ring-[var(--hh-purple)] bg-white text-sm" 
            placeholder="Search by ID, name, tax number, or account..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")} 
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category Pill Selectors */}
        <div className="flex flex-wrap gap-1 bg-[#F5EDFA]/60 p-1 rounded-lg border border-[var(--hh-border)]">
          {(["all", "supplier", "medical_aid", "affiliate"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                selectedCategory === cat 
                  ? "bg-white text-[var(--hh-purple)] shadow-sm border border-[var(--hh-border)]" 
                  : "text-[#66736d] hover:text-[var(--hh-purple)]"
              }`}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Directory Tabular View */}
      <div className="hh-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="hh-compact-table w-full text-left">
            <thead>
              <tr>
                <th className="w-32">Company ID</th>
                <th>Company Name</th>
                <th>Category</th>
                <th className="text-right w-36">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((company) => (
                <tr key={company.public_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="font-mono text-xs text-[var(--hh-purple)] font-semibold">
                    {company.company_code}
                  </td>
                  <td>
                    <div className="font-bold text-[var(--hh-purple-dark)]">{company.name}</div>
                    {company.address && (
                      <div className="text-xs text-[#66736d] flex items-center gap-1 mt-0.5 max-w-xs truncate">
                        <MapPin size={11} className="shrink-0" />
                        {company.address}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getCategoryBadgeClass(company.category)}`}>
                      {company.category_label || company.category.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-[#66736d] hover:text-[var(--hh-purple)] hover:bg-[#F5EDFA]/60 rounded-lg"
                        title="View Full Profile"
                        onClick={() => handleViewOpen(company)}
                      >
                        <Eye size={14} />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-[#66736d] hover:text-[var(--hh-purple)] hover:bg-[#F5EDFA]/60 rounded-lg"
                        title="Edit Profile"
                        onClick={() => handleEditOpen(company)}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        title="Delete Record"
                        onClick={() => handleDeleteOpen(company)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCompanies.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-[#66736d] text-sm">
                    No partner companies found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3.5. Read-Only Detailed View Modal */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="w-[min(94vw,640px)] p-0 overflow-hidden">
          <div className="flex flex-col">
            {/* Header */}
            <div className="border-b border-[var(--hh-border)] bg-[#fdfdfd] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--hh-border)] bg-[var(--hh-purple-light)] text-[var(--hh-purple)]">
                  <Building2 size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DialogTitle className="text-base font-bold text-[var(--hh-purple-dark)] truncate">
                      {viewingCompany?.name}
                    </DialogTitle>
                    {viewingCompany && (
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getCategoryBadgeClass(viewingCompany.category)}`}>
                        {viewingCompany.category_label || viewingCompany.category.replaceAll("_", " ")}
                      </span>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-[#66736d] mt-0.5 font-mono">
                    ID: {viewingCompany?.company_code}
                  </DialogDescription>
                </div>
                <DialogClose className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </DialogClose>
              </div>
            </div>

            {/* Content Details Grid */}
            <div className="grid gap-6 p-6 max-h-[64vh] overflow-y-auto">
              
              {/* General & Contacts Details Row */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Contact details Card */}
                <div className="p-4 rounded-xl border border-[var(--hh-border)] bg-gray-50/30 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--hh-purple)] flex items-center gap-1.5">
                    <Phone size={13} /> Contact Information
                  </h4>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-xs text-[#66736d] block mb-0.5">Phone Number</span>
                      {viewingCompany?.phone_number ? (
                        <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                          <Phone size={14} className="text-[#66736d]" />
                          {viewingCompany.phone_number}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None recorded</span>
                      )}
                    </div>

                    <div>
                      <span className="text-xs text-[#66736d] block mb-0.5">Email Address</span>
                      {viewingCompany?.email ? (
                        <a 
                          href={`mailto:${viewingCompany.email}`} 
                          className="font-semibold text-[var(--hh-purple)] hover:underline flex items-center gap-1.5 break-all"
                        >
                          <Mail size={14} className="text-[#66736d]" />
                          {viewingCompany.email}
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">None recorded</span>
                      )}
                    </div>

                    <div>
                      <span className="text-xs text-[#66736d] block mb-0.5">Website Domain</span>
                      {viewingCompany?.website ? (
                        <a 
                          href={viewingCompany.website.startsWith("http") ? viewingCompany.website : `https://${viewingCompany.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-semibold text-sky-700 hover:underline flex items-center gap-1.5 break-all"
                        >
                          <Globe size={14} className="text-[#66736d]" />
                          {viewingCompany.website.replace(/^https?:\/\//i, "")}
                        </a>
                      ) : (
                        <span className="text-gray-400 italic">None recorded</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Physical Location Card */}
                <div className="p-4 rounded-xl border border-[var(--hh-border)] bg-gray-50/30 flex flex-col h-full space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--hh-purple)] flex items-center gap-1.5">
                    <MapPin size={13} /> Physical Address
                  </h4>
                  <div className="flex-1 text-sm bg-white p-3 rounded-lg border border-[var(--hh-border)]/50 text-gray-700 whitespace-pre-line leading-relaxed">
                    {viewingCompany?.address ? (
                      viewingCompany.address
                    ) : (
                      <span className="text-gray-400 italic">No physical address registered for this company.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial & Registry Credentials Card */}
              <div className="p-4 rounded-xl border border-[var(--hh-border)] bg-gray-50/30 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--hh-purple)] flex items-center gap-1.5">
                  <CreditCard size={13} /> Registry & Banking Details
                </h4>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="bg-white p-3 rounded-lg border border-[var(--hh-border)]/50">
                    <span className="text-[10px] uppercase font-bold text-[#66736d] block mb-0.5">Tax Registration (TIN)</span>
                    <span className="text-sm font-semibold font-mono text-gray-800">
                      {viewingCompany?.tax_number || <span className="text-gray-400 italic font-sans font-normal">Not provided</span>}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-[var(--hh-border)]/50">
                    <span className="text-[10px] uppercase font-bold text-[#66736d] block mb-0.5">Bank Institution</span>
                    <span className="text-sm font-semibold text-gray-800 capitalize">
                      {viewingCompany?.bank_name ? viewingCompany.bank_name.replaceAll("_", " ") : <span className="text-gray-400 italic font-sans font-normal">Not provided</span>}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-[var(--hh-border)]/50">
                    <span className="text-[10px] uppercase font-bold text-[#66736d] block mb-0.5">Account Holder Name</span>
                    <span className="text-sm font-semibold text-gray-800 truncate block">
                      {viewingCompany?.account_holder || <span className="text-gray-400 italic font-sans font-normal">Not provided</span>}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-[var(--hh-border)]/50">
                    <span className="text-[10px] uppercase font-bold text-[#66736d] block mb-0.5">Branch Code</span>
                    <span className="text-sm font-semibold font-mono text-gray-800">
                      {viewingCompany?.branch_code || <span className="text-gray-400 italic font-sans font-normal">Not provided</span>}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-[var(--hh-border)]/50 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-[#66736d] block mb-0.5">Bank Account Number</span>
                    <span className="text-base font-bold font-mono text-[var(--hh-purple)]">
                      {viewingCompany?.account_number || <span className="text-gray-400 italic font-sans font-normal text-sm">Not provided</span>}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end bg-[#fdfdfd] border-t border-[var(--hh-border)] px-6 py-4">
              <Button type="button" onClick={() => setViewOpen(false)} className="bg-[var(--hh-purple)] text-white hover:bg-[var(--hh-purple-dark)] text-sm font-semibold">
                Close Profile
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* 4. Slide-over Sheet Drawer (Creation & Edition Form) */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="w-[min(94vw,620px)] p-0 overflow-hidden">
          <form onSubmit={handleSaveCompany} className="flex flex-col">
            <div className="border-b border-[var(--hh-border)] bg-[#fdfdfd] px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--hh-border)] bg-[var(--hh-purple-light)] text-[var(--hh-purple)]">
                  <Building2 size={20} />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[var(--hh-purple-dark)]">
                    {editingCompany ? `Edit '${editingCompany.name}'` : "Add Partner Company"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-[#66736d] mt-0.5">
                    {editingCompany 
                      ? "Update the company profile, categories, financial account keys, and communication metrics." 
                      : "Create a directory file containing legal, financial, and contact identifiers."
                    }
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 max-h-[64vh] overflow-y-auto">
              {formError && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div>{formError}</div>
                </div>
              )}

              {/* Company Name */}
              <div className="grid gap-1.5">
                <span className="text-xs font-bold text-[#3f1d58]">
                  Company Legal Name <span className="text-red-500">*</span>
                </span>
                <Input
                  className={`hh-input h-10 text-sm ${fieldErrors.name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                  placeholder="e.g. Swaziland Pharma Supplies Ltd"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={formLoading}
                  required
                />
                {fieldErrors.name && (
                  <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                    {fieldErrors.name.join(" ")}
                  </span>
                )}
              </div>

              {/* Category and Tax Number Row */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <span className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                    <Layers size={12} />
                    Category <span className="text-red-500">*</span>
                  </span>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    disabled={formLoading}
                    className={`h-10 text-sm bg-white ${fieldErrors.category ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                  >
                    <option value="supplier">Supplier</option>
                    <option value="medical_aid">Medical Aid</option>
                    <option value="affiliate">Affiliate</option>
                  </Select>
                  {fieldErrors.category && (
                    <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                      {fieldErrors.category.join(" ")}
                    </span>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <span className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                    <Percent size={12} />
                    Tax Number
                  </span>
                  <Input
                    className={`hh-input h-10 text-sm ${fieldErrors.tax_number ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="e.g. TIN-100-244-11"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    disabled={formLoading}
                  />
                  {fieldErrors.tax_number && (
                    <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                      {fieldErrors.tax_number.join(" ")}
                    </span>
                  )}
                </div>
              </div>

              {/* Contacts info row */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <span className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                    <Phone size={12} />
                    Phone number
                  </span>
                  <Input
                    className={`hh-input h-10 text-sm ${fieldErrors.phone_number ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="e.g. +268 2404 0000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={formLoading}
                  />
                  {fieldErrors.phone_number && (
                    <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                      {fieldErrors.phone_number.join(" ")}
                    </span>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <span className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                    <Mail size={12} />
                    Email address
                  </span>
                  <Input
                    type="email"
                    className={`hh-input h-10 text-sm ${fieldErrors.email ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="e.g. info@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={formLoading}
                  />
                  {fieldErrors.email && (
                    <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                      {fieldErrors.email.join(" ")}
                    </span>
                  )}
                </div>
              </div>

              {/* Website and Physical Address */}
              <div className="grid gap-1.5">
                <span className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                  <Globe size={12} />
                  Website url
                </span>
                <Input
                  type="text"
                  className={`hh-input h-10 text-sm ${fieldErrors.website ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                  placeholder="e.g. www.swazipharma.sz"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  disabled={formLoading}
                />
                {fieldErrors.website && (
                  <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                    {fieldErrors.website.join(" ")}
                  </span>
                )}
              </div>

              <div className="grid gap-1.5">
                <span className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                  <MapPin size={12} />
                  Physical address
                </span>
                <Textarea
                  className={`h-10 min-h-[40px] text-sm border-[var(--hh-border)] focus:border-[var(--hh-purple)] focus:ring-1 focus:ring-[var(--hh-purple)] leading-normal resize-none py-2 ${
                    fieldErrors.address ? "border-red-500 focus:border-red-500" : ""
                  }`}
                  placeholder="e.g. Suite 4, Plot 12, Gables Mbabane"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={formLoading}
                />
                {fieldErrors.address && (
                  <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                    {fieldErrors.address.join(" ")}
                  </span>
                )}
              </div>

              {/* SECTION: Banking Details (Optional) */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-[var(--hh-border)]" />
                </div>
                <div className="relative flex justify-start">
                  <span className="bg-white pr-3 text-[11px] font-bold uppercase tracking-wider text-[var(--hh-purple)]">
                    Banking Details (Optional)
                  </span>
                </div>
              </div>

              {/* Bank Name & Account Holder */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <span className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                    <CreditCard size={12} />
                    Bank Name
                  </span>
                  <Select
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    disabled={formLoading}
                    className={`h-10 text-sm bg-white ${fieldErrors.bank_name ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                  >
                    <option value="">Select a bank...</option>
                    <option value="fnb">First National Bank (FNB)</option>
                    <option value="standard_bank">Standard Bank</option>
                    <option value="nedbank">Nedbank</option>
                    <option value="eswatini_bank">Eswatini Bank</option>
                    <option value="eswatini_building_society">Eswatini Building Society</option>
                  </Select>
                  {fieldErrors.bank_name && (
                    <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                      {fieldErrors.bank_name.join(" ")}
                    </span>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <span className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                    <Building2 size={12} />
                    Account Holder Name
                  </span>
                  <Input
                    className={`hh-input h-10 text-sm ${fieldErrors.account_holder ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="e.g. Swaziland Pharma Ltd"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    disabled={formLoading}
                  />
                  {fieldErrors.account_holder && (
                    <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                      {fieldErrors.account_holder.join(" ")}
                    </span>
                  )}
                </div>
              </div>

              {/* Account Number & Branch Code */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-1.5">
                  <span className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                    <CreditCard size={12} />
                    Account Number
                  </span>
                  <Input
                    className={`hh-input h-10 text-sm ${fieldErrors.account_number ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="e.g. 62041122334"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    disabled={formLoading}
                  />
                  {fieldErrors.account_number && (
                    <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                      {fieldErrors.account_number.join(" ")}
                    </span>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <span className="text-xs font-bold text-[#3f1d58] flex items-center gap-1">
                    <Layers size={12} />
                    Branch Code
                  </span>
                  <Input
                    className={`hh-input h-10 text-sm ${fieldErrors.branch_code ? "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}`}
                    placeholder="e.g. 280164"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    disabled={formLoading}
                  />
                  {fieldErrors.branch_code && (
                    <span className="text-red-600 text-[10px] font-semibold mt-0.5 leading-none">
                      {fieldErrors.branch_code.join(" ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-[#fdfdfd] border-t border-[var(--hh-border)] px-6 py-4">
              <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={formLoading} className="text-sm font-semibold">
                Cancel
              </Button>
              <LoadingButton type="submit" loading={formLoading} loadingText="Saving..." className="bg-[var(--hh-purple)] text-white hover:bg-[var(--hh-purple-dark)] flex items-center justify-center gap-2">
                {editingCompany ? "Save Changes" : "Register Company"}
              </LoadingButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Delete Confirmation Warning Modal */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="w-[min(92vw,480px)] p-0 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
                <AlertCircle size={24} />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[var(--hh-purple-dark)]">Delete Partner Company</DialogTitle>
                <DialogDescription className="text-sm text-[#5c6a61] mt-2 leading-relaxed">
                  Are you absolutely sure you want to delete <span className="font-bold text-gray-800">'{companyToDelete?.name}'</span>?
                  This will permanently delete this company record, ID/code, and financial identifiers from our clinical system. This operation cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-[#fdfdfd] border-t border-[var(--hh-border)] px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} disabled={deleteLoading} className="text-sm font-semibold">
              Cancel
            </Button>
            <LoadingButton 
              type="button" 
              loading={deleteLoading} 
              loadingText="Deleting..." 
              onClick={handleDeleteConfirm}
              className="bg-red-600 text-white hover:bg-red-700 font-bold"
            >
              Confirm Deletion
            </LoadingButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
