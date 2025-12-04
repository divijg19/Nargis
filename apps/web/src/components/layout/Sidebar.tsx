"use client";

import {
  CalendarDaysIcon,
  ChartBarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  PencilSquareIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToasts } from "@/contexts/ToastContext";

type SidebarProps = {
  /** When true the mobile overlay is visible */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

type Prompt = {
  title: string;
  subtitle: string;
  prompt: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onMobileClose,
}) => {
  const { resolvedTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<HTMLButtonElement | null>(null);
  const mobileAsideRef = useRef<HTMLDivElement | null>(null);
  const collapseButtonRef = useRef<HTMLButtonElement | null>(null);
  const newSessionButtonRef = useRef<HTMLButtonElement | null>(null);

  const baseBg = resolvedTheme === "dark" ? "bg-gray-900" : "bg-gray-100";
  const baseBorder =
    resolvedTheme === "dark" ? "border-gray-800" : "border-gray-200";

  const examplePrompts: Prompt[] = [
    {
      title: "Plan my day",
      subtitle: "then list my top 3 priorities",
      prompt: "Plan my day: list my top 3 priorities",
      icon: CalendarDaysIcon,
    },
    {
      title: "Start a journal entry",
      subtitle: "about my progress this week",
      prompt: "Start a journal entry about my progress this week",
      icon: PencilSquareIcon,
    },
    {
      title: "Track a new habit",
      subtitle: "like 'read for 15 minutes daily'",
      prompt: "Track a new habit: read for 15 minutes daily",
      icon: ChartBarIcon,
    },
    {
      title: "Begin a focus session",
      subtitle: "by saying 'start Pomodoro'",
      prompt: "Begin a focus session: start Pomodoro",
      icon: ClockIcon,
    },
  ];

  const { push } = useToasts();
  const { sendUserMessage } = useRealtime();

  const handleNewSession = () => {
    push({ message: "New session started.", variant: "info" });
  };

  const handleCardClick = (prompt: string) => {
    push({ message: prompt, variant: "info" });
    onMobileClose?.();
  };

  const handleCopy = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      push({ message: "Copied to clipboard", variant: "success" });
      setTimeout(() => setCopiedIndex(null), 1600);
    } catch {
      push({ message: "Copy failed", variant: "error" });
    }
  };

  // When collapsing/expanding, manage focus for accessibility
  useEffect(() => {
    if (collapsed) {
      // focus the collapse button when collapsed
      collapseButtonRef.current?.focus();
    } else {
      // when expanded, focus the New Session button for keyboard users
      newSessionButtonRef.current?.focus();
    }
  }, [collapsed]);

  // Width classes transition for collapse (expanded wider)
  // collapsed: 5rem (w-20) for icons-only; expanded: 18rem (w-72)
  const widthClass = collapsed ? "w-16" : "w-72";

  // Mobile overlay styles
  const mobileOverlayClass = mobileOpen ? "fixed inset-0 z-40" : "hidden";

  return (
    <>
      {/* Persistent sidebar for md+ screens */}
      <aside
        className={`hidden md:flex ${widthClass} flex-col h-screen pt-8 ${baseBg} border-r ${baseBorder} transition-all duration-300 ease-in-out`}
      >
        <div className="p-4 flex items-center">
          <button
            ref={newSessionButtonRef}
            type="button"
            className={
              !collapsed
                ? "btn btn-primary px-3 py-2 text-sm w-full flex items-center gap-2 justify-start"
                : "p-2 rounded bg-primary text-primary-foreground"
            }
            onClick={handleNewSession}
            aria-label="New session"
            title={!collapsed ? undefined : "New session"}
          >
            <PlusIcon className="w-5 h-5" />
            {!collapsed && <span>New Session</span>}
          </button>
        </div>

        <div className="px-4 py-2">
          {!collapsed && (
            <h3 className="text-sm font-semibold mb-2">Get Started</h3>
          )}

          {!collapsed && (
            <div className="flex flex-col space-y-2">
              {examplePrompts.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <div key={p.title} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        // Primary click should insert into conversation for a fast flow
                        sendUserMessage(p.prompt);
                        onMobileClose?.();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-white/60 dark:bg-white/3 hover:shadow hover:scale-[1.01] transition transform"
                    >
                      <div className="flex items-center gap-3">
                        {Icon && (
                          <div className="icon-surface w-8 h-8 flex items-center justify-center">
                            <Icon className="w-4 h-4" aria-hidden />
                          </div>
                        )}
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">
                            {p.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopy(p.prompt, idx)}
                        aria-label={`Copy prompt ${p.title}`}
                        className="p-1 rounded text-muted-foreground hover:text-foreground"
                      >
                        {copiedIndex === idx ? (
                          <CheckIcon className="w-4 h-4 text-green-400" />
                        ) : (
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* When collapsed show icon list with tooltips */}
          {collapsed && (
            <div className="flex flex-col items-center space-y-3 py-4">
              <button
                type="button"
                onClick={handleNewSession}
                title="New session"
                aria-label="New session"
                className="p-2 rounded hover:bg-hover/40"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
              {examplePrompts.map((p, _idx) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => handleCardClick(p.prompt)}
                    title={p.title}
                    aria-label={p.title}
                    className="p-2 rounded hover:bg-hover/40"
                  >
                    {Icon ? (
                      <div className="icon-surface w-8 h-8 flex items-center justify-center">
                        <Icon className="w-4 h-4" aria-hidden />
                      </div>
                    ) : (
                      <svg
                        className="w-5 h-5 text-muted-foreground"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M4 6h16M4 12h16M4 18h8"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-auto p-3">
          <button
            ref={collapseButtonRef}
            type="button"
            onClick={() => setCollapsed((s) => !s)}
            className="w-full flex items-center justify-center gap-2 rounded-md px-3 py-2 border bg-transparent hover:bg-hover/40 transition"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <ChevronRightIcon className="w-5 h-5" />
            ) : (
              <ChevronLeftIcon className="w-5 h-5" />
            )}
            {!collapsed && <span className="text-sm">Collapse</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay variant */}
      <div className={mobileOverlayClass}>
        <button
          ref={overlayRef}
          type="button"
          onClick={onMobileClose}
          aria-label="Close sidebar overlay"
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close sidebar"
          className="sr-only"
          onClick={onMobileClose}
        />
        <aside
          ref={mobileAsideRef}
          role={mobileOpen ? "dialog" : undefined}
          // `aria-modal` is only valid for elements with role="dialog" — we avoid setting it directly on an `aside` element
          aria-label="Sidebar"
          className={`fixed left-0 top-0 h-full z-50 w-72 pt-16 ${baseBg} border-r ${baseBorder} transform transition-transform duration-300 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="p-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="btn btn-primary px-3 py-2 text-sm w-full flex items-center gap-2 justify-start"
                onClick={handleNewSession}
              >
                <PlusIcon className="w-5 h-5" />
                <span>New Session</span>
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-3">Get Started</h3>
              <div className="flex flex-col space-y-2">
                {examplePrompts.map((p, idx) => (
                  <div key={p.title} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        // mobile primary tap inserts into conversation like desktop
                        sendUserMessage(p.prompt);
                        onMobileClose?.();
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-lg bg-white/60 dark:bg-white/3 hover:shadow transition"
                    >
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">
                          {p.title}
                        </p>
                      </div>
                      <div className="shrink-0 ml-3 text-right">
                        <p className="text-xs text-muted-foreground">
                          {p.subtitle}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(p.prompt, idx)}
                      aria-label={`Copy prompt ${p.title}`}
                      className="absolute right-2 top-2 p-1 rounded text-muted-foreground hover:text-foreground"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile focus trap & escape handler */}
      {typeof window !== "undefined" && (
        <>
          {/* Hook into mobileOpen changes to trap focus and handle Escape */}
          {mobileOpen &&
            (() => {
              const mAside = mobileAsideRef.current;
              const prevActive = document.activeElement as HTMLElement | null;

              const focusableSelector =
                'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
              const focusFirst = () => {
                const els =
                  mAside?.querySelectorAll<HTMLElement>(focusableSelector) ??
                  [];
                if (els.length) els[0].focus();
                else mAside?.focus();
              };

              const onKey = (e: KeyboardEvent) => {
                if (e.key === "Escape") {
                  onMobileClose?.();
                }
                if (e.key === "Tab") {
                  const els = Array.from(
                    mAside?.querySelectorAll<HTMLElement>(focusableSelector) ??
                      [],
                  );
                  if (!els.length) return;
                  const first = els[0];
                  const last = els[els.length - 1];
                  if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                  } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                  }
                }
              };

              // tiny timeout to allow panel open animation
              setTimeout(() => focusFirst(), 120);
              document.addEventListener("keydown", onKey);

              return () => {
                document.removeEventListener("keydown", onKey);
                prevActive?.focus();
              };
            })()}
        </>
      )}
    </>
  );
};

export default Sidebar;
