import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";
import { CallDirection, CallStatus } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const extension = searchParams.get("extension") || undefined;
    const agentId = searchParams.get("agentId") || undefined;
    const leadId = searchParams.get("leadId") || undefined;
    const status = searchParams.get("status") || undefined;
    const direction = searchParams.get("direction") || undefined;
    const search = searchParams.get("search") || undefined;

    const callLogs = crmStore.getCallLogs({
      extension,
      agentId,
      leadId,
      status,
      direction,
      search,
    });

    const stats = crmStore.getRingCentralStats(extension);

    return NextResponse.json({
      success: true,
      callLogs,
      stats,
      count: callLogs.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch call logs";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      agentId,
      callerNumber,
      calleeNumber,
      direction = "OUTBOUND",
      status = "RINGING",
      leadId,
      leadBookingNumber,
      disposition,
      notes,
      durationSeconds = 0,
      recordingUrl,
      sentiment,
    } = body;

    if (!agentId) {
      return NextResponse.json({ success: false, error: "agentId is required." }, { status: 400 });
    }

    const agent = crmStore.getUserById(agentId);
    if (!agent) {
      return NextResponse.json({ success: false, error: "Agent not found." }, { status: 404 });
    }

    const agentExtension = agent.rcExtension || "101";

    const newCall = crmStore.createCallLog({
      tenantId: agent.tenantId || "tenant_travelocase",
      agentId: agent.id,
      agentName: agent.name,
      agentExtension,
      agentRole: agent.role,
      callerNumber: callerNumber || agent.rcDirectNumber || "+1 (800) 555-0101",
      calleeNumber: calleeNumber || "Unknown",
      direction: direction as CallDirection,
      status: status as CallStatus,
      startTime: new Date().toISOString(),
      durationSeconds,
      disposition,
      notes,
      leadId,
      leadBookingNumber,
      leadDetailsEntered: Boolean(leadId && notes),
      recordingUrl,
      sentiment,
    });

    return NextResponse.json({
      success: true,
      call: newCall,
      message: `Call registered on agent extension ${agentExtension}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create call log";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
