"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Patient, PatientProfile } from "@/types/clinic";

const HIV_STATUSES = [
  { value: "undisclosed", label: "Undisclosed" },
  { value: "non_reactive", label: "Non-reactive" },
  { value: "reactive", label: "Reactive" },
  { value: "unknown", label: "Unknown" },
] as const;

export function PatientMedicalHistoryDialog({ patient, onSaved }: { patient: Patient; onSaved: (profile: PatientProfile) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    allopathic_medication: patient.profile?.allopathic_medication || "",
    family_medical_history: patient.profile?.family_medical_history || "",
    past_medical_history: patient.profile?.past_medical_history || "",
    hiv_status: patient.profile?.hiv_status || "undisclosed",
    children_count: patient.profile?.children_count?.toString() || "",
    other_important_information: patient.profile?.other_important_information || "",
  });

  function setField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        allopathic_medication: form.allopathic_medication,
        family_medical_history: form.family_medical_history,
        past_medical_history: form.past_medical_history,
        hiv_status: form.hiv_status,
        other_important_information: form.other_important_information,
      };
      if (form.children_count) {
        body.children_count = parseInt(form.children_count, 10);
      }

      const res = await fetch(`/api/patients/${patient.id}/profile/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Could not save medical history");
      }

      const data = await res.json();
      onSaved(data.profile);
      toast.success("Medical history saved");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save medical history");
    } finally {
      setSaving(false);
    }
  }

  const hasExisting = !!patient.profile?.past_medical_history || !!patient.profile?.family_medical_history || !!patient.profile?.allopathic_medication;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          {hasExisting ? "Edit medical history" : "Medical history"}
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[min(96vw,720px)]">
        <div className="border-b border-[var(--hh-border)] px-5 py-4">
          <DialogTitle className="text-lg font-bold text-[var(--hh-purple-dark)]">Medical history</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[#66736d]">
            Record the patient&apos;s medical history. This is captured once and can be updated later if needed.
          </DialogDescription>
        </div>
        <div className="grid max-h-[78vh] gap-4 overflow-y-auto p-5">
          <label className="grid gap-1 text-sm font-bold text-[#53605a]">
            Allopathic medication
            <textarea
              className="min-h-[80px] rounded-lg border border-[var(--hh-border)] px-3 py-2 text-base font-normal text-[#17211d]"
              value={form.allopathic_medication}
              onChange={(e) => setField("allopathic_medication", e.target.value)}
              placeholder="Current allopathic / conventional medication"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-[#53605a]">
            Family medical history
            <textarea
              className="min-h-[80px] rounded-lg border border-[var(--hh-border)] px-3 py-2 text-base font-normal text-[#17211d]"
              value={form.family_medical_history}
              onChange={(e) => setField("family_medical_history", e.target.value)}
              placeholder="Relevant family medical conditions"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-[#53605a]">
            Past medical history
            <textarea
              className="min-h-[80px] rounded-lg border border-[var(--hh-border)] px-3 py-2 text-base font-normal text-[#17211d]"
              value={form.past_medical_history}
              onChange={(e) => setField("past_medical_history", e.target.value)}
              placeholder="Past illnesses, surgeries, hospitalizations"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold text-[#53605a]">
              HIV status
              <select
                className="h-11 rounded-lg border border-[var(--hh-border)] px-3 text-base font-normal text-[#17211d]"
                value={form.hiv_status}
                onChange={(e) => setField("hiv_status", e.target.value)}
              >
                {HIV_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-[#53605a]">
              Children count
              <input
                type="number"
                min="0"
                className="h-11 rounded-lg border border-[var(--hh-border)] px-3 text-base font-normal text-[#17211d]"
                value={form.children_count}
                onChange={(e) => setField("children_count", e.target.value)}
                placeholder="Number of children"
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-bold text-[#53605a]">
            Other important information
            <textarea
              className="min-h-[80px] rounded-lg border border-[var(--hh-border)] px-3 py-2 text-base font-normal text-[#17211d]"
              value={form.other_important_information}
              onChange={(e) => setField("other_important_information", e.target.value)}
              placeholder="Any other relevant clinical notes"
            />
          </label>
          <div className="flex justify-end gap-2 border-t border-[var(--hh-border)] pt-4">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save medical history"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
