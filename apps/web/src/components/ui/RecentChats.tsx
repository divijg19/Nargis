"use client";

import { useMemo, useState } from "react";
import { useRealtime } from "@/contexts/RealtimeContext";

interface RecentChatsProps {
  className?: string;
  maxChats?: number;
}

export function RecentChats({
  className = "",
  maxChats = 5,
}: RecentChatsProps) {
  const { messages, setOpenConversation } = useRealtime();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Group messages into conversations (user message + AI response pairs)
  const conversations = useMemo(() => {
    const convos: Array<{
      userMessage: string;
      aiMessage: string;
      timestamp: number;
    }> = [];

    for (let i = 0; i < messages.length; i++) {
      const current = messages[i];
      const next = messages[i + 1];

      // Look for user message followed by assistant message
      if (
        current.role === "user" &&
        next &&
        next.role === "assistant" &&
        next.ts - current.ts < 5000 // Within 5 seconds
      ) {
        convos.push({
          userMessage: current.text,
          aiMessage: next.text,
          timestamp: current.ts,
        });
        i++; // Skip the next message since we've paired it
      }
    }

    // Return most recent conversations first, limited to maxChats
    return convos.reverse().slice(0, maxChats);
  }, [messages, maxChats]);

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  const handleOpenFullConversation = () => {
    setOpenConversation(true);
  };

  if (conversations.length === 0) {
    return (
      <div className={`p-6 text-center ${className}`}>
        <div className="text-4xl mb-3" aria-hidden="true">
          💬
        </div>
        <p className="text-sm text-muted-foreground mb-1">
          No conversations yet
        </p>
        <p className="text-xs text-muted-foreground">
          Start chatting with Nargis to see your history here
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {conversations.map((convo, index) => {
        const isExpanded = expandedIndex === index;

        return (
          <div
            key={`${convo.timestamp}-${index}`}
            className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md transition-all"
          >
            {/* User Message */}
            <div className="mb-2">
              <div className="flex items-start gap-2 mb-1">
                <div className="text-sm shrink-0" aria-hidden="true">
                  👤
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">
                    You • {formatTimestamp(convo.timestamp)}
                  </p>
                  <p
                    className={`text-sm text-foreground ${!isExpanded ? "line-clamp-2" : ""}`}
                  >
                    {isExpanded
                      ? convo.userMessage
                      : truncateText(convo.userMessage, 100)}
                  </p>
                </div>
              </div>
            </div>

            {/* AI Response */}
            <div className="pl-6 border-l-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <div className="text-sm shrink-0" aria-hidden="true">
                  ✨
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-0.5">
                    Nargis
                  </p>
                  <p
                    className={`text-sm text-foreground ${!isExpanded ? "line-clamp-2" : ""}`}
                  >
                    {isExpanded
                      ? convo.aiMessage
                      : truncateText(convo.aiMessage, 100)}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setExpandedIndex(isExpanded ? null : index)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                {isExpanded ? "Show less" : "Read more"}
              </button>
              {index === 0 && (
                <button
                  type="button"
                  onClick={handleOpenFullConversation}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:underline font-medium ml-auto"
                >
                  View all →
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* View All Button */}
      {conversations.length >= maxChats && (
        <button
          type="button"
          onClick={handleOpenFullConversation}
          className="w-full p-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-gray-400 dark:hover:border-gray-500 transition-all"
        >
          View all conversations
        </button>
      )}
    </div>
  );
}
