# Standalone Edge CCTV Broadcaster (FalconVision)

A 100% standalone, serverless WebRTC edge camera broadcaster. Turn any smartphone, tablet, laptop, or drone into a live **30 FPS HD CCTV stream**.

---

## 🎯 How the Unique Camera ID is Handled

When multiple devices broadcast into the same Agora channel (`PhoneToLaptop`), how does the dashboard know which video feed belongs to which camera?

### 1. Multi-Path Resilient Telemetry Architecture
Because edge cameras operate over public 4G/5G mobile networks or external Wi-Fi, the broadcaster uses a 4-path failover transport to deliver sub-second telemetry to the central SOC console:

- **Path 1 — Global Secure MQTT over WebSocket (`wss://broker.emqx.io:8084/mqtt`)**:
  Connects to a global encrypted MQTT broker. Subscribes and publishes to `falconvision/{channel}/telemetry`. Provides sub-50ms latency across any cellular network worldwide without port forwarding or VPNs.
- **Path 2 — In-Band Agora WebRTC DataStream (`sendStreamMessage`)**:
  Sends low-latency in-band SD-RTN data packets directly between WebRTC peers.
- **Path 3 — Vercel Serverless Telemetry Buffer (`/api/telemetry`)**:
  Stores latest device telemetry in a serverless edge buffer accessible by any operator workstation via REST.
- **Path 4 — FalconVision Central Hub API (`/api/v1/agora/telemetry`)**:
  Directly updates SQLite database, breadcrumbs, and broadcasts `map.camera_moved` events across central WebSockets if a local or tunneled hub URL is reachable.

```json
{
  "type": "camera_telemetry",
  "camera_id": "cam-gate-north",
  "display_name": "North Perimeter Gate",
  "channel": "PhoneToLaptop",
  "agora_uid": 2841331849,
  "timestamp": "2026-10-06T15:30:00Z",
  "seq": 42,
  "gps": {
    "latitude": 12.8438,
    "longitude": 80.1520,
    "accuracy": 4.5,
    "heading": 185.0,
    "speed": 1.2,
    "altitude": 24.0
  }
}
```

### 2. URL Parameters / QR Code Presets
You can pre-configure any camera simply by opening it with query parameters:
```
https://your-domain.com/?camera_id=patrol-alpha&name=Guard+Alpha&channel=PhoneToLaptop&lat=12.8438&lng=80.1520
```

---

## 🚀 How to Host for Free (Permanent HTTPS)

Mobile Chrome and Safari require **HTTPS** to allow webcam access. You can host this single `index.html` file on any free static provider:

### Option A: GitHub Pages (Free, 2 Minutes)
1. Create a free GitHub repository (e.g. `my-cctv`).
2. Upload `index.html`.
3. Go to **Settings** $\rightarrow$ **Pages** $\rightarrow$ select **Branch: main** $\rightarrow$ **Save**.
4. You get a permanent free HTTPS link: `https://<username>.github.io/my-cctv/`.

### Option B: Vercel / Netlify (Free, 30 Seconds)
1. Drag and drop the `standalone_broadcaster` folder into [vercel.com](https://vercel.com) or [netlify.com](https://netlify.com).
2. It gives you a live HTTPS domain instantly.

### Option C: Cloudflare Pages (Free)
1. Upload `index.html` to Cloudflare Pages.
2. Get an instant permanent `*.pages.dev` HTTPS link.

---

## 🔗 Integrating with FalconVision SOC Dashboard

When a device broadcasts with this page:
1. Open your FalconVision Dashboard at `http://localhost:8000/dashboard`.
2. The Live Wall subscribes to the Agora channel.
3. It receives the 30 FPS video feed and matches the Camera ID from the telemetry packet.
4. Your local workstation samples the frames and runs ArcFace AI face recognition locally with zero tunnel bandwidth!
