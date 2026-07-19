const pool = require('../db/pool');
const { generateId, mapAntrean, hariFromTanggal } = require('../utils/helpers');

function todayLocalStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// jamSelesai contoh: "12:00" — dianggap lewat kalau tanggal === hari ini DAN jam
// sekarang sudah melewati jam SELESAI jadwal tersebut. Sesi yang sedang berlangsung
// (sudah mulai tapi belum selesai) masih dianggap valid untuk didaftarkan.
function isSlotPast(tanggal, jamSelesai) {
  if (tanggal !== todayLocalStr()) return false;
  const [h, m] = jamSelesai.split(':').map(Number);
  const slotEnd = new Date();
  slotEnd.setHours(h, m, 0, 0);
  return new Date() > slotEnd;
}

async function listAntrean(req, res) {
  try {
    const { tanggal, poliId, status } = req.query;
    const conditions = [];
    const params = [];
    if (tanggal) { params.push(tanggal); conditions.push(`tanggal = $${params.length}`); }
    if (poliId) { params.push(poliId); conditions.push(`poli_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    let sql = 'SELECT * FROM antrean';
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at ASC';
    const result = await pool.query(sql, params);
    res.json({ antrean: result.rows.map(mapAntrean) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat data antrean.' });
  }
}

async function listMyAntrean(req, res) {
  try {
    const result = await pool.query('SELECT * FROM antrean WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ antrean: result.rows.map(mapAntrean) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat antrean Anda.' });
  }
}

async function getAntreanById(req, res) {
  try {
    const result = await pool.query('SELECT * FROM antrean WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Antrean tidak ditemukan.' });
    res.json({ antrean: mapAntrean(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat antrean.' });
  }
}

async function createAntrean(req, res) {
  const client = await pool.connect();
  try {
    const {
      namaLengkap, nik, noHp, jenisKelamin, tanggalLahir, alamat,
      poliId, tanggal, jadwalDokterId,
    } = req.body;

    if (!namaLengkap || !nik || !noHp || !jenisKelamin || !tanggalLahir || !alamat || !poliId || !tanggal || !jadwalDokterId) {
      return res.status(400).json({ message: 'Data pendaftaran belum lengkap.' });
    }

    await client.query('BEGIN');
    // Serialize per jadwal dokter + tanggal to avoid race condition on kuota/nomor/posisi
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${jadwalDokterId}|${tanggal}`]);

    const poliRes = await client.query('SELECT * FROM poli WHERE id = $1', [poliId]);
    const poli = poliRes.rows[0];
    if (!poli) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Poli tidak ditemukan.' }); }

    const jadwalRes = await client.query(
      `SELECT jd.*, d.nama AS dokter_nama, d.poli_id AS dokter_poli_id, d.aktif AS dokter_aktif
       FROM jadwal_dokter jd JOIN dokter d ON d.id = jd.dokter_id
       WHERE jd.id = $1`,
      [jadwalDokterId]
    );
    const jadwal = jadwalRes.rows[0];
    if (!jadwal || !jadwal.aktif || !jadwal.dokter_aktif) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Jadwal dokter tidak ditemukan atau sudah tidak aktif.' });
    }
    if (jadwal.dokter_poli_id !== poliId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Jadwal dokter tidak sesuai dengan poli yang dipilih.' });
    }
    if (jadwal.hari !== hariFromTanggal(tanggal)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: `Dokter ini tidak praktek pada hari ${hariFromTanggal(tanggal)}. Silakan pilih tanggal lain.` });
    }
    if (isSlotPast(tanggal, jadwal.jam_selesai)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Jam praktik tersebut sudah lewat untuk hari ini. Silakan pilih jadwal lain.' });
    }

    const terpakaiRes = await client.query(
      `SELECT COUNT(*)::int AS jumlah FROM antrean WHERE jadwal_dokter_id = $1 AND tanggal = $2 AND status != 'dibatalkan'`,
      [jadwalDokterId, tanggal]
    );
    if (terpakaiRes.rows[0].jumlah >= jadwal.kuota_maks) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Kuota dokter tersebut untuk tanggal ini sudah penuh. Silakan pilih jadwal lain.' });
    }

    const countPoliRes = await client.query(
      `SELECT COUNT(*)::int AS jumlah FROM antrean WHERE poli_id = $1 AND tanggal = $2 AND status != 'dibatalkan'`,
      [poliId, tanggal]
    );
    const nomorUrut = countPoliRes.rows[0].jumlah + 1;
    const nomorAntrean = `${poli.singkatan}-${String(nomorUrut).padStart(3, '0')}`;

    const posisiRes = await client.query(
      `SELECT COUNT(*)::int AS jumlah FROM antrean WHERE jadwal_dokter_id = $1 AND tanggal = $2 AND status IN ('menunggu','dipanggil')`,
      [jadwalDokterId, tanggal]
    );
    const posisi = posisiRes.rows[0].jumlah + 1;

    const jamSlot = `${jadwal.jam_mulai} - ${jadwal.jam_selesai}`;
    const id = generateId('aq');
    const insertRes = await client.query(
      `INSERT INTO antrean (id, nomor_antrean, user_id, nama_lengkap, nik, no_hp, jenis_kelamin, tanggal_lahir, alamat, poli_id, nama_poli, dokter_id, nama_dokter, jadwal_dokter_id, tanggal, jam_slot, status, posisi, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'menunggu',$17, now(), now()) RETURNING *`,
      [id, nomorAntrean, req.user.id, namaLengkap, nik, noHp, jenisKelamin, tanggalLahir, alamat, poliId, poli.nama, jadwal.dokter_id, jadwal.dokter_nama, jadwalDokterId, tanggal, jamSlot, posisi]
    );

    await client.query('COMMIT');
    res.status(201).json({ antrean: mapAntrean(insertRes.rows[0]) });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Gagal membuat pendaftaran antrean.' });
  } finally {
    client.release();
  }
}

async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    const allowed = ['menunggu', 'dipanggil', 'selesai', 'dibatalkan', 'dilewati'];
    if (!allowed.includes(status)) return res.status(400).json({ message: 'Status tidak valid.' });

    const existing = await pool.query('SELECT * FROM antrean WHERE id = $1', [req.params.id]);
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ message: 'Antrean tidak ditemukan.' });

    if (req.user.role !== 'admin') {
      // Pasien hanya boleh membatalkan antreannya sendiri, dan hanya jika masih menunggu
      const isOwner = row.user_id === req.user.id;
      if (!isOwner) return res.status(403).json({ message: 'Anda tidak memiliki akses ke antrean ini.' });
      if (status !== 'dibatalkan') return res.status(403).json({ message: 'Anda hanya dapat membatalkan antrean.' });
      if (row.status !== 'menunggu') return res.status(409).json({ message: 'Antrean ini tidak dapat dibatalkan lagi.' });
    }

    const result = await pool.query(
      `UPDATE antrean SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    res.json({ antrean: mapAntrean(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui status antrean.' });
  }
}

async function deleteAntrean(req, res) {
  try {
    const result = await pool.query('DELETE FROM antrean WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Antrean tidak ditemukan.' });
    res.json({ message: 'Antrean berhasil dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus antrean.' });
  }
}

module.exports = { listAntrean, listMyAntrean, getAntreanById, createAntrean, updateStatus, deleteAntrean };