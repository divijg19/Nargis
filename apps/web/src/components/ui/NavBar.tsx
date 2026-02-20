"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LoginModal } from "@/components/auth/LoginModal";
import { RegisterModal } from "@/components/auth/RegisterModal";
import { useAuth } from "@/contexts/AuthContext";
import { AccountDrawer } from "./AccountDrawer";
import { AvatarButton } from "./AvatarButton";
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
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [accountDrawerOpen, setAccountDrawerOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleAuthSuccess = () => {
    // Modal will close automatically, can add toast here if desired
  };

  const handleSwitchToRegister = () => {
    setLoginModalOpen(false);
    setRegisterModalOpen(true);
  };

  const handleSwitchToLogin = () => {
    setRegisterModalOpen(false);
    setLoginModalOpen(true);
  };

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide/show navbar based on scroll direction
      if (currentScrollY < 100) {
        // Always show at top
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 200) {
        // Scrolling down - hide
        setIsVisible(false);
        setMobileMenuOpen(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <>
      <a
        href="#maincontent"
        className="sr-only focus:not-sr-only fixed top-4 left-1/2 -translate-x-1/2 z-60 bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium border border-primary/50 transition-[color,background-color,border-color,opacity,box-shadow,transform]"
      >
        Skip to content
      </a>

      <nav
        className={`
          fixed top-3 left-5 right-5 z-50 transition-[opacity,transform] duration-300 ease-out
          ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}
        `}
      >
        <div className="max-w-300 mx-auto">
          <div className="rounded-xl border border-structural bg-card/70 backdrop-blur-sm">
            <div className="px-4 sm:px-5">
              <div className="flex items-center justify-between h-11">
                {/* Logo */}
                <Link
                  href="/"
                  className="flex items-center space-x-3 transition-[color,opacity,transform] duration-200 group"
                >
                  <div className="w-7 h-7 rounded-lg border border-structural flex items-center justify-center">
                    <span className="text-sm font-semibold text-foreground">
                      N
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground/95 tracking-tight hidden sm:inline-block">
                    Nargis
                  </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-1.5">
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
                        className={`relative px-3 py-1 rounded-md text-sm font-normal transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                          isActive
                            ? "text-primary bg-primary-subtle"
                            : "text-muted-foreground hover:text-foreground hover:bg-hover/20"
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

                {/* Theme Toggle & Mobile Menu */}
                <div className="flex items-center space-x-3">
                  <div className="p-1 rounded-md border border-border/30 bg-background/50">
                    <ThemeToggle />
                  </div>

                  <AvatarButton
                    onClick={() => setAccountDrawerOpen(true)}
                    label="Open account drawer"
                  />

                  {/* Mobile menu button - toggles nav links */}
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2 rounded-md hover:bg-hover/50 transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-200 active:scale-95"
                    aria-label="Toggle mobile menu"
                    aria-expanded={mobileMenuOpen}
                  >
                    <svg
                      className="w-5 h-5 transition-transform duration-200"
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
                    className="md:hidden p-2 rounded-md hover:bg-hover/50 transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-200 active:scale-95"
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
                <div className="md:hidden pt-3 animate-in slide-in-from-top-2 duration-200">
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
                          className={`block px-4 py-3 rounded-xl text-sm font-normal transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background
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
          </div>
        </div>
      </nav>

      <AccountDrawer
        open={accountDrawerOpen}
        onClose={() => setAccountDrawerOpen(false)}
        onOpenLogin={() => {
          setAccountDrawerOpen(false);
          setLoginModalOpen(true);
        }}
        onOpenRegister={() => {
          setAccountDrawerOpen(false);
          setRegisterModalOpen(true);
        }}
      />

      {/* Auth Modals */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToRegister={handleSwitchToRegister}
      />
      <RegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSuccess={handleAuthSuccess}
        onSwitchToLogin={handleSwitchToLogin}
      />
    </>
  );
}
