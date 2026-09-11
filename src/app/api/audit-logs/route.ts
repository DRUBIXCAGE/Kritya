import { NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function GET() {
  const auditLogs = crmStore.getAuditLogs();
  const activityLogs = crmStore.getActivityLogs();
  return NextResponse.json({ success: true, auditLogs, activityLogs });
}
