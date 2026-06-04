"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeletePatientButton({ patientId, name }: { patientId: string; name: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (
      confirm(
        `⚠️ WARNING: Are you sure you want to soft-delete the patient record of ${name}?\n\nThis will remove them from the active patient directory, but they can be restored by an administrator within 30 days.`
      )
    ) {
      setDeleting(true);
      try {
        const res = await fetch(`/api/patients/${patientId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          router.push("/patients");
          router.refresh();
        } else {
          alert("Failed to delete patient. Please verify your permissions.");
        }
      } catch (err) {
        alert("An error occurred. Please try again.");
      } finally {
        setDeleting(false);
      }
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      className="bg-red-600 hover:bg-red-700 text-white hover:text-white border-red-600 flex items-center gap-1.5 shadow-sm transition-all"
      disabled={deleting}
      onClick={handleDelete}
    >
      <Trash2 size={16} />
      {deleting ? "Deleting..." : "Delete Patient"}
    </Button>
  );
}
