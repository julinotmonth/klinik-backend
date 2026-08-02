-- =============================================
-- KLINIK SEED DATA — Jalankan di pgAdmin
-- Database: railway (Railway PostgreSQL)
-- Password semua akun: password123
-- =============================================

-- Bersihkan data lama
TRUNCATE rekam_medis, antrean, jadwal_dokter, dokter, jam_operasional, klinik_settings, jam_slots, poli, users RESTART IDENTITY CASCADE;

-- USERS
INSERT INTO users (id, nama, email, password_hash, no_hp, nik, role, alamat, created_at) VALUES
('u1',    'Budi Santoso',      'budi@email.com',   '\$2b\$10\$LzKIuz9cPMjvLkZt7X44Zu4yzl7.3QiQWow9Kh3.Zn1RNN3teNbeK', '08123456789', '3578010101850001', 'pasien', 'Jl. Mawar No. 5 Surabaya',          '2024-01-10'),
('admin1','Dr. Siti Rahayu',   'admin@klinik.com', '\$2b\$10\$LzKIuz9cPMjvLkZt7X44Zu4yzl7.3QiQWow9Kh3.Zn1RNN3teNbeK', '08987654321', '3578010101800099', 'admin',  'Jl. Raya Darmo No. 1 Surabaya',     '2023-01-01'),
('u2',    'Sari Dewi',         'sari@email.com',   '\$2b\$10\$LzKIuz9cPMjvLkZt7X44Zu4yzl7.3QiQWow9Kh3.Zn1RNN3teNbeK', '08234567890', '3578015505900002', 'pasien', 'Jl. Melati No. 10 Surabaya',        '2024-01-11'),
('u3',    'Ahmad Rizki',       'ahmad@email.com',  '\$2b\$10\$LzKIuz9cPMjvLkZt7X44Zu4yzl7.3QiQWow9Kh3.Zn1RNN3teNbeK', '08345678901', '3578011203920003', 'pasien', 'Jl. Kenanga No. 3 Sidoarjo',        '2024-01-12'),
('u4',    'Nia Rahmawati',     'nia@email.com',    '\$2b\$10\$LzKIuz9cPMjvLkZt7X44Zu4yzl7.3QiQWow9Kh3.Zn1RNN3teNbeK', '08456789012', '3578012807880004', 'pasien', 'Jl. Dahlia No. 7 Gresik',           '2024-01-13'),
('u5',    'Doni Prasetyo',     'doni@email.com',   '\$2b\$10\$LzKIuz9cPMjvLkZt7X44Zu4yzl7.3QiQWow9Kh3.Zn1RNN3teNbeK', '08567890123', '3578011505950005', 'pasien', 'Jl. Tulip No. 2 Surabaya',          '2024-01-14'),
('u6',    'Fitri Handayani',   'fitri@email.com',  '\$2b\$10\$LzKIuz9cPMjvLkZt7X44Zu4yzl7.3QiQWow9Kh3.Zn1RNN3teNbeK', '08678901234', '3578012209870006', 'pasien', 'Jl. Anggrek No. 15 Surabaya',       '2024-01-15'),
('u7',    'Hasan Abdullah',    'hasan@email.com',  '\$2b\$10\$LzKIuz9cPMjvLkZt7X44Zu4yzl7.3QiQWow9Kh3.Zn1RNN3teNbeK', '08789012345', '3578010101800007', 'pasien', 'Jl. Flamboyan No. 8 Surabaya',      '2024-01-16'),
('u8',    'Maya Sari',         'maya@email.com',   '\$2b\$10\$LzKIuz9cPMjvLkZt7X44Zu4yzl7.3QiQWow9Kh3.Zn1RNN3teNbeK', '08890123456', '3578010303930008', 'pasien', 'Jl. Cempaka No. 1 Surabaya',        '2024-01-17');

-- POLI
INSERT INTO poli (id, nama, singkatan, deskripsi, dokter, icon, urutan) VALUES
('p1', 'Poli Umum', 'U', 'Pemeriksaan umum & keluhan ringan',   'dr. Ahmad Fauzi, Sp.PD',    '🩺', 1),
('p2', 'Poli Anak', 'A', 'Kesehatan bayi dan anak-anak',        'dr. Rina Sari, Sp.A',       '👶', 2),
('p3', 'Poli Gigi', 'G', 'Perawatan dan kesehatan gigi',        'drg. Hendra Putra',         '🦷', 3),
('p4', 'Poli KIA',  'K', 'Kesehatan ibu dan anak',              'dr. Dewi Lestari, Sp.OG',   '🤱', 4),
('p5', 'Poli Mata', 'M', 'Pemeriksaan dan perawatan mata',      'dr. Surya Atmaja, Sp.M',    '👁️', 5);

-- JAM SLOTS
INSERT INTO jam_slots (id, jam, total, urutan) VALUES
('j1', '08:00 - 09:00', 10, 1),
('j2', '09:00 - 10:00', 10, 2),
('j3', '10:00 - 11:00', 10, 3),
('j4', '11:00 - 12:00', 10, 4),
('j5', '13:00 - 14:00', 10, 5),
('j6', '14:00 - 15:00', 10, 6);

-- DOKTER
INSERT INTO dokter (id, nama, poli_id, spesialisasi, aktif, created_at) VALUES
('d1', 'dr. Ahmad Fauzi, Sp.PD',  'p1', 'Dokter Umum / Penyakit Dalam',      true, NOW()),
('d2', 'dr. Rina Sari, Sp.A',     'p2', 'Dokter Spesialis Anak',             true, NOW()),
('d3', 'drg. Hendra Putra',       'p3', 'Dokter Gigi',                        true, NOW()),
('d4', 'dr. Dewi Lestari, Sp.OG', 'p4', 'Dokter Spesialis Kandungan',        true, NOW()),
('d5', 'dr. Surya Atmaja, Sp.M',  'p5', 'Dokter Spesialis Mata',             true, NOW());

-- JADWAL DOKTER
INSERT INTO jadwal_dokter (id, dokter_id, hari, jam_mulai, jam_selesai, kuota_maks, aktif) VALUES
('jd1',  'd1', 'Senin',   '08:00', '12:00', 20, true),
('jd2',  'd1', 'Selasa',  '08:00', '12:00', 20, true),
('jd3',  'd1', 'Rabu',    '08:00', '12:00', 20, true),
('jd4',  'd1', 'Kamis',   '08:00', '12:00', 20, true),
('jd5',  'd1', 'Jumat',   '08:00', '12:00', 20, true),
('jd6',  'd1', 'Senin',   '13:00', '15:00', 15, true),
('jd7',  'd1', 'Selasa',  '13:00', '15:00', 15, true),
('jd8',  'd1', 'Rabu',    '13:00', '15:00', 15, true),
('jd9',  'd1', 'Kamis',   '13:00', '15:00', 15, true),
('jd10', 'd1', 'Jumat',   '13:00', '15:00', 15, true),
('jd11', 'd2', 'Senin',   '08:00', '11:00', 15, true),
('jd12', 'd2', 'Rabu',    '08:00', '11:00', 15, true),
('jd13', 'd2', 'Jumat',   '08:00', '11:00', 15, true),
('jd14', 'd3', 'Selasa',  '09:00', '14:00', 12, true),
('jd15', 'd3', 'Kamis',   '09:00', '14:00', 12, true),
('jd16', 'd4', 'Senin',   '08:00', '12:00', 10, true),
('jd17', 'd4', 'Selasa',  '08:00', '12:00', 10, true),
('jd18', 'd4', 'Rabu',    '08:00', '12:00', 10, true),
('jd19', 'd4', 'Kamis',   '08:00', '12:00', 10, true),
('jd20', 'd4', 'Jumat',   '08:00', '12:00', 10, true),
('jd21', 'd5', 'Selasa',  '08:00', '11:00', 10, true),
('jd22', 'd5', 'Kamis',   '08:00', '11:00', 10, true),
('jd23', 'd5', 'Sabtu',   '08:00', '11:00', 10, true);

-- KLINIK SETTINGS
INSERT INTO klinik_settings (id, nama_klinik, alamat, no_telpon, email, kuota_per_hari) VALUES
(1, 'Klinik Sehat Bersama', 'Jl. Raya Darmo No. 123, Surabaya 60265', '031-5678901', 'info@kliniksehat.co.id', 50);

-- JAM OPERASIONAL
INSERT INTO jam_operasional (hari, buka, tutup, aktif, urutan) VALUES
('Senin',   '08:00', '17:00', true,  0),
('Selasa',  '08:00', '17:00', true,  1),
('Rabu',    '08:00', '17:00', true,  2),
('Kamis',   '08:00', '17:00', true,  3),
('Jumat',   '08:00', '15:00', true,  4),
('Sabtu',   '08:00', '13:00', true,  5),
('Minggu',  '08:00', '12:00', false, 6);

-- Verifikasi
SELECT email, role FROM users ORDER BY role;
SQLEOF
echo "✅ SQL seed file created"