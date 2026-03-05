import { NextResponse } from "next/server";
import { getSpaceUrls, MissingEnvironmentError, warmSpace } from "../shared";

type WarmBody = {
  service?: "python" | "go";
};

function isValidService(service: unknown): service is "python" | "go" {
  return service === "python" || service === "go";
}

export async function POST(request: Request) {
  try {
    const urls = getSpaceUrls();

    let service: WarmBody["service"];
    try {
      const body = (await request.json()) as WarmBody;
      service = body?.service;
    } catch {
      service = undefined;
    }

    if (service && !isValidService(service)) {
      return NextResponse.json({ error: "invalid-service" }, { status: 400 });
    }

    if (service) {
      await warmSpace(urls[service]);
    } else {
      await Promise.all([warmSpace(urls.python), warmSpace(urls.go)]);
    }

    return NextResponse.json({
      python: "running",
      go: "running",
    });
  } catch (error) {
    if (error instanceof MissingEnvironmentError) {
      console.error("/api/system/warm missing environment", error.missing);
      return NextResponse.json(
        { error: "missing-environment", missing: error.missing },
        { status: 500 },
      );
    }

    console.error("/api/system/warm unavailable", error);
    return NextResponse.json({ error: "system-unavailable" }, { status: 500 });
  }
}
