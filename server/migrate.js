const db = require("./db");

async function migrate() {
  // 1) טבלאות בסיס
  await db.query(`
    CREATE TABLE IF NOT EXISTS retros (
      id TEXT PRIMARY KEY,
      team TEXT,
      title TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      retro_id TEXT REFERENCES retros(id),
      type TEXT,
      author_name TEXT,
      content TEXT,
      anonymous BOOLEAN,
      opened BOOLEAN DEFAULT false
    );
  `);

  // 2) "מיגרציות" אמיתיות לטבלאות קיימות (יישור סכימה)
  await db.query(`
    ALTER TABLE notes
    ADD COLUMN IF NOT EXISTS image_url TEXT;
  `);

  // (אופציונלי אבל מומלץ) לוודא default ל-opened גם אם היו רשומות/שדה בלי default בעבר
  await db.query(`
    ALTER TABLE notes
    ALTER COLUMN opened SET DEFAULT false;
  `);

  console.log("Migration completed");
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
