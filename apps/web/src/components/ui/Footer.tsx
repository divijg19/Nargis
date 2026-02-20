"use client";

import { useEffect, useRef, useState } from "react";

export function Footer() {
  const footerRef = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

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

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPercentage = currentScrollY / (documentHeight - windowHeight);

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
      ref={footerRef}
      className={`fixed bottom-4 left-4 right-4 z-40 transition-[opacity,transform] duration-300 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
      }`}
    >
      <div className="max-w-2xl mx-auto">
        <div className="surface-elevated border-structural rounded-2xl transition-[color,background-color,border-color,opacity,box-shadow,transform] duration-300">
          <div className="px-4 sm:px-6">
            <div className="flex items-center justify-between h-12 text-sm">
              <div className="flex items-center space-x-4">
                <p className="text-muted-foreground">
                  © 2025{" "}
                  <span className="font-semibold text-foreground">Nargis</span>
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-[color,background-color,border-color,opacity,box-shadow,transform]"
                  aria-label="System"
                >
                  System
                </button>
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
