"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToasts } from "@/lib/toasts";

type ServiceName = "python" | "go";
type RuntimeState = "active" | "idle" | "unreachable";
type ActionState = {
  service: ServiceName;
  action: "wake" | "restart";
};
type RuntimeHealth = {
  status: RuntimeState;
  latency: number;
};

type SystemActionError = {
  error?: string;
  missing?: string[];
};

type SystemActionResult =
  | { ok: true }
  | { ok: false; status?: number; payload?: SystemActionError };

type AccountDrawerProps = {
  open: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
};

function getStatusMeta(status: RuntimeState): {
  label: string;
  dotClassName: string;
  textClassName: string;
} {
  if (status === "active") {
    return {
      label: "Active",
      dotClassName: "bg-success",
      textClassName: "text-foreground",
    };
  }
  if (status === "idle") {
    return {
      label: "Idle",
      dotClassName: "bg-muted",
      textClassName: "text-muted-foreground",
    };
  }
  return {
    label: "Unreachable",
    dotClassName: "bg-destructive",
    textClassName: "text-destructive",
  };
}

const UNREACHABLE: RuntimeHealth = {
  status: "unreachable",
  latency: -1,
};

function isRuntimeState(value: unknown): value is RuntimeState {
  return value === "active" || value === "idle" || value === "unreachable";
}

function coerceRuntimeHealth(input: unknown): RuntimeHealth {
  if (
    typeof input === "object" &&
    input !== null &&
    "status" in input &&
    "latency" in input &&
    isRuntimeState((input as { status: unknown }).status) &&
    typeof (input as { latency: unknown }).latency === "number"
  ) {
    return {
      status: (input as { status: RuntimeState }).status,
      latency: (input as { latency: number }).latency,
    };
  }

  return UNREACHABLE;
}

function useSystemHealth(open: boolean) {
  const [pythonStatus, setPythonStatus] = useState<RuntimeHealth>(UNREACHABLE);
  const [goStatus, setGoStatus] = useState<RuntimeHealth>(UNREACHABLE);
  const [busyAction, setBusyAction] = useState<ActionState | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/system/status", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("status-unavailable");
      }

      const payload = (await response.json()) as {
        python?: unknown;
        go?: unknown;
      };

      setPythonStatus(coerceRuntimeHealth(payload.python));
      setGoStatus(coerceRuntimeHealth(payload.go));
    } catch {
      setPythonStatus(UNREACHABLE);
      setGoStatus(UNREACHABLE);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    void fetchStatus();
    const intervalId = window.setInterval(() => {
      void fetchStatus();
    }, 30000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [open, fetchStatus]);

  const wake = useCallback(
    async (service: ServiceName): Promise<SystemActionResult> => {
      setBusyAction({ service, action: "wake" });
      try {
        const response = await fetch("/api/system/warm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ service }),
        });

        if (response.ok) {
          return { ok: true };
        }

        let payload: SystemActionError | undefined;
        try {
          payload = (await response.json()) as SystemActionError;
        } catch {
          payload = undefined;
        }

        return { ok: false, status: response.status, payload };
      } catch {
        return { ok: false };
      } finally {
        await fetchStatus();
        setBusyAction(null);
      }
    },
    [fetchStatus],
  );

  const restart = useCallback(
    async (service: ServiceName): Promise<SystemActionResult> => {
      setBusyAction({ service, action: "restart" });
      try {
        const response = await fetch("/api/system/restart", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ service }),
        });

        if (response.ok) {
          return { ok: true };
        }

        let payload: SystemActionError | undefined;
        try {
          payload = (await response.json()) as SystemActionError;
        } catch {
          payload = undefined;
        }

        return { ok: false, status: response.status, payload };
      } catch {
        return { ok: false };
      } finally {
        await fetchStatus();
        setBusyAction(null);
      }
    },
    [fetchStatus],
  );

  return {
    pythonStatus,
    goStatus,
    wake,
    restart,
    isWaking: (service: ServiceName) =>
      busyAction?.service === service && busyAction.action === "wake",
    isRestarting: (service: ServiceName) =>
      busyAction?.service === service && busyAction.action === "restart",
    isBusy: (service: ServiceName) => busyAction?.service === service,
  };
}

export function AccountDrawer({
  open,
  onClose,
  onOpenLogin,
  onOpenRegister,
}: AccountDrawerProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { push } = useToasts();
  const {
    pythonStatus,
    goStatus,
    wake,
    restart,
    isWaking,
    isRestarting,
    isBusy,
  } = useSystemHealth(open);

  const pyMeta = getStatusMeta(pythonStatus.status);
  const goMeta = getStatusMeta(goStatus.status);

  const handleWake = async (service: ServiceName) => {
    const result = await wake(service);
    const ok = result.ok;
    const isMissingEnv =
      !result.ok && result.payload?.error === "missing-environment";
    push({
      message: ok
        ? `${service === "python" ? "Python runtime" : "Go gateway"} wake requested`
        : isMissingEnv
          ? "Wake not configured"
          : "Wake request unavailable",
      variant: ok ? "success" : "warning",
    });
  };

  const handleRestart = async (service: ServiceName) => {
    const result = await restart(service);
    const ok = result.ok;
    const isMissingEnv =
      !result.ok && result.payload?.error === "missing-environment";
    push({
      message: ok
        ? `${service === "python" ? "Python runtime" : "Go gateway"} restarting`
        : isMissingEnv
          ? "Restart not configured"
          : "Restart request unavailable",
      variant: ok ? "success" : "warning",
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close account drawer"
        className={`fixed inset-0 z-75 bg-black/8 dark:bg-black/48 transition-opacity duration-(--motion-medium) ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Account drawer"
        className={`fixed top-3 bottom-3 right-3 z-80 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl bg-linear-to-br from-(--color-background) via-(--color-card) to-(--color-primary) dark:bg-card/98 backdrop-blur-xl border border-border ring-1 ring-black/10 dark:ring-white/10 p-4 overflow-y-auto transition-[opacity,transform] duration-(--motion-medium) border-structural ${open ? "translate-x-0 opacity-100 pointer-events-auto" : "translate-x-6 opacity-0 pointer-events-none"}`}
        style={{
          boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-primary">Account</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-structural text-muted-foreground hover:text-foreground hover:bg-hover/20 transition-[opacity,transform] duration-(--motion-medium) hover:-translate-y-px"
            aria-label="Close account drawer"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6l12 12M18 6L6 18"
              />
            </svg>
          </button>
        </div>

        <section className="mb-5">
          <h3 className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">
            Profile
          </h3>
          {isAuthenticated ? (
            <div className="rounded-xl border border-border bg-linear-to-br from-(--color-surface) via-(--color-background) to-(--color-card) dark:bg-background/35 p-3">
              <p className="text-sm font-medium text-primary">
                {user?.name || "Nargis user"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {user?.email}
              </p>
              <button
                type="button"
                onClick={logout}
                className="mt-3 text-xs px-2.5 py-1.5 rounded-md border border-structural-thick bg-background/80 text-primary hover:bg-hover/40 transition-[opacity,transform] duration-(--motion-medium)"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-structural bg-linear-to-br from-(--color-surface) via-(--color-background) to-(--color-card) dark:bg-background/35 p-3 flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenLogin}
                className="text-xs px-2.5 py-1.5 rounded-md border border-structural-thick bg-primary text-primary-foreground hover:opacity-95 transition-[opacity,transform] duration-(--motion-medium)"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={onOpenRegister}
                className="text-xs px-2.5 py-1.5 rounded-md border border-structural-thick bg-background/80 text-primary hover:bg-hover/40 transition-[opacity,transform] duration-(--motion-medium)"
              >
                Sign Up
              </button>
            </div>
          )}
        </section>

        <section className="mb-5">
          <h3 className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">
            Preferences
          </h3>
          <div className="rounded-xl border border-structural bg-linear-to-br from-(--color-surface) via-(--color-background) to-(--color-card) dark:bg-background/35 p-3 text-xs text-muted-foreground">
            Theme and interaction preferences stay synced with your current
            workspace.
          </div>
        </section>

        <section className="mb-5">
          <h3 className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">
            Memory
          </h3>
          <div className="rounded-xl border border-structural bg-linear-to-br from-(--color-surface) via-(--color-background) to-(--color-card) dark:bg-background/35 p-3 text-xs text-muted-foreground">
            Conversation memory and productivity context are available in your
            active session.
          </div>
        </section>

        <section>
          <h3 className="text-xs uppercase tracking-wide text-foreground/80 dark:text-muted-foreground mb-2">
            System Health
          </h3>
          <div className="rounded-xl border border-structural bg-background/96 dark:bg-background/35 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  Python Runtime
                </p>
                <div className="mt-1 inline-flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${pyMeta.dotClassName}`}
                    aria-hidden="true"
                  />
                  <span className={`text-xs ${pyMeta.textClassName}`}>
                    {pyMeta.label}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {pythonStatus.latency >= 0
                    ? `${pythonStatus.latency} ms`
                    : "No response"}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleWake("python")}
                  disabled={isBusy("python")}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-structural bg-transparent text-foreground hover:bg-hover/20 disabled:opacity-60 transition-[opacity,transform] duration-(--motion-medium)"
                >
                  {isWaking("python") ? "Waking…" : "Wake"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRestart("python")}
                  disabled={isBusy("python")}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-structural-thick bg-transparent text-foreground hover:bg-hover/20 disabled:opacity-60 transition-[opacity,transform] duration-(--motion-medium)"
                >
                  {isRestarting("python") ? "Restarting…" : "Restart"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground">
                  Go Gateway
                </p>
                <div className="mt-1 inline-flex items-center gap-1.5">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${goMeta.dotClassName}`}
                    aria-hidden="true"
                  />
                  <span className={`text-xs ${goMeta.textClassName}`}>
                    {goMeta.label}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {goStatus.latency >= 0
                    ? `${goStatus.latency} ms`
                    : "No response"}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleWake("go")}
                  disabled={isBusy("go")}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-structural bg-transparent text-foreground hover:bg-hover/20 disabled:opacity-60 transition-[opacity,transform] duration-(--motion-medium)"
                >
                  {isWaking("go") ? "Waking…" : "Wake"}
                </button>
                <button
                  type="button"
                  onClick={() => handleRestart("go")}
                  disabled={isBusy("go")}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-structural-thick bg-transparent text-foreground hover:bg-hover/20 disabled:opacity-60 transition-[opacity,transform] duration-(--motion-medium)"
                >
                  {isRestarting("go") ? "Restarting…" : "Restart"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </>
  );
}
