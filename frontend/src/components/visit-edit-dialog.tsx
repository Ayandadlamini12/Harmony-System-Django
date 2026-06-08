"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Visit } from "@/types/clinic";

export function VisitEditDialog({
  visit,
  isOpen,
  setIsOpen,
  onVisitUpdated,
}: {
  visit: Visit;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onVisitUpdated: (visit: Visit) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    main_complaint: visit.main_complaint || "",
    initial_complaints: visit.initial_complaints || "",
    physical_examination: visit.physical_examination || "",
    diagnosis: visit.diagnosis || "",
    remedy: visit.remedy || "",
    visit_type: visit.visit_type || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/visits/${visit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to update visit");
      }

      const updatedVisit = await res.json();
      toast.success("Visit updated successfully.");
      onVisitUpdated(updatedVisit);
      setIsOpen(false);
    } catch (error) {
      toast.error("An error occurred while updating the visit.");
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = visit.visit_date 
    ? new Date(visit.visit_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : "Unknown date";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="mb-4">
          <DialogTitle className="text-xl font-bold">Edit Visit Record</DialogTitle>
          <DialogDescription className="mt-1.5 text-sm text-[#53605a]">
            Update clinical details for the visit on {formattedDate}.
          </DialogDescription>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="visit_type">Visit Type</Label>
            <Input
              id="visit_type"
              name="visit_type"
              value={formData.visit_type}
              onChange={handleChange}
              placeholder="e.g. follow_up, consultation"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="main_complaint">Main Complaint</Label>
            <Input
              id="main_complaint"
              name="main_complaint"
              value={formData.main_complaint}
              onChange={handleChange}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="initial_complaints">History of Present Complaint</Label>
            <Textarea
              id="initial_complaints"
              name="initial_complaints"
              value={formData.initial_complaints}
              onChange={handleChange}
              className="min-h-[80px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="physical_examination">Physical Examination</Label>
            <Textarea
              id="physical_examination"
              name="physical_examination"
              value={formData.physical_examination}
              onChange={handleChange}
              className="min-h-[80px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              className="min-h-[80px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="remedy">Remedy</Label>
            <Textarea
              id="remedy"
              name="remedy"
              value={formData.remedy}
              onChange={handleChange}
              className="min-h-[80px]"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-[var(--hh-border)] pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
