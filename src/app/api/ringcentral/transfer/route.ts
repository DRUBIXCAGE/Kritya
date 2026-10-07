import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { callId, targetExtension, fromAgentId, transferNotes } = body;

    if (!callId || !targetExtension) {
      return NextResponse.json(
        { success: false, error: "callId and targetExtension are required." },
        { status: 400 }
      );
    }

    const result = crmStore.transferCall(
      callId,
      targetExtension,
      fromAgentId || "usr_sales_agent1",
      transferNotes
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      call: result.callLog,
      transferredInboundCall: result.transferredInboundCall,
      targetUser: result.targetUser,
      message: `Call successfully transferred to extension ${targetExtension}.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to transfer call";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
