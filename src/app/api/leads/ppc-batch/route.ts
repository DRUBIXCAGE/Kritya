import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, actorId } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Items array is required for batch PPC lead ingestion." },
        { status: 400 }
      );
    }

    let actor = undefined;
    if (actorId) {
      actor = crmStore.getUserById(actorId);
    }

    const result = crmStore.ingestPpcBatch(items, actor);

    return NextResponse.json(
      {
        success: true,
        count: result.count,
        leads: result.leads,
        message: `Successfully batch ingested ${result.count} PPC leads.`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process batch PPC leads";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
