import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 1. RingCentral Webhook Handshake Verification
    // When subscribing a webhook, RingCentral sends a 'Validation-Token' header and expects it back
    const validationToken = req.headers.get("Validation-Token");
    if (validationToken) {
      return new NextResponse(null, {
        status: 200,
        headers: { "Validation-Token": validationToken },
      });
    }

    const payload = await req.json().catch(() => null);
    if (!payload) {
      return NextResponse.json({ success: true, message: "Empty body ignored" });
    }

    // Parse RingCentral telephony session event payload
    const event = payload.event; // e.g. /restapi/v1.0/account/~/telephony/sessions
    const body = payload.body;

    if (body) {
      const parties = body.parties || [];
      const sessionId = body.sessionId || body.id;

      // Extract parties
      for (const party of parties) {
        const extensionId = party.extensionId;
        const status = party.status?.code; // e.g. "Setup", "Proceeding", "Ringing", "Answered", "Disconnected"
        const fromNumber = party.from?.phoneNumber || party.from?.name || "Unknown";
        const toNumber = party.to?.phoneNumber || party.to?.extensionNumber || "Unknown";
        const direction = party.direction === "Inbound" ? "INBOUND" : "OUTBOUND";

        // Find agent by extension
        const allUsers = crmStore.getUsers();
        const matchedAgent = allUsers.find(
          (u) => u.rcExtension === toNumber || u.rcExtension === extensionId || u.rcDirectNumber === toNumber
        );

        if (matchedAgent) {
          if (status === "Ringing" && direction === "INBOUND") {
            crmStore.createCallLog({
              tenantId: matchedAgent.tenantId,
              agentId: matchedAgent.id,
              agentName: matchedAgent.name,
              agentExtension: matchedAgent.rcExtension || "101",
              agentRole: matchedAgent.role,
              callerNumber: fromNumber,
              calleeNumber: toNumber,
              direction: "INBOUND",
              status: "RINGING",
              startTime: new Date().toISOString(),
              durationSeconds: 0,
              leadDetailsEntered: false,
              rcSessionId: sessionId,
              telephonyStatus: "Ringing",
            });
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
