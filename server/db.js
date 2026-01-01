const Database = require("better-sqlite3");

// יוצר/פותח קובץ DB בשם retro.db
const db = new Database("retro.db");

// יוצר טבלת notes אם היא לא קיימת
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
