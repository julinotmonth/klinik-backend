const pool = require('../db/pool');

const HARI_MAP = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Menghitung status buka/tutup klinik saat ini berdasarkan jam operasional hari ini.
function computeStatusBuka(jamOperasionalRows) {
  const now = new Date();
  const hariIni = HARI_MAP[now.getDay()];
  const jamRow = jamOperasionalRows.find((j) => j.hari === hariIni);

  if (!jamRow || !jamRow.aktif) {
    return { buka: false, label: 'Tutup hari ini', hari: hariIni };
  }

  const nowMenit = now.getHours() * 60 + now.getMinutes();
  const [bH, bM] = jamRow.buka.split(':').map(Number);
  const [tH, tM] = jamRow.tutup.split(':').map(Number);
  const bukaMenit = bH * 60 + bM;
  const tutupMenit = tH * 60 + tM;
  const isBuka = nowMenit >= bukaMenit && nowMenit < tutupMenit;

  let label;
  if (isBuka) label = `Buka sampai ${jamRow.tutup}`;
  else if (nowMenit < bukaMenit) label = `Belum buka — mulai ${jamRow.buka}`;
  else label = `Sudah tutup untuk hari ini`;

  return { buka: isBuka, label, hari: hariIni, jamBuka: jamRow.buka, jamTutup: jamRow.tutup };
}

async function getSettings(req, res) {
  try {
    const settingsRes = await pool.query('SELECT * FROM klinik_settings WHERE id = 1');
    const jamRes = await pool.query('SELECT * FROM jam_operasional ORDER BY urutan ASC');
    const s = settingsRes.rows[0];
    if (!s) return res.status(404).json({ message: 'Pengaturan klinik belum tersedia.' });
    res.json({
      settings: {
        namaKlinik: s.nama_klinik,
        alamat: s.alamat,
        noTelpon: s.no_telpon,
        email: s.email,
        kuotaPerHari: s.kuota_per_hari,
        jamOperasional: jamRes.rows.map((j) => ({ hari: j.hari, buka: j.buka, tutup: j.tutup, aktif: j.aktif })),
        statusBuka: computeStatusBuka(jamRes.rows),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat pengaturan klinik.' });
  }
}

async function updateSettings(req, res) {
  const client = await pool.connect();
  try {
    const { namaKlinik, alamat, noTelpon, email, kuotaPerHari, jamOperasional } = req.body;
    await client.query('BEGIN');
    await client.query(
      `UPDATE klinik_settings SET nama_klinik=$1, alamat=$2, no_telpon=$3, email=$4, kuota_per_hari=$5 WHERE id = 1`,
      [namaKlinik, alamat, noTelpon, email, kuotaPerHari]
    );
    if (Array.isArray(jamOperasional)) {
      for (let i = 0; i < jamOperasional.length; i++) {
        const j = jamOperasional[i];
        await client.query(
          `UPDATE jam_operasional SET buka=$1, tutup=$2, aktif=$3 WHERE hari=$4`,
          [j.buka, j.tutup, j.aktif, j.hari]
        );
      }
    }
    await client.query('COMMIT');
    const settingsRes = await pool.query('SELECT * FROM klinik_settings WHERE id = 1');
    const jamRes = await pool.query('SELECT * FROM jam_operasional ORDER BY urutan ASC');
    const s = settingsRes.rows[0];
    res.json({
      settings: {
        namaKlinik: s.nama_klinik,
        alamat: s.alamat,
        noTelpon: s.no_telpon,
        email: s.email,
        kuotaPerHari: s.kuota_per_hari,
        jamOperasional: jamRes.rows.map((j) => ({ hari: j.hari, buka: j.buka, tutup: j.tutup, aktif: j.aktif })),
        statusBuka: computeStatusBuka(jamRes.rows),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui pengaturan klinik.' });
  } finally {
    client.release();
  }
}

module.exports = { getSettings, updateSettings };
