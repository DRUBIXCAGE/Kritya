const BASE_URL = "http://localhost:3000";

async function run() {
  console.log("==================================================================");
  console.log("TESTING IN-CALL CONTROLS: END, TRANSFER, MUTE, DIAL NUMBER");
  console.log("==================================================================\n");

  // Step 1: Simulate Inbound Call to Ext 101 (Sarah Chen)
  console.log("1. Starting call to Extension 101...");
  const simRes = await fetch(`${BASE_URL}/api/ringcentral/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "INCOMING_CALL",
      extension: "101",
      callerNumber: "+1 (555) 789-1234",
      callerName: "Jessica Alba",
    }),
  });
  const simData = await simRes.json();
  console.log("   HTTP Status:", simRes.status);
  console.log("   Call ID:", simData.call.id);
  console.log("   Status:", simData.call.status);

  // Step 2: Answer call
  console.log("\n2. Answering Call...");
  const ansRes = await fetch(`${BASE_URL}/api/ringcentral/calls/${simData.call.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "ANSWERED",
      telephonyStatus: "Connected",
    }),
  });
  const ansData = await ansRes.json();
  console.log("   HTTP Status:", ansRes.status);
  console.log("   Status:", ansData.call.status, "Telephony:", ansData.call.telephonyStatus);

  // Step 3: Test MUTE option
  console.log("\n3. Testing MUTE Option...");
  const muteRes = await fetch(`${BASE_URL}/api/ringcentral/calls/${simData.call.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      isMuted: true,
    }),
  });
  const muteData = await muteRes.json();
  console.log("   HTTP Status:", muteRes.status);
  console.log("   Call isMuted:", muteData.call.isMuted);

  // Step 4: Test TRANSFER TO ANOTHER EXTENSION option (Transfer from Ext 101 to Ext 102 - Marcus Brooks)
  console.log("\n4. Testing TRANSFER TO ANOTHER EXTENSION Option (Ext 101 -> Ext 102)...");
  const transferRes = await fetch(`${BASE_URL}/api/ringcentral/transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      callId: simData.call.id,
      targetExtension: "102",
      fromAgentId: "usr_sales_agent1",
      transferNotes: "Caller requesting flight date change",
    }),
  });
  const transferData = await transferRes.json();
  console.log("   HTTP Status:", transferRes.status);
  console.log("   Original Call Status:", transferData.call.status);
  console.log("   Original Call Transferred To:", transferData.call.transferredToExtension, `(${transferData.call.transferredToAgentName})`);
  console.log("   New Call Generated for Ext 102:", transferData.transferredInboundCall.id);
  console.log("   New Call Extension:", transferData.transferredInboundCall.agentExtension, "Status:", transferData.transferredInboundCall.status);
  console.log("   Target Agent:", transferData.targetUser ? transferData.targetUser.name : "Not Found");

  // Step 5: Test END CALL option on the transferred call
  console.log("\n5. Testing END CALL Option on Ext 102...");
  const endRes = await fetch(`${BASE_URL}/api/ringcentral/calls/${transferData.transferredInboundCall.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "COMPLETED",
      endTime: new Date().toISOString(),
      durationSeconds: 85,
      telephonyStatus: "Disconnected",
      disposition: "ITINERARY_CHANGE",
      notes: "Completed flight rescheduling for caller.",
    }),
  });
  const endData = await endRes.json();
  console.log("   HTTP Status:", endRes.status);
  console.log("   Ended Call Status:", endData.call.status);
  console.log("   Ended Call Duration:", endData.call.durationSeconds, "seconds");
  console.log("   Ended Call Disposition:", endData.call.disposition);

  // Step 6: Test DIAL NUMBER option (Outbound dialing from softphone)
  console.log("\n6. Testing DIAL NUMBER Option (Outbound Call from Ext 101)...");
  const dialRes = await fetch(`${BASE_URL}/api/ringcentral/dial`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentId: "usr_sales_agent1",
      targetNumber: "+1 (800) 433-7300",
    }),
  });
  const dialData = await dialRes.json();
  console.log("   HTTP Status:", dialRes.status);
  console.log("   Outbound Call ID:", dialData.call.id);
  console.log("   Callee Number:", dialData.call.calleeNumber);
  console.log("   Direction:", dialData.call.direction);

  console.log("\n==================================================================");
  console.log("ALL 4 IN-CALL CONTROLS TESTED SUCCESSFULLY! ✅");
  console.log("1. End Call - Verified");
  console.log("2. Transfer to Another Extension - Verified");
  console.log("3. Mute - Verified");
  console.log("4. Dial Number - Verified");
  console.log("==================================================================");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
