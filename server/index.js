// BOOT: הדפסה לטרמינל כדי לדעת איזה קובץ רץ
console.log("BOOT: v6-db, file:", __filename);

// ייבוא DB (SQLite) + Express
const db = require("./db");
const express = require("express");
const app = express();
const cors = require("cors");
app.use(
  cors({
    origin: ["http://localhost:5173", "https://retro-box-five.vercel.app"],
  })
);
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
app.post("/notes", async (req, res) => {
  try {
    const { type, authorName, content, anonymous } = req.body;

    const result = await db.query(
      `
      INSERT INTO notes (type, author_name, content, anonymous, opened)
      VALUES ($1, $2, $3, $4, false)
      RETURNING id
      `,
      [type, authorName || null, content, !!anonymous]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB insert failed" });
  }
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
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
