const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;
const USER_ID = "demo-user";
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "data", "db.json");

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(",") : true
}));
app.use(express.json());

function readDb() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    const seed = require("./data/seed.json");
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2));
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeDb(db) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(db, null, 2));
  fs.renameSync(tempFile, DATA_FILE);
}

function publicProfile(profile) {
  // Deliberately omit likedByUser and all private incoming-like metadata.
  const { likedByUser, ...safeProfile } = profile;
  return safeProfile;
}

app.get(["/api/health", "/health"], (_req, res) => {
  res.json({ status: "ok", service: "coy-discover-api" });
});

app.get(["/api/feed", "/feed"], (_req, res) => {
  const db = readDb();
  const swipedIds = new Set(db.swipes.filter(s => s.userId === USER_ID).map(s => s.profileId));
  const feed = db.profiles
    .filter(profile => !swipedIds.has(profile.id))
    .map(publicProfile);
  res.json({ profiles: feed, count: feed.length });
});

app.post(["/api/swipe", "/swipe"], (req, res) => {
  const { profileId, direction } = req.body || {};
  if (typeof profileId !== "string" || !["like", "pass"].includes(direction)) {
    return res.status(400).json({ error: "profileId and direction ('like' or 'pass') are required." });
  }

  const db = readDb();
  const profile = db.profiles.find(p => p.id === profileId);
  if (!profile) return res.status(404).json({ error: "Profile not found." });

  const alreadySwiped = db.swipes.some(s => s.userId === USER_ID && s.profileId === profileId);
  if (alreadySwiped) {
    return res.status(409).json({ error: "This profile has already been swiped on." });
  }

  db.swipes.push({ userId: USER_ID, profileId, direction, createdAt: new Date().toISOString() });

  let match = null;
  if (direction === "like" && profile.likedByUser === true) {
    const existingMatch = db.matches.find(m =>
      m.userId === USER_ID && m.profileId === profileId
    );
    if (!existingMatch) {
      const newMatch = {
        id: `match-${profileId}`,
        userId: USER_ID,
        profileId,
        createdAt: new Date().toISOString()
      };
      db.matches.push(newMatch);
    }
    match = publicProfile(profile);
  }

  writeDb(db);
  res.json({ success: true, direction, isMatch: Boolean(match), match });
});

app.get(["/api/matches", "/matches"], (_req, res) => {
  const db = readDb();
  const matches = db.matches
    .filter(m => m.userId === USER_ID)
    .map(m => db.profiles.find(p => p.id === m.profileId))
    .filter(Boolean)
    .map(publicProfile);
  res.json({ matches, count: matches.length });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Coy Discover API running on http://localhost:${PORT}`);
});
