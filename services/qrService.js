const crypto = require('crypto');
const QRCode = require('qrcode');

const QR_SECRET = process.env.QR_SECRET || 'change_this_qr_secret';

function buildPayload(registration) {
  return {
    r: registration.id,
    e: registration.eventId,
    m: registration.memberId,
    t: new Date(registration.registeredAt || registration.created_at || Date.now()).getTime()
  };
}

function signPayload(payload) {
  const data = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', QR_SECRET).update(data).digest('hex');
  return { data: payload, sig: signature };
}

function verifyToken(tokenObj) {
  try {
    const expectedSig = crypto
      .createHmac('sha256', QR_SECRET)
      .update(JSON.stringify(tokenObj.data))
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(tokenObj.sig));
  } catch (_) {
    return false;
  }
}

async function generateQrDataURL(registration) {
  const payload = buildPayload(registration);
  const tokenObj = signPayload(payload);
  const tokenString = Buffer.from(JSON.stringify(tokenObj)).toString('base64url');
  const qrText = `EVT:${tokenString}`;
  return await QRCode.toDataURL(qrText, { errorCorrectionLevel: 'M' });
}

module.exports = {
  buildPayload,
  signPayload,
  verifyToken,
  generateQrDataURL
};


