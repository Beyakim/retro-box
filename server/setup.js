// server/setup.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});

async function addColumnIfNotExists(client, table, column, definition) {
  const check = await client.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    `,
    [table, column],
  );

  if (check.rowCount === 0) {
    await client.query(
      `ALTER TABLE public.${table} ADD COLUMN ${column} ${definition}`,
    );
    console.log(`  ✅ Added column ${table}.${column}`);
  } else {
    console.log(`  ⏭️  Column ${table}.${column} already exists`);
  }
}

async function setup() {
  const client = await pool.connect();
  try {
    console.log("🔧 Starting database schema reconciliation...\n");
    await client.query("BEGIN");
    console.log("📦 Transaction started\n");

    // ===================== TEAMS =====================
    console.log("📋 Teams table:");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.teams (
        id SERIAL PRIMARY KEY,
        team_code VARCHAR(6) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("  ✅ Table exists\n");

    // ===================== BOXES =====================
    console.log("📋 Boxes table:");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.boxes (
        id SERIAL PRIMARY KEY,
        team_id INTEGER REFERENCES public.teams(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("  ✅ Table exists");

    // Columns used across: /boxes, /state, /active-box, start-retro, pull-next, close
    await addColumnIfNotExists(client, "boxes", "status", "VARCHAR(20)");
    await addColumnIfNotExists(client, "boxes", "retro_number", "INTEGER");
    await addColumnIfNotExists(client, "boxes", "closed_at", "TIMESTAMP");
    await addColumnIfNotExists(
      client,
      "boxes",
      "host_client_id",
      "VARCHAR(100)",
    );
    await addColumnIfNotExists(client, "boxes", "current_note_id", "INTEGER");

    // ✅ start-retro / pull-next need this
    await addColumnIfNotExists(client, "boxes", "pull_mode", "VARCHAR(20)");

    // Fix defaults even if columns already existed with old defaults
    await client.query(`
      ALTER TABLE public.boxes
      ALTER COLUMN status SET DEFAULT 'collecting'
    `);
    await client.query(`
      ALTER TABLE public.boxes
      ALTER COLUMN retro_number SET DEFAULT 1
    `);

    // Backfills to keep old rows compatible with new code
    const backfillStatus = await client.query(`
      UPDATE public.boxes
      SET status = 'collecting'
      WHERE status IS NULL OR status = 'open'
    `);
    if (backfillStatus.rowCount) {
      console.log(
        `  🔄 Backfilled status for ${backfillStatus.rowCount} boxes`,
      );
    }

    const backfillRetroNumber = await client.query(`
      UPDATE public.boxes
      SET retro_number = 1
      WHERE retro_number IS NULL
    `);
    if (backfillRetroNumber.rowCount) {
      console.log(
        `  🔄 Backfilled retro_number for ${backfillRetroNumber.rowCount} boxes`,
      );
    }

    // pull_mode defaulting: your code assumes fallback to "sequential" if null,
    // but we still want stable values in DB.
    await client.query(`
      UPDATE public.boxes
      SET pull_mode = 'sequential'
      WHERE pull_mode IS NULL
    `);

    // If you want DB-level default too (recommended):
    await client.query(`
      ALTER TABLE public.boxes
      ALTER COLUMN pull_mode SET DEFAULT 'sequential'
    `);

    console.log("");

    // ===================== NOTES =====================
    console.log("📋 Notes table:");
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.notes (
        id SERIAL PRIMARY KEY,
        box_id INTEGER REFERENCES public.boxes(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("  ✅ Table exists");

    await addColumnIfNotExists(client, "notes", "author_name", "VARCHAR(100)");
    await addColumnIfNotExists(client, "notes", "image_url", "TEXT");
    await addColumnIfNotExists(client, "notes", "anonymous", "BOOLEAN");
    await addColumnIfNotExists(client, "notes", "opened", "BOOLEAN");

    // DB-level defaults (safe)
    await client.query(`
      ALTER TABLE public.notes
      ALTER COLUMN anonymous SET DEFAULT false
    `);
    await client.query(`
      ALTER TABLE public.notes
      ALTER COLUMN opened SET DEFAULT false
    `);

    // Backfills (protect old rows)
    await client.query(
      `UPDATE public.notes SET anonymous = false WHERE anonymous IS NULL`,
    );
    await client.query(
      `UPDATE public.notes SET opened = false WHERE opened IS NULL`,
    );

    console.log("");

    // ===================== SANITY CHECK =====================
    console.log("🔍 Schema verification:");
    const boxesColsRes = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='boxes'
    `);
    const notesColsRes = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='notes'
    `);

    const boxesCols = new Set(boxesColsRes.rows.map((r) => r.column_name));
    const notesCols = new Set(notesColsRes.rows.map((r) => r.column_name));

    const mustBoxes = [
      "status",
      "retro_number",
      "closed_at",
      "host_client_id",
      "current_note_id",
      "pull_mode",
    ];
    const mustNotes = ["author_name", "image_url", "anonymous", "opened"];

    const missingBoxes = mustBoxes.filter((c) => !boxesCols.has(c));
    const missingNotes = mustNotes.filter((c) => !notesCols.has(c));

    if (missingBoxes.length || missingNotes.length) {
      throw new Error(
        `Schema mismatch: missing boxes=[${missingBoxes.join(", ")}], notes=[${missingNotes.join(", ")}]`,
      );
    }

    console.log("✅ Schema looks good\n");

    await client.query("COMMIT");
    console.log("✅ Transaction committed - schema reconciliation complete");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Setup failed - transaction rolled back:", err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

setup()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
