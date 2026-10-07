import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actorId, leadIds } = body;

    if (!actorId) {
      return NextResponse.json(
        { success: false, error: "actorId is required for round-robin assignment." },
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

    const result = crmStore.roundRobinAssignLeads(actor, leadIds);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      leads: result.leads,
      message: `Successfully auto round-robin assigned ${result.count} unassigned leads among active agents.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Round-robin assignment failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
