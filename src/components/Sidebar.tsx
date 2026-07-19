"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/planner", label: "Fortnight Planner" },
  { href: "/bills", label: "Bills Calendar" },
  { href: "/spending", label: "Spending Tracker" },
  { href: "/cards", label: "Credit Card Control" },
  { href: "/debt", label: "Debt Strategy" },
  { href: "/goals", label: "Goals & Sinking Funds" },
  { href: "/visuals", label: "Long-Term Visuals" },
  { href: "/review", label: "Monthly Review" },
  { href: "/coach", label: "AI Coach" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar({ open }: { open: boolean }) {
  const pathname = usePathname();
  return (
    <aside
      aria-hidden={!open}
      className={`shrink-0 border-r border-border bg-surface overflow-hidden transition-[width] duration-200 ease-in-out ${
        open ? "w-64" : "w-0 border-r-0"
      }`}
    >
      <div className="w-64 h-full flex flex-col">
        <div className="px-4 py-4">
          <p className="text-lg font-semibold tracking-tight">Platanning</p>
          <p className="text-xs text-muted mt-0.5">Calm fortnightly planning — pause, don&apos;t punish.</p>
        </div>
        <nav aria-label="Main sections" className="flex-1 overflow-y-auto px-2 pb-4">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                tabIndex={open ? 0 : -1}
                className={
                  "block rounded-lg px-3 py-2 text-sm mb-0.5 transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:bg-surface-muted hover:text-foreground")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
