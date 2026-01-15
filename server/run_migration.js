require('dotenv').config();
const db = require('./db');
const fs = require('fs');

async function runMigration() {
  try {
    const sql = fs.readFileSync('../migration_add_retro_number.sql', 'utf8');
    await db.query(sql);
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
