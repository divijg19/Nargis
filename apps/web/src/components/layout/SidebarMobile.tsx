"use client";

import { PlusIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";
import { PromptList, type SidebarPrompt } from "./PromptList";

export function SidebarMobile({
  mobileOpen,
  prompts,
  copiedIndex,
  onClose,
  onNewSession,
  onPromptSelect,
  onCopy,
}: {
  mobileOpen: boolean;
  prompts: SidebarPrompt[];
  copiedIndex: number | null;
  onClose?: () => void;
  onNewSession: () => void;
  onPromptSelect: (prompt: string) => void;
  onCopy: (prompt: string, idx: number) => void;
}) {
  const mobileOverlayClass = mobileOpen ? "fixed inset-0 z-40" : "hidden";
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobileOpen) return;

    const previous =
      typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

    const focusables = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ||
          [],
      );

    const moveInitialFocus = () => {
      const nodes = focusables();
      if (nodes.length > 0) nodes[0].focus();
    };

    moveInitialFocus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== "Tab") return;

      const nodes = focusables();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [mobileOpen, onClose]);

  return (
    <div className={mobileOverlayClass}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close sidebar overlay"
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sidebar"
        className={`fixed left-0 top-0 h-full z-50 w-68 pt-14 bg-surface/92 border-structural-right transform transition-transform duration-(--motion-medium) md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary px-3 py-2 text-sm w-full flex items-center gap-2 justify-start"
              onClick={onNewSession}
            >
              <PlusIcon className="w-5 h-5" />
              <span className="nav-label">New Session</span>
            </button>
          </div>

          <div className="mt-4">
            <h3 className="nav-label text-sm font-medium text-muted-foreground mb-3">
              Get Started
            </h3>
            <PromptList
              prompts={prompts}
              copiedIndex={copiedIndex}
              onSelect={onPromptSelect}
              onCopy={onCopy}
              mobile
            />
          </div>
        </div>
      </div>
    </div>
  );
}
