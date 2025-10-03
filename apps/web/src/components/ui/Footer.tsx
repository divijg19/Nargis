"use client";

import { useEffect, useState } from "react";

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
      <div className="max-w-5xl mx-auto">
        <div
          className={`
          backdrop-blur-xl rounded-2xl border transition-all duration-300
          ${
            isScrolled
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

              <div className="flex items-center space-x-3 text-muted-foreground">
                <div className="hidden md:flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  <span className="text-xs font-medium">
                    Premium AI Productivity
                  </span>
                </div>
                <div className="w-px h-3 bg-border/50" />
                <span className="text-xs font-semibold text-foreground">
                  v0.1
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
