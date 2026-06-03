# ChatKroo — Backend

[![CI](https://github.com/Palenzo/Backend-Chat-App-Mern/actions/workflows/ci.yml/badge.svg)](https://github.com/Palenzo/Backend-Chat-App-Mern/actions/workflows/ci.yml)

Real-time chat backend for **ChatKroo** — 1:1 & group messaging, presence, typing
indicators, WebRTC audio/video calling (signaled over Socket.IO), file sharing via
Cloudinary, an AI assistant ("Binod"), and an admin dashboard API.

> **Frontend repo:** [Frontend-Chat-App-Mern](https://github.com/Palenzo/Frontend-Chat-App-Mern) — React + Vite, deployed on Vercel.
> This backend is deployed on **Render**.

---

## ✨ Features

- **Auth** — JWT in httpOnly cookies, bcrypt-hashed passwords.
- **Chats** — direct & group chats, members management, friend requests.
- **Messaging** — real-time via Socket.IO, persisted to MongoDB, paginated history.
- **Attachments** — images/files uploaded to Cloudinary (auto-cleaned on chat delete).
- **Presence & typing** — online users and typing indicators.
- **Calling** — WebRTC offer/answer/ICE relayed over sockets, with persisted **call history**.
- **AI assistant** — "Binod" replies in any chat it's a member of (Upstage Solar).
- **Admin** — dashboard stats and user/chat/message management behind a secret key.

## 🧱 Tech stack

| Area      | Tech                                              |
| --------- | ------------------------------------------------- |
| Runtime   | Node.js (ESM), Express 5                           |
| Realtime  | Socket.IO 4                                        |
| Database  | MongoDB + Mongoose 8                               |
| Media     | Cloudinary, Multer 2                               |
| Security  | Helmet, CORS, express-rate-limit, JWT, bcrypt     |
| AI        | OpenAI SDK → Upstage Solar                         |
| Tooling   | ESLint 9 (flat), Vitest, Nodemon                   |

## 🏗 Architecture

```
app.js                  HTTP + Socket.IO bootstrap, middleware, call signaling
config/env.js           Validated environment config (fails fast on missing vars)
constants/              CORS options, socket event names
routes/                 user · chat · admin · call  →  /api/v1/*
controllers/            Request handlers (one per domain)
models/                 Mongoose schemas: User, Chat, Message, Request, Call
middlewares/            auth (HTTP + socket), error handling, multer
services/               aiService (Upstage), callService (call history)
lib/                    helpers, in-memory socket/presence store
seeders/                AI bot + sample data seeders
test/                   Vitest unit tests
```

### Request & realtime flow
- **REST** is mounted under `/api/v1/{user,chat,admin,call}` and protected by the
  `isAuthenticated` (cookie JWT) or `adminOnly` middleware.
- **Socket.IO** authenticates the same cookie on connect, then relays messages,
  presence, typing, and WebRTC signaling. Message and call events are persisted
  asynchronously.

> **Scaling note:** presence and the call-id map live in process memory
> (`lib/socketStore.js`, `services/callService.js`). Running more than one
> instance requires the Socket.IO Redis adapter and a shared store.

## 🚀 Getting started

### Prerequisites
- Node.js ≥ 18
- A MongoDB database (e.g. MongoDB Atlas)
- A Cloudinary account
- (optional) an Upstage API key for the AI assistant

### Setup

```bash
git clone https://github.com/Palenzo/Backend-Chat-App-Mern.git
cd Backend-Chat-App-Mern
npm install
cp .env.example .env   # then fill in the values
npm run dev
```

The server starts on `http://localhost:3000` (configurable via `PORT`).
Health check: `GET /health`.

## 🔑 Environment variables

See [`.env.example`](./.env.example) for the full annotated list. Required:
`MONGO_URI`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`. The app **refuses to start** if any are missing.

## 📜 Scripts

| Script             | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start with nodemon (hot reload)      |
| `npm start`        | Start the server                     |
| `npm run lint`     | Lint with ESLint                     |
| `npm test`         | Run the Vitest test suite            |
| `npm run seed`     | Seed sample users (dev only)         |

## 🌐 API overview

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| POST   | `/api/v1/user/new`             | Register (multipart, avatar)   |
| POST   | `/api/v1/user/login`           | Login                          |
| GET    | `/api/v1/user/me`              | Current user                   |
| GET    | `/api/v1/user/search`          | Search users                   |
| PUT    | `/api/v1/user/sendrequest`     | Send friend request            |
| PUT    | `/api/v1/user/acceptrequest`   | Accept/reject friend request   |
| POST   | `/api/v1/user/ai-chat`         | Get/create the AI chat         |
| GET    | `/api/v1/chat/my`              | My chats                       |
| POST   | `/api/v1/chat/new`             | New group                      |
| POST   | `/api/v1/chat/message`         | Send attachments               |
| GET    | `/api/v1/chat/message/:id`     | Paginated messages             |
| GET    | `/api/v1/call/my-history`      | My call history                |
| GET    | `/api/v1/admin/stats`          | Dashboard stats (admin)        |

### Socket events
`NEW_MESSAGE`, `NEW_MESSAGE_ALERT`, `START_TYPING`/`STOP_TYPING`,
`CHAT_JOINED`/`CHAT_LEAVED`, `ONLINE_USERS`, and the call/WebRTC set
(`CALL_INITIATED`, `INCOMING_CALL`, `CALL_ACCEPTED`, `CALL_REJECTED`,
`CALL_ENDED`, `WEBRTC_OFFER`, `WEBRTC_ANSWER`, `WEBRTC_ICE_CANDIDATE`).

## ☁️ Deployment (Render)

- **Build command:** `npm install`
- **Start command:** `npm start`
- Add all required environment variables in the Render dashboard.
- Set `CLIENT_URL` to your Vercel frontend URL so CORS and cookies work
  cross-site (cookies are `SameSite=None; Secure`).

## 🧪 CI

GitHub Actions ([`.github/workflows/ci.yml`](./.github/workflows/ci.yml)) installs,
lints, tests, and builds on every push and PR.

## 📄 License

ISC
