"use client";

import type React from "react";
import { cn } from "@/utils";

export function PageCanvas({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-full w-full max-w-[92rem] flex-col gap-6 px-1 pb-10 pt-4 sm:px-2 md:pt-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
