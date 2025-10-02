"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

const navigationItems = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/tasks", label: "Tasks", icon: "✓" },
    { href: "/habits", label: "Habits", icon: "🔥" },
    { href: "/pomodoro", label: "Focus", icon: "🍅" },
];

export function NavBar() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Update scrolled state for background opacity
            setIsScrolled(currentScrollY > 20);

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
                href="#main"
                className="sr-only focus:not-sr-only fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-primary text-primary-foreground px-4 py-2 rounded-xl font-medium shadow-lg transition-all hover:scale-105"
            >
                Skip to content
            </a>

            <nav
                className={`
          fixed top-4 left-4 right-4 z-50 transition-all duration-300 ease-out
          ${isVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}
        `}
            >
                <div className="max-w-5xl mx-auto">
                    <div
                        className={`
            backdrop-blur-xl rounded-2xl border transition-all duration-300
            ${isScrolled
                                ? "bg-background/95 border-border/50 shadow-lg shadow-primary/5"
                                : "bg-background/80 border-border/30 shadow-sm"
                            }
          `}
                    >
                        <div className="px-4 sm:px-6">
                            <div className="flex items-center justify-between h-14">
                                {/* Logo */}
                                <Link
                                    href="/"
                                    className="flex items-center space-x-3 hover:scale-105 transition-all duration-200 group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                                        <span className="text-sm font-bold text-primary-foreground">
                                            N
                                        </span>
                                    </div>
                                    <span className="text-lg font-semibold text-foreground tracking-tight">
                                        Nargis
                                    </span>
                                </Link>

                                {/* Desktop Navigation */}
                                <div className="hidden md:flex items-center space-x-1">
                                    {navigationItems.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`
                          relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 group
                          ${isActive
                                                        ? "text-primary bg-primary/10 shadow-sm"
                                                        : "text-muted-foreground hover:text-foreground hover:bg-hover/50"
                                                    }
                        `}
                                            >
                                                <span className="mr-2 transition-transform group-hover:scale-110">
                                                    {item.icon}
                                                </span>
                                                {item.label}
                                                {isActive && (
                                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full" />
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>

                                {/* Theme Toggle & Mobile Menu */}
                                <div className="flex items-center space-x-2">
                                    <ThemeToggle />

                                    {/* Mobile menu button */}
                                    <button
                                        type="button"
                                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                        className="md:hidden p-2 rounded-xl hover:bg-hover/50 transition-all duration-200 active:scale-95"
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
                                </div>
                            </div>

                            {/* Mobile Navigation */}
                            {mobileMenuOpen && (
                                <div className="md:hidden border-t border-border/30 py-3 animate-in slide-in-from-top-2 duration-200">
                                    <div className="space-y-1">
                                        {navigationItems.map((item) => {
                                            const isActive = pathname === item.href;
                                            return (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    onClick={() => setMobileMenuOpen(false)}
                                                    className={`
                            block px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                            ${isActive
                                                            ? "bg-primary/10 text-primary border border-primary/20"
                                                            : "text-muted-foreground hover:text-foreground hover:bg-hover/50"
                                                        }
                          `}
                                                >
                                                    <span className="mr-3">{item.icon}</span>
                                                    {item.label}
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
        </>
    );
}
