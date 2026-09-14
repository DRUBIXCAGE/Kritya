import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";
import { Role } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role") as Role | undefined;
  const userId = searchParams.get("userId") || undefined;
  const bookingId = searchParams.get("bookingId") || searchParams.get("pnr") || undefined;
  const search = searchParams.get("search") || undefined;

  const leads = crmStore.getLeads(role, userId, { bookingId, search });
  return NextResponse.json({ success: true, leads });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const lead = crmStore.ingestLead(body);
    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to ingest lead";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
