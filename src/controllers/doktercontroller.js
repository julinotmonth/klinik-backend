const pool = require('../db/pool');
const { generateId, mapDokter } = require('../utils/helpers');

async function listDokter(req, res) {
  try {
    const { poliId } = req.query;
    const params = [];
    let sql = 'SELECT * FROM dokter';
    if (poliId) { params.push(poliId); sql += ' WHERE poli_id = $1'; }
    sql += ' ORDER BY created_at ASC';
    const result = await pool.query(sql, params);
    res.json({ dokter: result.rows.map(mapDokter) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat data dokter.' });
  }
}

async function createDokter(req, res) {
  try {
    const { nama, poliId, spesialisasi } = req.body;
    if (!nama || !poliId) return res.status(400).json({ message: 'Nama dan poli wajib diisi.' });

    const id = generateId('dr');
    const result = await pool.query(
      `INSERT INTO dokter (id, nama, poli_id, spesialisasi, aktif, created_at) VALUES ($1,$2,$3,$4,true, now()) RETURNING *`,
      [id, nama, poliId, spesialisasi || '']
    );
    res.status(201).json({ dokter: mapDokter(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menambah dokter.' });
  }
}

async function updateDokter(req, res) {
  try {
    const { nama, poliId, spesialisasi, aktif } = req.body;
    const result = await pool.query(
      `UPDATE dokter SET
        nama = COALESCE($1, nama),
        poli_id = COALESCE($2, poli_id),
        spesialisasi = COALESCE($3, spesialisasi),
        aktif = COALESCE($4, aktif)
       WHERE id = $5 RETURNING *`,
      [nama, poliId, spesialisasi, aktif, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Dokter tidak ditemukan.' });
    res.json({ dokter: mapDokter(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui data dokter.' });
  }
}

async function deleteDokter(req, res) {
  try {
    const result = await pool.query('DELETE FROM dokter WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Dokter tidak ditemukan.' });
    res.json({ message: 'Dokter berhasil dihapus.' });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') {
      return res.status(409).json({ message: 'Dokter ini masih memiliki jadwal atau antrean pasien yang terdaftar. Nonaktifkan saja dokter ini jika tidak ingin praktik lagi.' });
    }
    res.status(500).json({ message: 'Gagal menghapus dokter.' });
  }
}

module.exports = { listDokter, createDokter, updateDokter, deleteDokter };