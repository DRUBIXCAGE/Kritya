import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, actorId } = body;

    if (!leadId || !actorId) {
      return NextResponse.json(
        { success: false, error: "Lead ID and Actor ID are required to duplicate a lead." },
        { status: 400 }
      );
    }

    const actor = crmStore.getUserById(actorId);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: "Actor user not found." },
        { status: 401 }
      );
    }

    const result = crmStore.duplicateLead(actor, leadId);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to duplicate lead." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      lead: result.lead,
      message: `Successfully created duplicate lead #${result.lead?.bookingNumber}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error duplicating lead";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
