import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Platanning — calm fortnightly finance planning",
  description:
    "A calm, non-judgemental fortnightly cash-flow planner: safe-to-spend, bill timing, credit card control, and gentle debt payoff.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-lg font-semibold tracking-tight">Platanning</p>
              <p className="text-xs text-muted">
                Calm fortnightly planning — pause, don&apos;t punish.
              </p>
            </div>
          </div>
        </header>
        <Nav />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">{children}</main>
        <footer className="border-t border-border">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 text-xs text-muted">
            Everything you enter stays in your local database. Nothing is sent anywhere unless
            you explicitly use the AI Coach.
          </div>
        </footer>
      </body>
    </html>
  );
}
