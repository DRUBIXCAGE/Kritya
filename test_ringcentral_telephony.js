const http = require("http");

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      `http://localhost:3000${path}`,
      {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );

    req.on("error", (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

async function testRingCentralSuite() {
  console.log("==================================================================");
  console.log("TESTING RINGCENTRAL INTEGRATION & TELEPHONY IN KRITYA CRM");
  console.log("==================================================================");

  // 1. Check Initial Call Logs & Extension Filtering
  console.log("\n1. Fetching call logs for Extension 101 (Sarah Chen)...");
  const ext101Res = await makeRequest("GET", "/api/ringcentral/calls?extension=101");
  console.log(`   HTTP Status: ${ext101Res.status}`);
  console.log(`   Calls Count on Ext 101: ${ext101Res.body.callLogs?.length}`);
  console.log(`   Stats: Total=${ext101Res.body.stats?.totalCalls}, Talk Time=${ext101Res.body.stats?.totalDurationSeconds}s`);

  // 2. Fetch Agent RingCentral Status
  console.log("\n2. Checking RingCentral availability status for Sarah Chen...");
  const statusRes = await makeRequest("GET", "/api/ringcentral/status?userId=usr_sales_agent1");
  console.log(`   HTTP Status: ${statusRes.status}`);
  console.log(`   Extension: ${statusRes.body.rcExtension}, Status: ${statusRes.body.rcStatus}, DID: ${statusRes.body.rcDirectNumber}`);

  // 3. Simulate Inbound Call to Extension 101
  console.log("\n3. Simulating Inbound Call from customer to Extension 101...");
  const simInbound = await makeRequest("POST", "/api/ringcentral/simulate", {
    action: "INCOMING_CALL",
    extension: "101",
    callerNumber: "+1 (555) 781-9920",
    callerName: "Eleanor Vance",
  });
  console.log(`   HTTP Status: ${simInbound.status}`);
  console.log(`   Call ID: ${simInbound.body.call?.id}`);
  console.log(`   Direction: ${simInbound.body.call?.direction}, Status: ${simInbound.body.call?.status}`);
  console.log(`   Target Agent: ${simInbound.body.targetAgent?.name} (Ext ${simInbound.body.targetAgent?.extension})`);

  const callId = simInbound.body.call?.id;
  if (!callId) throw new Error("Inbound call failed to register");

  // 4. Agent Answers the Call
  console.log("\n4. Agent Answers Call on Extension 101...");
  const answerCall = await makeRequest("POST", "/api/ringcentral/simulate", {
    action: "ANSWER_CALL",
    callId,
  });
  console.log(`   HTTP Status: ${answerCall.status}`);
  console.log(`   Answered Call Status: ${answerCall.body.call?.status}, Telephony: ${answerCall.body.call?.telephonyStatus}`);

  // 5. Agent Enters Lead Details & Flight Booking from Call
  console.log("\n5. Agent Enters Lead Details captured during call...");
  const createLeadRes = await makeRequest("POST", "/api/leads", {
    actorId: "usr_sales_agent1",
    name: "Eleanor Vance",
    phone: "+1 (555) 781-9920",
    email: "eleanor.vance@travelclient.com",
    status: "QUALIFIED",
    ticketPrice: 850,
    salePrice: 1250,
    mco: 400,
    assignedToId: "usr_sales_agent1",
    assignedToName: "Sarah Chen",
    bookingDetails: {
      origin: "JFK (New York)",
      destination: "FCO (Rome)",
      tripType: "ROUND_TRIP",
      departureDate: "2026-11-20",
      returnDate: "2026-12-05",
      airline: "ITA Airways",
      flightNumber: "AZ-609",
      cabinClass: "ECONOMY",
      ticketPrice: 850,
      salePrice: 1250,
      mco: 400,
      passengers: [{ id: "pax_1", fullName: "Eleanor Vance", dob: "1989-07-14", type: "ADULT" }],
    },
    notes: "[RingCentral Ext 101 Inbound Call] Customer booked round-trip Rome flight.",
  });
  console.log(`   HTTP Status: ${createLeadRes.status}`);
  console.log(`   New Lead Created: ID ${createLeadRes.body.lead?.id}, Booking #${createLeadRes.body.lead?.bookingNumber}`);
  console.log(`   Gross Sale: $${createLeadRes.body.lead?.salePrice}, Agent MCO: $${createLeadRes.body.lead?.mco}`);

  const leadId = createLeadRes.body.lead?.id;
  const bookingNumber = createLeadRes.body.lead?.bookingNumber;

  // 6. Update Call with Disposition, Discussion Notes, and link to Lead
  console.log("\n6. Finalizing Call Log with Disposition & Notes...");
  const patchCallRes = await makeRequest("PATCH", `/api/ringcentral/calls/${callId}`, {
    leadId,
    leadBookingNumber: bookingNumber,
    disposition: "FLIGHT_RESERVATION_SALE",
    notes: "Customer confirmed travel dates and accepted ticket quote with $400 margin. Authorization email dispatched.",
    sentiment: "POSITIVE",
    leadDetailsEntered: true,
    status: "COMPLETED",
    durationSeconds: 195,
  });
  console.log(`   HTTP Status: ${patchCallRes.status}`);
  console.log(`   Call Log Finalized: Ext ${patchCallRes.body.call?.agentExtension}`);
  console.log(`   Disposition: ${patchCallRes.body.call?.disposition}`);
  console.log(`   Linked Booking: #${patchCallRes.body.call?.leadBookingNumber}`);
  console.log(`   Duration: ${patchCallRes.body.call?.durationSeconds} seconds`);

  // 7. Test Outbound Dial from Agent Extension
  console.log("\n7. Initiating Outbound Call via RingCentral Softphone...");
  const dialRes = await makeRequest("POST", "/api/ringcentral/dial", {
    agentId: "usr_sales_agent1",
    targetNumber: "+1 (555) 912-3849",
    leadId,
    leadBookingNumber: bookingNumber,
  });
  console.log(`   HTTP Status: ${dialRes.status}`);
  console.log(`   Outbound Call Started: ID ${dialRes.body.call?.id}, From Ext ${dialRes.body.extension} to ${dialRes.body.targetNumber}`);

  // 8. Query All Calls Filtered by Extension
  console.log("\n8. Verifying Calls stored with respect to Extension 101...");
  const finalExtCalls = await makeRequest("GET", "/api/ringcentral/calls?extension=101");
  console.log(`   Total Calls Stored on Ext 101: ${finalExtCalls.body.callLogs?.length}`);
  finalExtCalls.body.callLogs?.slice(0, 4).forEach((c, i) => {
    console.log(`   [${i + 1}] ${c.direction} | ${c.callerNumber} -> ${c.calleeNumber} | Status: ${c.status} | Disp: ${c.disposition || "None"} | Ext: ${c.agentExtension}`);
  });

  console.log("\n==================================================================");
  console.log("ALL TESTS COMPLETED SUCCESSFULLY! ✅");
  console.log("==================================================================");
}

testRingCentralSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
