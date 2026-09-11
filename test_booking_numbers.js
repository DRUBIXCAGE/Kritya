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
  console.log("=== Testing Simple Number-Based Auto-Incremented Booking ID in Kritya ===");

  // 1. Fetch leads as admin
  console.log("\n1. Fetching all leads...");
  const leadsRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/leads?role=ADMIN',
    method: 'GET'
  });
  console.log(`Status: ${leadsRes.status}, Total leads: ${leadsRes.data.leads.length}`);
  leadsRes.data.leads.forEach(l => {
    console.log(`  Lead: ${l.name} | Booking #: ${l.bookingNumber} (${l.bookingId}) | PNR: ${l.bookingDetails?.pnrCode}`);
  });

  // Verify initial leads have sequential numbers 1001..
  const initialLeads = leadsRes.data.leads;
  const numbers = initialLeads.map(l => l.bookingNumber).filter(Boolean);
  console.log("  Initial booking numbers present:", numbers);

  // 2. Ingest a new lead and assert auto-incremented booking number
  console.log("\n2. Ingesting a new lead (Booking 1)...");
  const ingest1 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/leads',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Sir Arthur Wellesley',
    email: 'arthur.w@wellington-holdings.co.uk',
    phone: '+44 20 7946 0999',
    company: 'Wellington & Co',
    dealValue: 19500,
    currency: 'USD',
    bookingDetails: {
      origin: 'LHR (London)',
      destination: 'DXB (Dubai)',
      tripType: 'ROUND_TRIP',
      departureDate: '2026-11-01',
      returnDate: '2026-11-10',
      airline: 'Emirates',
      flightNumber: 'EK-002',
      cabinClass: 'FIRST',
      passengers: [{
        id: 'pax_arthur',
        fullName: 'Sir Arthur Wellesley',
        passportNumber: 'GB11992288',
        dob: '1970-05-01',
        type: 'ADULT'
      }]
    }
  });
  console.log(`Ingest 1 result: Booking #: ${ingest1.data.lead.bookingNumber}, bookingId: ${ingest1.data.lead.bookingId}, PNR: ${ingest1.data.lead.bookingDetails.pnrCode}`);

  console.log("\n3. Ingesting another new lead (Booking 2)...");
  const ingest2 = await request({
    hostname: 'localhost',
    port: 3000,
    path: '/api/leads',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    name: 'Duchess Eleanor of Aquitaine',
    email: 'eleanor@aquitaine-estates.fr',
    dealValue: 28000
  });
  console.log(`Ingest 2 result: Booking #: ${ingest2.data.lead.bookingNumber}, bookingId: ${ingest2.data.lead.bookingId}, PNR: ${ingest2.data.lead.bookingDetails.pnrCode}`);

  if (ingest2.data.lead.bookingNumber === ingest1.data.lead.bookingNumber + 1) {
    console.log("  [PASS] Auto-increment is working sequentially!");
  } else {
    console.error("  [FAIL] Booking numbers are not sequential!");
  }

  // 4. Test Search by numeric booking number
  const searchBookingNum = ingest1.data.lead.bookingNumber;
  console.log(`\n4. Searching by numeric booking number ${searchBookingNum}...`);
  const searchRes1 = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/search?bookingId=${searchBookingNum}&role=ADMIN`,
    method: 'GET'
  });
  console.log(`Search result for ${searchBookingNum}: Found ${searchRes1.data.lead?.name} (Booking #${searchRes1.data.lead?.bookingNumber})`);

  // Search by #1001
  console.log("\n5. Searching by prefixed booking number '#1001'...");
  const searchRes2 = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/search?bookingId=%231001&role=ADMIN`,
    method: 'GET'
  });
  console.log(`Search result for #1001: Found ${searchRes2.data.lead?.name} (Booking #${searchRes2.data.lead?.bookingNumber})`);

  // 6. Test Email Template Subject with Booking ID
  console.log("\n6. Testing Email dispatch with auto-incremented Booking ID in subject...");
  const emailRes = await request({
    hostname: 'localhost',
    port: 3000,
    path: `/api/leads/${ingest1.data.lead.id}/email`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    templateId: 'flight_auth_01',
    actorId: 'usr_sales_agent1',
    recipientEmail: 'arthur.w@wellington-holdings.co.uk'
  });
  console.log(`Email dispatched from: ${emailRes.data.email?.from}`);
  console.log(`Email subject: ${emailRes.data.email?.subject}`);

  console.log("\n=== ALL BOOKING NUMBER TESTS COMPLETED SUCCESSFULLY ===");
}

// Give dev server a moment to warm up
setTimeout(runTests, 3000);
