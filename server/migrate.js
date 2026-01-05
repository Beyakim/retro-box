const db = require("./db");

async function migrate() {
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

  console.log("Migration completed");
  process.exit(0);
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});
