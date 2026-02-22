"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { PromptList, type SidebarPrompt } from "./PromptList";

export function SidebarDesktop({
  collapsed,
  prompts,
  copiedIndex,
  onToggleCollapsed,
  onNewSession,
  onPromptSelect,
  onCopy,
  collapseButtonRef,
  newSessionButtonRef,
}: {
  collapsed: boolean;
  prompts: SidebarPrompt[];
  copiedIndex: number | null;
  onToggleCollapsed: () => void;
  onNewSession: () => void;
  onPromptSelect: (prompt: string) => void;
  onCopy: (prompt: string, idx: number) => void;
  collapseButtonRef: React.RefObject<HTMLButtonElement | null>;
  newSessionButtonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <aside
      data-collapsed={collapsed ? "true" : "false"}
      className="sidebar-desktop hidden md:flex flex-col h-full pt-2 bg-surface/75 border-structural-right overflow-y-auto"
    >
      <div
        className={
          collapsed
            ? "px-2 pb-2 pt-2 flex items-center justify-center"
            : "px-3 pb-2 pt-2 flex items-center justify-start gap-2"
        }
      >
        <button
          ref={collapseButtonRef}
          type="button"
          onClick={onToggleCollapsed}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/35 bg-transparent hover:bg-hover/20 transition-[color,background-color,border-color,opacity,box-shadow,transform]"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      <div
        className={
          collapsed
            ? "p-2 flex items-center justify-center"
            : "p-3 flex items-center"
        }
      >
        <button
          ref={newSessionButtonRef}
          type="button"
          className={
            !collapsed
              ? "btn btn-secondary px-3 py-2 text-sm w-full flex items-center gap-2 justify-start"
              : "p-2 rounded border border-border/40 text-foreground bg-transparent w-9 h-9 inline-flex items-center justify-center"
          }
          onClick={onNewSession}
          aria-label="New session"
          title={!collapsed ? undefined : "New session"}
        >
          <PlusIcon className="w-5 h-5" />
          {!collapsed && <span className="nav-label">New Session</span>}
        </button>
      </div>

      <div className={collapsed ? "px-2 py-2" : "px-3 py-2"}>
        {!collapsed && (
          <h3 className="nav-label text-sm font-normal mb-2 text-muted-foreground">
            Get Started
          </h3>
        )}

        {!collapsed ? (
          <PromptList
            prompts={prompts}
            copiedIndex={copiedIndex}
            onSelect={onPromptSelect}
            onCopy={onCopy}
          />
        ) : (
          <PromptList
            prompts={prompts}
            compact
            copiedIndex={copiedIndex}
            onSelect={onPromptSelect}
            onCopy={onCopy}
          />
        )}
      </div>
    </aside>
  );
}
