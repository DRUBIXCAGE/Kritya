// test_lead_assignment.js
// Verification of single and bulk lead assignment, manager/admin authorization, and agent isolation.

async function runTests() {
  const BASE_URL = "http://localhost:3000";

  console.log("=== STEP 1: Fetch initial state ===");
  const initRes = await fetch(`${BASE_URL}/api/leads`);
  const initData = await initRes.json();
  const leads = initData.leads;

  const usersRes = await fetch(`${BASE_URL}/api/users`);
  const usersData = await usersRes.json();
  const users = usersData.users;

  console.log(`Found ${leads.length} leads and ${users.length} users.`);

  const superAdmin = users.find((u) => u.role === "SUPER_ADMIN");
  const admin = users.find((u) => u.role === "ADMIN");
  const salesManager = users.find((u) => u.role === "SALES_MANAGER");
  const salesAgents = users.filter((u) => u.role === "SALES_AGENT");

  if (!salesManager || salesAgents.length < 2) {
    throw new Error("Required users (manager, multiple agents) not found in DB.");
  }

  const agent1 = salesAgents[0];
  const agent2 = salesAgents[1];

  console.log(`Testing with:
  - Super Admin: ${superAdmin.name} (${superAdmin.id})
  - Sales Manager: ${salesManager.name} (${salesManager.id})
  - Sales Agent 1: ${agent1.name} (${agent1.id})
  - Sales Agent 2: ${agent2.name} (${agent2.id})
`);

  // STEP 2: Unauthorized agent tries to assign a lead
  console.log("=== STEP 2: Agent attempts to assign a lead (Should fail 403) ===");
  const testLead1 = leads[0];
  const agentAssignRes = await fetch(`${BASE_URL}/api/leads/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leadId: testLead1.id,
      targetAgentId: agent1.id,
      actorId: agent1.id,
    }),
  });

  const agentAssignData = await agentAssignRes.json();
  console.log("Agent assign status:", agentAssignRes.status, agentAssignData);
  if (agentAssignRes.status !== 403 || agentAssignData.success) {
    throw new Error("Expected 403 Forbidden when agent attempts to assign lead!");
  }
  console.log("✓ Agent assignment successfully blocked by RBAC.");

  // STEP 3: Sales Manager assigns single lead to Agent 1
  console.log("\n=== STEP 3: Sales Manager assigns single lead to Agent 1 ===");
  const managerSingleAssignRes = await fetch(`${BASE_URL}/api/leads/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leadId: testLead1.id,
      targetAgentId: agent1.id,
      actorId: salesManager.id,
    }),
  });

  const managerSingleAssignData = await managerSingleAssignRes.json();
  console.log("Manager single assign status:", managerSingleAssignRes.status, managerSingleAssignData);
  if (!managerSingleAssignData.success) {
    throw new Error("Manager failed to assign lead: " + managerSingleAssignData.error);
  }
  if (managerSingleAssignData.lead.assignedToId !== agent1.id) {
    throw new Error("Lead assignedToId mismatch!");
  }
  console.log(`✓ Lead #${testLead1.bookingNumber || testLead1.id} successfully assigned to ${agent1.name}.`);

  // STEP 4: Admin bulk-assigns multiple leads to Agent 2 at the same time
  console.log("\n=== STEP 4: Admin bulk-assigns multiple leads to Agent 2 ===");
  const targetLeadIds = leads.slice(0, 3).map((l) => l.id);
  const adminBulkAssignRes = await fetch(`${BASE_URL}/api/leads/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      leadIds: targetLeadIds,
      targetAgentId: agent2.id,
      actorId: admin ? admin.id : superAdmin.id,
    }),
  });

  const adminBulkAssignData = await adminBulkAssignRes.json();
  console.log("Admin bulk assign status:", adminBulkAssignRes.status, adminBulkAssignData);
  if (!adminBulkAssignData.success) {
    throw new Error("Bulk assign failed: " + adminBulkAssignData.error);
  }
  if (adminBulkAssignData.count !== targetLeadIds.length) {
    throw new Error(`Expected count ${targetLeadIds.length}, got ${adminBulkAssignData.count}`);
  }
  console.log(`✓ Bulk assigned ${adminBulkAssignData.count} leads to ${agent2.name} simultaneously.`);

  // STEP 5: Re-fetch database to verify persistence
  console.log("\n=== STEP 5: Verify Persistence & Activity Logs ===");
  const verifyRes = await fetch(`${BASE_URL}/api/leads`);
  const verifyData = await verifyRes.json();
  for (const leadId of targetLeadIds) {
    const updatedLead = verifyData.leads.find((l) => l.id === leadId);
    if (!updatedLead || updatedLead.assignedToId !== agent2.id) {
      throw new Error(`Lead ${leadId} was not persisted with assignedToId ${agent2.id}`);
    }
  }
  console.log("✓ All bulk assigned leads verified in persisted database.");

  // Check activity logs
  const auditRes = await fetch(`${BASE_URL}/api/audit-logs`);
  const auditData = await auditRes.json();
  const activityLogs = auditData.activityLogs || [];
  const assignLogs = activityLogs.filter((l) => l.action === "LEAD_ASSIGNED" || l.action === "LEADS_BULK_ASSIGNED");
  console.log(`Found ${assignLogs.length} assignment activity log entries.`);
  if (assignLogs.length === 0) {
    throw new Error("Expected activity logs for lead assignments!");
  }
  console.log("✓ Activity log tracking verified.");

  console.log("\n==========================================");
  console.log("🎉 ALL LEAD ASSIGNMENT TESTS PASSED SUCCESSFULLY!");
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
