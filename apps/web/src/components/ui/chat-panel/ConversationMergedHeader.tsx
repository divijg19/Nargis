"use client";

type ConversationMergedHeaderProps = {
  headerId?: string;
  voiceMode: "chat" | "agent";
  canExecuteAgents: boolean;
  embeddedOpen: boolean;
  onModeChange: (mode: "chat" | "agent") => void;
  onClear: () => void;
  onToggleEmbedded: () => void;
  onSimulate?: () => void;
  showSimulate?: boolean;
};

export function ConversationMergedHeader({
  headerId,
  voiceMode,
  canExecuteAgents,
  embeddedOpen,
  onModeChange,
  onClear,
  onToggleEmbedded,
  onSimulate,
  showSimulate,
}: ConversationMergedHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <span
          className="w-1 h-8 rounded-full bg-border/60 inline-block"
          aria-hidden="true"
        />
        <div>
          <h3 id={headerId} className="text-sm font-medium">
            AI Conversation
          </h3>
          <p className="text-xs text-muted-foreground">
            Live transcript & assistant reply
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <fieldset className="hidden sm:flex items-center rounded-lg border border-structural bg-surface/30 p-1">
          <legend className="sr-only">Conversation mode</legend>
          <button
            type="button"
            className={`px-2.5 py-1 text-xs rounded-md transition-[opacity,transform] ${
              voiceMode === "chat"
                ? "mode-toggle-active"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onModeChange("chat")}
            aria-pressed={voiceMode === "chat"}
            title="Planning mode (no tools)"
          >
            Plan
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 text-xs rounded-md transition-[opacity,transform] ${
              voiceMode === "agent"
                ? "mode-toggle-active"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => onModeChange("agent")}
            aria-pressed={voiceMode === "agent"}
            title={
              canExecuteAgents
                ? "Execution mode (uses tools)"
                : "Sign in to use execution mode"
            }
          >
            Execute
          </button>
        </fieldset>

        <button
          type="button"
          className="btn btn-icon-primary btn-icon-lg"
          onClick={onClear}
          aria-label="Clear conversation"
          title="Clear"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <path
              d="M3 6h18"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 6v12a2 2 0 002 2h4a2 2 0 002-2V6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {showSimulate && onSimulate && (
          <button
            type="button"
            className="btn btn-icon-primary btn-icon-lg"
            onClick={onSimulate}
            aria-label="Simulate conversation"
            title="Simulate"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        <button
          type="button"
          className="btn btn-icon-primary btn-icon-lg"
          onClick={onToggleEmbedded}
          aria-expanded={embeddedOpen}
          aria-controls="chat-merged-body"
          aria-label={
            embeddedOpen ? "Collapse conversation" : "Expand conversation"
          }
          title={embeddedOpen ? "Collapse" : "Expand"}
        >
          {embeddedOpen ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M6 15l6-6 6 6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M6 9l6 6 6-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
