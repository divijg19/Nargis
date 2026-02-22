"use client";

import {
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import type { SidebarPrompt } from "@/components/layout/PromptList";
import { SidebarDesktop } from "@/components/layout/SidebarDesktop";
import { SidebarMobile } from "@/components/layout/SidebarMobile";
import { useRealtime } from "@/contexts/RealtimeContext";
import { useToasts } from "@/contexts/ToastContext";

type SidebarProps = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen = false,
  onMobileClose,
}) => {
  const [collapsed, setCollapsed] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("sidebarCollapsed") === "true",
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const collapseButtonRef = useRef<HTMLButtonElement | null>(null);
  const newSessionButtonRef = useRef<HTMLButtonElement | null>(null);

  const { push } = useToasts();
  const { sendUserMessage } = useRealtime();

  const prompts: SidebarPrompt[] = [
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

  const handleNewSession = () => {
    push({ message: "New session started.", variant: "info" });
  };

  const handlePromptSelect = (prompt: string) => {
    sendUserMessage(prompt);
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

  useEffect(() => {
    if (collapsed) collapseButtonRef.current?.focus();
    else newSessionButtonRef.current?.focus();
  }, [collapsed]);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty(
      "--sidebar-active-width",
      collapsed
        ? "var(--sidebar-width-collapsed)"
        : "var(--sidebar-width-expanded)",
    );
    return () => {
      root.style.setProperty(
        "--sidebar-active-width",
        "var(--sidebar-width-expanded)",
      );
    };
  }, [collapsed]);

  return (
    <>
      <SidebarDesktop
        collapsed={collapsed}
        prompts={prompts}
        copiedIndex={copiedIndex}
        onToggleCollapsed={() => setCollapsed((s) => !s)}
        onNewSession={handleNewSession}
        onPromptSelect={handlePromptSelect}
        onCopy={handleCopy}
        collapseButtonRef={collapseButtonRef}
        newSessionButtonRef={newSessionButtonRef}
      />

      <SidebarMobile
        mobileOpen={mobileOpen}
        prompts={prompts}
        copiedIndex={copiedIndex}
        onClose={onMobileClose}
        onNewSession={handleNewSession}
        onPromptSelect={handlePromptSelect}
        onCopy={handleCopy}
      />
    </>
  );
};

export default Sidebar;
