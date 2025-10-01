"use client";
import React, {
    createContext,
    useCallback,
    useContext,
    useReducer,
} from "react";

export interface Toast {
    id: string;
    title?: string;
    message: string;
    variant?: "info" | "success" | "error" | "warning";
    createdAt: number;
    ttlMs?: number;
}

interface ToastState {
    toasts: Toast[];
}
type ToastAction =
    | { type: "PUSH"; toast: Toast }
    | { type: "DISMISS"; id: string }
    | { type: "GC" };

function toastReducer(state: ToastState, action: ToastAction): ToastState {
    switch (action.type) {
        case "PUSH":
            return { toasts: [...state.toasts, action.toast] };
        case "DISMISS":
            return { toasts: state.toasts.filter((t) => t.id !== action.id) };
        case "GC": {
            const now = Date.now();
            return {
                toasts: state.toasts.filter(
                    (t) => !t.ttlMs || now - t.createdAt < t.ttlMs,
                ),
            };
        }
        default:
            return state;
    }
}

interface ToastContextValue {
    toasts: Toast[];
    push: (input: Omit<Toast, "id" | "createdAt"> & { id?: string }) => string;
    dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(toastReducer, { toasts: [] });

    // Garbage collect expired toasts periodically
    React.useEffect(() => {
        const i = setInterval(() => dispatch({ type: "GC" }), 4000);
        return () => clearInterval(i);
    }, []);

    const push: ToastContextValue["push"] = useCallback((input) => {
        const id = input.id || crypto.randomUUID();
        dispatch({
            type: "PUSH",
            toast: {
                id,
                createdAt: Date.now(),
                ttlMs: 6000,
                variant: "info",
                ...input,
            },
        });
        return id;
    }, []);

    const dismiss = useCallback(
        (id: string) => dispatch({ type: "DISMISS", id }),
        [],
    );

    return (
        <ToastContext.Provider value={{ toasts: state.toasts, push, dismiss }}>
            {children}
        </ToastContext.Provider>
    );
}

export function useToasts() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToasts must be used within ToastProvider");
    return ctx;
}
