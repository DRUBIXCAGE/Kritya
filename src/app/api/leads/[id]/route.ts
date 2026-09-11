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
