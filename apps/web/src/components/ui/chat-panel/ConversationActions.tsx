"use client";

type TimelineMessage = {
  role: "user" | "assistant";
  text: string;
  ts: number;
  thoughts?: string[];
};

type ConversationActionsProps = {
  messages: TimelineMessage[];
  aiResponse: string | null;
  transcribedText: string | null;
  onCopy: () => void;
  onCreateTask: () => void;
  onDownload: () => void;
};

export function ConversationActions({
  messages,
  aiResponse,
  transcribedText,
  onCopy,
  onCreateTask,
  onDownload,
}: ConversationActionsProps) {
  const hasContent = Boolean(aiResponse || transcribedText || messages.length);

  if (!hasContent) return null;

  return (
    <div className="flex items-center justify-end gap-2">
      <button type="button" className="btn btn-secondary" onClick={onCopy}>
        Copy
      </button>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={onCreateTask}
      >
        Create Task
      </button>
      <button type="button" className="btn btn-secondary" onClick={onDownload}>
        Download
      </button>
    </div>
  );
}
