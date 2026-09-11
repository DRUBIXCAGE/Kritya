import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";
import { TicketStatus } from "@/types";

export async function GET() {
  const tickets = crmStore.getTickets();
  const customers = crmStore.getCustomers();
  return NextResponse.json({ success: true, tickets, customers });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ticketId, status, actorId } = body;

    const actor = crmStore.getUserById(actorId) || crmStore.getUsers().find((u) => u.role === "CS_AGENT") || crmStore.getUsers()[0];
    const result = crmStore.updateTicketStatus(ticketId, status as TicketStatus, actor);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, ticket: result.ticket });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Ticket update failed";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
