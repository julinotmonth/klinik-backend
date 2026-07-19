const bcrypt = require('bcryptjs');
const pool = require('./pool');

const today = new Date().toISOString().split('T')[0];
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().split('T')[0];

const POLI = [
  { id: 'p1', nama: 'Poli Umum', singkatan: 'U', deskripsi: 'Pemeriksaan umum & keluhan ringan', dokter: 'dr. Ahmad Fauzi, Sp.PD', icon: '🩺', urutan: 1 },
  { id: 'p2', nama: 'Poli Anak', singkatan: 'A', deskripsi: 'Kesehatan bayi dan anak-anak', dokter: 'dr. Rina Sari, Sp.A', icon: '👶', urutan: 2 },
  { id: 'p3', nama: 'Poli Gigi', singkatan: 'G', deskripsi: 'Perawatan dan kesehatan gigi', dokter: 'drg. Hendra Putra', icon: '🦷', urutan: 3 },
  { id: 'p4', nama: 'Poli KIA', singkatan: 'K', deskripsi: 'Kesehatan ibu dan anak', dokter: 'dr. Dewi Lestari, Sp.OG', icon: '🤱', urutan: 4 },
  { id: 'p5', nama: 'Poli Mata', singkatan: 'M', deskripsi: 'Pemeriksaan dan perawatan mata', dokter: 'dr. Surya Atmaja, Sp.M', icon: '👁️', urutan: 5 },
];

const JAM_SLOTS = [
  { id: 'j1', jam: '08:00 - 09:00', total: 10, urutan: 1 },
  { id: 'j2', jam: '09:00 - 10:00', total: 10, urutan: 2 },
  { id: 'j3', jam: '10:00 - 11:00', total: 10, urutan: 3 },
  { id: 'j4', jam: '11:00 - 12:00', total: 10, urutan: 4 },
  { id: 'j5', jam: '13:00 - 14:00', total: 10, urutan: 5 },
  { id: 'j6', jam: '14:00 - 15:00', total: 10, urutan: 6 },
];

const USERS = [
  { id: 'u1', nama: 'Budi Santoso', email: 'budi@email.com', noHp: '08123456789', nik: '3578010101850001', role: 'pasien', alamat: 'Jl. Mawar No. 5 Surabaya', createdAt: '2024-01-10' },
  { id: 'admin1', nama: 'Dr. Siti Rahayu', email: 'admin@klinik.com', noHp: '08987654321', nik: '3578010101800099', role: 'admin', alamat: 'Jl. Raya Darmo No. 1 Surabaya', createdAt: '2023-01-01' },
  { id: 'u2', nama: 'Sari Dewi', email: 'sari@email.com', noHp: '08234567890', nik: '3578015505900002', role: 'pasien', alamat: 'Jl. Melati No. 10 Surabaya', createdAt: '2024-01-11' },
  { id: 'u3', nama: 'Ahmad Rizki', email: 'ahmad@email.com', noHp: '08345678901', nik: '3578011203920003', role: 'pasien', alamat: 'Jl. Kenanga No. 3 Sidoarjo', createdAt: '2024-01-12' },
  { id: 'u4', nama: 'Nia Rahmawati', email: 'nia@email.com', noHp: '08456789012', nik: '3578012807880004', role: 'pasien', alamat: 'Jl. Dahlia No. 7 Gresik', createdAt: '2024-01-13' },
  { id: 'u5', nama: 'Doni Prasetyo', email: 'doni@email.com', noHp: '08567890123', nik: '3578011505950005', role: 'pasien', alamat: 'Jl. Tulip No. 2 Surabaya', createdAt: '2024-01-14' },
  { id: 'u6', nama: 'Fitri Handayani', email: 'fitri@email.com', noHp: '08678901234', nik: '3578012209870006', role: 'pasien', alamat: 'Jl. Anggrek No. 15 Surabaya', createdAt: '2024-01-15' },
  { id: 'u7', nama: 'Hasan Abdullah', email: 'hasan@email.com', noHp: '08789012345', nik: '3578010101800007', role: 'pasien', alamat: 'Jl. Flamboyan No. 8 Surabaya', createdAt: '2024-01-16' },
  { id: 'u8', nama: 'Maya Sari', email: 'maya@email.com', noHp: '08890123456', nik: '3578010303930008', role: 'pasien', alamat: 'Jl. Cempaka No. 1 Surabaya', createdAt: '2024-01-17' },
];

const ANTREAN = [
  { id: 'aq1', nomorAntrean: 'U-001', userId: 'u2', namaLengkap: 'Sari Dewi', nik: '3578015505900002', noHp: '08234567890', jenisKelamin: 'P', tanggalLahir: '1990-05-15', alamat: 'Jl. Melati No. 10 Surabaya', poliId: 'p1', namaPoili: 'Poli Umum', tanggal: today, jamSlot: '08:00 - 09:00', status: 'selesai', posisi: 1, createdAt: today + 'T07:45:00', updatedAt: today + 'T08:30:00' },
  { id: 'aq2', nomorAntrean: 'U-002', userId: 'u3', namaLengkap: 'Ahmad Rizki', nik: '3578011203920003', noHp: '08345678901', jenisKelamin: 'L', tanggalLahir: '1992-03-12', alamat: 'Jl. Kenanga No. 3 Sidoarjo', poliId: 'p1', namaPoili: 'Poli Umum', tanggal: today, jamSlot: '08:00 - 09:00', status: 'selesai', posisi: 2, createdAt: today + 'T07:50:00', updatedAt: today + 'T08:50:00' },
  { id: 'aq3', nomorAntrean: 'U-003', userId: 'u4', namaLengkap: 'Nia Rahmawati', nik: '3578012807880004', noHp: '08456789012', jenisKelamin: 'P', tanggalLahir: '1988-07-28', alamat: 'Jl. Dahlia No. 7 Gresik', poliId: 'p1', namaPoili: 'Poli Umum', tanggal: today, jamSlot: '09:00 - 10:00', status: 'dipanggil', posisi: 3, createdAt: today + 'T08:15:00', updatedAt: today + 'T09:05:00' },
  { id: 'aq4', nomorAntrean: 'U-004', userId: 'u1', namaLengkap: 'Budi Santoso', nik: '3578010101850001', noHp: '08123456789', jenisKelamin: 'L', tanggalLahir: '1985-01-01', alamat: 'Jl. Mawar No. 5 Surabaya', poliId: 'p1', namaPoili: 'Poli Umum', tanggal: today, jamSlot: '09:00 - 10:00', status: 'menunggu', posisi: 4, createdAt: today + 'T08:30:00', updatedAt: today + 'T08:30:00' },
  { id: 'aq5', nomorAntrean: 'U-005', userId: 'u5', namaLengkap: 'Doni Prasetyo', nik: '3578011505950005', noHp: '08567890123', jenisKelamin: 'L', tanggalLahir: '1995-05-15', alamat: 'Jl. Tulip No. 2 Surabaya', poliId: 'p1', namaPoili: 'Poli Umum', tanggal: today, jamSlot: '10:00 - 11:00', status: 'menunggu', posisi: 5, createdAt: today + 'T09:00:00', updatedAt: today + 'T09:00:00' },
  { id: 'aq6', nomorAntrean: 'A-001', userId: 'u6', namaLengkap: 'Fitri Handayani', nik: '3578012209870006', noHp: '08678901234', jenisKelamin: 'P', tanggalLahir: '1987-09-22', alamat: 'Jl. Anggrek No. 15 Surabaya', poliId: 'p2', namaPoili: 'Poli Anak', tanggal: today, jamSlot: '08:00 - 09:00', status: 'dipanggil', posisi: 1, createdAt: today + 'T07:55:00', updatedAt: today + 'T08:10:00' },
  { id: 'aq7', nomorAntrean: 'A-002', userId: 'u7', namaLengkap: 'Hasan Abdullah', nik: '3578010101800007', noHp: '08789012345', jenisKelamin: 'L', tanggalLahir: '1980-01-01', alamat: 'Jl. Flamboyan No. 8 Surabaya', poliId: 'p2', namaPoili: 'Poli Anak', tanggal: today, jamSlot: '09:00 - 10:00', status: 'menunggu', posisi: 2, createdAt: today + 'T08:20:00', updatedAt: today + 'T08:20:00' },
  { id: 'aq8', nomorAntrean: 'G-001', userId: 'u8', namaLengkap: 'Maya Sari', nik: '3578010303930008', noHp: '08890123456', jenisKelamin: 'P', tanggalLahir: '1993-03-03', alamat: 'Jl. Cempaka No. 1 Surabaya', poliId: 'p3', namaPoili: 'Poli Gigi', tanggal: today, jamSlot: '08:00 - 09:00', status: 'menunggu', posisi: 1, createdAt: today + 'T08:05:00', updatedAt: today + 'T08:05:00' },
];

const REKAM_MEDIS = [
  { id: 'rm1', antreanId: 'aq1', userId: 'u2', namaLengkap: 'Sari Dewi', tanggal: today, poliId: 'p1', namaPoili: 'Poli Umum', dokter: 'dr. Ahmad Fauzi, Sp.PD',
    beratBadan: 55, tinggiBadan: 160, tekananDarah: '110/70', suhu: 36.8, nadiPerMenit: 80, golonganDarah: 'A+',
    keluhanUtama: 'Demam dan batuk sejak 3 hari yang lalu',
    anamnesis: 'Pasien datang dengan keluhan demam tidak tinggi disertai batuk kering. Tidak ada sesak napas.',
    diagnosisKode: 'J06.9', diagnosisNama: 'Infeksi Saluran Napas Atas Akut',
    tindakan: 'Pemeriksaan fisik, pengukuran vital sign',
    resep: 'Paracetamol 500mg 3x1, CTM 4mg 3x1, Ambroxol 30mg 3x1',
    catatan: 'Istirahat cukup, minum air putih yang banyak',
    kontrolKembali: inDays(7),
    createdAt: today + 'T08:30:00', updatedAt: today + 'T08:30:00' },
  { id: 'rm2', antreanId: 'aq2', userId: 'u3', namaLengkap: 'Ahmad Rizki', tanggal: today, poliId: 'p1', namaPoili: 'Poli Umum', dokter: 'dr. Ahmad Fauzi, Sp.PD',
    beratBadan: 72, tinggiBadan: 175, tekananDarah: '130/85', suhu: 37.0, nadiPerMenit: 88, golonganDarah: 'B+',
    keluhanUtama: 'Sakit kepala dan pusing berulang',
    anamnesis: 'Pasien mengeluh sakit kepala sejak seminggu terakhir, terutama di bagian belakang. Riwayat hipertensi disangkal.',
    diagnosisKode: 'R51', diagnosisNama: 'Nyeri Kepala (Headache)',
    tindakan: 'Pemeriksaan tekanan darah serial, pemeriksaan neurologis dasar',
    resep: 'Ibuprofen 400mg 3x1 (prn), Vitamin B complex 1x1',
    catatan: 'Kurangi stres, tidur teratur. Kontrol jika keluhan berlanjut.',
    kontrolKembali: null,
    createdAt: today + 'T08:50:00', updatedAt: today + 'T08:50:00' },
];

const KLINIK_SETTINGS = {
  namaKlinik: 'Klinik Sehat Bersama',
  alamat: 'Jl. Raya Darmo No. 123, Surabaya 60265',
  noTelpon: '031-5678901',
  email: 'info@kliniksehat.co.id',
  kuotaPerHari: 50,
};

const JAM_OPERASIONAL = [
  { hari: 'Senin', buka: '08:00', tutup: '17:00', aktif: true },
  { hari: 'Selasa', buka: '08:00', tutup: '17:00', aktif: true },
  { hari: 'Rabu', buka: '08:00', tutup: '17:00', aktif: true },
  { hari: 'Kamis', buka: '08:00', tutup: '17:00', aktif: true },
  { hari: 'Jumat', buka: '08:00', tutup: '15:00', aktif: true },
  { hari: 'Sabtu', buka: '08:00', tutup: '13:00', aktif: true },
  { hari: 'Minggu', buka: '08:00', tutup: '12:00', aktif: false },
];

const DOKTER = [
  { id: 'd1', nama: 'dr. Ahmad Fauzi, Sp.PD', poliId: 'p1', spesialisasi: 'Dokter Umum / Penyakit Dalam' },
  { id: 'd2', nama: 'dr. Rina Sari, Sp.A',    poliId: 'p2', spesialisasi: 'Dokter Spesialis Anak' },
  { id: 'd3', nama: 'drg. Hendra Putra',      poliId: 'p3', spesialisasi: 'Dokter Gigi' },
  { id: 'd4', nama: 'dr. Dewi Lestari, Sp.OG',poliId: 'p4', spesialisasi: 'Dokter Spesialis Kandungan' },
  { id: 'd5', nama: 'dr. Surya Atmaja, Sp.M', poliId: 'p5', spesialisasi: 'Dokter Spesialis Mata' },
];

const HARI_KERJA = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

const JADWAL_DOKTER = [
  // dr. Ahmad Fauzi (Poli Umum) — praktek pagi & sore, Senin-Jumat
  ...HARI_KERJA.map(hari => ({ dokterId: 'd1', hari, jamMulai: '08:00', jamSelesai: '12:00', kuotaMaks: 20 })),
  ...HARI_KERJA.map(hari => ({ dokterId: 'd1', hari, jamMulai: '13:00', jamSelesai: '15:00', kuotaMaks: 15 })),
  // dr. Rina Sari (Poli Anak) — Senin, Rabu, Jumat pagi
  { dokterId: 'd2', hari: 'Senin', jamMulai: '08:00', jamSelesai: '11:00', kuotaMaks: 15 },
  { dokterId: 'd2', hari: 'Rabu',  jamMulai: '08:00', jamSelesai: '11:00', kuotaMaks: 15 },
  { dokterId: 'd2', hari: 'Jumat', jamMulai: '08:00', jamSelesai: '11:00', kuotaMaks: 15 },
  // drg. Hendra Putra (Poli Gigi) — Selasa & Kamis
  { dokterId: 'd3', hari: 'Selasa', jamMulai: '09:00', jamSelesai: '14:00', kuotaMaks: 12 },
  { dokterId: 'd3', hari: 'Kamis',  jamMulai: '09:00', jamSelesai: '14:00', kuotaMaks: 12 },
  // dr. Dewi Lestari (Poli KIA) — Senin-Jumat pagi
  ...HARI_KERJA.map(hari => ({ dokterId: 'd4', hari, jamMulai: '08:00', jamSelesai: '12:00', kuotaMaks: 10 })),
  // dr. Surya Atmaja (Poli Mata) — Selasa, Kamis, Sabtu
  { dokterId: 'd5', hari: 'Selasa', jamMulai: '08:00', jamSelesai: '11:00', kuotaMaks: 10 },
  { dokterId: 'd5', hari: 'Kamis',  jamMulai: '08:00', jamSelesai: '11:00', kuotaMaks: 10 },
  { dokterId: 'd5', hari: 'Sabtu',  jamMulai: '08:00', jamSelesai: '11:00', kuotaMaks: 10 },
];

const DEFAULT_PASSWORD = 'password123';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('Menghapus data lama...');
    await client.query('TRUNCATE rekam_medis, antrean, jadwal_dokter, dokter, jam_operasional, klinik_settings, jam_slots, poli, users RESTART IDENTITY CASCADE');

    console.log('Seeding users...');
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    for (const u of USERS) {
      await client.query(
        `INSERT INTO users (id, nama, email, password_hash, no_hp, nik, role, alamat, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [u.id, u.nama, u.email, passwordHash, u.noHp, u.nik, u.role, u.alamat, u.createdAt]
      );
    }

    console.log('Seeding poli...');
    for (const p of POLI) {
      await client.query(
        `INSERT INTO poli (id, nama, singkatan, deskripsi, dokter, icon, urutan) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [p.id, p.nama, p.singkatan, p.deskripsi, p.dokter, p.icon, p.urutan]
      );
    }

    console.log('Seeding jam slots...');
    for (const j of JAM_SLOTS) {
      await client.query(
        `INSERT INTO jam_slots (id, jam, total, urutan) VALUES ($1,$2,$3,$4)`,
        [j.id, j.jam, j.total, j.urutan]
      );
    }

    console.log('Seeding dokter...');
    for (const d of DOKTER) {
      await client.query(
        `INSERT INTO dokter (id, nama, poli_id, spesialisasi, aktif, created_at) VALUES ($1,$2,$3,$4,true, now())`,
        [d.id, d.nama, d.poliId, d.spesialisasi]
      );
    }

    console.log('Seeding jadwal dokter...');
    for (let i = 0; i < JADWAL_DOKTER.length; i++) {
      const j = JADWAL_DOKTER[i];
      await client.query(
        `INSERT INTO jadwal_dokter (id, dokter_id, hari, jam_mulai, jam_selesai, kuota_maks, aktif) VALUES ($1,$2,$3,$4,$5,$6,true)`,
        [`jd${i + 1}`, j.dokterId, j.hari, j.jamMulai, j.jamSelesai, j.kuotaMaks]
      );
    }

    console.log('Seeding antrean...');
    for (const a of ANTREAN) {
      await client.query(
        `INSERT INTO antrean (id, nomor_antrean, user_id, nama_lengkap, nik, no_hp, jenis_kelamin, tanggal_lahir, alamat, poli_id, nama_poli, tanggal, jam_slot, status, posisi, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [a.id, a.nomorAntrean, a.userId, a.namaLengkap, a.nik, a.noHp, a.jenisKelamin, a.tanggalLahir, a.alamat, a.poliId, a.namaPoili, a.tanggal, a.jamSlot, a.status, a.posisi, a.createdAt, a.updatedAt]
      );
    }

    console.log('Seeding rekam medis...');
    for (const r of REKAM_MEDIS) {
      await client.query(
        `INSERT INTO rekam_medis (id, antrean_id, user_id, nama_lengkap, tanggal, poli_id, nama_poli, dokter, berat_badan, tinggi_badan, tekanan_darah, suhu, nadi_per_menit, golongan_darah, keluhan_utama, anamnesis, diagnosis_kode, diagnosis_nama, tindakan, resep, catatan, kontrol_kembali, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
        [r.id, r.antreanId, r.userId, r.namaLengkap, r.tanggal, r.poliId, r.namaPoili, r.dokter, r.beratBadan, r.tinggiBadan, r.tekananDarah, r.suhu, r.nadiPerMenit, r.golonganDarah, r.keluhanUtama, r.anamnesis, r.diagnosisKode, r.diagnosisNama, r.tindakan, r.resep, r.catatan, r.kontrolKembali, r.createdAt, r.updatedAt]
      );
    }

    console.log('Seeding pengaturan klinik...');
    await client.query(
      `INSERT INTO klinik_settings (id, nama_klinik, alamat, no_telpon, email, kuota_per_hari) VALUES (1,$1,$2,$3,$4,$5)`,
      [KLINIK_SETTINGS.namaKlinik, KLINIK_SETTINGS.alamat, KLINIK_SETTINGS.noTelpon, KLINIK_SETTINGS.email, KLINIK_SETTINGS.kuotaPerHari]
    );

    console.log('Seeding jam operasional...');
    for (let i = 0; i < JAM_OPERASIONAL.length; i++) {
      const j = JAM_OPERASIONAL[i];
      await client.query(
        `INSERT INTO jam_operasional (hari, buka, tutup, aktif, urutan) VALUES ($1,$2,$3,$4,$5)`,
        [j.hari, j.buka, j.tutup, j.aktif, i]
      );
    }

    await client.query('COMMIT');
    console.log('\nSeed selesai! Semua akun demo menggunakan password: ' + DEFAULT_PASSWORD);
    console.log('Contoh: admin@klinik.com / budi@email.com');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seeding gagal:', err);
  process.exit(1);
});