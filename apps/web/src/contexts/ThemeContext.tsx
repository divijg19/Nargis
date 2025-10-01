"use client";

import type React from "react";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getPreferredTheme(): Theme {
    if (typeof window === "undefined") return "light";
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") return stored;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(getPreferredTheme);

    const applyThemeClass = useCallback((t: Theme) => {
        if (typeof document === "undefined") return;
        const root = document.documentElement;
        if (t === "dark") root.classList.add("dark");
        else root.classList.remove("dark");
    }, []);

    useEffect(() => {
        applyThemeClass(theme);
        if (typeof window !== "undefined") {
            window.localStorage.setItem("theme", theme);
        }
    }, [theme, applyThemeClass]);

    const setTheme = useCallback((t: Theme) => setThemeState(t), []);
    const toggleTheme = useCallback(
        () => setThemeState((prev) => (prev === "dark" ? "light" : "dark")),
        [],
    );

    const value: ThemeContextType = { theme, toggleTheme, setTheme };
    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
