"use client";

import type { ReactNode } from "react";
import { cn } from "@/utils";

type MessageProps = {
  role: "user" | "assistant";
  text: string;
  ts?: number;
  thoughts?: string[];
};

const markdownTokenPattern =
  /(\[[^\]]+\]\((https?:\/\/[^\s)]+)\)|`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g;

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let tokenIndex = 0;

  for (const match of text.matchAll(markdownTokenPattern)) {
    const token = match[0];
    const start = match.index ?? 0;

    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }

    if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            key={`${keyPrefix}-tok-${tokenIndex++}`}
            href={linkMatch[2]}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-muted-foreground/60 underline-offset-2 hover:text-foreground"
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("**") || token.startsWith("__")) {
      nodes.push(
        <strong key={`${keyPrefix}-tok-${tokenIndex++}`}>
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") || token.startsWith("_")) {
      nodes.push(
        <em key={`${keyPrefix}-tok-${tokenIndex++}`}>{token.slice(1, -1)}</em>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={`${keyPrefix}-tok-${tokenIndex++}`}
          className="rounded bg-black/8 px-1 py-0.5 font-mono text-[0.95em] dark:bg-white/10"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(token);
    }

    cursor = start + token.length;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function renderMarkdown(text: string): ReactNode {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    return null;
  }

  const blockCounts = new Map<string, number>();

  return blocks.map((block) => {
    const blockCount = (blockCounts.get(block) ?? 0) + 1;
    blockCounts.set(block, blockCount);
    const blockKey = `${block}-${blockCount}`;

    const lines = block
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.length > 0);

    const lineCounts = new Map<string, number>();

    const isBulletList =
      lines.length > 0 && lines.every((line) => /^[-*]\s+/.test(line));
    if (isBulletList) {
      return (
        <ul key={blockKey} className="list-disc space-y-1 pl-5">
          {lines.map((line) => {
            const lineCount = (lineCounts.get(line) ?? 0) + 1;
            lineCounts.set(line, lineCount);
            const lineKey = `${line}-${lineCount}`;

            return (
              <li key={lineKey}>
                {renderInlineMarkdown(
                  line.replace(/^[-*]\s+/, ""),
                  `${blockKey}-${lineKey}`,
                )}
              </li>
            );
          })}
        </ul>
      );
    }

    const isNumberedList =
      lines.length > 0 && lines.every((line) => /^\d+\.\s+/.test(line));
    if (isNumberedList) {
      return (
        <ol key={blockKey} className="list-decimal space-y-1 pl-5">
          {lines.map((line) => {
            const lineCount = (lineCounts.get(line) ?? 0) + 1;
            lineCounts.set(line, lineCount);
            const lineKey = `${line}-${lineCount}`;

            return (
              <li key={lineKey}>
                {renderInlineMarkdown(
                  line.replace(/^\d+\.\s+/, ""),
                  `${blockKey}-${lineKey}`,
                )}
              </li>
            );
          })}
        </ol>
      );
    }

    let emittedLine = false;
    return (
      <p key={blockKey} className="whitespace-pre-wrap">
        {lines.map((line) => {
          const lineCount = (lineCounts.get(line) ?? 0) + 1;
          lineCounts.set(line, lineCount);
          const lineKey = `${line}-${lineCount}`;
          const addBreak = emittedLine;
          emittedLine = true;

          return (
            <span key={lineKey}>
              {addBreak ? <br /> : null}
              {renderInlineMarkdown(line, `${blockKey}-${lineKey}`)}
            </span>
          );
        })}
      </p>
    );
  });
}

export default function Message({ role, text, ts, thoughts }: MessageProps) {
  const isUser = role === "user";
  const time = ts
    ? new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : undefined;

  return (
    <div
      className={cn(
        `message message--${role}`,
        "rounded-2xl border px-4 py-3 shadow-sm",
        isUser
          ? "bg-primary text-primary-foreground border-primary/80"
          : "bg-muted/45 text-foreground border-border/55",
      )}
    >
      <div className="message__meta flex items-center justify-between mb-1.5">
        <div
          className={cn(
            "message__who text-[13px] font-medium tracking-[0.01em]",
            isUser ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {role === "user" ? "You" : "Nargis"}
        </div>
        {time && (
          <div
            className={cn(
              "message__time text-[12px]",
              isUser
                ? "text-primary-foreground/70"
                : "text-muted-foreground/90",
            )}
          >
            {time}
          </div>
        )}
      </div>
      <div
        className={cn(
          "message__body text-base leading-relaxed",
          isUser ? "text-primary-foreground" : "text-foreground",
        )}
      >
        {renderMarkdown(text)}
      </div>
      {thoughts && thoughts.length > 0 && (
        <div
          className={cn(
            "message__thoughts mt-2 text-xs",
            isUser ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {(() => {
            const thoughtCounts = new Map<string, number>();
            return thoughts.map((t) => {
              const nextCount = (thoughtCounts.get(t) ?? 0) + 1;
              thoughtCounts.set(t, nextCount);
              return (
                <div
                  key={`${role}-${ts ?? "na"}-${t}-${nextCount}`}
                  className="inline-block mr-2"
                >
                  {t}
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
