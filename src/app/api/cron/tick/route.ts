import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/auth";
import { runDueJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

/** Called every 15 minutes by the database scheduler (pg_cron), with the CRON_SECRET. */
async function handle(req: Request) {
  if (!cronAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });
  const result = await runDueJobs();
  return NextResponse.json(result);
}
export const GET = handle;
export const POST = handle;
