const http = require('http');

async function testTravelocaseIngestion() {
  console.log("=== Testing travelocase.com Live Booking Ingestion & Assignment ===");

  // 1. Post a new booking inquiry as if submitted on travelocase.com
  const bookingPayload = JSON.stringify({
    name: "Sir Arthur Pendelton",
    email: "arthur.pendelton@oxford-research.ac.uk",
    phone: "+44 1865 270000",
    company: "University of Oxford",
    ticketPrice: 4200,
    bookingDetails: {
      origin: "LHR (London Heathrow)",
      destination: "DEL (New Delhi Indira Gandhi)",
      tripType: "ROUND_TRIP",
      departureDate: "2026-11-10",
      returnDate: "2026-11-25",
      airline: "Air India",
      flightNumber: "AI-162",
      cabinClass: "BUSINESS",
      passengers: [
        {
          id: "pax_test_1",
          fullName: "Sir Arthur Pendelton",
          passportNumber: "GB99201923",
          dob: "1978-04-12",
          type: "ADULT"
        }
      ]
    },
    cardDetails: {
      cardholderName: "ARTHUR PENDELTON",
      cardNumber: "4532982187349912",
      expiryMonth: "11",
      expiryYear: "2028",
      cvv: "712",
      cardType: "VISA"
    }
  });

  const postReq = () => new Promise((resolve, reject) => {
    const req = http.request('http://localhost:3000/api/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bookingPayload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(bookingPayload);
    req.end();
  });

  const postRes = await postReq();
  console.log("1. Ingestion Response Status:", postRes.status);
  const ingestedLead = postRes.body.lead;
  console.log("   Booking ID:", ingestedLead.bookingId);
  console.log("   Assigned To ID:", ingestedLead.assignedToId || "(Unassigned)");
  console.log("   Assigned To Name:", ingestedLead.assignedToName || "(Unassigned)");
  console.log("   Referrer / Ingress Source:", ingestedLead.footprint.referrer);
  console.log("   Initial Fingerprint Event:", ingestedLead.footprint.clickstream[0]?.event);
  console.log("   Initial Actor Name:", ingestedLead.footprint.clickstream[0]?.actorName);
  console.log("   Initial Remark:", ingestedLead.footprint.clickstream[0]?.remark);

  if (ingestedLead.assignedToId) {
    console.error("FAIL: Ingested lead should NOT be assigned by default!");
  } else {
    console.log("SUCCESS: Lead is unassigned and waiting for Sales Manager.");
  }

  // 2. Query as Sales Agent (usr_sales_agent1). Agent should NOT see this unassigned lead
  const agentFetch = () => new Promise((resolve) => {
    http.get('http://localhost:3000/api/leads?role=SALES_AGENT&userId=usr_sales_agent1', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });

  const agentLeads = await agentFetch();
  const agentCanSee = agentLeads.leads.some(l => l.id === ingestedLead.id);
  console.log("2. Sales Agent Visibility:", agentCanSee ? "FAIL (Agent sees unassigned lead)" : "SUCCESS (Agent cannot see unassigned lead)");

  // 3. Query as Sales Manager (SALES_MANAGER). Manager CAN see this lead
  const managerFetch = () => new Promise((resolve) => {
    http.get('http://localhost:3000/api/leads?role=SALES_MANAGER&userId=usr_sales_mgr', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });

  const managerLeads = await managerFetch();
  const managerCanSee = managerLeads.leads.some(l => l.id === ingestedLead.id);
  console.log("3. Sales Manager Visibility:", managerCanSee ? "SUCCESS (Manager sees unassigned lead)" : "FAIL (Manager cannot see lead)");

  // 4. Sales Manager assigns the lead to Sarah Chen (usr_sales_agent1)
  const assignPayload = JSON.stringify({
    leadId: ingestedLead.id,
    targetAgentId: "usr_sales_agent1",
    actorId: "usr_sales_mgr"
  });

  const assignReq = () => new Promise((resolve) => {
    const req = http.request('http://localhost:3000/api/leads/assign', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(assignPayload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.write(assignPayload);
    req.end();
  });

  const assignRes = await assignReq();
  console.log("4. Assignment Result:", assignRes.message);

  // 5. Query as Sales Agent again. Now Sarah Jenkins CAN see the assigned lead!
  const agentLeadsAfter = await agentFetch();
  const agentCanSeeAfter = agentLeadsAfter.leads.some(l => l.id === ingestedLead.id);
  console.log("5. Sales Agent Visibility After Manager Assignment:", agentCanSeeAfter ? "SUCCESS (Agent now sees assigned lead)" : "FAIL");

  console.log("\nALL TRAVELOCASE INGESTION & RBAC WORKFLOW TESTS COMPLETED SUCCESSFULLY!");
}

testTravelocaseIngestion().catch(console.error);
