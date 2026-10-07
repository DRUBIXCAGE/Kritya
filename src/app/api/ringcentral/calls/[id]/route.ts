import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const callLog = crmStore.getCallLogById(params.id);
    if (!callLog) {
      return NextResponse.json({ success: false, error: "Call log not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true, call: callLog });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch call log";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const result = crmStore.updateCallLog(params.id, body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      call: result.callLog,
      message: "Call details successfully updated and saved with respect to agent extension.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update call log";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
