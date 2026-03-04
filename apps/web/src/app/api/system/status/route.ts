import { NextResponse } from "next/server";
import { getServiceHealth, getSpaceUrls } from "../shared";

const UNREACHABLE = {
  status: "unreachable" as const,
  latency: -1,
};

export async function GET() {
  try {
    const urls = getSpaceUrls();
    const [python, go] = await Promise.all([
      getServiceHealth(urls.python),
      getServiceHealth(urls.go),
    ]);

    return NextResponse.json({
      python,
      go,
    });
  } catch {
    return NextResponse.json({
      python: UNREACHABLE,
      go: UNREACHABLE,
    });
  }
}
