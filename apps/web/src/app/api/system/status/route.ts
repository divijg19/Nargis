import { NextResponse } from "next/server";
import {
  buildSystemStatusFallback,
  buildSystemStatusResponse,
  getMissingEnvironment,
} from "@/app/api/system/shared";

export async function GET() {
  try {
    const payload = await buildSystemStatusResponse();
    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const missing = getMissingEnvironment(error);
    return NextResponse.json(buildSystemStatusFallback(missing), {
      status: 200,
    });
  }
}
