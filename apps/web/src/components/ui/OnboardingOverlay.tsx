"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { InfoControl } from "./InfoControl";

const ONBOARDING_KEY = "nargis:onboarding-dismissed:v2";

export function OnboardingOverlay() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const openFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    const done = localStorage.getItem(ONBOARDING_KEY) === "true";
    setDismissed(done);

    if (pathname === "/" && !done) {
      setOverlayMounted(true);
      openFrameRef.current = window.requestAnimationFrame(() => {
        setOverlayVisible(true);
      });
    } else {
      setOverlayMounted(false);
      setOverlayVisible(false);
    }

    return () => {
      if (openFrameRef.current !== null) {
        window.cancelAnimationFrame(openFrameRef.current);
        openFrameRef.current = null;
      }
    };
  }, [pathname]);

  const openOverlay = () => {
    setOverlayMounted(true);
    openFrameRef.current = window.requestAnimationFrame(() => {
      setOverlayVisible(true);
    });
  };

  const closeOverlay = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setDismissed(true);
    setOverlayVisible(false);
  };

  const handlePanelTransitionEnd = () => {
    if (!overlayVisible) {
      setOverlayMounted(false);
    }
  };

  if (!mounted || pathname !== "/") return null;

  return (
    <>
      {overlayMounted &&
        createPortal(
          <>
            <div
              className={`fixed inset-0 z-65 bg-black/24 transition-opacity duration-(--motion-medium) ${overlayVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
              aria-hidden="true"
              onClick={closeOverlay}
            />

            <section
              role="dialog"
              aria-modal="true"
              aria-label="Onboarding"
              onTransitionEnd={handlePanelTransitionEnd}
              className={`fixed top-20 left-1/2 z-70 w-[min(34rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-structural p-5 transition-[opacity,transform] duration-(--motion-medium) ${overlayVisible ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-3 opacity-0 pointer-events-none"}`}
              style={{
                background:
                  "radial-gradient(circle at 12% 14%, color-mix(in srgb, var(--primary) 4%, transparent), transparent 70%), var(--surface)",
                boxShadow: "var(--shadow-1)",
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base leading-6 font-semibold gradient-onboarding-text">
                    Speak your productivity with Nargis
                  </h2>
                  <p className="text-sm text-muted-foreground mt-3 leading-7">
                    Welcome to your voice-first workspace. Keep one calm
                    conversation lane and use sidebar prompts for planning,
                    journaling, habits, and focus sessions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-structural text-muted-foreground hover:text-foreground hover:bg-hover/20 transition-[opacity,transform] duration-(--motion-medium) hover:-translate-y-px"
                  aria-label="Close onboarding"
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

              <div className="mt-4 rounded-xl border border-structural bg-card/65 p-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Voice-First Productivity
                </h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  Every feature is designed for seamless voice interaction and
                  natural conversation.
                </p>
              </div>

              <div className="mt-4 text-sm text-muted-foreground space-y-3">
                <h3 className="font-semibold text-foreground">
                  How to use Nargis
                </h3>
                <ol className="list-decimal list-inside space-y-2 leading-6">
                  <li>
                    Click the microphone or press "Try Voice Assistant" to start
                    speaking.
                  </li>
                  <li>
                    Use short, conversational commands like "Create a task",
                    "Start Pomodoro", or "Track habit".
                  </li>
                  <li>
                    Use starter prompts and then customize them to match your
                    workflow.
                  </li>
                  <li>
                    Explore the dashboard for insights and manage sessions from
                    the sidebar.
                  </li>
                </ol>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={closeOverlay}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-md border border-structural bg-card text-foreground hover:bg-hover/20 transition-[opacity,transform] duration-(--motion-medium)"
                >
                  Got it
                </button>
              </div>
            </section>
          </>,
          document.body,
        )}

      {dismissed && !overlayMounted && <InfoControl onClick={openOverlay} />}
    </>
  );
}
