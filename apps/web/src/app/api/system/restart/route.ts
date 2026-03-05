import { NextResponse } from "next/server";
import { MissingEnvironmentError, restartSpace } from "../shared";

type RestartBody = {
  service?: "python" | "go";
};

function isValidService(service: unknown): service is "python" | "go" {
  return service === "python" || service === "go";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RestartBody;

    if (!isValidService(body?.service)) {
      return NextResponse.json({ error: "invalid-service" }, { status: 400 });
    }

    const ok = await restartSpace(body.service);
    if (!ok) {
      return NextResponse.json(
        { error: "restart-unavailable" },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: "restarting" });
  } catch (error) {
    if (error instanceof MissingEnvironmentError) {
      console.error("/api/system/restart missing environment", error.missing);
      return NextResponse.json(
        { error: "missing-environment", missing: error.missing },
        { status: 500 },
      );
    }

    console.error("/api/system/restart unavailable", error);
    return NextResponse.json({ error: "restart-unavailable" }, { status: 500 });
  }
}
