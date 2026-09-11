import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";
import { OFFICIAL_SENDER_EMAIL } from "@/lib/templates";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const leadId = params.id;
    const body = await req.json();
    const { templateId, actorId, recipientEmail, subject, body: emailBody } = body;

    const actor =
      crmStore.getUserById(actorId) ||
      crmStore.getUsers().find((u) => u.role === "SALES_AGENT") ||
      crmStore.getUsers()[0];

    const result = crmStore.sendPredefinedEmail(leadId, templateId, actor, {
      senderEmail: OFFICIAL_SENDER_EMAIL,
      recipientEmail,
      subject,
      body: emailBody,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, email: result.email, lead: result.lead });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to dispatch email";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
