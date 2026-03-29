"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PromptList } from "@/components/layout/PromptList";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtime } from "@/contexts/RealtimeContext";
import { PROMPT_BAR_ACTIONS } from "@/lib/promptBar";
import { useToasts } from "@/lib/toasts";
import { ThemeToggle } from "./ThemeToggle";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/journal", label: "Journal" },
  { href: "/tasks", label: "Tasks" },
  { href: "/habits", label: "Habits" },
  { href: "/pomodoro", label: "Focus" },
];

export function NavBar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const { clearMessages, sendUserMessage } = useRealtime();
  const { push } = useToasts();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [promptBarOpen, setPromptBarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen && !promptBarOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!shellRef.current?.contains(event.target as Node)) {
        setMobileMenuOpen(false);
        setPromptBarOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        setPromptBarOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen, promptBarOpen]);

  const togglePromptBar = () => {
    setPromptBarOpen((open) => !open);
    setMobileMenuOpen(false);
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen((open) => !open);
    setPromptBarOpen(false);
  };

  const handleNewSession = () => {
    clearMessages();
    push({ message: "New session started.", variant: "info" });
    setPromptBarOpen(false);
  };

  const handlePromptSelect = (prompt: string) => {
    sendUserMessage(prompt);
    setPromptBarOpen(false);
  };

  const handleCopy = async (prompt: string, index: number) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedIndex(index);
      push({ message: "Copied to clipboard", variant: "success" });
      window.setTimeout(() => setCopiedIndex(null), 1600);
    } catch {
      push({ message: "Copy failed", variant: "error" });
    }
  };

  return (
    <>
      <a
        href="#maincontent"
        className="sr-only fixed left-1/2 top-2 z-60 -translate-x-1/2 rounded-lg border border-primary/50 bg-primary px-3 py-1.5 font-medium text-primary-foreground transition-[opacity,transform] duration-(--motion-medium) focus:not-sr-only"
      >
        Skip to content
      </a>

      <div
        ref={shellRef}
        className="fixed left-1/2 top-3 z-50 w-[min(82rem,calc(100vw-1.5rem))] -translate-x-1/2"
      >
        <nav className="rounded-2xl border border-structural bg-card/96 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm">
          <div className="px-2.5 sm:px-3">
            <div className="flex h-12 items-center justify-between gap-2.5 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={togglePromptBar}
                  className="inline-flex h-9 items-center gap-2 rounded-xl border border-structural px-3 text-sm font-medium text-foreground/90 transition-[opacity,transform] duration-(--motion-medium) hover:bg-hover/35 active:scale-[0.98]"
                  aria-expanded={promptBarOpen}
                  aria-controls="prompt-bar-menu"
                  aria-label="Toggle prompt bar"
                >
                  <span className="hidden sm:inline">Prompt Bar</span>
                  <span className="sm:hidden">Prompts</span>
                  <svg
                    className={`h-4 w-4 transition-transform duration-(--motion-medium) ${promptBarOpen ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <Link
                  href="/"
                  className="flex items-center gap-2 transition-[opacity,transform] duration-(--motion-medium)"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-structural">
                    <span className="text-xs font-semibold text-foreground">
                      N
                    </span>
                  </div>
                  <span className="text-sm font-medium tracking-tight text-foreground/95">
                    Nargis
                  </span>
                </Link>
              </div>

              <div className="hidden items-center gap-1 md:flex">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={`relative rounded-md px-2.5 py-1 text-sm font-normal transition-[opacity,transform] duration-(--motion-medium) focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                        isActive
                          ? "bg-primary-subtle text-primary"
                          : "text-foreground/80 hover:bg-hover/35 hover:text-foreground"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
                <div className="rounded-md bg-background/80 p-1">
                  <ThemeToggle />
                </div>

                <button
                  type="button"
                  onClick={toggleMobileMenu}
                  className="rounded-md border border-structural p-2 text-foreground/90 transition-[opacity,transform] duration-(--motion-medium) hover:bg-hover/50 active:scale-95 md:hidden"
                  aria-label="Toggle mobile menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <svg
                    className="h-5 w-5 transition-transform duration-(--motion-medium)"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    style={{
                      transform: mobileMenuOpen
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                    }}
                  >
                    {mobileMenuOpen ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {mobileMenuOpen && (
              <div className="border-t border-structural/60 pb-3 pt-2 transition-[opacity,transform] duration-(--motion-medium) md:hidden">
                <div className="space-y-1">
                  {navigationItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={`block rounded-lg px-3 py-2 text-sm font-normal transition-[opacity,transform] duration-(--motion-medium) focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          isActive
                            ? "bg-primary-subtle text-primary"
                            : "text-muted-foreground hover:bg-hover/40 hover:text-foreground"
                        }`}
                      >
                        <span className="align-middle">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </nav>

        {!isAuthenticated && (
          <div className="mt-2 px-1.5 sm:px-2.5">
            <p className="rounded-2xl border border-structural/60 bg-card/94 px-3 py-2 text-center text-[11px] text-muted-foreground shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:text-xs">
              You are in a temporary session.{" "}
              <Link href="/login" className="text-primary hover:underline">
                Log in
              </Link>{" "}
              to save your data.
            </p>
          </div>
        )}

        {promptBarOpen && (
          <div
            id="prompt-bar-menu"
            className="mt-3 overflow-hidden rounded-2xl border border-structural bg-card/98 shadow-[0_16px_50px_rgba(15,23,42,0.1)] backdrop-blur-sm"
          >
            <div className="grid gap-4 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-6">
              <div className="flex flex-col gap-3 md:w-48">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">
                    Prompt Bar
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Use starter actions for planning, journaling, habits, and
                    focus.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNewSession}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-structural bg-background px-3 text-sm font-medium text-foreground transition-[opacity,transform] duration-(--motion-medium) hover:bg-hover/20 active:scale-[0.98]"
                >
                  New Session
                </button>
              </div>

              <PromptList
                prompts={PROMPT_BAR_ACTIONS}
                copiedIndex={copiedIndex}
                onSelect={handlePromptSelect}
                onCopy={handleCopy}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
