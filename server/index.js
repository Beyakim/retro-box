// BOOT: הדפסה לטרמינל כדי לדעת איזה קובץ רץ
console.log("BOOT: v6-db, file:", __filename);

// ייבוא DB (SQLite) + Express
const db = require("./db");
const express = require("express");
const app = express();
const cors = require("cors");
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

/**
 * GET /health
 * בדיקת תקינות: מחזיר שהשרת חי
 */
app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "v6-db" });
});

/**
 * GET /notes
 * מחזיר את כל הפתקים מה-DB
 */
app.get("/notes", (req, res) => {
  const rows = db.prepare("SELECT * FROM notes ORDER BY id ASC").all();

  const result = rows.map((row) => ({
    id: row.id,
    type: row.type,
    authorName: row.authorName,
    content: row.content,
    anonymous: Boolean(row.anonymous),
    opened: Boolean(row.opened),
  }));

  res.json(result);
});

/**
 * GET /notes/next
 * מחזיר את הפתק הבא שלא נפתח (opened=0) ומסמן אותו כפתוח (opened=1)
 */
app.get("/notes/next", (req, res) => {
  const nextNote = db
    .prepare("SELECT * FROM notes WHERE opened = 0 ORDER BY id ASC LIMIT 1")
    .get();

  if (!nextNote) {
    return res.status(404).json({ message: "No unopened notes left" });
  }

  db.prepare("UPDATE notes SET opened = 1 WHERE id = ?").run(nextNote.id);

  res.json({
    id: nextNote.id,
    type: nextNote.type,
    authorName: nextNote.authorName,
    content: nextNote.content,
    anonymous: Boolean(nextNote.anonymous),
    opened: true,
  });
});

/**
 * POST /notes
 * מוסיף פתק חדש ל-DB
 * body: { authorName, content, type, anonymous }
 */
app.post("/notes", (req, res) => {
  const { authorName, content, type, anonymous } = req.body;

  const stmt = db.prepare(`
    INSERT INTO notes (type, authorName, content, anonymous, opened)
    VALUES (?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    type || null,
    anonymous ? null : authorName || null,
    content || null,
    anonymous ? 1 : 0,
    0
  );

  res.status(201).json({
    id: info.lastInsertRowid,
    type: type || null,
    authorName: anonymous ? null : authorName || null,
    content: content || null,
    anonymous: Boolean(anonymous),
    opened: false,
  });
});

/**
 * POST /notes/reset
 * מאפס את כל הפתקים ל-opened=0 (כלומר "סגורים" שוב)
 */
app.post("/notes/reset", (req, res) => {
  db.prepare("UPDATE notes SET opened = 0").run();
  res.json({ message: "All notes reset to unopened" });
});

/**
 * POST /notes/clear
 * מוחק את כל הפתקים מהטבלה
 */
app.post("/notes/clear", (req, res) => {
  db.prepare("DELETE FROM notes").run();
  res.json({ message: "All notes cleared" });
});

// מפעיל את השרת ומאזין לפורט 3000
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
