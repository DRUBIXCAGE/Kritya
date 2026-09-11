import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actorId, leadId, leadIds, targetAgentId } = body;

    if (!actorId) {
      return NextResponse.json(
        { success: false, error: "actorId is required." },
        { status: 400 }
      );
    }

    if (!targetAgentId) {
      return NextResponse.json(
        { success: false, error: "targetAgentId is required." },
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

    // Bulk assignment
    if (Array.isArray(leadIds) && leadIds.length > 0) {
      const result = crmStore.bulkAssignLeads(actor, leadIds, targetAgentId);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        count: result.count,
        leads: result.leads,
        message: `Successfully assigned ${result.count} leads to agent.`,
      });
    }

    // Single assignment
    if (leadId) {
      const result = crmStore.assignLead(actor, leadId, targetAgentId);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        lead: result.lead,
        message: `Successfully assigned lead to ${result.lead?.assignedToName}.`,
      });
    }

    return NextResponse.json(
      { success: false, error: "Either leadId or leadIds array must be provided." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Assignment failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
