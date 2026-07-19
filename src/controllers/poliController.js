const pool = require('../db/pool');
const { mapPoli } = require('../utils/helpers');

async function listPoli(req, res) {
  try {
    const result = await pool.query('SELECT * FROM poli ORDER BY urutan ASC');
    res.json({ poli: result.rows.map(mapPoli) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat data poli.' });
  }
}

module.exports = { listPoli };
