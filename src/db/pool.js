const { Pool } = require('pg');
require('dotenv').config();

const useSsl = String(process.env.PGSSL).toLowerCase() === 'true';

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT) || 5432,
      database: process.env.PGDATABASE || 'klinik_db',
      user: process.env.PGUSER || 'klinik_user',
      password: process.env.PGPASSWORD || 'klinik_pass',
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

module.exports = pool;
