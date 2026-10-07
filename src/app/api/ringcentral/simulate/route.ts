import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action = "INCOMING_CALL",
      extension = "101",
      callerNumber = "+1 (555) 392-1084",
      callerName = "David Henderson",
      leadId,
      callId,
      durationSeconds = 60,
    } = body;

    // 1. Trigger incoming call simulation
    if (action === "INCOMING_CALL") {
      // Find the agent who owns this extension
      const allUsers = crmStore.getUsers();
      const targetAgent = allUsers.find((u) => u.rcExtension === extension) || allUsers.find((u) => u.role === "SALES_AGENT");

      if (!targetAgent) {
        return NextResponse.json(
          { success: false, error: `No agent assigned to extension ${extension}.` },
          { status: 404 }
        );
      }

      // Check if caller phone matches any existing CRM Lead
      let matchedLead = leadId ? crmStore.getLeadById(leadId).lead : undefined;
      if (!matchedLead) {
        const cleanCaller = callerNumber.replace(/[^0-9]/g, "");
        matchedLead = crmStore.getLeads().find((l) => {
          const lp = (l.phone || "").replace(/[^0-9]/g, "");
          return lp.length >= 7 && (cleanCaller.endsWith(lp) || lp.endsWith(cleanCaller));
        });
      }

      const newCall = crmStore.createCallLog({
        tenantId: targetAgent.tenantId || "tenant_travelocase",
        agentId: targetAgent.id,
        agentName: targetAgent.name,
        agentExtension: targetAgent.rcExtension || extension,
        agentRole: targetAgent.role,
        callerNumber,
        calleeNumber: targetAgent.rcExtension || extension,
        direction: "INBOUND",
        status: "RINGING",
        startTime: new Date().toISOString(),
        durationSeconds: 0,
        leadId: matchedLead?.id,
        leadBookingNumber: matchedLead?.bookingNumber,
        leadDetailsEntered: false,
        rcSessionId: `rc_sim_in_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        telephonyStatus: "Ringing",
        notes: `Simulated inbound RingCentral call from ${callerName} (${callerNumber}) to Extension ${targetAgent.rcExtension || extension}.`,
      });

      return NextResponse.json({
        success: true,
        action: "INCOMING_CALL",
        call: newCall,
        targetAgent: {
          id: targetAgent.id,
          name: targetAgent.name,
          extension: targetAgent.rcExtension,
        },
        matchedLead: matchedLead
          ? {
              id: matchedLead.id,
              name: matchedLead.name,
              bookingNumber: matchedLead.bookingNumber,
              route: matchedLead.bookingDetails
                ? `${matchedLead.bookingDetails.origin} -> ${matchedLead.bookingDetails.destination}`
                : undefined,
              dealValue: matchedLead.dealValue,
            }
          : null,
        message: `Inbound call ringing on Extension ${targetAgent.rcExtension || extension}`,
      });
    }

    // 2. Answer Call Simulation
    if (action === "ANSWER_CALL") {
      if (!callId) {
        return NextResponse.json({ success: false, error: "callId is required to answer call." }, { status: 400 });
      }

      const result = crmStore.updateCallLog(callId, {
        status: "ANSWERED",
        telephonyStatus: "Connected",
      });

      return NextResponse.json({
        success: result.success,
        call: result.callLog,
        error: result.error,
        message: "Call answered on extension.",
      });
    }

    // 3. End Call Simulation
    if (action === "END_CALL") {
      if (!callId) {
        return NextResponse.json({ success: false, error: "callId is required to end call." }, { status: 400 });
      }

      const now = new Date().toISOString();
      const result = crmStore.updateCallLog(callId, {
        status: "COMPLETED",
        telephonyStatus: "Disconnected",
        endTime: now,
        durationSeconds: durationSeconds || 45,
      });

      return NextResponse.json({
        success: result.success,
        call: result.callLog,
        error: result.error,
        message: "Call ended on extension.",
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Simulation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
