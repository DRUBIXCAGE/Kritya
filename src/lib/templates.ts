import { EmailTemplate, Lead } from "@/types";
import { formatCurrency } from "./utils";

export const OFFICIAL_SENDER_EMAIL = "ticketing@travelocase.com";
export const OFFICIAL_SENDER_NAME = "Travelocase Reservations & Ticketing Desk";

export const PREDEFINED_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "flight_auth_01",
    title: "Flight Authorization & Card Verification Request",
    type: "AUTHENTICATION",
    subject: "[Booking ID: {{PNR_CODE}}] Urgent: Card Authorization & Flight Itinerary Confirmation for {{PASSENGER_NAME}}",
    bodyTemplate: `<p>Dear <strong>{{CUSTOMER_NAME}}</strong>,</p>

<p>Thank you for booking your upcoming flight with <strong>Travelocase Global Flight Services</strong>.</p>

<p>To finalize your flight reservation and proceed with ticket issuance, please review and verify your travel itinerary below:</p>

<h3>✈️ FLIGHT ITINERARY SUMMARY:</h3>
<ul>
  <li><strong>Booking Reference (PNR):</strong> <span style="color: #6366f1; font-weight: bold;">{{PNR_CODE}}</span></li>
  <li><strong>Routing:</strong> {{ORIGIN}} &rarr; {{DESTINATION}} ({{TRIP_TYPE}})</li>
  <li><strong>Airline / Flight:</strong> {{AIRLINE}} {{FLIGHT_NUMBER}} ({{CABIN_CLASS}} Class)</li>
  <li><strong>Departure Date:</strong> {{DEPARTURE_DATE}}</li>
  {{RETURN_DATE_ROW}}
  <li><strong>Total Fare Authorized:</strong> <span style="color: #10b981; font-weight: bold;">{{TOTAL_FARE}}</span></li>
</ul>

<h3>👥 PASSENGER ROSTER:</h3>
<ol>
{{PASSENGER_LIST_HTML}}
</ol>

<blockquote>
  <strong>PAYMENT & SECURITY VERIFICATION PROTOCOL:</strong><br/>
  In strict compliance with airline ticketing and credit card security protocols, our travel specialist will contact you at <strong>{{CUSTOMER_PHONE}}</strong> to verbally verify the booking code and billing authorization.
</blockquote>

<p>Once verbally verified on call, your official e-tickets and boarding passes will be issued immediately.</p>

<hr/>
<p>
  Kind regards,<br/>
  <strong>{{AGENT_NAME}}</strong><br/>
  <em>Enterprise Flight Operations Desk</em><br/>
  <strong>Travelocase Global Flight Services</strong><br/>
  <span style="font-size: 11px; color: #94a3b8;">Sent securely from ticketing@travelocase.com</span>
</p>`,
  },
  {
    id: "booking_itinerary_02",
    title: "Official Flight Itinerary & E-Ticket Confirmation",
    type: "CONFIRMATION",
    subject: "[Booking ID: {{PNR_CODE}}] Confirmed: Flight E-Ticket Itinerary for {{PASSENGER_NAME}}",
    bodyTemplate: `<p>Dear <strong>{{CUSTOMER_NAME}}</strong>,</p>

<p>Your flight reservation has been successfully <strong style="color: #10b981;">CONFIRMED</strong>. Your official e-tickets are issued by <strong>Travelocase</strong>.</p>

<h3>🎫 CONFIRMED BOOKING DETAILS:</h3>
<ul>
  <li><strong>Booking Reference (PNR):</strong> <span style="color: #6366f1; font-weight: bold;">{{PNR_CODE}}</span></li>
  <li><strong>Routing:</strong> {{ORIGIN}} &rarr; {{DESTINATION}}</li>
  <li><strong>Airline:</strong> {{AIRLINE}} (Flight {{FLIGHT_NUMBER}})</li>
  <li><strong>Cabin Class:</strong> {{CABIN_CLASS}}</li>
  <li><strong>Departure Date:</strong> {{DEPARTURE_DATE}}</li>
  {{RETURN_DATE_ROW}}
  <li><strong>Total Amount Settled:</strong> <span style="color: #10b981; font-weight: bold;">{{TOTAL_FARE}}</span></li>
</ul>

<h3>👥 PASSENGER ROSTER & TICKETING STATUS:</h3>
<ol>
{{PASSENGER_LIST_HTML}}
</ol>

<p><em>Note: Please ensure all passenger names match the exact spelling on their international passports. Airport online check-in opens 24 hours prior to scheduled departure.</em></p>

<hr/>
<p>
  Safe travels,<br/>
  <strong>{{AGENT_NAME}}</strong><br/>
  <em>Flight Operations & E-Ticket Issuance Desk</em><br/>
  <strong>Travelocase Global Flight Services</strong><br/>
  <span style="font-size: 11px; color: #94a3b8;">Sent securely from ticketing@travelocase.com</span>
</p>`,
  },
  {
    id: "travel_followup_03",
    title: "Travel Schedule Follow-up & Verification Call Scheduled",
    type: "FOLLOW_UP",
    subject: "[Booking ID: {{PNR_CODE}}] Follow-up: Flight Itinerary Verification for {{ORIGIN}} to {{DESTINATION}}",
    bodyTemplate: `<p>Dear <strong>{{CUSTOMER_NAME}}</strong>,</p>

<p>I am following up regarding your international flight inquiry from <strong>{{ORIGIN}}</strong> to <strong>{{DESTINATION}}</strong> with <strong>Travelocase</strong>.</p>

<p>Our reservations team has placed a temporary promotional fare hold on <strong>{{AIRLINE}} {{FLIGHT_NUMBER}}</strong> for departure on <strong>{{DEPARTURE_DATE}}</strong> under Booking Reference <strong>{{PNR_CODE}}</strong>.</p>

<p>Please reply directly to this email or call our desk at <strong>{{CUSTOMER_PHONE}}</strong> at your earliest convenience to lock in this enterprise airfare rate before the airline ticket hold expires.</p>

<hr/>
<p>
  Best regards,<br/>
  <strong>{{AGENT_NAME}}</strong><br/>
  <em>Reservations & Flight Advisory Desk</em><br/>
  <strong>Travelocase Global Flight Services</strong><br/>
  <span style="font-size: 11px; color: #94a3b8;">Sent securely from ticketing@travelocase.com</span>
</p>`,
  },
  {
    id: "cancellation_notice_04",
    title: "Flight Cancellation Notice & Refund Assessment",
    type: "CANCELLATION",
    subject: "[Booking ID: {{PNR_CODE}}] Cancellation Notice & Record for {{PASSENGER_NAME}}",
    bodyTemplate: `<p>Dear <strong>{{CUSTOMER_NAME}}</strong>,</p>

<p>This message confirms that flight booking under Reference <strong>{{PNR_CODE}}</strong> ({{ORIGIN}} &rarr; {{DESTINATION}}) has been updated to <strong style="color: #ef4444;">CANCELLED</strong> per your request.</p>

<h3>📋 CANCELLATION SUMMARY:</h3>
<ul>
  <li><strong>Booking Reference (PNR):</strong> {{PNR_CODE}}</li>
  <li><strong>Airline / Route:</strong> {{AIRLINE}} &bull; {{ORIGIN}} to {{DESTINATION}}</li>
  <li><strong>Primary Passenger:</strong> {{PASSENGER_NAME}}</li>
</ul>

<p>If applicable, any refundable airfare or airline travel vouchers will be processed according to airline tariff regulations and credited to the original form of payment within 5-7 business days.</p>

<hr/>
<p>
  Sincerely,<br/>
  <strong>{{AGENT_NAME}}</strong><br/>
  <em>Customer Care & Ticketing Desk</em><br/>
  <strong>Travelocase Global Flight Services</strong><br/>
  <span style="font-size: 11px; color: #94a3b8;">Sent securely from ticketing@travelocase.com</span>
</p>`,
  },
];

export function renderEmailTemplate(
  template: EmailTemplate,
  lead: Lead,
  agentName: string
): { subject: string; body: string } {
  const booking = lead.bookingDetails;
  const primaryPassenger = booking?.passengers[0]?.fullName || lead.name;
  const pnr =
    booking?.pnrCode ||
    "TC-" + lead.id.substring(lead.id.length - 6).toUpperCase();
  const origin = booking?.origin || "JFK (New York)";
  const destination = booking?.destination || "LHR (London Heathrow)";
  const airline = booking?.airline || "British Airways";
  const flightNumber = booking?.flightNumber || "BA-178";
  const cabinClass = booking?.cabinClass || "BUSINESS";
  const tripType =
    booking?.tripType === "ROUND_TRIP" ? "Round Trip" : "One Way";
  const departureDate = booking?.departureDate || "2026-10-15";
  const returnDateRow = booking?.returnDate
    ? `<li><strong>Return Date:</strong> ${booking.returnDate}</li>`
    : "";

  const passengerListHtml =
    booking?.passengers && booking.passengers.length > 0
      ? booking.passengers
          .map(
            (p) =>
              `<li><strong>${p.fullName}</strong> &bull; Passport: <code>${
                p.passportNumber || "On File"
              }</code> &bull; Seat: ${p.seatPreference || "Standard"} &bull; DOB: ${
                p.dob || "N/A"
              }</li>`
          )
          .join("\n")
      : `<li><strong>${lead.name}</strong> (Primary Passenger)</li>`;

  const totalFare = formatCurrency(lead.dealValue, lead.currency || "USD");

  const bookingNumberStr = lead.bookingNumber ? `#${lead.bookingNumber}` : `#1001`;
  const bookingRef = lead.bookingNumber ? `#${lead.bookingNumber}` : pnr;

  let subject = template.subject
    .replace(/\{\{CUSTOMER_NAME\}\}/g, lead.name)
    .replace(/\{\{PASSENGER_NAME\}\}/g, primaryPassenger)
    .replace(/\{\{PNR_CODE\}\}/g, pnr)
    .replace(/\{\{BOOKING_NUMBER\}\}/g, bookingNumberStr)
    .replace(/\{\{BOOKING_ID\}\}/g, bookingRef)
    .replace(/\{\{ORIGIN\}\}/g, origin)
    .replace(/\{\{DESTINATION\}\}/g, destination);

  // Guarantee that [Booking ID: ... ] is always at the beginning of the subject if not already present
  if (!subject.includes("[Booking ID:")) {
    subject = `[Booking ID: ${bookingRef}] ${subject}`;
  } else {
    // If it has [Booking ID: {{PNR_CODE}}], replace with [Booking ID: #1001]
    subject = subject.replace(/\[Booking ID:\s*[^\]]+\]/, `[Booking ID: ${bookingRef}]`);
  }

  let body = template.bodyTemplate
    .replace(/\{\{CUSTOMER_NAME\}\}/g, lead.name)
    .replace(/\{\{CUSTOMER_PHONE\}\}/g, lead.phone || "+1 (555) 019-2834")
    .replace(/\{\{PASSENGER_NAME\}\}/g, primaryPassenger)
    .replace(/\{\{PNR_CODE\}\}/g, pnr)
    .replace(/\{\{BOOKING_NUMBER\}\}/g, bookingNumberStr)
    .replace(/\{\{BOOKING_ID\}\}/g, bookingRef)
    .replace(/\{\{ORIGIN\}\}/g, origin)
    .replace(/\{\{DESTINATION\}\}/g, destination)
    .replace(/\{\{TRIP_TYPE\}\}/g, tripType)
    .replace(/\{\{AIRLINE\}\}/g, airline)
    .replace(/\{\{FLIGHT_NUMBER\}\}/g, flightNumber)
    .replace(/\{\{CABIN_CLASS\}\}/g, cabinClass)
    .replace(/\{\{DEPARTURE_DATE\}\}/g, departureDate)
    .replace(/\{\{RETURN_DATE_ROW\}\}/g, returnDateRow)
    .replace(/\{\{PASSENGER_LIST_HTML\}\}/g, passengerListHtml)
    .replace(/\{\{TOTAL_FARE\}\}/g, totalFare)
    .replace(/\{\{AGENT_NAME\}\}/g, agentName);

  return { subject, body };
}
