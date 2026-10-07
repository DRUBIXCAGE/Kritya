import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    let actor = undefined;
    if (body.actorId) {
      actor = crmStore.getUserById(body.actorId);
    }

    const lead = crmStore.ingestPpcLead({
      ...body,
      actor,
    });

    return NextResponse.json(
      {
        success: true,
        lead,
        message: `PPC lead #${lead.bookingNumber} successfully created and tagged.`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to ingest PPC lead";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
