"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function SeedButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSeed = async () => {
    if (!confirm("Are you sure you want to seed 3 mock patients with profiles, cases, and vitals? This will NOT delete any existing patients.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/patients/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert("Success! 3 demo patients with vitals, cases, and first visits have been seeded successfully.");
        router.refresh();
      } else {
        alert(`Failed to seed: ${data.error || "Unknown error"}`);
      }
    } catch (err: any) {
      alert(`Error seeding patients: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleSeed}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-lg border border-[#cce4d1] bg-[#f2fbf4] px-4 py-2.5 text-sm font-bold text-[#225c2c] transition hover:bg-[#e6f7e9] disabled:cursor-not-allowed disabled:opacity-60 shadow-sm"
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Seeding...
        </>
      ) : (
        <>
          <Sparkles size={16} className="text-[#225c2c]" />
          Seed demo patients
        </>
      )}
    </button>
  );
}
