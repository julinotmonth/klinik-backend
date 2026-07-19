require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const poliRoutes = require('./routes/poli');
const jadwalRoutes = require('./routes/jadwal');
const antreanRoutes = require('./routes/antrean');
const rekamMedisRoutes = require('./routes/rekamMedis');
const settingsRoutes = require('./routes/settings');
const dokterRoutes = require('./routes/Dokter');
const jadwalDokterRoutes = require('./routes/Jadwaldokter')

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',') 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'klinik-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/poli', poliRoutes);
app.use('/api/jadwal', jadwalRoutes);
app.use('/api/antrean', antreanRoutes);
app.use('/api/rekam-medis', rekamMedisRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dokter', dokterRoutes);
app.use('/api/jadwal-dokter', jadwalDokterRoutes);

app.use((req, res) => res.status(404).json({ message: 'Endpoint tidak ditemukan.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Klinik backend berjalan di http://localhost:${PORT}`);
});