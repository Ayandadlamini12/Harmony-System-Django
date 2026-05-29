import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--hh-border)] bg-white px-5 py-4 text-center text-xs text-[#66736d]">
      <p>
        &copy; 2026 Harmony Health Eswatini. All Rights Reserved. v1.0.0.0
      </p>
      <p className="mt-1">
        Developed By{" "}
        <Link href="https://website.fmtagency.online/" target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--hh-purple)] hover:underline">
          FMT Digital Agency
        </Link>
      </p>
    </footer>
  );
}
