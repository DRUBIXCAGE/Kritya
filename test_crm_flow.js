// Comprehensive End-to-End Test for Kritya Flight CRM
// Verifies:
// 1. Database Persistence
// 2. Booking ID Search / Query
// 3. Strict Sales Agent Row-Level Security & Access Lockdown
// 4. Email Dispatching from ticketing@travelocase.com with Booking ID subject
// 5. Manager Clearance & Card Vault Access

const fs = require("fs");
const path = require("path");

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("===================================================================");
  console.log(" STARTING KRITYA ENTERPRISE CRM DATABASE & RBAC ISOLATION TEST");
  console.log("===================================================================");

  // 1. Ingest New Flight Lead assigned to Sarah Chen (usr_sales_agent1)
  console.log("\n[TEST 1] Ingesting Flight Booking assigned to Sarah Chen (usr_sales_agent1)...");
  const pnr = "TC-TEST" + Math.floor(1000 + Math.random() * 9000);
  const ingestPayload = {
    name: "Countess Natalia Romanova",
    email: "natalia.romanova@vanguard-holdings.ch",
    company: "Vanguard Wealth Management",
    phone: "+41 22 819 0920",
    dealValue: 28500,
    currency: "USD",
    assignedToId: "usr_sales_agent1",
    ipAddress: "198.51.100.99",
    bookingDetails: {
      origin: "ZRH (Zurich)",
      destination: "JFK (New York)",
      tripType: "ROUND_TRIP",
      departureDate: "2026-11-15",
      returnDate: "2026-11-28",
      airline: "SWISS International Air Lines",
      flightNumber: "LX-14",
      cabinClass: "FIRST",
      pnrCode: pnr,
      passengers: [
        {
          id: "pax_nat_01",
          fullName: "Countess Natalia Romanova",
          passportNumber: "CH90281923",
          passportExpiry: "2032-08-19",
          nationality: "Swiss (CHE)",
          dob: "1986-03-12",
          gender: "FEMALE",
          type: "ADULT",
          seatPreference: "1K (First Suite)",
          mealPreference: "Alpine Gourmet Caviar Special",
          specialAssistance: "None (VIP Chauffeur Tarmac Transfer)",
          eTicketNumber: "ETKT-724-9028192301",
        },
      ],
    },
    cardDetails: {
      cardholderName: "NATALIA ROMANOVA",
      cardNumber: "4532890129487733",
      expiryMonth: "11",
      expiryYear: "2029",
      cvv: "912",
      cardType: "VISA",
      isAccessGrantedToAgent: false,
    },
  };

  const ingestRes = await fetch(`${BASE_URL}/api/leads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(ingestPayload),
  });
  const ingestData = await ingestRes.json();
  if (!ingestData.success || !ingestData.lead) throw new Error("Ingest failed: " + JSON.stringify(ingestData));
  const leadId = ingestData.lead.id;
  console.log(`✓ Flight Lead Ingested! Lead ID: ${leadId}, PNR: ${pnr}`);

  // 2. Verify Database Persistence on Disk
  console.log("\n[TEST 2] Verifying persistent database file on disk (kritya_crm_db.json)...");
  const dbFilePath = path.join(process.cwd(), "data", "kritya_crm_db.json");
  if (!fs.existsSync(dbFilePath)) {
    throw new Error("Database file data/kritya_crm_db.json was not found on disk!");
  }
  const dbRaw = fs.readFileSync(dbFilePath, "utf-8");
  const dbData = JSON.parse(dbRaw);
  const foundInDb = dbData.leads.some((l) => l.id === leadId && l.bookingDetails.pnrCode === pnr);
  if (!foundInDb) {
    throw new Error(`Ingested lead ${leadId} with PNR ${pnr} not found in database on disk!`);
  }
  console.log(`✓ Verified Lead persisted into Database! (Total Leads in DB: ${dbData.leads.length})`);

  // 3. Test Direct Search by Booking ID (PNR)
  console.log("\n[TEST 3] Testing Direct Booking ID Search (PNR: " + pnr + ")...");
  const searchRes = await fetch(`${BASE_URL}/api/leads/search?bookingId=${pnr}&role=SALES_AGENT&userId=usr_sales_agent1`);
  const searchData = await searchRes.json();
  if (!searchData.success || !searchData.lead) throw new Error("PNR Search failed: " + JSON.stringify(searchData));
  console.log(`✓ Booking Found by PNR! Customer: ${searchData.lead.name}, Routing: ${searchData.lead.bookingDetails.origin} -> ${searchData.lead.bookingDetails.destination}`);

  // 4. Test Agent Row-Level Security Isolation (David Miller CANNOT access Sarah Chen's lead)
  console.log("\n[TEST 4] Testing Agent Row-Level Security Isolation...");
  // 4a: David Miller queries all leads -> must only get leads assigned to him
  const davidLeadsRes = await fetch(`${BASE_URL}/api/leads?role=SALES_AGENT&userId=usr_sales_agent2`);
  const davidLeadsData = await davidLeadsRes.json();
  const hasSarahLead = davidLeadsData.leads.some((l) => l.id === leadId);
  if (hasSarahLead) {
    throw new Error("Security Breach: David Miller received Sarah Chen's lead in pipeline list!");
  }
  console.log(`✓ Agent pipeline list strictly isolated (David Miller received ${davidLeadsData.leads.length} leads assigned to him)`);

  // 4b: David Miller directly tries to fetch Sarah Chen's lead by ID -> must return 403 Forbidden
  const forbiddenIdRes = await fetch(`${BASE_URL}/api/leads/${leadId}?role=SALES_AGENT&userId=usr_sales_agent2`);
  if (forbiddenIdRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for unauthorized agent fetch but got ${forbiddenIdRes.status}`);
  }
  console.log(`✓ Direct access by unauthorized agent blocked with 403 Forbidden`);

  // 4c: David Miller directly searches for Sarah Chen's Booking ID -> must return 403 Forbidden
  const forbiddenSearchRes = await fetch(`${BASE_URL}/api/leads/search?bookingId=${pnr}&role=SALES_AGENT&userId=usr_sales_agent2`);
  if (forbiddenSearchRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for unauthorized booking search but got ${forbiddenSearchRes.status}`);
  }
  console.log(`✓ Booking search by unauthorized agent blocked with 403 Forbidden`);

  // 4d: Sales Manager (usr_sales_mgr) CAN access any agent's booking
  const managerSearchRes = await fetch(`${BASE_URL}/api/leads/search?bookingId=${pnr}&role=SALES_MANAGER&userId=usr_sales_mgr`);
  const managerSearchData = await managerSearchRes.json();
  if (!managerSearchData.success) {
    throw new Error("Manager was denied access to booking: " + JSON.stringify(managerSearchData));
  }
  console.log(`✓ Sales Manager granted supervisory access to booking ${pnr}`);

  // 5. Test Sending Customized Recipient & Customized Email from ticketing@travelocase.com
  console.log("\n[TEST 5] Testing Email Dispatch from ticketing@travelocase.com with Booking ID Subject...");
  const editedRecipient = "natalia.assistant@vanguard-holdings.ch";
  const customSubject = `[Booking ID: ${pnr}] Flight Itinerary & First Class Suite Confirmation for Countess Romanova`;
  const customBody = `<p>Dear Countess Romanova,</p><p>Your SWISS First Suite booking (${pnr}) from Zurich to New York has been reserved.</p>`;

  const emailRes = await fetch(`${BASE_URL}/api/leads/${leadId}/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      templateId: "flight_auth_01",
      actorId: "usr_sales_agent1",
      recipientEmail: editedRecipient,
      subject: customSubject,
      body: customBody,
    }),
  });
  const emailData = await emailRes.json();
  if (!emailData.success) throw new Error("Email dispatch failed: " + JSON.stringify(emailData));
  console.log(`✓ Email Dispatched Successfully!`);
  console.log(`  - From: ${emailData.email.from}`);
  console.log(`  - To: ${emailData.email.recipientEmail}`);
  console.log(`  - Subject: ${emailData.email.subject}`);

  if (emailData.email.from !== "ticketing@travelocase.com") {
    throw new Error("Sender email is not ticketing@travelocase.com!");
  }
  if (!emailData.email.subject.includes(`[Booking ID: ${pnr}]`)) {
    throw new Error("Email subject does not contain Booking ID tag!");
  }

  // 6. Test Manager Granting Card Clearance Protocol
  console.log("\n[TEST 6] Sales Manager Grants Card Clearance to Agent...");
  const grantRes = await fetch(`${BASE_URL}/api/leads/${leadId}/card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "GRANT",
      actorId: "usr_sales_mgr",
    }),
  });
  const grantData = await grantRes.json();
  if (!grantData.success) throw new Error("Manager card grant failed: " + JSON.stringify(grantData));
  console.log(`✓ Card Clearance Authorized by: ${grantData.lead.cardDetails.grantedByManagerName}`);

  // 7. Card View Auditing into Digital Footprint
  console.log("\n[TEST 7] Assigned Agent Unmasks Card -> Verifying Instant Audit into Digital Footprint...");
  const viewRes = await fetch(`${BASE_URL}/api/leads/${leadId}/card`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "VIEW",
      actorId: "usr_sales_agent1",
    }),
  });
  const viewData = await viewRes.json();
  if (!viewData.success) throw new Error("Card view logging failed: " + JSON.stringify(viewData));
  console.log(`✓ Card View Audit Logged into Digital Footprint!`);

  // 8. Sales Confirmation & Charging Handoff
  console.log("\n[TEST 8] Sales Agent Marks Deal as SALE -> Handing off to Charging Desk...");
  const saleRes = await fetch(`${BASE_URL}/api/leads/${leadId}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targetStatus: "SALE",
      actorId: "usr_sales_agent1",
    }),
  });
  const saleData = await saleRes.json();
  if (!saleData.success) throw new Error("Sale transition failed: " + JSON.stringify(saleData));
  console.log(`✓ Lead Status Advanced to: ${saleData.lead.status} (Enqueued to Charging Desk)`);

  console.log("\n===================================================================");
  console.log(" ALL KRITYA DATABASE, BOOKING SEARCH & RBAC ISOLATION TESTS PASSED 100%!");
  console.log("===================================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
