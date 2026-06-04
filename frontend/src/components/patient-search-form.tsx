"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function PatientSearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams.get("search") || "";
  const [search, setSearch] = useState(currentSearch);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) {
      params.set("search", search.trim());
    } else {
      params.delete("search");
    }
    params.delete("page"); // Reset page to 1 on a new search
    router.push(`/patients?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 flex max-w-md items-center gap-2">
      <div className="relative flex-1">
        <input
          className="hh-input pr-16"
          name="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, ID, phone..."
        />
        {currentSearch && (
          <Link
            href="/patients"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#225c2c] hover:underline"
          >
            Clear
          </Link>
        )}
      </div>
      <button className="hh-button min-h-[2.5rem] px-5 bg-[#225c2c] hover:bg-[#1a4a22]" type="submit">
        Search
      </button>
    </form>
  );
}
