# SyncBeat

SyncBeat is a private real-time listening room built with React + Vite + TypeScript, Node.js + Express + Socket.IO and browser WebRTC. YouTube playback uses the official YouTube IFrame Player API only.

## Local
```bash
npm install
npm run dev
```
Open http://localhost:5173. The server runs on http://localhost:3001.

## Production
This repository is designed for one Render Web Service. Build:
```bash
npm install && npm run build:client
```
Start:
```bash
npm run server
```
Health endpoint: `/health`.

The app serves `client/dist` from the Node server, so the browser and Socket.IO endpoint share one HTTPS origin.

## Environment
`PORT` — Node server port (Render provides this)
`CLIENT_ORIGIN` — allowed Socket.IO origin; use the deployed HTTPS origin in a hardened deployment
`PUBLIC_BASE_URL` — public URL used by deployment setup
`STUN_URLS` — comma-separated STUN/TURN URLs

## Features
- Private rooms, optional password and invite links
- Host-only synchronized YouTube playback controls
- YouTube URL/ID parsing for watch, youtu.be, shorts, embed and live URLs
- Shared queue with add, remove and drag/reorder
- Autoplay next queue item
- Live room chat, typing indicator and reactions
- Participant list, host transfer and kick
- WebRTC peer voice with mute/deafen and public Google STUN servers
- Responsive dark/light UI, connection state and low-bandwidth setting
- Keyboard shortcut: Space toggles host playback, C focuses chat

## YouTube compliance
SyncBeat does not download, scrape, proxy, extract audio, convert to MP3, block ads or bypass YouTube restrictions. Playback is through the official IFrame Player API. Some videos may refuse embedding because of owner settings or YouTube restrictions; choose another video in that case.

## Voice / TURN
STUN is useful for development but does not guarantee connectivity on restrictive networks. For reliable production voice, configure a TURN server. Coturn is a common self-hosted option. Do not expose long-lived private credentials in frontend source.

## Security
Inputs are validated server-side with Zod, room passwords are hashed in memory, chat is rendered as text, and host-only actions are checked by the server. The in-memory room store is intentionally simple; restarting the server clears rooms. For a larger production deployment add authentication, durable storage, distributed rate limiting and appropriate origin/CSRF controls.

## Testing
Use two separate browser profiles or devices:
1. Create a room in profile A.
2. Join its invite URL from profile B.
3. Add a normal embeddable YouTube URL and test play/pause/seek.
4. Add and reorder queue entries and let a video end.
5. Send chat and reactions.
6. Join voice from both clients and test mute/deafen.
7. Transfer host and test kick.

Render free instances may sleep after inactivity, so the first request after sleep can take a moment.