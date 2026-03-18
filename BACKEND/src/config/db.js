const { Pool } = require('pg');

function createPool(database) {
  return new Pool({
    host: process.env.PGHOST,
    database,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    port: Number(process.env.PGPORT || 5432),
    max: 20,
    idleTimeoutMillis: 30000,
  });
}

const pool = createPool(process.env.PGDATABASE);
const irAssetDbPool = createPool(process.env.IR_ASSET_DB_DATABASE || 'ir_asset_db');

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

irAssetDbPool.on('error', (err) => {
  console.error('Unexpected IR asset DB pool error', err);
});

module.exports = pool;
module.exports.irAssetDbPool = irAssetDbPool;
