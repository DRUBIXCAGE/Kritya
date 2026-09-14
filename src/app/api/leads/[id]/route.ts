import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";
import { Role } from "@/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") as Role | undefined;
    const userId = searchParams.get("userId") || undefined;

    const result = crmStore.getLeadById(leadId, role, userId);

    if (result.forbidden) {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: You can only view bookings assigned to your account.",
        },
        { status: 403 }
      );
    }

    if (!result.lead) {
      return NextResponse.json(
        { success: false, error: "Lead/Booking not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, lead: result.lead });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch lead";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await req.json();
    const { actorId, ...updates } = body;

    if (!actorId) {
      return NextResponse.json(
        { success: false, error: "Actor ID is required for audit and permission validation." },
        { status: 400 }
      );
    }

    const actor = crmStore.getUserById(actorId);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: "Actor account not found in system." },
        { status: 401 }
      );
    }

    const result = crmStore.updateLead(actor, leadId, updates);
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to update lead." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, lead: result.lead });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update lead details";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

