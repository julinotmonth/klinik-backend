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

const ANTREAN_SELECT = `
  SELECT a.*, jd.jam_mulai AS jd_jam_mulai, jd.durasi_menit AS jd_durasi_menit
  FROM antrean a
  LEFT JOIN jadwal_dokter jd ON jd.id = a.jadwal_dokter_id
`;

async function listAntrean(req, res) {
  try {
    const { tanggal, poliId, status } = req.query;
    const conditions = [];
    const params = [];
    if (tanggal) { params.push(tanggal); conditions.push(`a.tanggal = $${params.length}`); }
    if (poliId) { params.push(poliId); conditions.push(`a.poli_id = $${params.length}`); }
    if (status) { params.push(status); conditions.push(`a.status = $${params.length}`); }
    let sql = ANTREAN_SELECT;
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY a.created_at ASC';
    const result = await pool.query(sql, params);
    res.json({ antrean: result.rows.map(mapAntrean) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat data antrean.' });
  }
}

async function listMyAntrean(req, res) {
  try {
    const result = await pool.query(`${ANTREAN_SELECT} WHERE a.user_id = $1 ORDER BY a.created_at DESC`, [req.user.id]);
    res.json({ antrean: result.rows.map(mapAntrean) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat antrean Anda.' });
  }
}

async function getAntreanById(req, res) {
  try {
    const result = await pool.query(`${ANTREAN_SELECT} WHERE a.id = $1`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Antrean tidak ditemukan.' });
    res.json({ antrean: mapAntrean(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat antrean.' });
  }
}

// Logika inti booking, dipakai bersama oleh pendaftaran online (pasien) dan
// input walk-in/offline oleh admin — memastikan keduanya memakai kuota &
// penomoran antrean yang sama persis (integrasi online & offline).
async function bookAntrean(client, { userId, sumber, namaLengkap, nik, noHp, jenisKelamin, tanggalLahir, alamat, poliId, tanggal, jadwalDokterId }) {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${jadwalDokterId}|${tanggal}`]);

  const poliRes = await client.query('SELECT * FROM poli WHERE id = $1', [poliId]);
  const poli = poliRes.rows[0];
  if (!poli) { await client.query('ROLLBACK'); return { error: { status: 404, message: 'Poli tidak ditemukan.' } }; }

  const jadwalRes = await client.query(
    `SELECT jd.*, d.nama AS dokter_nama, d.poli_id AS dokter_poli_id, d.aktif AS dokter_aktif
     FROM jadwal_dokter jd JOIN dokter d ON d.id = jd.dokter_id
     WHERE jd.id = $1`,
    [jadwalDokterId]
  );
  const jadwal = jadwalRes.rows[0];
  if (!jadwal || !jadwal.aktif || !jadwal.dokter_aktif) {
    await client.query('ROLLBACK');
    return { error: { status: 404, message: 'Jadwal dokter tidak ditemukan atau sudah tidak aktif.' } };
  }
  if (jadwal.dokter_poli_id !== poliId) {
    await client.query('ROLLBACK');
    return { error: { status: 400, message: 'Jadwal dokter tidak sesuai dengan poli yang dipilih.' } };
  }
  if (jadwal.hari !== hariFromTanggal(tanggal)) {
    await client.query('ROLLBACK');
    return { error: { status: 400, message: `Dokter ini tidak praktek pada hari ${hariFromTanggal(tanggal)}. Silakan pilih tanggal lain.` } };
  }
  // Admin (walk-in) boleh tetap mencatat pasien yang datang meski jam praktik hampir/telah berakhir;
  // validasi jam-sudah-lewat hanya berlaku untuk pendaftaran online.
  if (sumber === 'online' && isSlotPast(tanggal, jadwal.jam_selesai)) {
    await client.query('ROLLBACK');
    return { error: { status: 400, message: 'Jam praktik tersebut sudah lewat untuk hari ini. Silakan pilih jadwal lain.' } };
  }

  const terpakaiRes = await client.query(
    `SELECT COUNT(*)::int AS jumlah FROM antrean WHERE jadwal_dokter_id = $1 AND tanggal = $2 AND status != 'dibatalkan'`,
    [jadwalDokterId, tanggal]
  );
  if (terpakaiRes.rows[0].jumlah >= jadwal.kuota_maks) {
    await client.query('ROLLBACK');
    return { error: { status: 409, message: 'Kuota dokter tersebut untuk tanggal ini sudah penuh. Silakan pilih jadwal lain.' } };
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
    `INSERT INTO antrean (id, nomor_antrean, user_id, nama_lengkap, nik, no_hp, jenis_kelamin, tanggal_lahir, alamat, poli_id, nama_poli, dokter_id, nama_dokter, jadwal_dokter_id, tanggal, jam_slot, status, sumber, posisi, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'menunggu',$17,$18, now(), now()) RETURNING *`,
    [id, nomorAntrean, userId, namaLengkap, nik, noHp, jenisKelamin, tanggalLahir, alamat, poliId, poli.nama, jadwal.dokter_id, jadwal.dokter_nama, jadwalDokterId, tanggal, jamSlot, sumber, posisi]
  );

  await client.query('COMMIT');
  const createdRow = { ...insertRes.rows[0], jd_jam_mulai: jadwal.jam_mulai, jd_durasi_menit: jadwal.durasi_menit };
  return { antrean: mapAntrean(createdRow) };
}

async function createAntrean(req, res) {
  const client = await pool.connect();
  try {
    const { namaLengkap, nik, noHp, jenisKelamin, tanggalLahir, alamat, poliId, tanggal, jadwalDokterId } = req.body;

    if (!namaLengkap || !nik || !noHp || !jenisKelamin || !tanggalLahir || !alamat || !poliId || !tanggal || !jadwalDokterId) {
      return res.status(400).json({ message: 'Data pendaftaran belum lengkap.' });
    }

    const result = await bookAntrean(client, {
      userId: req.user.id, sumber: 'online',
      namaLengkap, nik, noHp, jenisKelamin, tanggalLahir, alamat, poliId, tanggal, jadwalDokterId,
    });
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    res.status(201).json({ antrean: result.antrean });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ message: 'Gagal membuat pendaftaran antrean.' });
  } finally {
    client.release();
  }
}

// Admin: catat pasien yang datang langsung (walk-in/offline) ke dalam antrean yang
// sama persis dengan pendaftaran online, supaya kuota & nomor antrean tetap konsisten.
async function createWalkin(req, res) {
  const client = await pool.connect();
  try {
    const { namaLengkap, nik, noHp, jenisKelamin, tanggalLahir, alamat, poliId, tanggal, jadwalDokterId } = req.body;

    if (!namaLengkap || !nik || !noHp || !jenisKelamin || !tanggalLahir || !alamat || !poliId || !tanggal || !jadwalDokterId) {
      return res.status(400).json({ message: 'Data pendaftaran belum lengkap.' });
    }

    const userRes = await client.query('SELECT id FROM users WHERE nik = $1', [nik]);
    const userId = userRes.rows[0]?.id || null;

    const result = await bookAntrean(client, {
      userId, sumber: 'offline',
      namaLengkap, nik, noHp, jenisKelamin, tanggalLahir, alamat, poliId, tanggal, jadwalDokterId,
    });
    if (result.error) return res.status(result.error.status).json({ message: result.error.message });
    res.status(201).json({ antrean: result.antrean });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ message: 'Gagal mencatat pasien walk-in.' });
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
      const isOwner = row.user_id === req.user.id;
      if (!isOwner) return res.status(403).json({ message: 'Anda tidak memiliki akses ke antrean ini.' });
      if (status !== 'dibatalkan') return res.status(403).json({ message: 'Anda hanya dapat membatalkan antrean.' });
      if (row.status !== 'menunggu') return res.status(409).json({ message: 'Antrean ini tidak dapat dibatalkan lagi.' });
    }

    await pool.query(`UPDATE antrean SET status = $1, updated_at = now() WHERE id = $2`, [status, req.params.id]);
    const refreshed = await pool.query(`${ANTREAN_SELECT} WHERE a.id = $1`, [req.params.id]);
    res.json({ antrean: mapAntrean(refreshed.rows[0]) });
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

module.exports = { listAntrean, listMyAntrean, getAntreanById, createAntrean, createWalkin, updateStatus, deleteAntrean };
