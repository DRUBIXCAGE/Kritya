import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";
import { Role } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bookingId = searchParams.get("bookingId") || searchParams.get("pnr") || searchParams.get("q");
    const role = searchParams.get("role") as Role | undefined;
    const userId = searchParams.get("userId") || undefined;

    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: "bookingId or pnr query parameter is required." },
        { status: 400 }
      );
    }

    const result = crmStore.findLeadByBookingId(bookingId, role, userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error?.includes("Access Denied") ? 403 : 404 }
      );
    }

    return NextResponse.json({ success: true, lead: result.lead });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
