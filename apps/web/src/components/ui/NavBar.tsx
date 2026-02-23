"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "./ThemeToggle";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", requiresAuth: true },
  { href: "/journal", label: "Journal", requiresAuth: true },
  { href: "/tasks", label: "Tasks", requiresAuth: true },
  { href: "/habits", label: "Habits", requiresAuth: true },
  { href: "/pomodoro", label: "Focus", requiresAuth: true },
];

type NavBarProps = {
  onMobileSidebarToggle?: () => void;
};

export function NavBar({ onMobileSidebarToggle }: NavBarProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <a
        href="#maincontent"
        className="sr-only focus:not-sr-only fixed top-2 left-1/2 -translate-x-1/2 z-60 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium border border-primary/50 transition-[opacity,transform] duration-(--motion-medium)"
      >
        Skip to content
      </a>

      <nav className="fixed top-3 left-2 right-15 z-50 md:left-[calc(var(--sidebar-active-width)+0.5rem)] md:right-15 rounded-xl border border-structural bg-card/96 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          <div className="h-11 flex items-center justify-between gap-3">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 transition-[opacity,transform] duration-(--motion-medium)"
            >
              <div className="w-6 h-6 rounded-md border border-structural flex items-center justify-center">
                <span className="text-xs font-semibold text-foreground">N</span>
              </div>
              <span className="text-sm font-medium text-foreground/95 tracking-tight">
                Nargis
              </span>
            </Link>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="hidden md:flex items-center gap-1">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  const isLocked = item.requiresAuth && !isAuthenticated;
                  const targetHref = isLocked
                    ? `/login?next=${encodeURIComponent(item.href)}`
                    : item.href;
                  return (
                    <Link
                      key={item.href}
                      href={targetHref}
                      aria-current={isActive ? "page" : undefined}
                      title={isLocked ? "Sign in to access" : undefined}
                      className={`relative px-2.5 py-1 rounded-md text-sm font-normal transition-[opacity,transform] duration-(--motion-medium) focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${isActive
                        ? "text-primary bg-primary-subtle"
                        : "text-foreground/80 hover:text-foreground hover:bg-hover/35"
                        }`}
                    >
                      {item.label}
                      {isLocked && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Locked
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="p-1 rounded-md bg-background/80">
                <ThemeToggle />
              </div>

              {/* Mobile menu button - toggles nav links */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md border border-structural/70 text-foreground/90 hover:bg-hover/50 transition-[opacity,transform] duration-(--motion-medium) active:scale-95"
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
              >
                <svg
                  className="w-5 h-5 transition-transform duration-(--motion-medium)"
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

              {/* Mobile sidebar toggle (hamburger) */}
              <button
                type="button"
                onClick={() => onMobileSidebarToggle?.()}
                className="md:hidden p-2 rounded-md border border-structural/70 text-foreground/90 hover:bg-hover/50 transition-[opacity,transform] duration-(--motion-medium) active:scale-95"
                aria-label="Open sidebar"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <title>Open sidebar</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden pt-2 pb-3 transition-[opacity,transform] duration-(--motion-medium)">
              <div className="space-y-1">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  const isLocked = item.requiresAuth && !isAuthenticated;
                  const targetHref = isLocked
                    ? `/login?next=${encodeURIComponent(item.href)}`
                    : item.href;
                  return (
                    <Link
                      key={item.href}
                      href={targetHref}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      title={isLocked ? "Sign in to access" : undefined}
                      className={`block px-3 py-2 rounded-lg text-sm font-normal transition-[opacity,transform] duration-(--motion-medium) focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background
                      ${isActive ? "bg-primary-subtle text-primary" : "text-muted-foreground hover:text-foreground hover:bg-hover/40"}
                    `}
                    >
                      <span className="align-middle">{item.label}</span>
                      {isLocked && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          Locked
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
