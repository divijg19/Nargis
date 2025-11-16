"use client";

// Goal feature removed: stub context to avoid runtime errors if accidentally imported.
import { createContext } from "react";

const _DEPRECATED = () => {
    throw new Error(
        "Goal feature removed: GoalContext is deprecated. Remove Goal imports and providers.",
    );
};

// Minimal exports that will fail fast if used.
export const GoalContext = createContext<any>(null);
export function GoalProvider({ children }: { children: React.ReactNode }) {
    _DEPRECATED();
    return <>{children}</>;
}
export function useGoalStore() {
    _DEPRECATED();
}
