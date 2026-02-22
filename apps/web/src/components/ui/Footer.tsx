"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { OnboardingOverlay } from "./OnboardingOverlay";
import { VoiceControl } from "./VoiceControl";

export function Footer() {
  const footerRef = useRef<HTMLElement | null>(null);
  const [draft, setDraft] = useState("");
  const { sendUserMessage } = useRealtime();

  // Measure footer height and publish to CSS custom property so other
  // layout pieces (chat panel) can reserve appropriate space.
  useEffect(() => {
    const updateFooterOffset = () => {
      const el = footerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // add a small gap (16px) so content doesn't butt up against the footer
      const offset = Math.ceil(rect.height + 16);
      document.documentElement.style.setProperty(
        "--app-footer-offset",
        `${offset}px`,
      );
    };

    updateFooterOffset();
    const ro = new ResizeObserver(updateFooterOffset);
    if (footerRef.current) ro.observe(footerRef.current);
    window.addEventListener("resize", updateFooterOffset);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateFooterOffset);
    };
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = draft.trim();
    if (!message) return;
    sendUserMessage(message);
    setDraft("");
  };

  return (
    <footer
      ref={footerRef}
      className="fixed bottom-3 left-2 right-0 z-40 md:left-[calc(var(--sidebar-active-width)+0.5rem)] rounded-xl border border-structural bg-card backdrop-blur-sm"
    >
      <div className="pl-2 pr-1 sm:pl-3 sm:pr-1">
        <div className="w-full max-w-none ml-auto py-3.5">
          <form
            onSubmit={handleSubmit}
            className="footer-conversation-shell relative flex items-center gap-2.5"
          >
            <label htmlFor="footer-chat-input" className="sr-only">
              Send a message
            </label>
            <input
              id="footer-chat-input"
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message…"
              className="h-10 flex-1 rounded-xl border border-structural bg-background/95 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
              autoComplete="off"
            />
            <button
              type="submit"
              className="h-10 px-3 rounded-xl border border-structural bg-background text-sm font-medium text-foreground hover:text-foreground transition-[opacity,transform] duration-(--motion-medium) hover:-translate-y-px"
            >
              Send
            </button>

            <div className="footer-voice-anchor relative shrink-0 ml-auto flex items-center justify-end">
              <VoiceControl inline showMeta={false} />
              <OnboardingOverlay />
            </div>
          </form>
        </div>
      </div>
    </footer>
  );
}
