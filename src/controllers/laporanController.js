const pool = require('../db/pool');

const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Statistik pendaftaran & kunjungan selesai — mingguan (7 hari terakhir) atau
// bulanan (6 bulan terakhir). Dipakai untuk grafik tren di Dashboard admin,
// menggantikan data acak/dummy dengan data nyata dari tabel antrean.
async function getStatistik(req, res) {
  try {
    const range = req.query.range === 'bulanan' ? 'bulanan' : 'mingguan';

    if (range === 'bulanan') {
      const now = new Date();
      const bulanList = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        bulanList.push({
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        });
      }
      const awal = `${bulanList[0].key}-01`;
      const result = await pool.query(
        `SELECT to_char(tanggal, 'YYYY-MM') AS periode,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE status = 'selesai')::int AS selesai
         FROM antrean WHERE tanggal >= $1 GROUP BY 1`,
        [awal]
      );
      const map = {};
      result.rows.forEach(r => { map[r.periode] = r; });
      const data = bulanList.map(b => ({
        hari: b.label,
        pendaftaran: map[b.key]?.total || 0,
        selesai: map[b.key]?.selesai || 0,
      }));
      return res.json({ range, data });
    }

    const hariList = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      hariList.push({ key: toLocalDateStr(d), label: HARI_SINGKAT[d.getDay()] });
    }
    const result = await pool.query(
      `SELECT to_char(tanggal, 'YYYY-MM-DD') AS periode,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'selesai')::int AS selesai
       FROM antrean WHERE tanggal >= $1 GROUP BY 1`,
      [hariList[0].key]
    );
    const map = {};
    result.rows.forEach(r => { map[r.periode] = r; });
    const data = hariList.map(h => ({
      hari: h.label,
      pendaftaran: map[h.key]?.total || 0,
      selesai: map[h.key]?.selesai || 0,
    }));
    res.json({ range: 'mingguan', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat statistik.' });
  }
}

module.exports = { getStatistik };
