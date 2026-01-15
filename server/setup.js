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
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = $2
  `,
    [table, column]
  );

  if (check.rows.length === 0) {
    await client.query(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
    );
    console.log(`  ✅ Added column ${table}.${column}`);
    return true;
  } else {
    console.log(`  ⏭️  Column ${table}.${column} already exists`);
    return false;
  }
}

async function setup() {
  const client = await pool.connect();

  try {
    console.log("🔧 Starting database schema reconciliation...");
    console.log("");

    // BEGIN TRANSACTION
    await client.query("BEGIN");
    console.log("📦 Transaction started");
    console.log("");

    // ========== TEAMS TABLE ==========
    console.log("📋 Teams table:");
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        team_code VARCHAR(6) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("  ✅ Table exists");
    console.log("");

    // ========== BOXES TABLE (RETRO SESSION TABLE) ==========
    console.log("📋 Boxes table (retro sessions):");
    await client.query(`
      CREATE TABLE IF NOT EXISTS boxes (
        id SERIAL PRIMARY KEY,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("  ✅ Table exists");

    // Add all required columns for retro sessions
    await addColumnIfNotExists(client, "boxes", "closed_at", "TIMESTAMP");
    await addColumnIfNotExists(
      client,
      "boxes",
      "status",
      "VARCHAR(20) DEFAULT 'collecting'"
    );
    await addColumnIfNotExists(
      client,
      "boxes",
      "retro_number",
      "INTEGER DEFAULT 1"
    );
    await addColumnIfNotExists(
      client,
      "boxes",
      "host_client_id",
      "VARCHAR(100)"
    );
    await addColumnIfNotExists(client, "boxes", "current_note_id", "INTEGER");

    // Backfill status to 'collecting' (backend expects this)
    const backfillBoxStatus = await client.query(`
      UPDATE boxes SET status = 'collecting' WHERE status IS NULL OR status = 'open'
    `);
    if (backfillBoxStatus.rowCount > 0) {
      console.log(
        `  🔄 Backfilled status to 'collecting' for ${backfillBoxStatus.rowCount} boxes`
      );
    }
    console.log("");

    // ========== NOTES TABLE ==========
    console.log("📋 Notes table:");
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        box_id INTEGER REFERENCES boxes(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("  ✅ Table exists");

    await addColumnIfNotExists(client, "notes", "author_name", "VARCHAR(100)");
    await addColumnIfNotExists(
      client,
      "notes",
      "anonymous",
      "BOOLEAN DEFAULT false"
    );
    await addColumnIfNotExists(
      client,
      "notes",
      "opened",
      "BOOLEAN NOT NULL DEFAULT false"
    );

    // ALWAYS backfill opened to ensure NOT NULL constraint
    const backfillOpened = await client.query(`
      UPDATE notes SET opened = false WHERE opened IS NULL
    `);
    if (backfillOpened.rowCount > 0) {
      console.log(
        `  🔄 Backfilled opened for ${backfillOpened.rowCount} notes`
      );
    }
    console.log("");

    // ========== SCHEMA VERIFICATION ==========
    console.log("🔍 Schema verification:");

    const boxesSchema = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns
      WHERE table_name = 'boxes' 
      ORDER BY ordinal_position
    `);
    console.log("  📊 boxes columns:");
    boxesSchema.rows.forEach((r) => {
      console.log(
        `     - ${r.column_name} (${r.data_type})${
          r.column_default ? " = " + r.column_default : ""
        }`
      );
    });

    const notesSchema = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'notes' ORDER BY ordinal_position
    `);
    console.log(
      "  📊 notes:",
      notesSchema.rows.map((r) => r.column_name).join(", ")
    );

    console.log("");

    // COMMIT TRANSACTION
    await client.query("COMMIT");
    console.log("✅ Transaction committed - schema reconciliation complete");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Setup failed - transaction rolled back:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setup()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
EOF;
