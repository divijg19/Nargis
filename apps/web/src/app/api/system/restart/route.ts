import { NextResponse } from "next/server";
import {
  getMissingEnvironment,
  restartByTarget,
} from "@/app/api/system/shared";
import type { RestartTarget } from "@/types/system";

type RestartBody = {
  target?: RestartTarget;
};

function isValidTarget(target: unknown): target is RestartTarget {
  return target === "go" || target === "py" || target === "both";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RestartBody | null;
    const target = body?.target;

    if (!isValidTarget(target)) {
      return NextResponse.json({ error: "invalid-target" }, { status: 400 });
    }

    const result = await restartByTarget(target);
    const allOk =
      target === "both"
        ? Boolean(result.go?.ok && result.py?.ok)
        : target === "go"
          ? Boolean(result.go?.ok)
          : Boolean(result.py?.ok);

    return NextResponse.json(result, { status: allOk ? 200 : 502 });
  } catch (error) {
    const missing = getMissingEnvironment(error);
    if (missing) {
      console.error("/api/system/restart missing environment", missing);
      return NextResponse.json(
        { error: "missing-environment", missing },
        { status: 500 },
      );
    }

    console.error("/api/system/restart unavailable", error);
    return NextResponse.json({ error: "restart-unavailable" }, { status: 500 });
  }
}
