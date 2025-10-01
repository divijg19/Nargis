"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/utils";
import { ThemeToggle } from "./ThemeToggle";

// Navigation links (extend here when adding new top-level sections)
const links: Array<{ href: string; label: string; icon: string; hidden?: boolean }> = [
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/tasks", label: "Tasks", icon: "✓" },
    { href: "/habits", label: "Habits", icon: "🔥" },
    { href: "/pomodoro", label: "Pomodoro", icon: "🍅" },
];

export function NavBar() {
    const pathname = usePathname();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <>
            <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-1/2 focus:-translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium z-50">
                Skip to content
            </a>

            {/* Floating Centered Navbar */}
            <div className="fixed top-3 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8 animate-slide-down">
                <nav
                    aria-label="Primary"
                    className="max-w-4xl mx-auto glass bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-xl border border-gray-200/60 dark:border-gray-700/60 shadow-lg shadow-gray-200/10 dark:shadow-gray-900/30"
                >
                    <div className="px-3 sm:px-4">
                        <div className="flex items-center justify-between h-14">
                            {/* Logo */}
                            <Link
                                href="/dashboard"
                                className="flex items-center space-x-2 font-bold text-base text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                aria-label="Nargis Home"
                            >
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                                    <span className="text-sm" aria-hidden="true">🌸</span>
                                </div>
                                <span className="hidden sm:inline">Nargis</span>
                            </Link>

                            {/* Desktop Navigation - Centered */}
                            <div className="hidden md:flex items-center justify-center flex-1 px-4">
                                <ul className="flex items-center space-x-0.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-lg px-1 py-1" aria-label="Primary navigation">
                                    {links.map(link => {
                                        if (link.hidden) return null;
                                        const active = pathname === link.href;
                                        return (
                                            <li key={link.href}>
                                                <Link
                                                    href={link.href}
                                                    className={cn(
                                                        'flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
                                                        active
                                                            ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-gray-700/60'
                                                    )}
                                                    aria-current={active ? 'page' : undefined}
                                                >
                                                    <span aria-hidden="true" className="text-sm">{link.icon}</span>
                                                    <span>{link.label}</span>
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>

                            {/* Right Side - Theme Toggle */}
                            <div className="hidden md:flex items-center">
                                <ThemeToggle />
                            </div>

                            {/* Mobile menu button */}
                            <div className="flex md:hidden items-center space-x-2">
                                <ThemeToggle />
                                <button
                                    type="button"
                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                    className="inline-flex items-center justify-center p-2 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    aria-expanded={mobileMenuOpen}
                                    aria-label="Toggle navigation menu"
                                >
                                    {mobileMenuOpen ? (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    ) : (
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mobile menu */}
                    {mobileMenuOpen && (
                        <div className="md:hidden border-t border-gray-200/60 dark:border-gray-800/60 animate-slide-down rounded-b-xl overflow-hidden">
                            <ul className="px-2 py-2 space-y-0.5 bg-white/95 dark:bg-gray-900/95" aria-label="Mobile navigation">
                                {links.map(link => {
                                    if (link.hidden) return null;
                                    const active = pathname === link.href;
                                    return (
                                        <li key={link.href}>
                                            <Link
                                                href={link.href}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={cn(
                                                    'flex items-center space-x-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                                                    active
                                                        ? 'bg-blue-600 text-white shadow-sm'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                )}
                                                aria-current={active ? 'page' : undefined}
                                            >
                                                <span className="text-base" aria-hidden="true">{link.icon}</span>
                                                <span>{link.label}</span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </nav>
            </div>
        </>
    );
}
