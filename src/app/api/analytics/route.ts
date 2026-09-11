import { NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function GET() {
  const analytics = crmStore.getAnalytics();
  return NextResponse.json({ success: true, analytics });
}
