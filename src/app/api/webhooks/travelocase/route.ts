import { NextRequest, NextResponse } from "next/server";
import { crmStore } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * TRAVELOCASE.COM WEBHOOK INGESTION ENDPOINT
 * 
 * URL: POST /api/webhooks/travelocase
 * 
 * Header:
 * - Content-Type: application/json
 * - x-webhook-secret: (Optional) Matches process.env.TRAVELOCASE_WEBHOOK_SECRET
 * 
 * Payload Example:
 * {
 *   "name": "Jane Doe",
 *   "email": "jane@example.com",
 *   "phone": "+1 555-0199",
 *   "ticketPrice": 1250,
 *   "bookingDetails": {
 *     "origin": "JFK",
 *     "destination": "LHR",
 *     "tripType": "ROUND_TRIP",
 *     "airline": "British Airways",
 *     "flightNumber": "BA-178",
 *     "passengers": [...]
 *   },
 *   "cardDetails": { ... }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.TRAVELOCASE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incomingSecret = req.headers.get("x-webhook-secret") || req.headers.get("x-api-key");
      if (incomingSecret !== webhookSecret) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Invalid x-webhook-secret header" },
          { status: 401 }
        );
      }
    }

    const body = await req.json();
    
    // Ingest into CRM unassigned queue with Travelocase metadata
    const lead = crmStore.ingestLead({
      ...body,
      ingressSource: "TRAVELOCASE_WEBHOOK",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Booking inquiry received from Travelocase.com and routed to unassigned sales queue",
        bookingId: lead.bookingNumber || lead.id,
        leadId: lead.id,
        status: lead.status,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to process Travelocase webhook";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    service: "Kritya CRM - Travelocase Webhook Gateway",
    endpoint: "POST /api/webhooks/travelocase",
    status: "ACTIVE",
    version: "1.0",
  });
}
