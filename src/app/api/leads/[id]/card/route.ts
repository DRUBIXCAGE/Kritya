import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const { lead } = crmStore.getLeadById(leadId);
    if (!lead) {
      return NextResponse.json({ success: false, error: "Lead not found" }, { status: 404 });
    }

    crmStore.enforceCardAccessExpiry(lead);

    const card = lead.cardDetails;
    let remainingSeconds = 0;
    if (card?.isAccessGrantedToAgent && card.accessExpiresAt) {
      remainingSeconds = Math.max(0, Math.floor((new Date(card.accessExpiresAt).getTime() - Date.now()) / 1000));
    }

    return NextResponse.json({
      success: true,
      isAccessGrantedToAgent: card?.isAccessGrantedToAgent || false,
      remainingSeconds,
      grantedAt: card?.grantedAt,
      accessExpiresAt: card?.accessExpiresAt,
      accessDurationMinutes: card?.accessDurationMinutes || 3,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to get card status";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await req.json();
    const { action, actorId, ipAddress: clientIp, userAgent: clientUa } = body;

    const actor = crmStore.getUserById(actorId) || crmStore.getUsers()[0];
    const ipAddress =
      clientIp ||
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    const userAgent =
      clientUa ||
      req.headers.get("user-agent") ||
      "Enterprise CRM Web Client";

    if (action === "VIEW") {
      // Log card view directly into Digital Footprint (Fingerprinting) & check 3-minute expiry
      const result = crmStore.logCardView(leadId, actor, ipAddress, userAgent);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Card view logged to fingerprinting" });
    }

    if (action === "CONCEAL") {
      // Log card concealment directly into Digital Footprint (Fingerprinting)
      const result = crmStore.logCardConcealed(leadId, actor, ipAddress, userAgent);
      return NextResponse.json(result);
    }

    if (action === "GRANT") {
      // Manager grants 3-minute card clearance to assigned agent
      const result = crmStore.grantCardAccess(leadId, actor, ipAddress, userAgent);
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 403 });
      }
      return NextResponse.json({ success: true, lead: result.lead });
    }

    if (action === "EXPIRE") {
      // 3-minute clearance window elapsed: auto/manual revoke card access
      const result = crmStore.expireCardAccess(leadId, "3-minute clearance window elapsed");
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Card operation failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
