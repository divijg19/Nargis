"use client";

import { useRealtime } from "@/contexts/RealtimeContext";

export default function FloatingChatButton() {
  const { setOpenConversation } = useRealtime();

  return (
    <button
      type="button"
      aria-label="Open conversation"
      data-floating-chat
      onClick={() => setOpenConversation(true)}
      className="fixed bottom-6 right-6 z-60 w-12 h-12 rounded-full bg-primary text-white shadow-xl flex items-center justify-center transition-shadow hover:shadow-2xl"
    >
      💬
    </button>
  );
}
