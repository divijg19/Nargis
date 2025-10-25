"use client";

import { useEffect, useState } from "react";
import { ConnectionStatusIndicator } from "@/components/ui/ConnectionStatusIndicator";
import { useRealtime } from "@/contexts/RealtimeContext";

function CompactVoiceControl() {
  const { isListening, startListening, stopListening, connectionStatus } =
    useRealtime();
  // Do not completely disable the footer control while connecting; allow
  // clicks so users can initiate a connection from the footer as well.
  const disabled = false;

  return (
    <div className="hidden sm:block">
      <button
        type="button"
        aria-pressed={isListening}
        disabled={disabled}
        onClick={() => {
          if (isListening) stopListening();
          else startListening();
        }}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary/10 ${isListening ? "bg-destructive text-white border-2 border-white/20 shadow-md" : "bg-primary text-white border border-transparent hover:border-primary/30"} disabled:opacity-50 disabled:cursor-not-allowed leading-none`}
        title={
          connectionStatus === "connecting"
            ? "Connecting..."
            : isListening
              ? "Stop listening"
              : "Start listening"
        }
      >
        <span className="sr-only">Voice</span>
        {isListening ? (
          <svg
            className="w-6 h-6 block mx-auto leading-none"
            style={{ transform: "translateY(2px)" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <title>Stop recording</title>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12" />
          </svg>
        ) : (
          <svg
            className="w-6 h-6 block mx-auto leading-none"
            style={{ transform: "translateY(5px)" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <title>Start recording</title>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 1v11m0 0a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3z"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

export function Footer() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPercentage = currentScrollY / (documentHeight - windowHeight);

      // Update scrolled state for background opacity
      setIsScrolled(currentScrollY > 20);

      // Show footer when near bottom or scrolling up
      if (
        scrollPercentage > 0.8 ||
        currentScrollY < lastScrollY ||
        currentScrollY < 100
      ) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 200) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <footer
      className={`
        fixed bottom-4 left-4 right-4 z-40 transition-all duration-300 ease-out
        ${isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}
      `}
    >
      <div className="max-w-2xl mx-auto">
        <div
          className={`
          backdrop-blur-xl rounded-2xl border transition-all duration-300
          ${isScrolled
              ? "bg-background/95 border-border/50 shadow-lg shadow-primary/5"
              : "bg-background/80 border-border/30 shadow-sm"
            }
        `}
        >
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between h-12 text-sm">
              <div className="flex items-center space-x-4">
                <p className="text-muted-foreground">
                  © 2025{" "}
                  <span className="font-semibold text-foreground">Nargis</span>
                </p>
                <div className="hidden sm:flex items-center space-x-2">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-success animate-ping opacity-75" />
                  </div>
                  <span className="text-muted-foreground font-medium text-xs">
                    Voice Ready
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="hidden sm:block">
                  <ConnectionStatusIndicator />
                </div>
                <CompactVoiceControl />
              </div>

              <div className="flex items-center space-x-3 text-muted-foreground">
                <div className="hidden md:flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="text-xs font-medium">
                    Premium AI Productivity
                  </span>
                </div>
                <div className="w-px h-3 bg-border/50" />
                <span className="text-xs font-semibold text-foreground">
                  v0.5
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
