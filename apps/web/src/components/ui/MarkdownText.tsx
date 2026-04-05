"use client";

import type { ReactNode } from "react";
import { sanitizeText } from "@/lib/sanitize";

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const token = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let match: RegExpExecArray | null = token.exec(text);

  while (match) {
    const found = match[0];
    const index = match.index;

    if (index > last) {
      nodes.push(<span key={`txt-${last}`}>{text.slice(last, index)}</span>);
    }

    if (found.startsWith("**") && found.endsWith("**") && found.length > 4) {
      nodes.push(<strong key={`bold-${index}`}>{found.slice(2, -2)}</strong>);
    } else if (
      found.startsWith("`") &&
      found.endsWith("`") &&
      found.length > 2
    ) {
      nodes.push(
        <code
          key={`code-${index}`}
          className="rounded bg-black/5 px-1 py-0.5 text-[0.92em] dark:bg-white/10"
        >
          {found.slice(1, -1)}
        </code>,
      );
    }

    last = index + found.length;
    match = token.exec(text);
  }

  if (last < text.length) {
    nodes.push(<span key={`tail-${last}`}>{text.slice(last)}</span>);
  }

  return nodes;
}

export function MarkdownText({ content }: { content: string }) {
  const safe = sanitizeText(content || "", 20000, false);
  const blocks = safe
    .split(/\n{2,}/g)
    .filter((block) => block.trim().length > 0);
  let keySeed = 0;

  const nextKey = (prefix: string) => {
    keySeed += 1;
    return `${prefix}-${keySeed}`;
  };

  return (
    <div className="space-y-3 text-sm leading-7 text-foreground/90">
      {blocks.map((block) => {
        const lines = block
          .split("\n")
          .filter((line) => line.trim().length > 0);
        const listLike = lines.every((line) => /^\s*[-*+]\s+/.test(line));

        if (listLike) {
          return (
            <ul key={nextKey("ul")} className="list-disc space-y-1 pl-5">
              {lines.map((line) => {
                const item = line.replace(/^\s*[-*+]\s+/, "");
                return <li key={nextKey("li")}>{renderInline(item)}</li>;
              })}
            </ul>
          );
        }

        return (
          <p key={nextKey("p")}>
            {lines.map((line) => (
              <span key={nextKey("line")}>
                {renderInline(line)}
                {line !== lines[lines.length - 1] ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
