import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";
import { LeadStatus } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await req.json();
    const { targetStatus, actorId, metadata } = body;

    const actor = crmStore.getUserById(actorId) || crmStore.getUsers()[0];
    const result = crmStore.transitionLead(
      leadId,
      targetStatus as LeadStatus,
      actor,
      metadata
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, lead: result.lead });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
