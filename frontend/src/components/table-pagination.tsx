"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  count: number;
  pageSize?: number;
}

export function TablePagination({ count, pageSize = 12 }: TablePaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const totalPages = Math.ceil(count / pageSize);

  if (totalPages <= 1) return null;

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`${pathname}?${params.toString()}`);
  };

  const startEntry = (currentPage - 1) * pageSize + 1;
  const endEntry = Math.min(currentPage * pageSize, count);

  const pages: number[] = [];
  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  const endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#cce4d1] bg-[#f2fbf4] px-5 py-3 text-sm text-[#225c2c]">
      <div className="font-medium">
        Showing <span className="font-bold">{startEntry}</span> to{" "}
        <span className="font-bold">{endEntry}</span> of{" "}
        <span className="font-bold">{count}</span> entries
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#cce4d1] bg-white transition hover:bg-[#e6f7e9] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white text-[#225c2c] shadow-sm"
        >
          <ChevronLeft size={16} />
        </button>

        {startPage > 1 && (
          <>
            <button
              onClick={() => handlePageChange(1)}
              className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg border border-[#cce4d1] bg-white px-2 transition hover:bg-[#e6f7e9] font-medium shadow-sm"
            >
              1
            </button>
            {startPage > 2 && <span className="px-1 text-xs opacity-70">...</span>}
          </>
        )}

        {pages.map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2.5 font-bold transition shadow-sm border ${
              page === currentPage
                ? "bg-[#225c2c] border-[#225c2c] text-white"
                : "bg-white border-[#cce4d1] hover:bg-[#e6f7e9] text-[#225c2c]"
            }`}
          >
            {page}
          </button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-1 text-xs opacity-70">...</span>}
            <button
              onClick={() => handlePageChange(totalPages)}
              className="flex h-8 min-w-[2rem] items-center justify-center rounded-lg border border-[#cce4d1] bg-white px-2 transition hover:bg-[#e6f7e9] font-medium shadow-sm"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#cce4d1] bg-white transition hover:bg-[#e6f7e9] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white text-[#225c2c] shadow-sm"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
