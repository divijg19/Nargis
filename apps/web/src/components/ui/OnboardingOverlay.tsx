"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
      {overlayMounted && (
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
            className={`fixed top-20 left-1/2 z-70 w-[min(30rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-structural p-5 transition-[opacity,transform] duration-(--motion-medium) ${overlayVisible ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-3 opacity-0 pointer-events-none"}`}
            style={{
              background:
                "radial-gradient(circle at 12% 14%, color-mix(in srgb, var(--primary) 8%, transparent), transparent 62%), var(--surface)",
              boxShadow: "var(--shadow-1)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-medium gradient-onboarding-text">
                  Speak your productivity with Nargis
                </h2>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  Welcome to your voice-first workspace. Keep one calm
                  conversation lane and use sidebar prompts for planning,
                  journaling, habits, and focus sessions.
                </p>
              </div>
              <button
                type="button"
                onClick={closeOverlay}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-structural text-muted-foreground hover:text-foreground transition-[opacity,transform] duration-(--motion-medium) hover:scale-[1.03]"
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

            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={closeOverlay}
                className="text-xs px-2.5 py-1.5 rounded-md border border-structural text-foreground hover:bg-hover/25 transition-[opacity,transform] duration-(--motion-medium)"
              >
                Got it
              </button>
            </div>
          </section>
        </>
      )}

      {dismissed && !overlayMounted && <InfoControl onClick={openOverlay} />}
    </>
  );
}
