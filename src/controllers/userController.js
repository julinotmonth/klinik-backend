const pool = require('../db/pool');
const { mapUser } = require('../utils/helpers');

async function listUsers(req, res) {
  try {
    const { role } = req.query;
    const params = [];
    let sql = 'SELECT * FROM users';
    if (role) {
      params.push(role);
      sql += ' WHERE role = $1';
    }
    sql += ' ORDER BY created_at ASC';
    const result = await pool.query(sql, params);
    res.json({ users: result.rows.map(mapUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Gagal memuat data pengguna.' });
  }
}

module.exports = { listUsers };
