import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required." }, { status: 400 });
    }

    const user = crmStore.getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      rcStatus: user.rcStatus || "AVAILABLE",
      rcExtension: user.rcExtension || "101",
      rcDirectNumber: user.rcDirectNumber || `+1 (800) 555-0${user.rcExtension || "101"}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch status";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, status, extension, directNumber } = body;

    if (!userId || !status) {
      return NextResponse.json({ success: false, error: "userId and status are required." }, { status: 400 });
    }

    const result = crmStore.updateUserRcStatus(userId, status, extension, directNumber);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      message: `RingCentral status updated to ${status}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update status";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
