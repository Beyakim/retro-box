/**
 * GET /notes
 * מחזיר את כל הפתקים מה-DB
 */
app.get("/notes", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id,
        type,
        author_name AS "authorName",
        content,
        anonymous,
        opened
      FROM notes
      ORDER BY id ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB fetch failed" });
  }
});

/**
 * GET /notes/next
 * מחזיר את הפתק הבא שלא נפתח ומסמן אותו כפתוח
 */
app.get("/notes/next", async (req, res) => {
  try {
    // נועלים את השורה כדי למנוע מצב ששני משתמשים שולפים את אותו פתק במקביל
    const next = await db.query(
      `
      SELECT id, type, author_name AS "authorName", content, anonymous, opened
      FROM notes
      WHERE opened = false
      ORDER BY id ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
      `
    );

    if (next.rows.length === 0) {
      return res.status(404).json({ message: "No unopened notes left" });
    }

    const note = next.rows[0];

    await db.query(`UPDATE notes SET opened = true WHERE id = $1`, [note.id]);

    res.json({ ...note, opened: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB next note failed" });
  }
});

/**
 * POST /notes/reset
 * מאפס את כל הפתקים ל-opened=false
 */
app.post("/notes/reset", async (req, res) => {
  try {
    await db.query(`UPDATE notes SET opened = false`);
    res.json({ message: "All notes reset to unopened" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB reset failed" });
  }
});

/**
 * POST /notes/clear
 * מוחק את כל הפתקים
 */
app.post("/notes/clear", async (req, res) => {
  try {
    await db.query(`DELETE FROM notes`);
    res.json({ message: "All notes cleared" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB clear failed" });
  }
});
