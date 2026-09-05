const { Pool } = require("pg");

const urlPrecisaSsl = /supabase\.co|render\.com|neon\.tech|amazonaws\.com/.test(
  process.env.DATABASE_URL || ""
);
const sslExplicito = process.env.DB_SSL;
const usarSsl = sslExplicito === "true" || (sslExplicito !== "false" && urlPrecisaSsl);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: usarSsl ? { rejectUnauthorized: false } : false,
});

module.exports = { pool };
