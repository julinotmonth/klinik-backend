const fs = require('fs');
const path = require('path');
const pool = require('./pool');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('Menjalankan migrasi skema database...');
  await pool.query(sql);
  console.log('Migrasi selesai.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migrasi gagal:', err);
  process.exit(1);
});
