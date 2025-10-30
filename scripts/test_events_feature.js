const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const MEMBER_TOKEN = process.env.MEMBER_TOKEN || '';

function adminHeaders() {
  if (!ADMIN_TOKEN) return {};
  return { Authorization: `Bearer ${ADMIN_TOKEN}` };
}

function memberHeaders() {
  if (!MEMBER_TOKEN) return {};
  return { Authorization: `Bearer ${MEMBER_TOKEN}` };
}

async function main() {
  try {
    console.log('🏁 Starting Events feature e2e smoke test');

    // 1) Admin: Create event
    if (!ADMIN_TOKEN) {
      console.log('⚠️  ADMIN_TOKEN missing. Skipping admin-protected tests.');
    }

    let eventId = null;
    if (ADMIN_TOKEN) {
      console.log('🛠️  Creating test event...');
      const now = new Date();
      const in2h = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const resCreate = await axios.post(
        `${BASE_URL}/api/events`,
        {
          title: 'Test Event - E2E',
          type: 'Workshop',
          startDate: now.toISOString(),
          endDate: in2h.toISOString(),
          city: 'TestCity',
          district: 'TestDistrict',
          state: 'TestState',
          address: '123 Test Street',
          pincode: '400001',
          registrationFee: 0
        },
        { headers: { ...adminHeaders() } }
      );
      eventId = resCreate.data.event.id;
      console.log('✅ Event created:', eventId);

      // 2) Admin: Add exhibitor
      console.log('🛠️  Adding exhibitor...');
      const resExh = await axios.post(
        `${BASE_URL}/api/events/${eventId}/exhibitors`,
        { name: 'Test Exhibitor', phone: '9999999999', description: 'Demo', logo: null },
        { headers: { ...adminHeaders() } }
      );
      console.log('✅ Exhibitor created:', resExh.data.exhibitor.id);
    }

    // 3) Public: Get exhibitors list
    if (eventId) {
      console.log('🔎 Listing exhibitors (public)...');
      const resListExh = await axios.get(`${BASE_URL}/api/events/${eventId}/exhibitors`);
      console.log('✅ Exhibitors count:', resListExh.data.exhibitors.length);
    }

    // 4) Member: RSVP (register)
    if (!MEMBER_TOKEN) {
      console.log('⚠️  MEMBER_TOKEN missing. Skipping member-protected tests.');
    }

    let registrationId = null;
    if (MEMBER_TOKEN && eventId) {
      console.log('🛠️  RSVP to event...');
      const resRSVP = await axios.post(
        `${BASE_URL}/api/mobile/events/${eventId}/rsvp`,
        { notes: 'E2E RSVP' },
        { headers: { ...memberHeaders() } }
      );
      registrationId = resRSVP.data.registration.id;
      console.log('✅ RSVP done. Registration:', registrationId);

      // 5) Member: Get QR for registration
      console.log('🔎 Getting QR for registration...');
      const resQR = await axios.get(
        `${BASE_URL}/api/mobile/registrations/${registrationId}/qr`,
        { headers: { ...memberHeaders() } }
      );
      const qrDataURL = resQR.data.qrDataURL;
      console.log('✅ QR generated (data URL length):', qrDataURL.length);

      // 6) Admin: Check-in using QR
      if (ADMIN_TOKEN) {
        console.log('🛠️  Admin check-in (QR)...');
        // Extract the EVT:... token from the data URL payload requires decoding; our API expects qrToken (EVT:...)
        // Since we only have the data URL image, we cannot extract the token directly.
        // Instead, re-generate QR token string via server by calling QR endpoint that returns the same data URL.
        // To keep it e2e: server accepts qrToken posted; here we simulate by regenerating token server-side:
        // We'll call a tiny helper: re-generate token by asking the same endpoint — but not available.
        // Workaround: use the server-side format: EVT:<base64url({data,sig})>
        // We can't reconstruct without secret; thus we skip direct check-in with image-only.
        console.log('ℹ️  Skipping direct check-in because only QR image is returned to client.');
      }
    }

    // 7) Mobile: My events list
    if (MEMBER_TOKEN) {
      console.log('🔎 Get my events with QR...');
      const resMy = await axios.get(
        `${BASE_URL}/api/mobile/my/events`,
        { headers: { ...memberHeaders() } }
      );
      console.log('✅ My registrations:', resMy.data.registrations.length);
    }

    // 8) Admin: Registrations list for event
    if (ADMIN_TOKEN && eventId) {
      console.log('🔎 Get event registrations...');
      const resRegs = await axios.get(
        `${BASE_URL}/api/events/${eventId}/registrations`,
        { headers: { ...adminHeaders() } }
      );
      console.log('✅ Registrations fetched:', resRegs.data.registrations.length);
    }

    console.log('🎉 Tests finished');
  } catch (err) {
    if (err.response) {
      console.error('❌ Test failed:', err.response.status, err.response.data);
    } else {
      console.error('❌ Test failed:', err.message);
    }
    process.exit(1);
  }
}

main();


