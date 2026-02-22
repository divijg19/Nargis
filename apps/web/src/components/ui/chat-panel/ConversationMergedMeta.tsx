"use client";

import { sanitizeText } from "@/lib/sanitize";

type ConversationMergedMetaProps = {
  shouldShowSignInNudge: boolean;
  embeddedOpen: boolean;
  isListening: boolean;
  transcribedText: string | null;
  aiResponse: string | null;
  permissionDenied: boolean;
  onSignIn: () => void;
};

export function ConversationMergedMeta({
  shouldShowSignInNudge,
  embeddedOpen,
  isListening,
  transcribedText,
  aiResponse,
  permissionDenied,
  onSignIn,
}: ConversationMergedMetaProps) {
  return (
    <>
      {shouldShowSignInNudge && (
        <div className="mb-3 rounded-xl border border-border/20 bg-surface-elevated/70 p-3 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            You’re in guest mode — sign in to save history.
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onSignIn}
          >
            Sign in
          </button>
        </div>
      )}

      {embeddedOpen && (
        <div id="chat-merged-body" className="mb-3">
          <div className="status-tile flex items-center gap-2 text-[13px] leading-5">
            <span className="text-muted-foreground">Status:</span>
            <span
              className={isListening ? "text-success" : "text-muted-foreground"}
            >
              {isListening ? "Listening…" : "Idle"}
            </span>
            <span aria-hidden="true" className="text-muted-foreground/60">
              •
            </span>
            <span
              className={
                transcribedText && !aiResponse
                  ? "text-warning"
                  : "text-muted-foreground"
              }
            >
              {transcribedText && !aiResponse ? "Processing…" : "Ready"}
            </span>
            {aiResponse && (
              <>
                <span aria-hidden="true" className="text-muted-foreground/60">
                  •
                </span>
                <span className="text-success">Completed</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="chat-divider" aria-hidden="true" />

      {transcribedText && !aiResponse && (
        <div
          className="mt-1 p-3 bg-surface-elevated rounded-md border border-border/20 text-sm text-foreground whitespace-pre-wrap"
          aria-live="off"
        >
          <strong className="sr-only">Live transcript:</strong>
          {sanitizeText(transcribedText, 2000)}
        </div>
      )}

      {permissionDenied && (
        <div className="mt-3 p-3 glass bg-destructive/6 border border-destructive/20 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-destructive"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.73 3h16.9a2 2 0 001.73-3l-8.47-14.14a2 2 0 00-3.46 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-destructive">
                Microphone Access Required
              </h3>
              <p className="text-xs text-destructive/80 mt-1">
                Please enable microphone permissions to use voice features.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
