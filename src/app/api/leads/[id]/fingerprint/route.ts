import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await req.json();
    const { actorId, event = "QUERY_REMARK_LOGGED", remark, metadata, isAutoLogged } = body;

    if (!actorId) {
      return NextResponse.json(
        { success: false, error: "Actor ID is required for fingerprint logging." },
        { status: 400 }
      );
    }

    const actor = crmStore.getUserById(actorId);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: "Actor user not found in system." },
        { status: 401 }
      );
    }

    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Enterprise CRM Client";

    const result = crmStore.logLeadFingerprintEvent(
      leadId,
      actor,
      event,
      remark,
      metadata,
      Boolean(isAutoLogged),
      `/leads/${leadId}`,
      ipAddress,
      userAgent
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Failed to log fingerprint event." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      lead: result.lead,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to process fingerprint log";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
