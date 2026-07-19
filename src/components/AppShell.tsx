"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";

const STORAGE_KEY = "platanning:sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // Reading a persisted preference on mount is a one-time sync from an external
    // store (localStorage), not a reactive effect — this can't be derived during
    // render since window/localStorage don't exist on the server.
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "open" || stored === "closed") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(stored === "open");
    } else if (window.innerWidth < 768) {
      setOpen(false);
    }
  }, []);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, next ? "open" : "closed");
      return next;
    });
  }

  return (
    <div className="flex min-h-full">
      <Sidebar open={open} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border sticky top-0 z-20 bg-surface/80 backdrop-blur">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
            <button
              onClick={toggle}
              aria-label={open ? "Hide sidebar" : "Show sidebar"}
              aria-expanded={open}
              className="shrink-0 rounded-lg border border-border p-2 hover:bg-surface-muted"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M2.5 5H15.5M2.5 9H15.5M2.5 13H15.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            {!open && <p className="text-sm font-semibold tracking-tight">Platanning</p>}
          </div>
        </header>
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
        <footer className="border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-muted">
            Everything you enter stays in your local database. Nothing is sent anywhere unless
            you explicitly use the AI Coach.
          </div>
        </footer>
      </div>
    </div>
  );
}
