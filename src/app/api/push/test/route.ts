import { NextResponse } from "next/server";
import { notifyAll } from "@/lib/push";

export async function POST() {
  const sent = await notifyAll("Test notification", "Reminders will look like this.", "/settings");
  return NextResponse.json({ sent });
}
