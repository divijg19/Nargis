"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToasts } from "@/contexts/ToastContext";

type BackendState = "checking" | "online" | "offline";

type AccountDrawerProps = {
  open: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
};

function normalizeBaseUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function getStatusMeta(status: BackendState): {
  label: string;
  dotClassName: string;
  textClassName: string;
} {
  if (status === "online") {
    return {
      label: "Online",
      dotClassName: "bg-success",
      textClassName: "text-foreground",
    };
  }
  if (status === "checking") {
    return {
      label: "Checking",
      dotClassName: "bg-warning",
      textClassName: "text-muted-foreground",
    };
  }
  return {
    label: "Offline",
    dotClassName: "bg-destructive",
    textClassName: "text-muted-foreground",
  };
}

function formatRelativeMinutes(timestamp: number | null, tick: number) {
  void tick;
  if (!timestamp) return "Never";
  const deltaMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(deltaMs / 60000));
  if (minutes < 1) return "just now";
  return `${minutes}m ago`;
}

async function timedFetch(input: string, init?: RequestInit) {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
      credentials: "include",
    });
    const elapsed = Math.round(performance.now() - startedAt);
    return { ok: res.ok, elapsed };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function AccountDrawer({
  open,
  onClose,
  onOpenLogin,
  onOpenRegister,
}: AccountDrawerProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const { push } = useToasts();
  const apiBase = useMemo(
    () =>
      normalizeBaseUrl(
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
      ),
    [],
  );
  const gatewayBase = useMemo(
    () =>
      normalizeBaseUrl(
        process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8080",
      ),
    [],
  );

  const [pyStatus, setPyStatus] = useState<BackendState>("checking");
  const [goStatus, setGoStatus] = useState<BackendState>("checking");
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [busyAction, setBusyAction] = useState<"warm" | "restart" | null>(null);
  const [lastWarmEventAt, setLastWarmEventAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);

  const pyMeta = getStatusMeta(pyStatus);
  const goMeta = getStatusMeta(goStatus);

  useEffect(() => {
    if (!open) return;

    let mounted = true;

    const checkBackend = async (
      baseUrl: string,
      endpoints: string[],
      setStatus: (s: BackendState) => void,
    ) => {
      setStatus("checking");
      for (const endpoint of endpoints) {
        try {
          const { ok, elapsed } = await timedFetch(`${baseUrl}${endpoint}`);
          if (!mounted) return;
          if (ok) {
            setStatus("online");
            return elapsed;
          }
        } catch {
          // continue trying fallbacks
        }
      }
      if (mounted) setStatus("offline");
      return null;
    };

    const run = async () => {
      const [pyLatency, goLatency] = await Promise.all([
        checkBackend(apiBase, ["/v1/health", "/health", "/"], setPyStatus),
        checkBackend(gatewayBase, ["/healthz", "/health", "/"], setGoStatus),
      ]);

      if (!mounted) return;
      const samples = [pyLatency, goLatency].filter(
        (value): value is number => typeof value === "number",
      );
      setLatencyMs(
        samples.length > 0
          ? Math.round(
            samples.reduce((sum, value) => sum + value, 0) / samples.length,
          )
          : null,
      );
    };

    run();

    return () => {
      mounted = false;
    };
  }, [open, apiBase, gatewayBase]);

  useEffect(() => {
    if (!open) return;
    const intervalId = window.setInterval(() => {
      setNowTick((value) => value + 1);
    }, 60000);
    return () => window.clearInterval(intervalId);
  }, [open]);

  const runWarm = async () => {
    setBusyAction("warm");
    try {
      const res = await fetch(`${apiBase}/v1/agent/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger_type: "morning_briefing" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("warm-failed");
      setLastWarmEventAt(Date.now());
      push({ message: "Warm request sent", variant: "success" });
    } catch {
      push({ message: "Warm request failed", variant: "error" });
    } finally {
      setBusyAction(null);
    }
  };

  const runRestart = async () => {
    setBusyAction("restart");
    try {
      const res = await fetch(`${gatewayBase}/restart`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("restart-failed");
      push({ message: "Restart request sent", variant: "success" });
    } catch {
      push({ message: "Restart request unavailable", variant: "warning" });
    } finally {
      setBusyAction(null);
    }
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
        style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)" }}
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
          <h3 className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">Profile</h3>
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
          <h3 className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">Preferences</h3>
          <div className="rounded-xl border border-structural bg-linear-to-br from-(--color-surface) via-(--color-background) to-(--color-card) dark:bg-background/35 p-3 text-xs text-muted-foreground">
            Theme and interaction preferences stay synced with your current workspace.
          </div>
        </section>

        <section className="mb-5">
          <h3 className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">Memory</h3>
          <div className="rounded-xl border border-structural bg-linear-to-br from-(--color-surface) via-(--color-background) to-(--color-card) dark:bg-background/35 p-3 text-xs text-muted-foreground">
            Conversation memory and productivity context are available in your active session.
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
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={runWarm}
                  disabled={busyAction !== null}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-structural-thick bg-background/80 dark:bg-background/30 text-foreground hover:-translate-y-px disabled:opacity-60 transition-[opacity,transform] duration-(--motion-medium)"
                >
                  {busyAction === "warm" ? "Warming…" : "Warm"}
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
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <button
                  type="button"
                  onClick={runRestart}
                  disabled={busyAction !== null}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-structural-thick bg-background/80 dark:bg-background/30 text-foreground hover:-translate-y-px disabled:opacity-60 transition-[opacity,transform] duration-(--motion-medium)"
                >
                  {busyAction === "restart" ? "Restarting…" : "Restart"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground/75 dark:text-muted-foreground">Latency</span>
              <span className="text-foreground">
                {latencyMs === null ? "—" : `${latencyMs} ms`}
              </span>
            </div>

            <div
              className="text-[11px] text-foreground/75 dark:text-muted-foreground"
              aria-live="polite"
            >
              Last warm event: {formatRelativeMinutes(lastWarmEventAt, nowTick)}
            </div>
          </div>
        </section>
      </aside>
    </>
  );
}
