import { NextResponse } from "next/server";
import { getMissingEnvironment, triggerWarmup } from "@/app/api/system/shared";
import type { RestartTarget } from "@/types/system";

type WarmBody = { target?: RestartTarget; service?: "python" | "go" };

function toWarmTarget(body: WarmBody | null): RestartTarget {
  if (body?.target === "go" || body?.service === "go") return "go";
  if (body?.target === "py" || body?.service === "python") return "py";
  return "both";
}

export async function POST(request: Request) {
  try {
    let body: WarmBody | null = null;
    try {
      body = (await request.json()) as WarmBody;
    } catch {
      body = null;
    }

    const target = toWarmTarget(body);
    triggerWarmup(target);

    return NextResponse.json({ waking: true, target });
  } catch (error) {
    const missing = getMissingEnvironment(error);
    if (missing) {
      console.error("/api/system/warm missing environment", missing);
      return NextResponse.json(
        { error: "missing-environment", missing },
        { status: 500 },
      );
    }

    console.error("/api/system/warm unavailable", error);
    return NextResponse.json({ error: "system-unavailable" }, { status: 500 });
  }
}
