import { EmailTemplate, Lead, FlightSegment, Passenger } from "@/types";
import { formatCurrency } from "./utils";

export const OFFICIAL_SENDER_EMAIL = "ticketing@travelocase.com";
export const OFFICIAL_SENDER_NAME = "Travelocase Reservations & Ticketing Desk";

export const PREDEFINED_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "flight_auth_01",
    title: "Flight Authorization & Card Verification Request",
    type: "AUTHENTICATION",
    subject: "[Booking ID: {{BOOKING_ID}}] Urgent: Card Authorization & Flight Itinerary Confirmation for {{PASSENGER_NAME}}",
    bodyTemplate: `<p>Dear <strong>{{CUSTOMER_NAME}}</strong>,</p>

<p>Thank you for booking your upcoming flight with <strong>Travelocase Global Flight Services</strong>.</p>

<p>To finalize your flight reservation and proceed with ticket issuance, please review and verify your confirmed travel itinerary below:</p>

<h3 style="color: #1e293b; margin-bottom: 6px;">✈️ FLIGHT ITINERARY SUMMARY</h3>
{{FLIGHT_TABLE_HTML}}

<div style="margin: 12px 0; font-size: 13px; color: #334155;">
  <strong>Booking Reference (PNR):</strong> <span style="color: #4f46e5; font-weight: bold; font-family: monospace;">{{PNR_CODE}}</span> &bull; 
  <strong>Total Authorized Fare:</strong> <span style="color: #059669; font-weight: bold;">{{TOTAL_FARE}}</span>
</div>

<h3 style="color: #1e293b; margin-bottom: 6px; margin-top: 18px;">👥 PASSENGER MANIFEST & TICKETING DETAILS</h3>
{{PASSENGER_TABLE_HTML}}

<blockquote style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 10px 14px; margin: 16px 0; font-size: 12px; color: #1e293b;">
  <strong>PAYMENT & SECURITY VERIFICATION PROTOCOL:</strong><br/>
  In compliance with airline ticketing security standards, our travel specialist will contact you at <strong>{{CUSTOMER_PHONE}}</strong> to verbally verify the booking authorization.
</blockquote>

<p>Once verbally verified on call, your official e-tickets and boarding passes will be issued immediately.</p>

<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 18px 0;"/>
<p style="font-size: 12px; color: #475569;">
  Kind regards,<br/>
  <strong>{{AGENT_NAME}}</strong><br/>
  <em>Enterprise Flight Operations & Ticketing Desk</em><br/>
  <strong>Travelocase Global Flight Services</strong><br/>
  <span style="font-size: 11px; color: #94a3b8;">Sent securely from ticketing@travelocase.com</span>
</p>`,
  },
  {
    id: "booking_itinerary_02",
    title: "Official Flight Itinerary & E-Ticket Confirmation",
    type: "CONFIRMATION",
    subject: "[Booking ID: {{BOOKING_ID}}] Confirmed: Flight E-Ticket Itinerary for {{PASSENGER_NAME}}",
    bodyTemplate: `<p>Dear <strong>{{CUSTOMER_NAME}}</strong>,</p>

<p>Your flight reservation has been successfully <strong style="color: #059669;">CONFIRMED & ISSUED</strong>. Your official travel itinerary from <strong>Travelocase</strong> is detailed below:</p>

<h3 style="color: #1e293b; margin-bottom: 6px;">🎫 CONFIRMED FLIGHT ITINERARY</h3>
{{FLIGHT_TABLE_HTML}}

<div style="margin: 12px 0; font-size: 13px; color: #334155;">
  <strong>Booking Reference (PNR):</strong> <span style="color: #4f46e5; font-weight: bold; font-family: monospace;">{{PNR_CODE}}</span> &bull; 
  <strong>Total Amount Settled:</strong> <span style="color: #059669; font-weight: bold;">{{TOTAL_FARE}}</span>
</div>

<h3 style="color: #1e293b; margin-bottom: 6px; margin-top: 18px;">👥 PASSENGER ROSTER & SEAT ASSIGNMENTS</h3>
{{PASSENGER_TABLE_HTML}}

<p style="font-size: 12px; color: #64748b;"><em>Note: Please ensure all passenger names match the exact spelling on their government IDs/passports. Airport check-in opens 24 hours prior to scheduled departure.</em></p>

<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 18px 0;"/>
<p style="font-size: 12px; color: #475569;">
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
    subject: "[Booking ID: {{BOOKING_ID}}] Follow-up: Flight Itinerary Verification for {{ORIGIN}} to {{DESTINATION}}",
    bodyTemplate: `<p>Dear <strong>{{CUSTOMER_NAME}}</strong>,</p>

<p>I am following up regarding your flight inquiry from <strong>{{ORIGIN}}</strong> to <strong>{{DESTINATION}}</strong> with <strong>Travelocase</strong>.</p>

<h3 style="color: #1e293b; margin-bottom: 6px;">✈️ RESERVED FLIGHT SCHEDULE</h3>
{{FLIGHT_TABLE_HTML}}

<p>Our reservations team has placed a promotional fare hold under Booking Reference <strong>{{PNR_CODE}}</strong>.</p>

<p>Please reply directly to this email or call our desk at <strong>{{CUSTOMER_PHONE}}</strong> at your earliest convenience to lock in this airfare before the ticket hold expires.</p>

<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 18px 0;"/>
<p style="font-size: 12px; color: #475569;">
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
    subject: "[Booking ID: {{BOOKING_ID}}] Cancellation Notice & Record for {{PASSENGER_NAME}}",
    bodyTemplate: `<p>Dear <strong>{{CUSTOMER_NAME}}</strong>,</p>

<p>This message confirms that flight booking under Reference <strong>{{PNR_CODE}}</strong> ({{ORIGIN}} &rarr; {{DESTINATION}}) has been updated to <strong style="color: #dc2626;">CANCELLED</strong> per your request.</p>

<h3 style="color: #1e293b; margin-bottom: 6px;">📋 CANCELLED FLIGHT SEGMENTS</h3>
{{FLIGHT_TABLE_HTML}}

<p>If applicable, any refundable airfare or airline travel vouchers will be processed according to airline tariff regulations and credited within 5-7 business days.</p>

<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 18px 0;"/>
<p style="font-size: 12px; color: #475569;">
  Sincerely,<br/>
  <strong>{{AGENT_NAME}}</strong><br/>
  <em>Customer Care & Ticketing Desk</em><br/>
  <strong>Travelocase Global Flight Services</strong><br/>
  <span style="font-size: 11px; color: #94a3b8;">Sent securely from ticketing@travelocase.com</span>
</p>`,
  },
];

/**
 * Generate formatted HTML table for flight segments
 */
export function generateFlightTableHtml(flights: FlightSegment[], defaultOrigin = "JFK", defaultDest = "LHR", defaultAirline = "American Airlines", defaultFlightNo = "AA-100", defaultDate = "2026-07-16"): string {
  if (!flights || flights.length === 0) {
    flights = [
      {
        id: "flt_def",
        airline: defaultAirline,
        flightNumber: defaultFlightNo,
        origin: defaultOrigin,
        destination: defaultDest,
        departureDate: defaultDate,
        departureTime: "08:00 AM",
        arrivalDate: defaultDate,
        arrivalTime: "11:30 AM",
        duration: "03h 30m",
        cabinClass: "Economy",
        confirmationNumber: "CONF-DEFAULT",
      },
    ];
  }

  const rows = flights.map((f, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 600; color: #0f172a;">
        ${f.airline || "Airline"} <span style="font-family: monospace; color: #4f46e5;">${f.flightNumber}</span>
      </td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #334155;">
        <strong>${f.origin}</strong> ${f.originName ? `(${f.originName})` : ''}<br/>
        <span style="font-size: 11px; color: #64748b;">${f.departureTime || 'TBD'} &bull; ${f.departureDate}</span>
      </td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #334155;">
        <strong>${f.destination}</strong> ${f.destinationName ? `(${f.destinationName})` : ''}<br/>
        <span style="font-size: 11px; color: #64748b;">${f.arrivalTime || 'TBD'} &bull; ${f.arrivalDate || f.departureDate}</span>
      </td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #334155; text-align: center;">
        <span style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">
          ${f.cabinClass || "Economy"}
        </span>
      </td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-family: monospace; color: #0369a1; font-weight: bold; text-align: center;">
        ${f.confirmationNumber || f.fareBasis || "CONFIRMED"}
      </td>
    </tr>
  `).join("");

  return `
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin: 10px 0; font-size: 12px; font-family: Arial, sans-serif;">
      <thead>
        <tr style="background-color: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left;">
          <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Flight / Airline</th>
          <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Departure</th>
          <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Arrival</th>
          <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">Cabin</th>
          <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center;">Confirmation #</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Generate formatted HTML table for passengers
 */
export function generatePassengerTableHtml(passengers: Passenger[], defaultLeadName = "Valued Customer"): string {
  if (!passengers || passengers.length === 0) {
    passengers = [
      {
        id: "pax_def",
        title: "Mr",
        fullName: defaultLeadName,
        type: "Adult",
        gender: "Male",
        dob: "N/A",
        seatPreference: "Standard",
      },
    ];
  }

  const rows = passengers.map((p, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 600; color: #334155; text-align: center;">
        ${p.title || (p.gender === "Female" ? "Ms" : "Mr")}
      </td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 700; color: #0f172a;">
        ${p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || defaultLeadName}
      </td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #475569; text-align: center;">
        <span style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 11px;">
          ${p.type || "Adult"}
        </span>
      </td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; font-family: monospace; color: #475569; text-align: center;">
        ${p.dob || "On File"}
      </td>
      <td style="padding: 8px 10px; border: 1px solid #cbd5e1; color: #334155;">
        ${p.seatPreference || "Auto-Assign"} ${p.mealPreference ? `(${p.mealPreference})` : ''}
      </td>
    </tr>
  `).join("");

  return `
    <table style="width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; margin: 10px 0; font-size: 12px; font-family: Arial, sans-serif;">
      <thead>
        <tr style="background-color: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left;">
          <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; width: 60px;">Title</th>
          <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Passenger Name</th>
          <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; width: 90px;">Type</th>
          <th style="padding: 8px 10px; border: 1px solid #cbd5e1; text-align: center; width: 110px;">DOB</th>
          <th style="padding: 8px 10px; border: 1px solid #cbd5e1;">Seat / Meal Preference</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

export function renderEmailTemplate(
  template: EmailTemplate,
  lead: Lead,
  agentName: string
): { subject: string; body: string } {
  const booking = lead.bookingDetails;
  const primaryPassenger = booking?.passengers?.[0]?.fullName || lead.name;
  const pnr =
    booking?.pnrCode ||
    lead.bookingId ||
    "TC-" + lead.id.substring(lead.id.length - 6).toUpperCase();
  const origin = booking?.origin || "JFK (New York)";
  const destination = booking?.destination || "LHR (London Heathrow)";
  const airline = booking?.airline || "American Airlines";
  const flightNumber = booking?.flightNumber || "AA-3484";
  const cabinClass = booking?.cabinClass || "Economy";
  const tripType =
    booking?.tripType === "ROUND_TRIP" ? "Round Trip" : "One Way";
  const departureDate = booking?.departureDate || "2026-07-16";
  const returnDateRow = booking?.returnDate
    ? `<li><strong>Return Date:</strong> ${booking.returnDate}</li>`
    : "";

  const flightTableHtml = generateFlightTableHtml(
    booking?.flights || [],
    origin,
    destination,
    airline,
    flightNumber,
    departureDate
  );

  const passengerTableHtml = generatePassengerTableHtml(
    booking?.passengers || [],
    lead.name
  );

  const totalFare = formatCurrency(
    lead.salePrice || lead.dealValue || 1850,
    lead.currency || "USD"
  );

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
    subject = subject.replace(/\[Booking ID:\s*[^\]]+\]/, `[Booking ID: ${bookingRef}]`);
  }

  let body = template.bodyTemplate
    .replace(/\{\{CUSTOMER_NAME\}\}/g, lead.name)
    .replace(/\{\{CUSTOMER_PHONE\}\}/g, lead.phone || "+1-2537548903")
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
    .replace(/\{\{FLIGHT_TABLE_HTML\}\}/g, flightTableHtml)
    .replace(/\{\{PASSENGER_TABLE_HTML\}\}/g, passengerTableHtml)
    .replace(/\{\{PASSENGER_LIST_HTML\}\}/g, passengerTableHtml)
    .replace(/\{\{TOTAL_FARE\}\}/g, totalFare)
    .replace(/\{\{AGENT_NAME\}\}/g, agentName);

  return { subject, body };
}
