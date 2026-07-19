const pool = require('../db/pool');

async function listJadwal(req, res) {
  try {
    const tanggal = req.query.tanggal || new Date().toISOString().split('T')[0];
    const slots = await pool.query('SELECT * FROM jam_slots ORDER BY urutan ASC');
    const counts = await pool.query(
      `SELECT jam_slot, COUNT(*)::int AS jumlah FROM antrean
       WHERE tanggal = $1 AND status != 'dibatalkan'
       GROUP BY jam_slot`,
      [tanggal]
    );
    const countMap = {};
    counts.rows.forEach((r) => { countMap[r.jam_slot] = r.jumlah; });

    const result = slots.rows.map((s) => {
      const terpakai = countMap[s.jam] || 0;
      return {
        id: s.id,
        jam: s.jam,
        total: s.total,
        sisa: Math.max(0, s.total - terpakai),
      };
    });
    res.json({ tanggal, jamSlots: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat jadwal.' });
  }
}

module.exports = { listJadwal };
