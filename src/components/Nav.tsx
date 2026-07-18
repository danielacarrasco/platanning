"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
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

export function Nav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main sections"
      className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-20"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1 overflow-x-auto py-2 [scrollbar-width:thin]">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  "shrink-0 rounded-full px-3 py-1.5 text-sm transition-colors " +
                  (active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted hover:bg-surface-muted hover:text-foreground")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
