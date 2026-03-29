"use client";

import {
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  fetchSystemStatus,
  restartSystem,
  systemStatusQueryKey,
  warmSystem,
} from "@/services/system";
import type {
  RestartTarget,
  SystemRestartResponse,
  SystemStatusResponse,
} from "@/types/system";
import { hasSleepingEngine } from "@/types/system";

type SystemStatusQueryOptions = {
  enabled?: boolean;
  refetchInterval?: UseQueryOptions<SystemStatusResponse>["refetchInterval"];
  staleTime?: number;
};

export function useSystemStatus(options: SystemStatusQueryOptions = {}) {
  const {
    enabled = true,
    refetchInterval = 30_000,
    staleTime = 15_000,
  } = options;

  return useQuery({
    queryKey: systemStatusQueryKey,
    queryFn: fetchSystemStatus,
    enabled,
    refetchInterval,
    refetchOnWindowFocus: false,
    staleTime,
  });
}

export function useWarmSystemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (target: RestartTarget = "both") => warmSystem(target),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: systemStatusQueryKey });
    },
  });
}

export function useRestartSystemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (target: RestartTarget) => restartSystem(target),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: systemStatusQueryKey });
    },
  });
}

export function useAutoWarmSystem(
  status: SystemStatusResponse | undefined,
  enabled = true,
) {
  const warmTriggeredRef = useRef(false);
  const warmMutation = useWarmSystemMutation();

  useEffect(() => {
    if (!enabled || !status) {
      return;
    }

    const shouldWarm =
      hasSleepingEngine(status.go) || hasSleepingEngine(status.py);
    if (!shouldWarm) {
      warmTriggeredRef.current = false;
      return;
    }

    if (warmTriggeredRef.current || warmMutation.isPending) {
      return;
    }

    warmTriggeredRef.current = true;
    warmMutation.mutate("both");
  }, [enabled, status, warmMutation]);

  return warmMutation;
}

export function useWarmSystemOnMount(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    void warmSystem("both", { keepalive: true }).catch(() => {
      // Silent by design; this is only a best-effort warm trigger.
    });
  }, [enabled]);
}

export function getRestartTargetOk(
  target: RestartTarget,
  payload: SystemRestartResponse,
): boolean {
  if (target === "go") {
    return Boolean(payload.go?.ok);
  }
  if (target === "py") {
    return Boolean(payload.py?.ok);
  }
  return Boolean(payload.go?.ok && payload.py?.ok);
}
