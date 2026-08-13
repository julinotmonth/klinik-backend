const pool = require('../db/pool');
const { generateId, mapJadwalDokter, hariFromTanggal, computeSlotTimes } = require('../utils/helpers');

const HARI_VALID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const DURASI_MAKS = 30;

function todayLocalStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function isSlotTimePast(tanggal, slotTime) {
  if (tanggal !== todayLocalStr()) return false;
  const [h, m] = slotTime.split(':').map(Number);
  const slotDate = new Date();
  slotDate.setHours(h, m, 0, 0);
  return new Date() > slotDate;
}

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
    const durasi = durasiMenit || 15;
    if (durasi < 1 || durasi > DURASI_MAKS) return res.status(400).json({ message: `Durasi kunjungan harus antara 1-${DURASI_MAKS} menit.` });

    const id = generateId('jd');
    const result = await pool.query(
      `INSERT INTO jadwal_dokter (id, dokter_id, hari, jam_mulai, jam_selesai, kuota_maks, durasi_menit, aktif)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
      [id, dokterId, hari, jamMulai, jamSelesai, kuotaMaks || 20, durasi]
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
    if (durasiMenit !== undefined && (durasiMenit < 1 || durasiMenit > DURASI_MAKS)) {
      return res.status(400).json({ message: `Durasi kunjungan harus antara 1-${DURASI_MAKS} menit.` });
    }

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

// Dipakai di halaman Pendaftaran (pasien) & modal walk-in (admin): untuk poli + tanggal
// tertentu, cari dokter yang praktek pada hari itu, beserta breakdown SETIAP slot jam
// spesifik (bukan cuma angka sisa kuota) — supaya online & offline benar-benar berbagi
// slot yang sama dan tidak bisa saling menabrak.
async function listTersedia(req, res) {
  try {
    const { poliId, tanggal } = req.query;
    if (!poliId || !tanggal) return res.status(400).json({ message: 'poliId dan tanggal wajib diisi.' });

    const hari = hariFromTanggal(tanggal);
    const result = await pool.query(
      `SELECT jd.*, d.nama AS dokter_nama, d.spesialisasi
       FROM jadwal_dokter jd
       JOIN dokter d ON d.id = jd.dokter_id
       WHERE d.poli_id = $1 AND d.aktif = true AND jd.aktif = true AND jd.hari = $2 AND d.poli_id IS NOT NULL
       ORDER BY jd.jam_mulai ASC`,
      [poliId, hari]
    );

    const jadwalIds = result.rows.map(r => r.id);
    let takenByJadwal = {};
    if (jadwalIds.length > 0) {
      const takenRes = await pool.query(
        `SELECT jadwal_dokter_id, jam_booking FROM antrean
         WHERE jadwal_dokter_id = ANY($1::text[]) AND tanggal = $2::date AND status != 'dibatalkan' AND jam_booking IS NOT NULL`,
        [jadwalIds, tanggal]
      );
      takenByJadwal = takenRes.rows.reduce((acc, r) => {
        (acc[r.jadwal_dokter_id] = acc[r.jadwal_dokter_id] || new Set()).add(r.jam_booking);
        return acc;
      }, {});
    }

    const tersedia = result.rows.map(r => {
      const allSlots = computeSlotTimes(r.jam_mulai, r.jam_selesai, r.durasi_menit, r.kuota_maks);
      const taken = takenByJadwal[r.id] || new Set();
      const slots = allSlots.map(jam => ({
        jam,
        tersedia: !taken.has(jam) && !isSlotTimePast(tanggal, jam),
        lewat: isSlotTimePast(tanggal, jam),
      }));
      const sisa = slots.filter(s => s.tersedia).length;
      const slotBerikutnya = slots.find(s => s.tersedia)?.jam || null;

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
        terpakai: allSlots.length - sisa,
        sisa,
        estimasiMulai: slotBerikutnya,
        slots,
      };
    });

    res.json({ hari, tersedia });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat jadwal yang tersedia.' });
  }
}

module.exports = { listJadwalDokter, createJadwalDokter, updateJadwalDokter, deleteJadwalDokter, listTersedia };