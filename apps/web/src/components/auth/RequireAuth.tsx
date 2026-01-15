"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const next = useMemo(() => {
    const qs = searchParams?.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) return;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }, [isAuthenticated, loading, next, router]);

  if (loading) {
    return fallback ?? null;
  }

  if (!isAuthenticated) {
    return null;
  }

  return children;
}
