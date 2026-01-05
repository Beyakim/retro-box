const path = require("path");
const Database = require("better-sqlite3");

// תמיד ייצור/יפתח את ה-DB בתוך תיקיית server
const dbPath = path.join(__dirname, "retro.db");
const db = new Database(dbPath);

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    authorName TEXT,
    content TEXT,
    anonymous INTEGER,
    opened INTEGER
  )
`
).run();

module.exports = db;
