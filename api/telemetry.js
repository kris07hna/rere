// Vercel Serverless Function: Real-Time Telemetry Relay & Cache
// Enables mobile broadcasters worldwide to stream GPS coordinates and sensor data
// to workstation consoles and dashboards across any network.

const memoryTelemetry = {};

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const channel = (req.query.channel || 'PhoneToLaptop').trim();

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (_) {
        return res.status(400).json({ error: 'Invalid JSON payload' });
      }
    }

    if (!body || typeof body !== 'object') {
      return res.status(400).json({ error: 'Missing telemetry payload' });
    }

    const cameraId = String(body.camera_id || body.cameraId || 'cam-field-unit').trim();
    const effectiveChannel = String(body.channel || channel).trim();
    const now = Date.now();

    if (!memoryTelemetry[effectiveChannel]) {
      memoryTelemetry[effectiveChannel] = {};
    }

    // Clean out stale records older than 5 minutes
    for (const [id, record] of Object.entries(memoryTelemetry[effectiveChannel])) {
      if (now - (record.updated_at_ms || 0) > 300000) {
        delete memoryTelemetry[effectiveChannel][id];
      }
    }

    const gps = body.gps || body.coords || {};
    const record = {
      camera_id: cameraId,
      display_name: body.display_name || cameraId,
      channel: effectiveChannel,
      agora_uid: body.agora_uid || null,
      seq: Number(body.seq) || 1,
      latitude: Number(gps.latitude || body.latitude || 0),
      longitude: Number(gps.longitude || body.longitude || 0),
      accuracy_m: Number(gps.accuracy || body.accuracy || body.accuracy_m || 5),
      heading_deg: (gps.heading !== undefined && gps.heading !== null) ? Number(gps.heading) : null,
      speed_mps: (gps.speed !== undefined && gps.speed !== null) ? Number(gps.speed) : null,
      altitude_m: (gps.altitude !== undefined && gps.altitude !== null) ? Number(gps.altitude) : null,
      observed_at: body.timestamp || new Date().toISOString(),
      updated_at_ms: now
    };

    memoryTelemetry[effectiveChannel][cameraId] = record;

    return res.status(200).json({
      status: 'ok',
      camera_id: cameraId,
      channel: effectiveChannel,
      seq: record.seq,
      stored_at: record.observed_at
    });
  }

  if (req.method === 'GET') {
    const channelStore = memoryTelemetry[channel] || {};
    const cameras = Object.values(channelStore);

    return res.status(200).json({
      channel,
      count: cameras.length,
      cameras,
      timestamp: Date.now()
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
