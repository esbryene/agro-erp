const { Pool } = require("pg");

// Supabase (e a maioria dos free tiers de Postgres na nuvem) exige conexão
// SSL. Em Docker/VPS local (DATABASE_SSL não definida) mantém sem SSL.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
});

module.exports = { pool };
