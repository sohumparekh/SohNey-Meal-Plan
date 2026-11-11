import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/auth";
import { setupDatabase } from "@/lib/db/setup";

export const dynamic = "force-dynamic";

/** One-time (and safe to repeat) database setup: POST with Authorization: Bearer CRON_SECRET. */
export async function POST(req: Request) {
  if (!cronAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(await setupDatabase());
}
