"use client";

import Message from "@/components/ui/Message";

type TimelineMessage = {
  role: "user" | "assistant";
  text: string;
  ts: number;
  thoughts?: string[];
};

type ConversationContentProps = {
  merged: boolean;
  messages: TimelineMessage[];
  safeTranscript: string;
  safeAi: string;
  displayTranscript: string;
  displayAi: string;
  displayLimit: number;
  processing: boolean;
  currentAgentState: string | null;
  showFullTranscript: boolean;
  showFullAi: boolean;
  onToggleShowFullTranscript: () => void;
  onToggleShowFullAi: () => void;
  onStopProcessing: () => void;
};

export function ConversationContent({
  merged,
  messages,
  safeTranscript,
  safeAi,
  displayTranscript,
  displayAi,
  displayLimit,
  processing,
  currentAgentState,
  showFullTranscript,
  showFullAi,
  onToggleShowFullTranscript,
  onToggleShowFullAi,
  onStopProcessing,
}: ConversationContentProps) {
  return (
    <div
      className={`chat-body space-y-4 mb-3 ${merged ? "flex-1 min-h-0" : ""}`}
    >
      {messages.length > 0 ? (
        <div
          className={`messages-scroll space-y-4 ${merged ? "flex-1 min-h-0" : "max-h-72 sm:max-h-64"}`}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((m, i) => (
            <div
              key={`${m.ts}-${m.role}-${i}`}
              className={
                m.role === "user"
                  ? "flex justify-start pl-4 sm:pl-6"
                  : "flex justify-start"
              }
            >
              <div className="max-w-[86%]">
                <Message
                  role={m.role}
                  text={m.text}
                  ts={m.ts}
                  thoughts={m.thoughts}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {safeTranscript && (
            <div className="mb-2">
              <div className="text-xs font-medium mb-1">You said</div>
              <div className="max-h-28 overflow-y-auto text-sm leading-relaxed">
                {displayTranscript}
                {safeTranscript.length > displayLimit && (
                  <div className="mt-2">
                    <button
                      type="button"
                      className="text-xs text-primary underline"
                      onClick={onToggleShowFullTranscript}
                    >
                      {showFullTranscript ? "Show less" : "Show more"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium mb-1">
              {processing ? "Nargis is thinking" : "Nargis"}
            </div>
            {processing ? (
              <div className="flex items-center space-x-2">
                <span
                  role="img"
                  aria-label="Loading"
                  className="w-4 h-4 rounded-full border-2 border-current border-r-transparent animate-spin text-muted-foreground"
                />
                <span className="text-xs text-muted-foreground font-mono">
                  {currentAgentState || "Thinking..."}
                </span>
                <button
                  type="button"
                  className="ml-2 px-2 py-1 text-xs rounded bg-muted hover:bg-muted/80"
                  onClick={onStopProcessing}
                  aria-label="Stop processing"
                >
                  Stop
                </button>
              </div>
            ) : !safeAi ? (
              <div className="text-xs text-muted-foreground italic">
                Waiting for response...
              </div>
            ) : (
              <div>
                <div
                  className="max-h-44 overflow-y-auto text-sm leading-relaxed"
                  aria-live="off"
                >
                  {displayAi}
                  {safeAi.length > displayLimit && (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="text-xs text-primary underline"
                        onClick={onToggleShowFullAi}
                      >
                        {showFullAi ? "Show less" : "Show more"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
