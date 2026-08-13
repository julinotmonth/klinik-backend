const crypto = require('crypto');

function generateId(prefix = '') {
  return `${prefix}${crypto.randomBytes(8).toString('hex')}`;
}

function toDateStr(d) {
  if (!d) return d;
  if (typeof d === 'string') return d.split('T')[0];
  // node-postgres parses DATE columns into a JS Date object set to LOCAL midnight
  // (not UTC midnight). Reading it back with .toISOString() converts to UTC and
  // silently shifts the date backward by one day for any timezone ahead of UTC
  // (e.g. WIB/GMT+7) — so we must read the LOCAL date components instead.
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Row -> API shape mappers (snake_case DB -> camelCase JSON) ────────────

function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    nama: row.nama,
    email: row.email,
    noHp: row.no_hp,
    nik: row.nik,
    role: row.role,
    alamat: row.alamat,
    avatar: row.avatar || undefined,
    createdAt: row.created_at,
  };
}

function mapPoli(row) {
  return {
    id: row.id,
    nama: row.nama,
    singkatan: row.singkatan,
    deskripsi: row.deskripsi,
    dokter: row.dokter,
    icon: row.icon,
    bisaBookingOnline: row.bisa_booking_online !== false,
  };
}

function mapAntrean(row) {
  let estimasiMulai, waktuIngatkan;
  const fmt = (menit) => {
    const clamped = Math.max(0, menit);
    const jam = Math.floor(clamped / 60) % 24;
    const mnt = clamped % 60;
    return `${String(jam).padStart(2, '0')}:${String(mnt).padStart(2, '0')}`;
  };
  if (row.jam_booking) {
    // Slot spesifik sudah ditetapkan saat booking — ini sumber kebenaran paling akurat.
    const [h, m] = row.jam_booking.split(':').map(Number);
    estimasiMulai = row.jam_booking;
    waktuIngatkan = fmt(h * 60 + m - 30);
  } else if (row.jd_jam_mulai && row.jd_durasi_menit != null) {
    // Fallback untuk data lama (sebelum sistem slot spesifik) yang belum punya jam_booking.
    const [h, m] = row.jd_jam_mulai.split(':').map(Number);
    const menitMulai = h * 60 + m + (row.posisi - 1) * row.jd_durasi_menit;
    estimasiMulai = fmt(menitMulai);
    waktuIngatkan = fmt(menitMulai - 30);
  }
  return {
    id: row.id,
    nomorAntrean: row.nomor_antrean,
    userId: row.user_id,
    namaLengkap: row.nama_lengkap,
    nik: row.nik,
    noHp: row.no_hp,
    jenisKelamin: row.jenis_kelamin,
    tanggalLahir: toDateStr(row.tanggal_lahir),
    alamat: row.alamat,
    poliId: row.poli_id,
    namaPoili: row.nama_poli,
    dokterId: row.dokter_id || undefined,
    namaDokter: row.nama_dokter || undefined,
    jadwalDokterId: row.jadwal_dokter_id || undefined,
    tanggal: toDateStr(row.tanggal),
    jamSlot: row.jam_slot,
    jamBooking: row.jam_booking || undefined,
    status: row.status,
    sumber: row.sumber || 'online',
    posisi: row.posisi,
    estimasiMulai,
    waktuIngatkan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Menghasilkan daftar slot jam diskrit untuk sebuah jadwal dokter, mis. jam_mulai=08:00,
// jam_selesai=09:00, durasi_menit=15 -> ['08:00','08:15','08:30','08:45']. Jumlah slot juga
// dibatasi oleh kuota_maks kalau itu lebih kecil dari kapasitas berbasis waktu.
function computeSlotTimes(jamMulai, jamSelesai, durasiMenit, kuotaMaks) {
  const [mh, mm] = jamMulai.split(':').map(Number);
  const [sh, sm] = jamSelesai.split(':').map(Number);
  const startMenit = mh * 60 + mm;
  const endMenit = sh * 60 + sm;
  const slots = [];
  for (let t = startMenit; t < endMenit; t += durasiMenit) {
    const jam = Math.floor(t / 60) % 24;
    const mnt = t % 60;
    slots.push(`${String(jam).padStart(2, '0')}:${String(mnt).padStart(2, '0')}`);
  }
  if (typeof kuotaMaks === 'number' && kuotaMaks > 0 && kuotaMaks < slots.length) {
    return slots.slice(0, kuotaMaks);
  }
  return slots;
}

function mapDokter(row) {
  return {
    id: row.id,
    nama: row.nama,
    poliId: row.poli_id,
    spesialisasi: row.spesialisasi,
    aktif: row.aktif,
    createdAt: row.created_at,
  };
}

function mapJadwalDokter(row) {
  return {
    id: row.id,
    dokterId: row.dokter_id,
    hari: row.hari,
    jamMulai: row.jam_mulai,
    jamSelesai: row.jam_selesai,
    kuotaMaks: row.kuota_maks,
    durasiMenit: row.durasi_menit,
    aktif: row.aktif,
  };
}

function mapRekamMedis(row) {
  return {
    id: row.id,
    antreanId: row.antrean_id,
    userId: row.user_id,
    namaLengkap: row.nama_lengkap,
    tanggal: toDateStr(row.tanggal),
    poliId: row.poli_id,
    namaPoili: row.nama_poli,
    dokter: row.dokter,
    beratBadan: row.berat_badan !== null ? Number(row.berat_badan) : undefined,
    tinggiBadan: row.tinggi_badan !== null ? Number(row.tinggi_badan) : undefined,
    tekananDarah: row.tekanan_darah || undefined,
    suhu: row.suhu !== null && row.suhu !== undefined ? Number(row.suhu) : undefined,
    nadiPerMenit: row.nadi_per_menit || undefined,
    golonganDarah: row.golongan_darah || undefined,
    keluhanUtama: row.keluhan_utama,
    anamnesis: row.anamnesis || undefined,
    diagnosisKode: row.diagnosis_kode || undefined,
    diagnosisNama: row.diagnosis_nama,
    tindakan: row.tindakan || undefined,
    resep: row.resep || undefined,
    catatan: row.catatan || undefined,
    kontrolKembali: row.kontrol_kembali ? toDateStr(row.kontrol_kembali) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const HARI_MAP = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
function hariFromTanggal(tanggalStr) {
  const [y, m, d] = tanggalStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return HARI_MAP[dt.getDay()];
}

module.exports = { generateId, toDateStr, mapUser, mapPoli, mapAntrean, mapRekamMedis, mapDokter, mapJadwalDokter, hariFromTanggal, computeSlotTimes };