const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { generateId, mapUser } = require('../utils/helpers');

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function register(req, res) {
  try {
    const { nama, email, noHp, nik, password } = req.body;
    if (!nama || !email || !noHp || !nik || !password) {
      return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }
    if (String(nik).length !== 16) {
      return res.status(400).json({ message: 'NIK harus 16 digit.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password minimal 8 karakter.' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1) OR nik = $2', [email, nik]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email atau NIK sudah terdaftar.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = generateId('u');
    const result = await pool.query(
      `INSERT INTO users (id, nama, email, password_hash, no_hp, nik, role, alamat, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,'pasien','', now()) RETURNING *`,
      [id, nama, email, passwordHash, noHp, nik]
    );
    const user = mapUser(result.rows[0]);
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal membuat akun. Coba lagi nanti.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi.' });

    const result = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
    const row = result.rows[0];
    if (!row) return res.status(401).json({ message: 'Email tidak terdaftar' });

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) return res.status(401).json({ message: 'Password salah' });

    const user = mapUser(row);
    const token = signToken(user);
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal login. Coba lagi nanti.' });
  }
}

async function me(req, res) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json({ user: mapUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat data pengguna.' });
  }
}

async function updateProfile(req, res) {
  try {
    const { nama, noHp, alamat, avatar, email } = req.body;

    if (email) {
      const clash = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1) AND id != $2', [email, req.user.id]);
      if (clash.rows.length > 0) return res.status(409).json({ message: 'Email sudah digunakan akun lain.' });
    }

    const result = await pool.query(
      `UPDATE users SET
        nama = COALESCE($1, nama),
        no_hp = COALESCE($2, no_hp),
        alamat = COALESCE($3, alamat),
        avatar = COALESCE($4, avatar),
        email = COALESCE($5, email)
       WHERE id = $6 RETURNING *`,
      [nama, noHp, alamat, avatar, email, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ message: 'User tidak ditemukan' });
    res.json({ user: mapUser(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memperbarui profil.' });
  }
}

async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Password lama dan baru wajib diisi.' });
    if (String(newPassword).length < 8) return res.status(400).json({ message: 'Password baru minimal 8 karakter.' });

    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const row = result.rows[0];
    if (!row) return res.status(404).json({ message: 'User tidak ditemukan.' });

    const valid = await bcrypt.compare(oldPassword, row.password_hash);
    if (!valid) return res.status(401).json({ message: 'Password lama salah' });

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);
    res.json({ message: 'Password berhasil diubah.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal mengubah password.' });
  }
}

module.exports = { register, login, me, updateProfile, changePassword };
