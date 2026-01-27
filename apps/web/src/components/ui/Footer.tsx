"use client";

import { useEffect, useState } from "react";
import { VoiceInputButton } from "@/components/ui/VoiceInputButton";

function CompactVoiceControl() {
  // Render the shared voice input control in compact mode for the footer
  return (
    <VoiceInputButton
      size="sm"
      showStatus={true}
      statusInline={true}
      variantOverride="btn-icon-primary btn-icon-sm rounded-lg"
      iconTranslateY={5}
      iconSizeClass="w-8 h-8"
    />
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
      className={`fixed bottom-4 left-4 right-4 z-40 transition-all duration-300 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      <div className="max-w-2xl mx-auto">
        <div
          className={`surface-elevated rounded-2xl transition-all duration-300 ${
            isScrolled ? "shadow-lg" : "shadow-sm"
          }`}
        >
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between h-12 text-sm">
              <div className="flex items-center space-x-4">
                <p className="text-muted-foreground">
                  © 2025{" "}
                  <span className="font-semibold text-foreground">Nargis</span>
                </p>
                <div className="hidden sm:flex items-center space-x-2">
                  <span
                    className="w-2 h-2 rounded-full bg-success"
                    aria-hidden
                  />
                  <span className="text-muted-foreground font-medium text-xs">
                    Voice Ready
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Render the compact voice button with inline status here so footer uses the same source of truth */}
                <CompactVoiceControl />
              </div>

              <div className="flex items-center space-x-3 text-muted-foreground">
                <div className="hidden md:flex items-center space-x-2">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-primary/60"
                    aria-hidden
                  />
                  <span className="text-xs font-medium">
                    Premium AI Productivity
                  </span>
                </div>
                <div className="w-px h-3 bg-border/50" aria-hidden />
                <small className="text-xs text-muted-foreground" aria-hidden>
                  v1.x
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
