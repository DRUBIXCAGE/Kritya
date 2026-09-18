import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";
import { Role } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const role = searchParams.get("role") as Role | undefined;
    const channelId = searchParams.get("channelId") || undefined;
    const recipientId = searchParams.get("recipientId") || undefined;
    const leadId = searchParams.get("leadId") || undefined;

    const currentUser = userId ? crmStore.getUserById(userId) : undefined;
    const channels = crmStore.getChatChannels(currentUser);
    const messages = crmStore.getChatMessages(userId, role, {
      channelId,
      recipientId,
      leadId,
    });

    return NextResponse.json({
      success: true,
      channels,
      messages,
      totalCount: messages.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch chat messages";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actorId, action } = body;

    if (!actorId) {
      return NextResponse.json(
        { success: false, error: "actorId is required." },
        { status: 400 }
      );
    }

    const actor = crmStore.getUserById(actorId);
    if (!actor) {
      return NextResponse.json(
        { success: false, error: "Actor user not found in CRM." },
        { status: 401 }
      );
    }

    // Mark as read action
    if (action === "MARK_READ") {
      const { channelId, senderId } = body;
      const res = crmStore.markChatMessagesRead(actor.id, channelId, senderId);
      return NextResponse.json({ success: true, count: res.count });
    }

    // Send new message
    const {
      channelId,
      recipientId,
      content,
      messageType,
      leadId,
      leadBookingNumber,
      leadPnr,
      leadDealValue,
      metadata,
    } = body;

    const res = crmStore.sendChatMessage(actor, {
      channelId,
      recipientId,
      content,
      messageType,
      leadId,
      leadBookingNumber,
      leadPnr,
      leadDealValue,
      metadata,
    });

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: res.message },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to process chat action";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
