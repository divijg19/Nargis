"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { isFlagEnabled } from "@/flags/flags";
import { RealtimeConnection } from "@/realtime/connection";

interface RealtimeContextValue {
  status: "idle" | "connecting" | "open" | "closed" | "error" | "retrying";
  send: (msg: unknown) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | undefined>(
  undefined,
);

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RealtimeContextValue["status"]>("idle");
  const [conn, setConn] = useState<RealtimeConnection | null>(null);

  useEffect(() => {
    if (!isFlagEnabled("realtime")) return; // Feature flag gate
    const url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/ws";
    const c = new RealtimeConnection({ url, maxRetries: 6 });
    setConn(c);
    c.onStatus(setStatus);
    c.onMessage((msg) => {
      // TODO: Dispatch enrichment patches to domain contexts
      // eslint-disable-next-line no-console
      console.info("[realtime] message", msg);
    });
    return () => c.close();
  }, []);

  return (
    <RealtimeContext.Provider value={{ status, send: (m) => conn?.send(m) }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx)
    return { status: "idle", send: () => undefined } as RealtimeContextValue;
  return ctx;
}
