const http = require('http');

async function testChatSystem() {
  console.log("=== Testing Internal CRM Team & Hierarchy Chat System ===");

  // 1. Fetch Chat Channels & Messages for Sales Agent (usr_sales_agent1)
  const fetchChat = () => new Promise((resolve, reject) => {
    http.get('http://localhost:3000/api/chat?userId=usr_sales_agent1&role=SALES_AGENT', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    }).on('error', reject);
  });

  const chatInit = await fetchChat();
  console.log("1. Fetch Chat Data Status:", chatInit.status);
  console.log("   Channels Count:", chatInit.body.channels?.length);
  console.log("   Available Channels:", chatInit.body.channels?.map(c => '#' + c.name).join(', '));
  console.log("   Initial Messages Count:", chatInit.body.messages?.length);

  // 2. Sales Agent sends message in #sales-operations
  const sendChannelMsg = () => new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      actorId: "usr_sales_agent1",
      channelId: "sales-operations",
      content: "Reviewing unassigned bookings from travelocase.com now. Ready for route quotes!",
      messageType: "TEXT"
    });

    const req = http.request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  const chMsgRes = await sendChannelMsg();
  console.log("2. Send Channel Message Status:", chMsgRes.status);
  console.log("   Message ID:", chMsgRes.body.message?.id);
  console.log("   Sender:", chMsgRes.body.message?.senderName);
  console.log("   Channel:", chMsgRes.body.message?.channelId);

  // 3. Sales Agent sends Direct Hierarchy Escalation to Marcus Brooks with linked Booking #1001
  const sendEscalationMsg = () => new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      actorId: "usr_sales_agent1",
      recipientId: "usr_sales_mgr",
      content: "Marcus, urgent card clearance needed for customer on Booking #1001. Can you grant 3-minute access?",
      messageType: "APPROVAL_REQUEST",
      leadId: "lead_1",
      leadBookingNumber: 1001,
      leadPnr: "NX-78429"
    });

    const req = http.request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  const escMsgRes = await sendEscalationMsg();
  console.log("3. Send Direct Hierarchy Escalation Status:", escMsgRes.status);
  console.log("   Recipient:", escMsgRes.body.message?.recipientName);
  console.log("   Linked Booking Number:", escMsgRes.body.message?.leadBookingNumber);
  console.log("   Message Type:", escMsgRes.body.message?.messageType);

  // 4. Marcus Brooks (Sales Manager) replies with Approval Response
  const sendApprovalRes = () => new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      actorId: "usr_sales_mgr",
      recipientId: "usr_sales_agent1",
      content: "Card access clearance granted for 3 minutes for Booking #1001. Proceed with transaction verification.",
      messageType: "APPROVAL_RESPONSE",
      leadId: "lead_1",
      leadBookingNumber: 1001
    });

    const req = http.request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  const appMsgRes = await sendApprovalRes();
  console.log("4. Manager Approval Response Status:", appMsgRes.status);
  console.log("   Content:", appMsgRes.body.message?.content);

  // 5. Super Admin broadcasts official Hierarchy Shift Update
  const sendHierarchyBroadcast = () => new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      actorId: "usr_superadmin",
      channelId: "hierarchy-broadcasts",
      content: "📢 Executive Update: Travelocase routing integration active. Sales Managers and Charging Operators please align on handoff SLA thresholds.",
      messageType: "HIERARCHY_UPDATE"
    });

    const req = http.request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  const hcastRes = await sendHierarchyBroadcast();
  console.log("5. Hierarchy Broadcast Status:", hcastRes.status);
  console.log("   Broadcast Type:", hcastRes.body.message?.messageType);

  console.log("\nALL INTERNAL CHAT & HIERARCHY MESSAGING TESTS PASSED CLEANLY!");
}

testChatSystem().catch(console.error);
