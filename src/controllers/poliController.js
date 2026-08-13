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

// Admin: atur apakah sebuah poli boleh dibooking lewat pendaftaran online (web).
// Poli yang dimatikan tetap bisa dilayani offline/walk-in oleh admin.
async function updatePoli(req, res) {
  try {
    const { bisaBookingOnline } = req.body;
    if (typeof bisaBookingOnline !== 'boolean') {
      return res.status(400).json({ message: 'bisaBookingOnline wajib berupa boolean.' });
    }
    const result = await pool.query(
      'UPDATE poli SET bisa_booking_online = $1 WHERE id = $2 RETURNING *',
      [bisaBookingOnline, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Poli tidak ditemukan.' });
    res.json({ poli: mapPoli(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui poli.' });
  }
}

module.exports = { listPoli, updatePoli };