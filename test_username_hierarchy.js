const http = require("http");

async function postJSON(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: "localhost",
        port: 3000,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function getJSON(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: "localhost", port: 3000, path }, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on("error", reject);
  });
}

async function runTests() {
  console.log("=== Testing User Creation: Agents (Username) vs Admins/Managers (Email + Username) ===\n");

  const usersRes = await getJSON("/api/users");
  const users = usersRes.data.users;
  const superAdmin = users.find((u) => u.role === "SUPER_ADMIN");
  const admin = users.find((u) => u.role === "ADMIN");
  const salesManager = users.find((u) => u.role === "SALES_MANAGER");
  const salesAgent = users.find((u) => u.role === "SALES_AGENT");

  console.log(`[Setup] Super Admin: ${superAdmin?.name} (${superAdmin?.id})`);
  console.log(`[Setup] Admin: ${admin?.name} (${admin?.id})`);
  console.log(`[Setup] Sales Manager: ${salesManager?.name} (${salesManager?.id})`);
  console.log(`[Setup] Sales Agent: ${salesAgent?.name} (${salesAgent?.id})\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, message, extra) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`, extra ? JSON.stringify(extra) : "");
      failed++;
    }
  }

  // TEST 1: Manager creates Sales Agent with username only (no email passed)
  const agentUsername = `test.agent.${Date.now() % 10000}`;
  const t1 = await postJSON("/api/users", {
    actorId: salesManager.id,
    name: "Automated Test Agent",
    username: agentUsername,
    role: "SALES_AGENT",
  });
  assert(
    t1.status === 200 &&
      t1.data.success &&
      t1.data.user?.username === agentUsername &&
      t1.data.user?.email === `${agentUsername}@travelocase.com`,
    `Manager created Agent with username only -> username: '${agentUsername}', email: '${agentUsername}@travelocase.com'`,
    t1
  );

  // TEST 2: Manager attempts to create Agent without username -> should fail
  const t2 = await postJSON("/api/users", {
    actorId: salesManager.id,
    name: "Nameless Agent",
    email: "test.no.user@travelocase.com",
    role: "SALES_AGENT",
  });
  assert(
    t2.status === 403 || t2.status === 400 || t2.data?.success === false,
    `Agent creation without username rejected -> Error: '${t2.data?.error}'`,
    t2
  );

  // TEST 3: Admin creates Sales Manager with BOTH username AND email
  const mgrUsername = `test.mgr.${Date.now() % 10000}`;
  const mgrEmail = `${mgrUsername}.corp@travelocase.com`;
  const t3 = await postJSON("/api/users", {
    actorId: admin.id,
    name: "Executive Test Manager",
    username: mgrUsername,
    email: mgrEmail,
    role: "SALES_MANAGER",
  });
  assert(
    t3.status === 200 &&
      t3.data?.success &&
      t3.data.user?.username === mgrUsername &&
      t3.data.user?.email === mgrEmail,
    `Admin created Manager with both username & email -> username: '${mgrUsername}', email: '${mgrEmail}'`,
    t3
  );

  // TEST 4: Super Admin creates Admin with BOTH username AND email
  const adminUsername = `test.admin.${Date.now() % 10000}`;
  const adminEmail = `${adminUsername}.ops@travelocase.com`;
  const t4 = await postJSON("/api/users", {
    actorId: superAdmin.id,
    name: "Regional Operations Admin",
    username: adminUsername,
    email: adminEmail,
    role: "ADMIN",
  });
  assert(
    t4.status === 200 &&
      t4.data?.success &&
      t4.data.user?.username === adminUsername &&
      t4.data.user?.email === adminEmail,
    `Super Admin created Admin with both username & email -> username: '${adminUsername}', email: '${adminEmail}'`,
    t4
  );

  // TEST 5: Attempting to create Manager with username but NO email -> should fail
  const t5 = await postJSON("/api/users", {
    actorId: admin.id,
    name: "Incomplete Manager",
    username: `mgr.noemail.${Date.now() % 10000}`,
    role: "CHARGING_MANAGER",
  });
  assert(
    t5.status === 403 || t5.status === 400 || t5.data?.success === false,
    `Manager creation without email rejected -> Error: '${t5.data?.error}'`,
    t5
  );

  // TEST 6: Attempting to create Manager with email but NO username -> should fail
  const t6 = await postJSON("/api/users", {
    actorId: admin.id,
    name: "Incomplete Manager 2",
    email: `mgr.nousername.${Date.now() % 10000}@travelocase.com`,
    role: "CS_MANAGER",
  });
  assert(
    t6.status === 403 || t6.status === 400 || t6.data?.success === false,
    `Manager creation without username rejected -> Error: '${t6.data?.error}'`,
    t6
  );

  // TEST 7: Duplicate username rejection
  const t7 = await postJSON("/api/users", {
    actorId: salesManager.id,
    name: "Duplicate Agent",
    username: agentUsername,
    role: "SALES_AGENT",
  });
  assert(
    t7.status === 409 || t7.data?.success === false,
    `Duplicate username '${agentUsername}' rejected -> Error: '${t7.data?.error}'`,
    t7
  );

  // TEST 8: Duplicate email rejection
  const t8 = await postJSON("/api/users", {
    actorId: admin.id,
    name: "Duplicate Email Manager",
    username: `unique.user.${Date.now() % 10000}`,
    email: mgrEmail,
    role: "SALES_MANAGER",
  });
  assert(
    t8.status === 409 || t8.data?.success === false,
    `Duplicate email '${mgrEmail}' rejected -> Error: '${t8.data?.error}'`,
    t8
  );

  // TEST 9: Agent attempts to create user -> forbidden
  const t9 = await postJSON("/api/users", {
    actorId: salesAgent.id,
    name: "Unauthorized Creation",
    username: `unauth.${Date.now() % 10000}`,
    role: "SALES_AGENT",
  });
  assert(
    t9.status === 403 || t9.data?.success === false,
    `Agent cannot create users -> Error: '${t9.data?.error}'`,
    t9
  );

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
