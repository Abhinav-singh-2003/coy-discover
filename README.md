# Coy Discover — SDE Intern Assignment

A standalone, mobile-first discovery app built with React + Vite and Node.js + Express.
It implements a private-like model: incoming likes are never exposed; a match is returned
only when the current user likes someone who has already liked them.

## Features
- 36 seeded mock profiles
- One profile at a time, swipe right to like / left to pass
- Pointer-based drag gestures (mouse, touch, stylus) and desktop buttons
- Swipe feedback, card animation, empty state
- Mutual match modal and Matches view
- Persistent swipes and matches in a JSON data file
- `GET /feed`, `POST /swipe`, `GET /matches`
- Home placeholder tab

## Requirements
- Node.js 18+
- npm

## Run locally

### 1. Start backend
```bash
cd backend
npm install
npm run dev
```
Backend runs at `http://localhost:5000`.

### 2. Start frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`.

Vite proxies `/api` requests to the backend. The single demo user is `demo-user`.
No authentication is required, as specified in the assignment.

## API
- `GET /api/health` — health check
- `GET /api/feed` — profiles not yet swiped on; does not reveal incoming likes
- `POST /api/swipe` — JSON `{ "profileId": "p01", "direction": "like" | "pass" }`
- `GET /api/matches` — mutual matches only

The backend also supports the exact unprefixed routes (`/feed`, `/swipe`, `/matches`) in case
the evaluator calls the assignment paths directly.

## Reset demo data
Stop the backend, then run:
```bash
npm run reset-data
```
This restores seeded profiles, seeded incoming likes, and clears all swipes/matches.

## Deployment
### Backend (Render)
- Create a new **Web Service** from this GitHub repository.
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Add environment variable `NODE_VERSION=20` (optional).
- Use a persistent disk mounted at `/opt/render/project/src/backend/data` if available, and set
  `DATA_FILE=/opt/render/project/src/backend/data/db.json`. Without a persistent disk, local JSON
  writes may be lost when the service restarts/redeploys.

### Frontend (Vercel)
- Import the same GitHub repository.
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Set `VITE_API_URL` to the deployed backend origin, e.g. `https://your-service.onrender.com/api`
  (no trailing slash).
- Redeploy after setting the environment variable.

For local development, leave `VITE_API_URL` empty; Vite's proxy is used.

## Notes / assumptions
- The app models one logged-in user (`demo-user`) as permitted by the brief.
- `likedByUser: true` exists only in server-side seed data. It is never sent in feed responses.
- JSON storage is suitable for this assignment/demo, not production concurrency or scale.
- For production, replace JSON storage with a transactional database, add authenticated users,
  rate limiting, input validation, and observability.
