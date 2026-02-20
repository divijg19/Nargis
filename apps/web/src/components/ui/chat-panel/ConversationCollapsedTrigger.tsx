"use client";

type ConversationCollapsedTriggerProps = {
  compact: boolean;
  merged: boolean;
  openConversation: boolean;
  embeddedOpen: boolean;
  onOpenConversation: () => void;
  onExpandEmbedded: () => void;
};

export function ConversationCollapsedTrigger({
  compact,
  merged,
  openConversation,
  embeddedOpen,
  onOpenConversation,
  onExpandEmbedded,
}: ConversationCollapsedTriggerProps) {
  return (
    <div className={`mt-4 w-full ${compact ? "" : "max-w-4xl mx-auto"}`}>
      <div className="w-full bg-surface-elevated rounded-xl p-3 flex items-center justify-between border border-border/20">
        <div className="text-sm text-muted-foreground">AI Conversation</div>
        <div className="flex items-center gap-2">
          {merged ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onExpandEmbedded}
              aria-expanded={embeddedOpen}
            >
              Expand
            </button>
          ) : (
            <button
              type="button"
              className="text-sm px-3 py-1 rounded-md border border-border/10 bg-transparent text-foreground/90 hover:bg-white/2"
              onClick={onOpenConversation}
              aria-expanded={openConversation}
            >
              Open
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
