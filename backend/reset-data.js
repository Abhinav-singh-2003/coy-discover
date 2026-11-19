const fs = require("fs");
const path = require("path");
const target = process.env.DATA_FILE || path.join(__dirname, "data", "db.json");
const seed = require("./data/seed.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(seed, null, 2));
console.log("Demo data reset. Incoming likes are seeded; swipes and matches are cleared.");
