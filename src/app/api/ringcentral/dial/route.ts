import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, targetNumber, leadId, leadBookingNumber } = body;

    if (!agentId || !targetNumber) {
      return NextResponse.json(
        { success: false, error: "agentId and targetNumber are required." },
        { status: 400 }
      );
    }

    const agent = crmStore.getUserById(agentId);
    if (!agent) {
      return NextResponse.json({ success: false, error: "Agent not found." }, { status: 404 });
    }

    const extension = agent.rcExtension || "101";
    const callerNumber = agent.rcDirectNumber || `+1 (800) 555-0${extension}`;

    // Lookup lead by ID or by phone match if leadId not specified
    let matchedLeadId = leadId;
    let matchedBookingNumber = leadBookingNumber;

    if (!matchedLeadId) {
      const allLeads = crmStore.getLeads();
      const cleanTarget = targetNumber.replace(/[^0-9]/g, "");
      const found = allLeads.find((l) => {
        const leadPhone = (l.phone || "").replace(/[^0-9]/g, "");
        return leadPhone.length >= 7 && (cleanTarget.endsWith(leadPhone) || leadPhone.endsWith(cleanTarget));
      });
      if (found) {
        matchedLeadId = found.id;
        matchedBookingNumber = found.bookingNumber;
      }
    }

    // Register active outbound call log
    const callLog = crmStore.createCallLog({
      tenantId: agent.tenantId || "tenant_travelocase",
      agentId: agent.id,
      agentName: agent.name,
      agentExtension: extension,
      agentRole: agent.role,
      callerNumber,
      calleeNumber: targetNumber,
      direction: "OUTBOUND",
      status: "RINGING",
      startTime: new Date().toISOString(),
      durationSeconds: 0,
      leadId: matchedLeadId,
      leadBookingNumber: matchedBookingNumber,
      leadDetailsEntered: false,
      rcSessionId: `rc_sess_out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      telephonyStatus: "Proceeding",
    });

    // Set agent status to ON_CALL
    crmStore.updateUserRcStatus(agent.id, "ON_CALL");

    return NextResponse.json({
      success: true,
      call: callLog,
      extension,
      callerNumber,
      targetNumber,
      matchedLeadId,
      matchedBookingNumber,
      message: `Outbound RingCentral call initiated from Extension ${extension} to ${targetNumber}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Outbound dial failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
