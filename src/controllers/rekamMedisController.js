const pool = require('../db/pool');
const { generateId, mapRekamMedis } = require('../utils/helpers');

async function listRekamMedis(req, res) {
  try {
    const { poliId, search } = req.query;
    const conditions = [];
    const params = [];
    if (poliId && poliId !== 'semua') { params.push(poliId); conditions.push(`poli_id = $${params.length}`); }
    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push(`(lower(nama_lengkap) LIKE $${params.length} OR lower(diagnosis_nama) LIKE $${params.length} OR lower(dokter) LIKE $${params.length})`);
    }
    let sql = 'SELECT * FROM rekam_medis';
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC';
    const result = await pool.query(sql, params);
    res.json({ rekamMedis: result.rows.map(mapRekamMedis) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat rekam medis.' });
  }
}

async function listMyRekamMedis(req, res) {
  try {
    const result = await pool.query('SELECT * FROM rekam_medis WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ rekamMedis: result.rows.map(mapRekamMedis) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat rekam medis Anda.' });
  }
}

async function getByAntrean(req, res) {
  try {
    const result = await pool.query('SELECT * FROM rekam_medis WHERE antrean_id = $1', [req.params.antreanId]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Rekam medis tidak ditemukan.' });
    res.json({ rekamMedis: mapRekamMedis(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat rekam medis.' });
  }
}

function pick(body) {
  return {
    antreanId: body.antreanId || null,
    userId: body.userId || null,
    namaLengkap: body.namaLengkap || '',
    tanggal: body.tanggal || new Date().toISOString().split('T')[0],
    poliId: body.poliId || null,
    namaPoili: body.namaPoili || '',
    dokter: body.dokter || '',
    beratBadan: body.beratBadan ?? null,
    tinggiBadan: body.tinggiBadan ?? null,
    tekananDarah: body.tekananDarah || null,
    suhu: body.suhu ?? null,
    nadiPerMenit: body.nadiPerMenit ?? null,
    golonganDarah: body.golonganDarah || null,
    keluhanUtama: body.keluhanUtama || '',
    anamnesis: body.anamnesis || null,
    diagnosisKode: body.diagnosisKode || null,
    diagnosisNama: body.diagnosisNama || '',
    tindakan: body.tindakan || null,
    resep: body.resep || null,
    catatan: body.catatan || null,
    kontrolKembali: body.kontrolKembali || null,
  };
}

async function createRekamMedis(req, res) {
  try {
    const d = pick(req.body);
    if (!d.keluhanUtama.trim()) return res.status(400).json({ message: 'Keluhan utama wajib diisi.' });
    if (!d.diagnosisNama.trim()) return res.status(400).json({ message: 'Diagnosis wajib diisi.' });

    const id = generateId('rm');
    const result = await pool.query(
      `INSERT INTO rekam_medis (id, antrean_id, user_id, nama_lengkap, tanggal, poli_id, nama_poli, dokter, berat_badan, tinggi_badan, tekanan_darah, suhu, nadi_per_menit, golongan_darah, keluhan_utama, anamnesis, diagnosis_kode, diagnosis_nama, tindakan, resep, catatan, kontrol_kembali, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22, now(), now()) RETURNING *`,
      [id, d.antreanId, d.userId, d.namaLengkap, d.tanggal, d.poliId, d.namaPoili, d.dokter, d.beratBadan, d.tinggiBadan, d.tekananDarah, d.suhu, d.nadiPerMenit, d.golonganDarah, d.keluhanUtama, d.anamnesis, d.diagnosisKode, d.diagnosisNama, d.tindakan, d.resep, d.catatan, d.kontrolKembali]
    );
    res.status(201).json({ rekamMedis: mapRekamMedis(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menyimpan rekam medis.' });
  }
}

async function updateRekamMedis(req, res) {
  try {
    const existing = await pool.query('SELECT * FROM rekam_medis WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ message: 'Rekam medis tidak ditemukan.' });

    const merged = { ...mapRekamMedis(existing.rows[0]), ...req.body };
    const d = pick(merged);

    const result = await pool.query(
      `UPDATE rekam_medis SET
        antrean_id=$1, user_id=$2, nama_lengkap=$3, tanggal=$4, poli_id=$5, nama_poli=$6, dokter=$7,
        berat_badan=$8, tinggi_badan=$9, tekanan_darah=$10, suhu=$11, nadi_per_menit=$12, golongan_darah=$13,
        keluhan_utama=$14, anamnesis=$15, diagnosis_kode=$16, diagnosis_nama=$17, tindakan=$18, resep=$19,
        catatan=$20, kontrol_kembali=$21, updated_at=now()
       WHERE id=$22 RETURNING *`,
      [d.antreanId, d.userId, d.namaLengkap, d.tanggal, d.poliId, d.namaPoili, d.dokter, d.beratBadan, d.tinggiBadan, d.tekananDarah, d.suhu, d.nadiPerMenit, d.golonganDarah, d.keluhanUtama, d.anamnesis, d.diagnosisKode, d.diagnosisNama, d.tindakan, d.resep, d.catatan, d.kontrolKembali, req.params.id]
    );
    res.json({ rekamMedis: mapRekamMedis(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui rekam medis.' });
  }
}

async function deleteRekamMedis(req, res) {
  try {
    const result = await pool.query('DELETE FROM rekam_medis WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'Rekam medis tidak ditemukan.' });
    res.json({ message: 'Rekam medis berhasil dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal menghapus rekam medis.' });
  }
}

module.exports = { listRekamMedis, listMyRekamMedis, getByAntrean, createRekamMedis, updateRekamMedis, deleteRekamMedis };
