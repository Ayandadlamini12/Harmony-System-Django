"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ClipboardEdit, Pencil, Save, X, AlertTriangle, Info, Sparkles, Check
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Patient } from "@/types/clinic";
import { showActionError } from "@/lib/action-error";

// Clinical quick-insert template tags
const CLINICAL_ACCELERATORS = [
  { label: "High Alert", tag: "[⚠️ HIGH ALERT] ", style: "bg-red-50 hover:bg-red-100 text-red-700 border-red-200/50 hover:border-red-300", dot: "bg-red-500 animate-ping" },
  { label: "Allergy Alert", tag: "[🚫 ALLERGY] ", style: "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200/50 hover:border-amber-300", dot: "bg-amber-500" },
  { label: "Chronic Illness", tag: "[🧬 CHRONIC] ", style: "bg-purple-50 hover:bg-purple-100 text-[var(--hh-purple)] border-purple-200/50 hover:border-purple-300", dot: "bg-[var(--hh-purple)]" },
  { label: "Medication Notice", tag: "[💊 MEDICATION] ", style: "bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200/50 hover:border-blue-300", dot: "bg-blue-500" },
  { label: "Special Guidance", tag: "[🛡️ GUIDANCE] ", style: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200/50 hover:border-emerald-300", dot: "bg-emerald-500" },
];

export function KeyNotesDialog({ patient }: { patient: Patient }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(patient.profile?.other_important_information || "");
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const characterLimit = 500;
  const currentLength = notes.length;
  const progressPercent = Math.min((currentLength / characterLimit) * 100, 100);

  // Determine progress bar styling based on character length
  let progressBarColor = "bg-[var(--hh-green)] shadow-[0_0_8px_rgba(34,197,94,0.3)]";
  if (currentLength > 400) {
    progressBarColor = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse";
  } else if (currentLength > 300) {
    progressBarColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
  }

  // Insert clinical tag at current cursor position
  function handleInsertTag(tag: string) {
    const textarea = textareaRef.current;
    if (!textarea) {
      setNotes((prev) => tag + prev);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentText = textarea.value;

    const newText = currentText.substring(0, start) + tag + currentText.substring(end);
    
    if (newText.length > characterLimit) {
      toast.warning("Cannot insert tag: will exceed 500 characters limit.");
      return;
    }

    setNotes(newText);

    // Re-focus and set selection back
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 50);
  }

  async function handleSave() {
    if (notes.length > characterLimit) {
      toast.error(`Key notes cannot exceed ${characterLimit} characters.`);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        other_important_information: notes,
      };

      const res = await fetch(`/api/patients/${patient.id}/profile/`, {
        method: patient.profile ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to update notes");
      }

      toast.success("Key clinical notes updated successfully");
      setOpen(false);
      router.refresh();
    } catch (err) {
      showActionError({
        title: "Failed to update notes",
        message: "Could not save the clinical memo for this patient.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button 
          className="group flex h-7 w-7 items-center justify-center rounded-md bg-white border border-[#e8d5f3] text-[var(--hh-purple)] shadow-[0_2px_4px_rgba(112,48,160,0.04)] transition-all duration-200 hover:bg-[var(--hh-purple)] hover:text-white hover:border-[var(--hh-purple)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--hh-purple)] active:scale-95 cursor-pointer" 
          type="button"
          title="Edit Key Notes & Medical Alerts"
        >
          <Pencil size={11} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl bg-[#fafbfe]">
        
        {/* Modern Header */}
        <div className="flex items-center justify-between bg-white px-6 py-4.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--hh-purple)] to-[#8b5cf6] text-white shadow-md shadow-purple-100 animate-pulse-subtle">
              <ClipboardEdit size={16} />
            </div>
            <div>
              <DialogTitle className="text-sm font-black tracking-tight text-slate-800 leading-none">
                Patient Key Notes & Alerts
              </DialogTitle>
              <DialogDescription className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 mt-1">
                Updating record for {patient.first_name} {patient.last_name}
              </DialogDescription>
            </div>
          </div>
          <button 
            onClick={() => setOpen(false)}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          
          {/* Informative Warning Banner */}
          <div className="flex gap-3 p-3.5 rounded-xl bg-[#FFFDF5] border border-[#FDE047]/60 text-xs text-amber-800 font-medium leading-relaxed shadow-2xs">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5 animate-bounce-subtle" />
            <div>
              <span className="font-black uppercase tracking-wider mr-1 text-amber-900 text-[10px]">Clinical Notice:</span>
              These key notes are pinned globally at the top of the patient file. They are instantly visible to all clinic staff. Ensure details are critical, accurate, and professional.
            </div>
          </div>

          {/* Quick Insert Templates */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
              <Sparkles size={10} className="text-[var(--hh-purple)]" />
              <span>Clinician Quick Accelerators</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {CLINICAL_ACCELERATORS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleInsertTag(item.tag)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all duration-150 active:scale-95 cursor-pointer shadow-2xs ${item.style}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note Area with limit tracking */}
          <div className="space-y-2">
            <div className="relative rounded-xl border border-slate-200 bg-white p-1 transition-all focus-within:border-[var(--hh-purple)] focus-within:ring-2 focus-within:ring-[#e8d5f3]/40 shadow-2xs focus-within:shadow-md">
              <Textarea
                ref={textareaRef}
                value={notes}
                onChange={(e) => {
                  if (e.target.value.length <= characterLimit) {
                    setNotes(e.target.value);
                  }
                }}
                placeholder="Enter critical medical alerts, clinical summaries, allergy alerts, or custom guidelines for the team..."
                className="min-h-[150px] w-full resize-none border-0 bg-transparent p-3 text-xs font-semibold leading-relaxed text-slate-800 placeholder:text-slate-400 placeholder:italic focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              
              {/* Corner character counter */}
              <div className={`absolute bottom-2.5 right-3 text-[9px] font-black px-2 py-0.5 rounded-md ${
                currentLength >= characterLimit ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"
              }`}>
                {currentLength} / {characterLimit}
              </div>
            </div>

            {/* Character limit bar */}
            <div className="space-y-1">
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${progressBarColor}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                <span>Safe Limit Gauge</span>
                <span>Maximum {characterLimit} characters</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4 rounded-b-2xl">
          <p className="text-[9px] leading-snug text-slate-400 font-extrabold max-w-[200px] uppercase tracking-wide">
            Changes persist immediately
          </p>
          
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setOpen(false)} 
              disabled={isSaving}
              className="h-8 px-3.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSave} 
              disabled={isSaving} 
              className="h-8 bg-[var(--hh-purple)] px-4.5 text-xs font-extrabold text-white hover:bg-[var(--hh-purple-dark)] shadow-md hover:shadow-purple-100/40 transition-all duration-200 rounded-lg flex items-center gap-1.5 cursor-pointer active:scale-95 border-none"
            >
              {isSaving ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={12} />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
