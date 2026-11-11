import { NextResponse } from "next/server";
import { savePushSubscription } from "@/lib/db/repo";

export async function POST(req: Request) {
  const sub = await req.json();
  if (!sub?.endpoint || typeof sub.endpoint !== "string" || !sub.keys) return new NextResponse("Bad subscription", { status: 400 });
  await savePushSubscription(sub);
  return NextResponse.json({ ok: true });
}
