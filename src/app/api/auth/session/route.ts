import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, user: null }, { status: 400 });
    }

    const user = crmStore.getUserById(userId);
    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, error: "Session invalid or expired.", user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch session";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
