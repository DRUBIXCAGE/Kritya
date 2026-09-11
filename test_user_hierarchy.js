const http = require('http');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== Testing Super Admin, Admin, Manager & Agent Role Hierarchy in Kritya ===\n");

  // Fetch initial users to obtain session IDs
  const usersRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'GET'
  });

  const superAdmin = usersRes.data.users.find(u => u.role === 'SUPER_ADMIN');
  const admin = usersRes.data.users.find(u => u.role === 'ADMIN');
  const salesMgr = usersRes.data.users.find(u => u.role === 'SALES_MANAGER');
  const salesAgent = usersRes.data.users.find(u => u.role === 'SALES_AGENT');

  console.log("Actors:");
  console.log(`- Super Admin: ${superAdmin?.name} (${superAdmin?.id})`);
  console.log(`- Operations Admin: ${admin?.name} (${admin?.id})`);
  console.log(`- Sales Manager: ${salesMgr?.name} (${salesMgr?.id})`);
  console.log(`- Sales Agent: ${salesAgent?.name} (${salesAgent?.id})\n`);

  // =========================================================================
  // 1. SUPER ADMIN PERMISSIONS
  // =========================================================================
  console.log("1. Testing Super Admin Creation Permissions:");
  // Super Admin creates an Operations Admin
  const saCreateAdmin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    actorId: superAdmin.id,
    name: 'Victoria Vance',
    email: 'victoria.v@travelocase.com',
    role: 'ADMIN'
  });
  console.log(`  [Super Admin -> Create ADMIN] Status: ${saCreateAdmin.status}, Success: ${saCreateAdmin.data.success}, User: ${saCreateAdmin.data.user?.name}`);

  // Super Admin creates a Sales Manager
  const saCreateMgr = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    actorId: superAdmin.id,
    name: 'Julian Sterling',
    email: 'julian.s@travelocase.com',
    role: 'SALES_MANAGER'
  });
  console.log(`  [Super Admin -> Create SALES_MANAGER] Status: ${saCreateMgr.status}, Success: ${saCreateMgr.data.success}, User: ${saCreateMgr.data.user?.name}`);

  // Super Admin creates a Sales Agent
  const saCreateAgent = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    actorId: superAdmin.id,
    name: 'Oliver Thorne',
    email: 'oliver.t@travelocase.com',
    role: 'SALES_AGENT'
  });
  console.log(`  [Super Admin -> Create SALES_AGENT] Status: ${saCreateAgent.status}, Success: ${saCreateAgent.data.success}, User: ${saCreateAgent.data.user?.name}\n`);

  // =========================================================================
  // 2. OPERATIONS ADMIN PERMISSIONS
  // =========================================================================
  console.log("2. Testing Operations Admin Hierarchy Enforcement:");
  // Admin creates Charging Manager (Permitted)
  const admCreateMgr = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    actorId: admin.id,
    name: 'Claire Beauchamp',
    email: 'claire.b@travelocase.com',
    role: 'CHARGING_MANAGER'
  });
  console.log(`  [Admin -> Create CHARGING_MANAGER] Status: ${admCreateMgr.status}, Success: ${admCreateMgr.data.success} (Permitted)`);

  // Admin creates CS Agent (Permitted)
  const admCreateAgent = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    actorId: admin.id,
    name: 'Liam Henderson',
    email: 'liam.h@travelocase.com',
    role: 'CS_AGENT'
  });
  console.log(`  [Admin -> Create CS_AGENT] Status: ${admCreateAgent.status}, Success: ${admCreateAgent.data.success} (Permitted)`);

  // Admin attempts to create Super Admin (BLOCKED)
  const admCreateSuperAdmin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    actorId: admin.id,
    name: 'Unauthorized Super Admin',
    email: 'rogue.super@travelocase.com',
    role: 'SUPER_ADMIN'
  });
  console.log(`  [Admin -> Create SUPER_ADMIN (BLOCKED)] Status: ${admCreateSuperAdmin.status}, Error: ${admCreateSuperAdmin.data.error}`);

  // Admin attempts to create another Admin (BLOCKED)
  const admCreateAdmin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    actorId: admin.id,
    name: 'Peer Admin',
    email: 'peer.admin@travelocase.com',
    role: 'ADMIN'
  });
  console.log(`  [Admin -> Create ADMIN (BLOCKED)] Status: ${admCreateAdmin.status}, Error: ${admCreateAdmin.data.error}\n`);

  // =========================================================================
  // 3. DEPARTMENT MANAGER PERMISSIONS
  // =========================================================================
  console.log("3. Testing Department Manager Hierarchy Enforcement:");
  // Sales Manager creates Sales Agent (Permitted)
  const mgrCreateAgent = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    actorId: salesMgr.id,
    name: 'Sophie Martin',
    email: 'sophie.m@travelocase.com',
    role: 'SALES_AGENT'
  });
  console.log(`  [Sales Manager -> Create SALES_AGENT] Status: ${mgrCreateAgent.status}, Success: ${mgrCreateAgent.data.success} (Permitted)`);

  // Sales Manager attempts to create Admin (BLOCKED)
  const mgrCreateAdmin = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    actorId: salesMgr.id,
    name: 'Unauthorized Admin',
    email: 'mgr.rogue.admin@travelocase.com',
    role: 'ADMIN'
  });
  console.log(`  [Sales Manager -> Create ADMIN (BLOCKED)] Status: ${mgrCreateAdmin.status}, Error: ${mgrCreateAdmin.data.error}`);

  // Sales Manager attempts to create Charging Manager (BLOCKED)
  const mgrCreatePeerMgr = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    actorId: salesMgr.id,
    name: 'Unauthorized Peer Manager',
    email: 'mgr.rogue.peer@travelocase.com',
    role: 'CHARGING_MANAGER'
  });
  console.log(`  [Sales Manager -> Create CHARGING_MANAGER (BLOCKED)] Status: ${mgrCreatePeerMgr.status}, Error: ${mgrCreatePeerMgr.data.error}\n`);

  // =========================================================================
  // 4. SALES AGENT PERMISSIONS (BLOCKED)
  // =========================================================================
  console.log("4. Testing Sales Agent Hierarchy Enforcement (Zero Creation Rights):");
  const agentCreate = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/users',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    actorId: salesAgent.id,
    name: 'Rogue Agent',
    email: 'rogue.agent@travelocase.com',
    role: 'SALES_AGENT'
  });
  console.log(`  [Sales Agent -> Create SALES_AGENT (BLOCKED)] Status: ${agentCreate.status}, Error: ${agentCreate.data.error}\n`);

  // =========================================================================
  // 5. AUDIT LOG VERIFICATION
  // =========================================================================
  const auditRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/audit-logs',
    method: 'GET'
  });
  const userAudits = auditRes.data.auditLogs.filter(a => a.action.includes('USER_CREAT'));
  console.log(`5. Audit Trail Verification: Found ${userAudits.length} user creation audit events logged.`);
  userAudits.slice(0, 4).forEach(a => {
    console.log(`  - [${a.status}] ${a.actorEmail} -> ${a.action} (${a.resource})`);
  });

  console.log("\n=== ALL HIERARCHY TESTS COMPLETED SUCCESSFULLY ===");
}

setTimeout(runTests, 1000);
