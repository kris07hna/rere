const crypto = require('crypto');
const zlib = require('zlib');

function generateAgoraTokenV007(appId, appCert, channel, uid = 0, expire = 86400 * 30) {
  const now = Math.floor(Date.now() / 1000);
  const salt = Math.floor(Math.random() * 99999999) + 1;

  const issueTsBuf = Buffer.alloc(4);
  issueTsBuf.writeUInt32LE(now, 0);

  const saltBuf = Buffer.alloc(4);
  saltBuf.writeUInt32LE(salt, 0);

  const h1 = crypto.createHmac('sha256', appCert).update(issueTsBuf).digest();
  const signingKey = crypto.createHmac('sha256', h1).update(saltBuf).digest();

  const privileges = [1, 2, 3, 4];
  const serviceRtc = [];

  const svcTypeBuf = Buffer.alloc(2);
  svcTypeBuf.writeUInt16LE(1, 0);
  serviceRtc.push(svcTypeBuf);

  const privCntBuf = Buffer.alloc(2);
  privCntBuf.writeUInt16LE(privileges.length, 0);
  serviceRtc.push(privCntBuf);

  for (const p of privileges) {
    const pBuf = Buffer.alloc(6);
    pBuf.writeUInt16LE(p, 0);
    pBuf.writeUInt32LE(expire, 2);
    serviceRtc.push(pBuf);
  }

  const chBuf = Buffer.from(channel, 'utf8');
  const chLenBuf = Buffer.alloc(2);
  chLenBuf.writeUInt16LE(chBuf.length, 0);
  serviceRtc.push(chLenBuf, chBuf);

  const uidStr = (uid && uid !== 0 && uid !== '0') ? String(uid) : '';
  const uidBuf = Buffer.from(uidStr, 'utf8');
  const uidLenBuf = Buffer.alloc(2);
  uidLenBuf.writeUInt16LE(uidBuf.length, 0);
  serviceRtc.push(uidLenBuf, uidBuf);

  const servicePayload = Buffer.concat(serviceRtc);

  const appIdBuf = Buffer.from(appId, 'utf8');
  const appIdLenBuf = Buffer.alloc(2);
  appIdLenBuf.writeUInt16LE(appIdBuf.length, 0);

  const expireBuf = Buffer.alloc(4);
  expireBuf.writeUInt32LE(expire, 0);

  const svcCountBuf = Buffer.alloc(2);
  svcCountBuf.writeUInt16LE(1, 0);

  const signingInfo = Buffer.concat([
    appIdLenBuf,
    appIdBuf,
    issueTsBuf,
    expireBuf,
    saltBuf,
    svcCountBuf,
    servicePayload
  ]);

  const signature = crypto.createHmac('sha256', signingKey).update(signingInfo).digest();
  const sigLenBuf = Buffer.alloc(2);
  sigLenBuf.writeUInt16LE(signature.length, 0);

  const fullPacket = Buffer.concat([sigLenBuf, signature, signingInfo]);
  return '007' + zlib.deflateSync(fullPacket).toString('base64');
}

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const appId = process.env.AGORA_APP_ID || '3ea564c44c4f4fff9f889036b6a5fc0c';
  const appCert = process.env.AGORA_APP_CERTIFICATE || '08c7e961b8844fb2abe0d181a530c8fc';
  const channel = req.query.channel || 'PhoneToLaptop';
  const uid = req.query.uid || 0;

  try {
    const token = generateAgoraTokenV007(appId, appCert, channel, uid);
    res.status(200).json({
      app_id: appId,
      channel,
      token,
      uid: uid ? Number(uid) : null,
      has_certificate: true,
      timestamp: Date.now()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
