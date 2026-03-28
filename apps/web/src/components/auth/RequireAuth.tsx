"use client";

import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function RequireAuth({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { loading } = useAuth();

  if (loading) {
    return fallback ?? null;
  }

  return children;
}
