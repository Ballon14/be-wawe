const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'iqbal14',
  database: process.env.DB_NAME || 'wawe',
  multipleStatements: true
});

const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = [
    'create_users_table.sql',
    'create_destinations_table.sql',
    'create_guides_table.sql',
    'create_open_trips_table.sql',
    'create_open_trip_registrations_table.sql',
    'add_open_trip_registration_fields.sql',
    'create_history_table.sql',
    'create_private_trips_table.sql',
    'create_chat_messages_table.sql'
  ];

async function runMigrations() {
  for (const file of migrationFiles) {
    const sqlFile = path.join(migrationsDir, file);
    if (!fs.existsSync(sqlFile)) {
      console.log(`Skipping ${file} (file not found)`);
      continue;
    }
    
    const sql = fs.readFileSync(sqlFile, 'utf8');
    const tableName = file.replace('create_', '').replace('_table.sql', '');
    
    try {
      await connection.promise().query(sql);
      console.log(`✓ ${tableName} table created successfully!`);
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log(`- ${tableName} table already exists, skipping...`);
      } else {
        console.error(`✗ Error creating ${tableName} table:`, err.message);
      }
    }
  }
  
  connection.end();
  console.log('\nAll migrations completed!');
}

runMigrations().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

