-- ============================================================
-- Skema database Klinik App (PostgreSQL)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  nama           TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL,
  no_hp          TEXT NOT NULL,
  nik            TEXT NOT NULL UNIQUE,
  role           TEXT NOT NULL CHECK (role IN ('pasien', 'admin')) DEFAULT 'pasien',
  alamat         TEXT DEFAULT '',
  avatar         TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS poli (
  id         TEXT PRIMARY KEY,
  nama       TEXT NOT NULL,
  singkatan  TEXT NOT NULL,
  deskripsi  TEXT NOT NULL DEFAULT '',
  dokter     TEXT NOT NULL DEFAULT '',
  icon       TEXT NOT NULL DEFAULT '',
  urutan     INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS jam_slots (
  id     TEXT PRIMARY KEY,
  jam    TEXT NOT NULL,
  total  INT NOT NULL DEFAULT 10,
  urutan INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS dokter (
  id             TEXT PRIMARY KEY,
  nama           TEXT NOT NULL,
  poli_id        TEXT REFERENCES poli(id) ON DELETE CASCADE,
  spesialisasi   TEXT NOT NULL DEFAULT '',
  aktif          BOOLEAN NOT NULL DEFAULT true,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dokter_poli ON dokter(poli_id);

CREATE TABLE IF NOT EXISTS jadwal_dokter (
  id             TEXT PRIMARY KEY,
  dokter_id      TEXT REFERENCES dokter(id) ON DELETE CASCADE,
  hari           TEXT NOT NULL CHECK (hari IN ('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu')),
  jam_mulai      TEXT NOT NULL,
  jam_selesai    TEXT NOT NULL,
  kuota_maks     INT NOT NULL DEFAULT 20,
  aktif          BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_jadwal_dokter_dokter ON jadwal_dokter(dokter_id);

CREATE TABLE IF NOT EXISTS antrean (
  id             TEXT PRIMARY KEY,
  nomor_antrean  TEXT NOT NULL,
  user_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
  nama_lengkap   TEXT NOT NULL,
  nik            TEXT NOT NULL,
  no_hp          TEXT NOT NULL,
  jenis_kelamin  TEXT NOT NULL CHECK (jenis_kelamin IN ('L', 'P')),
  tanggal_lahir  DATE NOT NULL,
  alamat         TEXT NOT NULL DEFAULT '',
  poli_id        TEXT REFERENCES poli(id),
  nama_poli      TEXT NOT NULL,
  dokter_id      TEXT REFERENCES dokter(id),
  nama_dokter    TEXT NOT NULL DEFAULT '',
  jadwal_dokter_id TEXT REFERENCES jadwal_dokter(id),
  tanggal        DATE NOT NULL,
  jam_slot       TEXT NOT NULL,
  status         TEXT NOT NULL CHECK (status IN ('menunggu','dipanggil','selesai','dibatalkan','dilewati')) DEFAULT 'menunggu',
  posisi         INT NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_antrean_tanggal_poli ON antrean(tanggal, poli_id);
CREATE INDEX IF NOT EXISTS idx_antrean_user ON antrean(user_id);

CREATE TABLE IF NOT EXISTS rekam_medis (
  id               TEXT PRIMARY KEY,
  antrean_id       TEXT REFERENCES antrean(id) ON DELETE SET NULL,
  user_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
  nama_lengkap     TEXT NOT NULL,
  tanggal          DATE NOT NULL,
  poli_id          TEXT REFERENCES poli(id),
  nama_poli        TEXT NOT NULL,
  dokter           TEXT NOT NULL DEFAULT '',
  berat_badan      NUMERIC(5,2),
  tinggi_badan     NUMERIC(5,2),
  tekanan_darah    TEXT,
  suhu             NUMERIC(4,1),
  nadi_per_menit   INT,
  golongan_darah   TEXT,
  keluhan_utama    TEXT NOT NULL,
  anamnesis        TEXT,
  diagnosis_kode   TEXT,
  diagnosis_nama   TEXT NOT NULL,
  tindakan         TEXT,
  resep            TEXT,
  catatan          TEXT,
  kontrol_kembali  DATE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rm_user ON rekam_medis(user_id);
CREATE INDEX IF NOT EXISTS idx_rm_antrean ON rekam_medis(antrean_id);

CREATE TABLE IF NOT EXISTS klinik_settings (
  id             INT PRIMARY KEY DEFAULT 1,
  nama_klinik    TEXT NOT NULL,
  alamat         TEXT NOT NULL,
  no_telpon      TEXT NOT NULL,
  email          TEXT NOT NULL,
  kuota_per_hari INT NOT NULL DEFAULT 50,
  CONSTRAINT single_row CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS jam_operasional (
  id     SERIAL PRIMARY KEY,
  hari   TEXT NOT NULL,
  buka   TEXT NOT NULL,
  tutup  TEXT NOT NULL,
  aktif  BOOLEAN NOT NULL DEFAULT true,
  urutan INT NOT NULL DEFAULT 0
);

-- ============================================================
-- Migrasi tambahan (idempotent) untuk database yang sudah ada
-- sebelum fitur "Dokter & Jadwal Praktik" ditambahkan.
-- ============================================================
ALTER TABLE antrean ADD COLUMN IF NOT EXISTS dokter_id TEXT REFERENCES dokter(id);
ALTER TABLE antrean ADD COLUMN IF NOT EXISTS nama_dokter TEXT NOT NULL DEFAULT '';
ALTER TABLE antrean ADD COLUMN IF NOT EXISTS jadwal_dokter_id TEXT REFERENCES jadwal_dokter(id);