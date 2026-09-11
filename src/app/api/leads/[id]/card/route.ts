import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await req.json();
    const { action, actorId } = body;

    const actor = crmStore.getUserById(actorId) || crmStore.getUsers()[0];
    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";

    if (action === "VIEW") {
      // Log card view directly into Digital Footprint & Audit Logs
      const result = crmStore.logCardView(leadId, actor, ipAddress);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Card view logged to digital footprint" });
    }

    if (action === "GRANT") {
      // Manager grants card access to assigned agent
      const result = crmStore.grantCardAccess(leadId, actor);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 403 });
      }
      return NextResponse.json({ success: true, lead: result.lead });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Card operation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
