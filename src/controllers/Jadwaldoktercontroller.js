const pool = require('../db/pool');
const { generateId, mapJadwalDokter, hariFromTanggal } = require('../utils/helpers');

const HARI_VALID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

async function listJadwalDokter(req, res) {
  try {
    const { dokterId } = req.query;
    const params = [];
    let sql = 'SELECT * FROM jadwal_dokter';
    if (dokterId) { params.push(dokterId); sql += ' WHERE dokter_id = $1'; }
    sql += ' ORDER BY jam_mulai ASC';
    const result = await pool.query(sql, params);
    res.json({ jadwalDokter: result.rows.map(mapJadwalDokter) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat jadwal dokter.' });
  }
}

async function createJadwalDokter(req, res) {
  try {
    const { dokterId, hari, jamMulai, jamSelesai, kuotaMaks, durasiMenit } = req.body;
    if (!dokterId || !hari || !jamMulai || !jamSelesai) {
      return res.status(400).json({ message: 'Dokter, hari, dan jam wajib diisi.' });
    }
    if (!HARI_VALID.includes(hari)) return res.status(400).json({ message: 'Hari tidak valid.' });
    if (jamSelesai <= jamMulai) return res.status(400).json({ message: 'Jam selesai harus setelah jam mulai.' });
    if (durasiMenit !== undefined && durasiMenit < 1) return res.status(400).json({ message: 'Durasi kunjungan minimal 1 menit.' });

    const id = generateId('jd');
    const result = await pool.query(
      `INSERT INTO jadwal_dokter (id, dokter_id, hari, jam_mulai, jam_selesai, kuota_maks, durasi_menit, aktif)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
      [id, dokterId, hari, jamMulai, jamSelesai, kuotaMaks || 20, durasiMenit || 15]
    );
    res.status(201).json({ jadwalDokter: mapJadwalDokter(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menambah jadwal dokter.' });
  }
}

async function updateJadwalDokter(req, res) {
  try {
    const { hari, jamMulai, jamSelesai, kuotaMaks, durasiMenit, aktif } = req.body;
    if (hari && !HARI_VALID.includes(hari)) return res.status(400).json({ message: 'Hari tidak valid.' });
    if (durasiMenit !== undefined && durasiMenit < 1) return res.status(400).json({ message: 'Durasi kunjungan minimal 1 menit.' });

    const result = await pool.query(
      `UPDATE jadwal_dokter SET
        hari = COALESCE($1, hari),
        jam_mulai = COALESCE($2, jam_mulai),
        jam_selesai = COALESCE($3, jam_selesai),
        kuota_maks = COALESCE($4, kuota_maks),
        durasi_menit = COALESCE($5, durasi_menit),
        aktif = COALESCE($6, aktif)
       WHERE id = $7 RETURNING *`,
      [hari, jamMulai, jamSelesai, kuotaMaks, durasiMenit, aktif, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'Jadwal tidak ditemukan.' });
    res.json({ jadwalDokter: mapJadwalDokter(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui jadwal dokter.' });
  }
}

async function deleteJadwalDokter(req, res) {
  try {
    const result = await pool.query('DELETE FROM jadwal_dokter WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Jadwal tidak ditemukan.' });
    res.json({ message: 'Jadwal dokter berhasil dihapus.' });
  } catch (err) {
    console.error(err);
    if (err.code === '23503') {
      return res.status(409).json({ message: 'Jadwal ini masih memiliki antrean pasien yang terdaftar. Nonaktifkan saja jadwal ini jika tidak ingin dipakai lagi.' });
    }
    res.status(500).json({ message: 'Gagal menghapus jadwal dokter.' });
  }
}

// Dipakai di halaman Pendaftaran (pasien): untuk poli + tanggal tertentu, cari dokter
// yang praktek pada hari itu beserta sisa kuota (kuota_maks dikurangi jumlah antrean aktif),
// dan perkiraan jam giliran berikutnya (dipakai untuk reminder H-30 menit).
async function listTersedia(req, res) {
  try {
    const { poliId, tanggal } = req.query;
    if (!poliId || !tanggal) return res.status(400).json({ message: 'poliId dan tanggal wajib diisi.' });

    const hari = hariFromTanggal(tanggal);
    const result = await pool.query(
      `SELECT jd.*, d.nama AS dokter_nama, d.spesialisasi,
        (SELECT COUNT(*)::int FROM antrean a WHERE a.jadwal_dokter_id = jd.id AND a.tanggal = $2 AND a.status != 'dibatalkan') AS terpakai
       FROM jadwal_dokter jd
       JOIN dokter d ON d.id = jd.dokter_id
       WHERE d.poli_id = $1 AND d.aktif = true AND jd.aktif = true AND jd.hari = $3
       ORDER BY jd.jam_mulai ASC`,
      [poliId, tanggal, hari]
    );

    const tersedia = result.rows.map(r => {
      const sisa = Math.max(0, r.kuota_maks - r.terpakai);
      const [jamH, jamM] = r.jam_mulai.split(':').map(Number);
      const estimasiMenit = jamH * 60 + jamM + r.terpakai * r.durasi_menit;
      const estimasiMulai = `${String(Math.floor(estimasiMenit / 60) % 24).padStart(2, '0')}:${String(estimasiMenit % 60).padStart(2, '0')}`;
      return {
        jadwalDokterId: r.id,
        dokterId: r.dokter_id,
        namaDokter: r.dokter_nama,
        spesialisasi: r.spesialisasi,
        hari: r.hari,
        jamMulai: r.jam_mulai,
        jamSelesai: r.jam_selesai,
        kuotaMaks: r.kuota_maks,
        durasiMenit: r.durasi_menit,
        terpakai: r.terpakai,
        sisa,
        estimasiMulai,
      };
    });

    res.json({ hari, tersedia });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat jadwal yang tersedia.' });
  }
}

module.exports = { listJadwalDokter, createJadwalDokter, updateJadwalDokter, deleteJadwalDokter, listTersedia };
