"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function RequireAuth({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) return;
    // Avoid Next's prerender "blocking-route" warning by not depending on
    // useSearchParams()/usePathname() here. We can safely compute next from
    // window.location at runtime.
    const next = `${window.location.pathname}${window.location.search}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return fallback ?? null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
