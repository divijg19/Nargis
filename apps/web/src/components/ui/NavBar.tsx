"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";
import { ThemeToggle } from "./ThemeToggle";

// Navigation links (extend here when adding new top-level sections)
const links: Array<{ href: string; label: string; hidden?: boolean }> = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/tasks", label: "Tasks" },
    { href: "/habits", label: "Habits" },
    { href: "/pomodoro", label: "Pomodoro" },
];

export function NavBar() {
    const pathname = usePathname();
    return (
        <>
            <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-3 py-1 rounded">
                Skip to content
            </a>
            <nav aria-label="Primary" className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                        <Link
                            href="/dashboard"
                            className="navbar-title font-semibold text-lg text-gray-900 dark:text-white"
                            aria-label="Nargis Home"
                        >
                            Nargis
                        </Link>
                        <ul className="hidden md:flex items-center space-x-4" aria-label="Primary navigation">
                            {links.map(link => {
                                if (link.hidden) return null;
                                const active = pathname === link.href;
                                return (
                                    <li key={link.href}>
                                        <Link
                                            href={link.href}
                                            className={cn(
                                                'px-3 py-2 rounded-md text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                                                active
                                                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                                            )}
                                            aria-current={active ? 'page' : undefined}
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div className="flex items-center space-x-3">
                        <ThemeToggle />
                    </div>
                </div>
            </nav>
        </>
    );
}
