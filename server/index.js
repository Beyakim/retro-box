console.log("BOOT: v7-pg, file:", __filename);

const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();

app.use(
  cors({
    origin: ["http://localhost:5173", "https://retro-box-five.vercel.app"],
  })
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", version: "v7-pg" });
});

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

// שולף את הפתק הבא שלא נפתח בצורה אטומית (בלי התנגשויות)
app.get("/notes/next", async (req, res) => {
  try {
    const result = await db.query(`
      WITH next_note AS (
        SELECT id
        FROM notes
        WHERE opened = false
        ORDER BY id ASC
        LIMIT 1
      )
      UPDATE notes
      SET opened = true
      WHERE id IN (SELECT id FROM next_note)
      RETURNING
        id,
        type,
        author_name AS "authorName",
        content,
        anonymous,
        opened;
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No unopened notes left" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB next note failed" });
  }
});

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

app.post("/notes/reset", async (req, res) => {
  try {
    await db.query(`UPDATE notes SET opened = false`);
    res.json({ message: "All notes reset to unopened" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB reset failed" });
  }
});

app.post("/notes/clear", async (req, res) => {
  try {
    await db.query(`DELETE FROM notes`);
    res.json({ message: "All notes cleared" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB clear failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
