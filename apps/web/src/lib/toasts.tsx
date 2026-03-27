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
  /**
   * Visual variant (color) — kept for backward compatibility.
   */
  variant?: "info" | "success" | "error" | "warning";
  /**
   * Optional typed semantic identifier for the toast. Use this instead of
   * string-matching messages (e.g. 'recording-started').
   */
  type?:
    | "recording-started"
    | "recording-stopped"
    | "reconnecting"
    | "reconnected"
    | "connection-error"
    | "auth-required"
    | "transcript-ready"
    | "ai-response"
    | "stream-canceled";
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
  const lastToastRef = React.useRef<{
    id: string;
    message: string;
    ts: number;
  } | null>(null);
  const [ariaMessage, setAriaMessage] = React.useState<string>("");
  const [ariaPoliteness, setAriaPoliteness] = React.useState<
    "polite" | "assertive"
  >("polite");

  // Garbage collect expired toasts periodically
  React.useEffect(() => {
    const i = setInterval(() => dispatch({ type: "GC" }), 4000);
    return () => clearInterval(i);
  }, []);

  const push: ToastContextValue["push"] = useCallback((input) => {
    const id = input.id || crypto.randomUUID();
    // Dedupe recent identical messages (2s window)
    const now = Date.now();
    const msg = input.message;
    if (
      lastToastRef.current &&
      lastToastRef.current.message === msg &&
      now - lastToastRef.current.ts < 2000
    ) {
      // return existing toast id when deduping
      return lastToastRef.current.id;
    }
    const variant = input.variant || "info";
    dispatch({
      type: "PUSH",
      toast: {
        id,
        createdAt: Date.now(),
        ttlMs: 6000,
        variant,
        ...input,
      },
    });
    // Update aria-live region and lastToast ref
    lastToastRef.current = { id, message: msg, ts: now };
    setAriaMessage(msg);
    // map variant -> politeness: errors/warnings are assertive
    if (variant === "error" || variant === "warning") {
      setAriaPoliteness("assertive");
    } else {
      setAriaPoliteness("polite");
    }
    return id;
  }, []);

  const dismiss = useCallback(
    (id: string) => dispatch({ type: "DISMISS", id }),
    [],
  );

  return (
    <ToastContext.Provider value={{ toasts: state.toasts, push, dismiss }}>
      {/* aria-live region for screen readers - polite/assertive based on toast severity */}
      <div
        aria-live={ariaPoliteness}
        aria-atomic="true"
        style={{
          position: "absolute",
          left: -9999,
          width: 1,
          height: 1,
          overflow: "hidden",
        }}
      >
        {ariaMessage}
      </div>
      {children}
    </ToastContext.Provider>
  );
}

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToasts must be used within ToastProvider");
  return ctx;
}
