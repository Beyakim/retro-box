const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setup() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Setting up database schema...');
    
    // 1. Create teams table
    await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        team_code VARCHAR(6) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Teams table ready');

    // 2. Create boxes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS boxes (
        id SERIAL PRIMARY KEY,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP,
        status VARCHAR(20) DEFAULT 'open'
      );
    `);
    
    // Add retro_number to boxes if missing
    await client.query(`
      ALTER TABLE boxes 
      ADD COLUMN IF NOT EXISTS retro_number INTEGER DEFAULT 1;
    `);
    console.log('✅ Boxes table ready');

    // 3. Create notes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        box_id INTEGER REFERENCES boxes(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        author_name VARCHAR(100),
        anonymous BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add opened column to notes if missing
    await client.query(`
      ALTER TABLE notes 
      ADD COLUMN IF NOT EXISTS opened BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log('✅ Notes table ready');

    // 4. Create retros table
    await client.query(`
      CREATE TABLE IF NOT EXISTS retros (
        id SERIAL PRIMARY KEY,
        box_id INTEGER REFERENCES boxes(id) ON DELETE CASCADE,
        host_client_id VARCHAR(100) NOT NULL,
        current_note_id INTEGER,
        status VARCHAR(20) DEFAULT 'in_retro',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add retro_number to retros if missing
    await client.query(`
      ALTER TABLE retros 
      ADD COLUMN IF NOT EXISTS retro_number INTEGER DEFAULT 1;
    `);
    console.log('✅ Retros table ready');
    
    console.log('✅ Database schema set up successfully');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setup()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
