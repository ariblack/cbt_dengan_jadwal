// server.js - CBT Lengkap dengan Semua Fitur Asli + Fitur Baru (OPTIMIZED)
const express = require('express');
const multer = require('multer');
const mammoth = require('mammoth');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const http = require('http');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

const adapter = new FileSync('db.json');
const db = low(adapter);

// Inisialisasi database dengan default termasuk fitur baru
try {
    db.defaults({
        adminAuth: { password: '', isSet: false },
        siswa: [],
        bankSoal: [],
        ujian: {
            aktifPaket: [],
            durasi: 60,
            tampilkanNilai: true,
            maxPelanggaran: 3,
            pesanPelanggaran: 'Anda terdeteksi berpindah tab atau aplikasi. Ujian Anda dihentikan. Serahkan perangkat Anda kepada pengawas ujian.',
            deteksiPelanggaran: true,
            alarmType: 'beep',
            alarmDurasi: 3000,
            acakSoal: false,
            durasiPerPaket: false
        },
        pengaturan: {
            namaSekolah: "SMP MUHAMMADIYAH 14",
            namaAplikasi: "CBT Online",
            ukuranSekolah: 18,
            ukuranAplikasi: 13,
            tema: "green",
            temaLogin: "green",
            layoutLogin: "modern"
        }
    }).write();
} catch (e) {
    console.error('DB init error:', e);
    // PENTING: Jangan timpa db.json jika sudah ada data - cukup buat backup dan lanjutkan
    // Menimpa db.json akan menghapus semua data siswa!
    try {
        const existing = JSON.parse(fs.readFileSync('db.json', 'utf-8'));
        // Jika db.json bisa dibaca tapi ada field baru yang missing, merge dengan default
        if (!existing.ujian) existing.ujian = {};
        if (!existing.ujian.aktifPaket) existing.ujian.aktifPaket = [];
        if (!existing.ujian.hasOwnProperty('acakSoal')) existing.ujian.acakSoal = false;
        if (!existing.ujian.hasOwnProperty('durasiPerPaket')) existing.ujian.durasiPerPaket = false;
        if (!existing.ujian.hasOwnProperty('alarmType')) existing.ujian.alarmType = 'beep';
        if (!existing.ujian.hasOwnProperty('alarmDurasi')) existing.ujian.alarmDurasi = 3000;
        if (!existing.ujian.hasOwnProperty('deteksiPelanggaran')) existing.ujian.deteksiPelanggaran = true;
        if (!existing.ujian.hasOwnProperty('maxPelanggaran')) existing.ujian.maxPelanggaran = 3;
        if (!existing.ujian.hasOwnProperty('pesanPelanggaran')) existing.ujian.pesanPelanggaran = 'Anda terdeteksi berpindah tab atau aplikasi. Ujian Anda dihentikan.';
        fs.writeFileSync('db.json', JSON.stringify(existing, null, 2));
        console.log('DB init: berhasil merge field baru ke db.json yang ada');
    } catch (e2) {
        // Hanya buat file baru jika db.json memang tidak ada sama sekali
        console.error('DB init: db.json tidak ditemukan atau corrupt, membuat baru:', e2.message);
        fs.writeFileSync('db.json', JSON.stringify({
            adminAuth: { password: '', isSet: false },
            siswa: [], bankSoal: [],
            ujian: {
                aktifPaket: [], durasi: 60, tampilkanNilai: true,
                maxPelanggaran: 3,
                pesanPelanggaran: 'Anda terdeteksi berpindah tab atau aplikasi. Ujian Anda dihentikan.',
                deteksiPelanggaran: true,
                alarmType: 'beep',
                alarmDurasi: 3000,
                acakSoal: false,
                durasiPerPaket: false
            },
            pengaturan: { namaSekolah: "SMP MUHAMMADIYAH 14", namaAplikasi: "CBT Online", ukuranSekolah: 18, ukuranAplikasi: 13, tema: "green", temaLogin: "green", layoutLogin: "modern" }
        }, null, 2));
    }
}

const app = express();
const upload = multer({ dest: 'uploads/', limits: { fileSize: 20 * 1024 * 1024 } });
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.static('public'));

// ─── AUTH ADMIN ──────────────────────────────────────────────────────────────
function hashPassword(pw) {
    return crypto.createHash('sha256').update(pw + 'cbt_salt_2026').digest('hex');
}

let activeAdminToken = null;

function requireAdminAuth(req, res, next) {
    const token = req.cookies && req.cookies.admin_token;
    if (token && token === activeAdminToken) return next();
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.redirect('/admin-login.html');
    }
    res.status(401).json({ success: false, message: 'Unauthorized', redirect: '/admin-login.html' });
}
// ─────────────────────────────────────────────────────────────────────────────

const imagesDir = path.join(__dirname, 'public', 'images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.get('/admin-login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));
app.get('/admin', requireAdminAuth, (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/ujian', (req, res) => res.sendFile(path.join(__dirname, 'public', 'ujian.html')));

// ─── ENDPOINT AUTH ADMIN ──────────────────────────────────────────────────────
app.post('/login-admin', (req, res) => {
    const { password } = req.body;
    const stored = db.get('adminAuth.password').value();

    // First time setup
    if (!stored || stored === '') {
        if (!password || password.length < 6) {
            return res.json({ success: false, message: 'Password minimal 6 karakter' });
        }
        db.set('adminAuth.password', hashPassword(password)).set('adminAuth.isSet', true).write();
        const token = crypto.randomBytes(32).toString('hex');
        activeAdminToken = token;
        res.cookie('admin_token', token, { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 });
        return res.json({ success: true, message: 'Password admin berhasil diset' });
    }

    // Login biasa
    if (hashPassword(password) !== stored) {
        return res.json({ success: false, message: 'Password salah' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    activeAdminToken = token;
    res.cookie('admin_token', token, { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 });
    res.json({ success: true });
});

app.post('/logout-admin', (req, res) => {
    activeAdminToken = null;
    res.clearCookie('admin_token');
    res.json({ success: true });
});

app.get('/check-admin-auth', (req, res) => {
    const token = req.cookies && req.cookies.admin_token;
    res.json({ authenticated: !!(token && token === activeAdminToken) });
});

app.get('/admin-auth-status', (req, res) => {
    const isSet = db.get('adminAuth.isSet').value();
    res.json({ isSet: !!isSet });
});
// ─────────────────────────────────────────────────────────────────────────────

// Cache sederhana dengan improvement
let cache = { siswa: null, bank: null, ujian: null, pengaturan: null, time: 0 };
const CACHE_TTL = 1000;
function flushCache() { cache.time = 0; cache.siswa = cache.bank = cache.ujian = cache.pengaturan = null; }
function gc(key) {
    if (Date.now() - cache.time > CACHE_TTL) {
        cache.siswa = cache.bank = cache.ujian = cache.pengaturan = null;
    }
    return cache[key];
}
function sc(key, val) { cache.time = Date.now(); cache[key] = val; }

function hitungNA(siswa, ujian) {
    const pg = Number(siswa.nilaiOtomatis) || 0;
    const esai = Number(siswa.nilaiEsai) || 0;
    const cfg = (ujian.aktifPaket || []).find(p => p.paketId == siswa.paketId && p.kelas === siswa.kelas);
    const bPG = cfg ? Number(cfg.bobotPG || 60) : 60;
    const bEsai = cfg ? Number(cfg.bobotEsai || 40) : 40;
    return (pg * bPG / 100) + (esai * bEsai / 100);
}

function normalizeKunci(raw) {
    if (!raw) return '';
    let cleaned = raw.toString().replace(/^KUNCI\s*[:\s]+/i, '').trim();
    var upper = cleaned.toUpperCase().replace(/\s+/g, '');
    if (upper === 'ESAI' || upper === 'ESAY') return 'ESAI';
    cleaned = cleaned.replace(/\s*,\s*/g, ',');
    cleaned = cleaned.replace(/[^A-E0-9,\-]/g, '');
    return cleaned.toUpperCase();
}

// GET endpoints
app.get('/get-ujian', (req, res) => {
    let d = gc('ujian'); if (!d) { d = db.get('ujian').value(); sc('ujian', d); }
    res.json(d);
});
app.get('/get-siswa', requireAdminAuth, (req, res) => {
    let d = gc('siswa'); if (!d) { d = db.get('siswa').value(); sc('siswa', d); }
    res.json(d);
});
app.get('/get-bank-soal', requireAdminAuth, (req, res) => {
    let d = gc('bank'); if (!d) { d = db.get('bankSoal').value(); sc('bank', d); }
    res.json(d);
});
app.get('/get-pengaturan', (req, res) => {
    let d = gc('pengaturan'); if (!d) { d = db.get('pengaturan').value(); sc('pengaturan', d); }
    res.json(d);
});

app.get('/admin/stats', requireAdminAuth, (req, res) => {
    try {
        const siswa = db.get('siswa').value();
        const bankSoal = db.get('bankSoal').value();
        const ujian = db.get('ujian').value();
        const aktifPaket = ujian.aktifPaket || [];
        const selesai = siswa.filter(s => s.status === 'Selesai').length;
        const belum = siswa.filter(s => s.status !== 'Selesai' && s.status !== 'Diblokir').length;
        const diblokir = siswa.filter(s => s.status === 'Diblokir').length;
        let totalNa = 0, countNa = 0;
        let dist = { A: 0, B: 0, C: 0, D: 0 };
        let kelasMap = {};
        siswa.forEach(s => {
            const k = s.kelas || 'Tanpa Kelas';
            if (!kelasMap[k]) kelasMap[k] = { total: 0, selesai: 0, na: 0, countNa: 0 };
            kelasMap[k].total++;
            if (s.status === 'Selesai') {
                kelasMap[k].selesai++;
                const na = s.na !== undefined ? Number(s.na) : hitungNA(s, ujian);
                totalNa += na; countNa++;
                kelasMap[k].na += na; kelasMap[k].countNa++;
                if (na >= 85) dist.A++;
                else if (na >= 70) dist.B++;
                else if (na >= 55) dist.C++;
                else dist.D++;
            }
        });
        let rekapKelas = Object.entries(kelasMap).map(([k, v]) => ({
            kelas: k, total: v.total, selesai: v.selesai,
            rata: v.countNa > 0 ? (v.na / v.countNa).toFixed(2) : 0
        })).sort((a, b) => a.kelas.localeCompare(b.kelas));
        res.json({
            success: true, totalSiswa: siswa.length, totalBankSoal: bankSoal.length,
            totalUjianAktif: aktifPaket.length, siswaSelesai: selesai,
            siswaBelum: belum, siswaDiblokir: diblokir,
            rataRataNilai: countNa > 0 ? (totalNa / countNa).toFixed(2) : 0,
            distribusiNilai: dist, rekapKelas: rekapKelas
        });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/review-jawaban/:id', requireAdminAuth, (req, res) => {
    try {
        const siswa = db.get('siswa').find({ id: req.params.id }).value();
        if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        const bank = db.get('bankSoal').find({ id: Number(siswa.paketId) }).value();
        if (!bank) return res.status(404).json({ success: false, message: 'Paket soal tidak ditemukan' });
        const review = bank.daftarSoal.map((soal, idx) => {
            const raw = siswa.jawabanSiswa ? siswa.jawabanSiswa[String(idx)] : null;
            const kunci = normalizeKunci(soal.kunci);
            const isEsai = kunci === 'ESAI';
            const isMJ = (soal.tipe || '').toUpperCase() === 'MENJODOHKAN'
                || soal.konten.indexOf('|') !== -1
                || /^\d+-[A-E](,\d+-[A-E])+$/i.test(kunci);
            const isKompleks = kunci.includes(',') && !isMJ && !isEsai;
            let jawabanText = '(tidak dijawab)', kunciText = kunci, benar = false;
            if (isEsai) { jawabanText = raw || '(tidak dijawab)'; kunciText = 'Esai — koreksi manual'; }
            else if (isMJ && typeof raw === 'object') {
                const kunciMap = {};
                kunci.split(',').forEach(part => {
                    const m = part.trim().match(/^(\d+)-([A-E])$/i);
                    if (m) kunciMap[Number(m[1])] = m[2].toUpperCase();
                });
                let allCorrect = true, anyAnswered = false;
                Object.keys(kunciMap).forEach(itemNum => {
                    const userAns = (raw[Number(itemNum)] || '').toUpperCase().trim();
                    if (userAns) anyAnswered = true;
                    if (userAns !== kunciMap[Number(itemNum)]) allCorrect = false;
                });
                jawabanText = Object.entries(raw).sort((a, b) => +a[0] - +b[0]).map(e => e[0] + '-' + e[1]).join(', ');
                benar = allCorrect && anyAnswered;
            } else {
                jawabanText = raw ? String(raw) : '(tidak dijawab)';
                const jawabanNorm = String(jawabanText).replace(/\s*,\s*/g, '').toUpperCase();
                const kunciNorm = kunci.replace(/\s*,\s*/g, '').toUpperCase();
                benar = jawabanNorm === kunciNorm && jawabanNorm !== '';
            }
            let pilihanHtml = '';
            if (soal.pilihan && soal.pilihan.length) {
                pilihanHtml = soal.pilihan.map((p, i) => {
                    const huruf = String.fromCharCode(65 + i);
                    const jawabanNorm = String(jawabanText).replace(/\s*,\s*/g, '').toUpperCase();
                    const kunciNorm = kunci.replace(/\s*,\s*/g, '').toUpperCase();
                    const isJawaban = jawabanNorm.includes(huruf) && !isMJ;
                    const isKunci = kunciNorm.includes(huruf) && !isMJ && !isEsai;
                    let cls = '';
                    if (isKunci && isJawaban) cls = 'bg-success text-white';
                    else if (isKunci) cls = 'bg-success bg-opacity-25 border border-success';
                    else if (isJawaban) cls = 'bg-danger bg-opacity-25 border border-danger';
                    return '<span class="badge ' + cls + ' me-1 mb-1" style="font-size:12px">' + huruf + '. ' + p + '</span>';
                }).join('');
            }
            return { nomor: idx + 1, konten: soal.konten, pilihanHtml, jawaban: jawabanText, kunci: kunciText, benar, tipe: isEsai ? 'ESAI' : isMJ ? 'MENJODOHKAN' : isKompleks ? 'KOMPLEKS' : 'PG' };
        });
        res.json({ success: true, siswa, review, mapel: bank.mapel, kelas: bank.kelas });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

// POST endpoints untuk pengaturan ujian
app.post('/simpan-semua-ujian', requireAdminAuth, (req, res) => {
    try {
        const { durasi, tampilkanNilai, aktifPaket, acakSoal, durasiPerPaket } = req.body;
        if (!Array.isArray(aktifPaket)) return res.status(400).json({ success: false, message: 'Data tidak valid' });
        const banks = db.get('bankSoal').value();
        for (let item of aktifPaket) {
            if (!banks.find(b => b.id === Number(item.paketId))) return res.status(400).json({ success: false, message: 'Paket ID ' + item.paketId + ' tidak ditemukan' });
            const bPG = Number(item.bobotPG) || 0, bEsai = Number(item.bobotEsai) || 0;
            if (bPG + bEsai !== 100) return res.status(400).json({ success: false, message: 'Bobot harus 100%' });
        }
        if (durasi !== undefined) db.set('ujian.durasi', Math.max(1, Number(durasi))).write();
        if (tampilkanNilai !== undefined) db.set('ujian.tampilkanNilai', !!tampilkanNilai).write();
        if (acakSoal !== undefined) db.set('ujian.acakSoal', !!acakSoal).write();
        if (durasiPerPaket !== undefined) db.set('ujian.durasiPerPaket', !!durasiPerPaket).write();
        db.set('ujian.aktifPaket', aktifPaket).write();
        flushCache();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/set-tampilkan-nilai', requireAdminAuth, (req, res) => {
    db.set('ujian.tampilkanNilai', !!req.body.tampilkanNilai).write();
    flushCache(); res.json({ success: true });
});

app.post('/set-diblokir', requireAdminAuth, (req, res) => {
    db.get('siswa').find({ id: req.body.userId }).assign({ status: 'Diblokir' }).write();
    flushCache(); res.json({ success: true });
});

// Unblock siswa - status kembali ke 'Belum', ujianMulai tetap (waktu terus berjalan), soal diacak ulang saat login
app.post('/unblock-siswa', requireAdminAuth, (req, res) => {
    try {
        const siswa = db.get('siswa').find({ id: req.body.id }).value();
        if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        // Reset status ke Belum agar bisa login lagi, tapi JANGAN reset ujianMulai - waktu tetap jalan
        db.get('siswa').find({ id: req.body.id }).assign({
            status: 'Belum',
            nilaiOtomatis: 0, nilaiEsai: 0, totalNilai: 0, na: 0,
            jawabanSiswa: {}, paketId: null, pelanggaran: 0, logPelanggaran: [], selesaiOtomatis: false
            // ujianMulai TIDAK direset - waktu server tetap berjalan
        }).write();
        flushCache(); res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// Endpoint untuk cek sisa waktu siswa (bisa dipakai polling)
// Endpoint polling: cek status terkini siswa dari DB (digunakan ujian.html setiap 5 detik)
app.get('/cek-status-siswa/:userId', (req, res) => {
    try {
        const siswa = db.get('siswa').find({ id: req.params.userId }).value();
        if (!siswa) return res.status(404).json({ success: false, status: null });
        res.json({ success: true, status: siswa.status });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.get('/get-sisa-waktu/:userId', (req, res) => {
    try {
        const siswa = db.get('siswa').find({ id: req.params.userId }).value();
        if (!siswa) return res.status(404).json({ success: false });
        if (!siswa.ujianMulai) return res.json({ success: true, sisaDetik: null });
        const ujianConfig = db.get('ujian').value();
        const paketForKelas = (ujianConfig.aktifPaket || []).find(p => p.kelas === siswa.kelas);
        let durasiUjian = ujianConfig.durasi || 60;
        if (ujianConfig.durasiPerPaket && paketForKelas && paketForKelas.durasi) durasiUjian = paketForKelas.durasi;
        const durasiMs = durasiUjian * 60 * 1000;
        const elapsed = Date.now() - siswa.ujianMulai;
        const sisaDetik = Math.max(0, Math.floor((durasiMs - elapsed) / 1000));
        res.json({ success: true, sisaDetik: sisaDetik, serverTime: Date.now() });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/update-keamanan', requireAdminAuth, (req, res) => {
    try {
        const { maxPelanggaran, pesanPelanggaran, deteksiPelanggaran, alarmType, alarmDurasi } = req.body;
        if (maxPelanggaran !== undefined) db.set('ujian.maxPelanggaran', Math.max(1, Math.min(20, Number(maxPelanggaran) || 3))).write();
        if (pesanPelanggaran !== undefined) db.set('ujian.pesanPelanggaran', (pesanPelanggaran || '').toString()).write();
        if (deteksiPelanggaran !== undefined) db.set('ujian.deteksiPelanggaran', !!deteksiPelanggaran).write();
        if (alarmType !== undefined) db.set('ujian.alarmType', (alarmType || 'beep').toString()).write();
        if (alarmDurasi !== undefined) db.set('ujian.alarmDurasi', Math.min(10000, Math.max(1000, Number(alarmDurasi) || 3000))).write();
        flushCache();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/update-tema', requireAdminAuth, (req, res) => {
    try {
        const { tema, temaLogin, layoutLogin } = req.body;
        if (tema) db.set('pengaturan.tema', tema).write();
        if (temaLogin) db.set('pengaturan.temaLogin', temaLogin).write();
        if (layoutLogin) db.set('pengaturan.layoutLogin', layoutLogin).write();
        flushCache();
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/update-pengaturan', requireAdminAuth, (req, res) => {
    db.set('pengaturan', {
        namaSekolah: (req.body.namaSekolah || '').toString(),
        namaAplikasi: (req.body.namaAplikasi || '').toString(),
        ukuranSekolah: Math.max(10, Math.min(40, Number(req.body.ukuranSekolah) || 18)),
        ukuranAplikasi: Math.max(8, Math.min(30, Number(req.body.ukuranAplikasi) || 13)),
        tema: req.body.tema || 'green',
        temaLogin: req.body.temaLogin || 'green',
        layoutLogin: req.body.layoutLogin || 'modern'
    }).write();
    flushCache();
    res.json({ success: true });
});

app.post('/login-siswa', (req, res) => {
    try {
        const username = (req.body.username || req.body.nis || '').toString().trim();
        if (!username) return res.status(400).json({ success: false, message: 'NIS tidak boleh kosong!' });

        const user = db.get('siswa').find({ username: username }).value();
        const ujianConfig = db.get('ujian').value();

        if (!user) return res.status(404).json({ success: false, message: 'NIS tidak ditemukan!' });
        if (user.status === 'Selesai') return res.status(403).json({ success: false, message: 'Anda sudah mengerjakan ujian ini!' });
        if (user.status === 'Diblokir') return res.status(403).json({ success: false, message: 'Ujian Anda diblokir karena pelanggaran. Hubungi admin.' });

        const paketForKelas = (ujianConfig.aktifPaket || []).find(p => p.kelas === user.kelas);
        if (!paketForKelas) return res.status(400).json({ success: false, message: 'Belum ada ujian aktif untuk kelas ' + user.kelas });

        const paketSoal = db.get('bankSoal').find({ id: Number(paketForKelas.paketId) }).value();
        if (!paketSoal) return res.status(400).json({ success: false, message: 'Paket soal tidak ditemukan' });
        if (!paketSoal.daftarSoal || !paketSoal.daftarSoal.length) return res.status(400).json({ success: false, message: 'Paket soal kosong!' });

        let daftarSoal = [...paketSoal.daftarSoal];
        if (ujianConfig.acakSoal) {
            for (let i = daftarSoal.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [daftarSoal[i], daftarSoal[j]] = [daftarSoal[j], daftarSoal[i]];
            }
        }

        let durasiUjian = ujianConfig.durasi || 60;
        if (ujianConfig.durasiPerPaket && paketForKelas.durasi) durasiUjian = paketForKelas.durasi;

        // Server-side timer: record ujianMulai if not already set
        const now = Date.now();
        let ujianMulai = user.ujianMulai || null;
        if (!ujianMulai) {
            ujianMulai = now;
            db.get('siswa').find({ id: user.id }).assign({ ujianMulai: ujianMulai }).write();
            flushCache();
        }

        // Compute remaining time based on server start time
        const durasiMs = durasiUjian * 60 * 1000;
        const elapsed = now - ujianMulai;
        const sisaDetik = Math.max(0, Math.floor((durasiMs - elapsed) / 1000));

        // If time already ran out, auto-finish
        if (sisaDetik <= 0 && user.status !== 'Selesai') {
            db.get('siswa').find({ id: user.id }).assign({ status: 'Selesai', selesaiOtomatis: true }).write();
            flushCache();
            return res.status(403).json({ success: false, message: 'Waktu ujian Anda sudah habis!' });
        }

        res.json({
            success: true,
            user: db.get('siswa').find({ id: user.id }).value(),
            config: {
                aktifId: paketForKelas.paketId,
                durasi: durasiUjian,
                tampilkanNilai: ujianConfig.tampilkanNilai !== false,
                bobotPG: paketForKelas.bobotPG || 60,
                bobotEsai: paketForKelas.bobotEsai || 40
            },
            sisaDetik: sisaDetik,
            ujianMulai: ujianMulai,
            soal: daftarSoal,
            mapelAsli: paketSoal.mapel,
            security: {
                maxPelanggaran: Number(ujianConfig.maxPelanggaran) || 3,
                pesanPelanggaran: ujianConfig.pesanPelanggaran || 'Anda terdeteksi berpindah tab atau aplikasi. Ujian Anda dihentikan. Serahkan perangkat Anda kepada pengawas ujian.',
                pelanggaranSaatIni: user.pelanggaran || 0,
                deteksiPelanggaran: ujianConfig.deteksiPelanggaran !== false,
                alarmType: ujianConfig.alarmType || 'beep',
                alarmDurasi: ujianConfig.alarmDurasi || 3000
            }
        });
    } catch (e) {
        console.error('Login error:', e);
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/simpan-hasil', (req, res) => {
    try {
        const { userId, nilaiOtomatis, detailJawaban, paketId } = req.body;
        if (!userId) return res.status(400).json({ success: false, message: 'userId tidak boleh kosong. Silakan login kembali.' });
        const siswa = db.get('siswa').find({ id: String(userId) }).value();
        if (!siswa) return res.status(404).json({ success: false, message: 'Data siswa tidak ditemukan. Kemungkinan sesi login sudah berakhir. Silakan hubungi pengawas.' });
        if (siswa.status === 'Diblokir') return res.status(403).json({ success: false, message: 'Siswa diblokir' });
        const ujian = db.get('ujian').value();
        const pg = Number(nilaiOtomatis) || 0;
        const cfg = (ujian.aktifPaket || []).find(p => p.paketId == paketId && p.kelas === siswa.kelas);
        const bPG = cfg ? Number(cfg.bobotPG || 60) : 60;
        const na = (pg * bPG / 100);
        db.get('siswa').find({ id: String(userId) }).assign({
            status: 'Selesai', nilaiOtomatis: pg, totalNilai: pg,
            nilaiEsai: 0, na: na, jawabanSiswa: detailJawaban,
            paketId: paketId || null, pelanggaran: siswa.pelanggaran || 0,
            logPelanggaran: siswa.logPelanggaran || [], selesaiOtomatis: false
        }).write();
        flushCache();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/autosave', (req, res) => {
    try {
        const { userId, jawaban } = req.body;
        db.get('siswa').find({ id: userId }).assign({ jawabanAutoSave: jawaban }).write();
        res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false }); }
});

app.post('/update-nilai-esai', requireAdminAuth, (req, res) => {
    try {
        const { id, nilaiEsai } = req.body;
        const siswa = db.get('siswa').find({ id: id }).value();
        if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        const ujian = db.get('ujian').value();
        const pg = Number(siswa.nilaiOtomatis) || 0;
        const esai = Math.min(100, Math.max(0, Number(nilaiEsai) || 0));
        const cfg = (ujian.aktifPaket || []).find(p => p.paketId == siswa.paketId && p.kelas === siswa.kelas);
        const bPG = cfg ? Number(cfg.bobotPG || 60) : 60;
        const bEsai = cfg ? Number(cfg.bobotEsai || 40) : 40;
        const na = (pg * bPG / 100) + (esai * bEsai / 100);
        db.get('siswa').find({ id: id }).assign({ nilaiEsai: esai, totalNilai: pg + esai, na: na }).write();
        flushCache(); res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/log-pelanggaran', (req, res) => {
    try {
        const { userId } = req.body;
        const siswa = db.get('siswa').find({ id: userId }).value();
        if (!siswa) return res.status(404).json({ success: false, message: 'Siswa tidak ditemukan' });
        const ujian = db.get('ujian').value();
        if (ujian.deteksiPelanggaran === false) return res.json({ success: true, blocked: false, count: 0, max: 0, disabled: true });
        if (siswa.status === 'Diblokir') return res.json({ success: true, blocked: true, count: siswa.pelanggaran || 0 });
        if (siswa.status === 'Selesai') return res.json({ success: true, blocked: false, count: siswa.pelanggaran || 0 });
        const maxP = Number(ujian.maxPelanggaran) || 3;
        const newCount = (siswa.pelanggaran || 0) + 1;
        let log = Array.isArray(siswa.logPelanggaran) ? siswa.logPelanggaran : [];
        log.push(new Date().toISOString());
        if (newCount >= maxP) {
            db.get('siswa').find({ id: userId }).assign({
                status: 'Diblokir', pelanggaran: newCount, logPelanggaran: log, selesaiOtomatis: true
            }).write();
            flushCache();
            return res.json({ success: true, blocked: true, count: newCount, pesan: ujian.pesanPelanggaran || 'Anda terdeteksi berpindah tab. Ujian dihentikan.' });
        }
        db.get('siswa').find({ id: userId }).assign({ pelanggaran: newCount, logPelanggaran: log }).write();
        flushCache();
        return res.json({ success: true, blocked: false, count: newCount, max: maxP });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/add-siswa', requireAdminAuth, (req, res) => {
    try {
        const u = req.body.username.toString().trim();
        if (!u) return res.status(400).json({ success: false, message: 'NIS wajib diisi!' });
        if (db.get('siswa').find({ username: u }).value()) return res.status(400).json({ success: false, message: 'NIS sudah ada!' });
        db.get('siswa').push({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
            username: u, nama: req.body.nama || '', kelas: req.body.kelas || '',
            status: 'Belum', nilaiOtomatis: 0, nilaiEsai: 0, totalNilai: 0, na: 0,
            jawabanSiswa: {}, paketId: null, pelanggaran: 0, logPelanggaran: [], selesaiOtomatis: false
        }).write();
        flushCache(); res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/import-siswa', requireAdminAuth, (req, res) => {
    try {
        const { siswaList } = req.body;
        if (!Array.isArray(siswaList)) return res.status(400).json({ success: false, message: 'Format tidak valid' });
        let added = 0, skipped = 0;
        siswaList.forEach(s => {
            const u = (s.username || '').toString().trim();
            const n = (s.nama || '').toString().trim();
            if (!u || !n) { skipped++; return; }
            if (db.get('siswa').find({ username: u }).value()) { skipped++; return; }
            db.get('siswa').push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
                username: u, nama: n, kelas: (s.kelas || '').toString().trim(),
                status: 'Belum', nilaiOtomatis: 0, nilaiEsai: 0, totalNilai: 0, na: 0,
                jawabanSiswa: {}, paketId: null, pelanggaran: 0, logPelanggaran: [], selesaiOtomatis: false
            }).write();
            added++;
        });
        flushCache(); res.json({ success: true, added, skipped });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/reset-siswa', requireAdminAuth, (req, res) => {
    db.get('siswa').find({ id: req.body.id }).assign({
        status: 'Belum', nilaiOtomatis: 0, nilaiEsai: 0, totalNilai: 0, na: 0,
        jawabanSiswa: {}, paketId: null, pelanggaran: 0, logPelanggaran: [], selesaiOtomatis: false,
        ujianMulai: null
    }).write();
    flushCache(); res.json({ success: true });
});

app.post('/reset-semua-siswa', requireAdminAuth, (req, res) => {
    db.get('siswa').forEach(s => {
        db.get('siswa').find({ id: s.id }).assign({
            status: 'Belum', nilaiOtomatis: 0, nilaiEsai: 0, totalNilai: 0, na: 0,
            jawabanSiswa: {}, paketId: null, pelanggaran: 0, logPelanggaran: [], selesaiOtomatis: false,
            ujianMulai: null
        }).write();
    }).value();
    flushCache(); res.json({ success: true });
});

app.delete('/delete-siswa/:id', requireAdminAuth, (req, res) => { db.get('siswa').remove({ id: req.params.id }).write(); flushCache(); res.json({ success: true }); });
app.delete('/delete-bank/:id', requireAdminAuth, (req, res) => { db.get('bankSoal').remove({ id: Number(req.params.id) }).write(); flushCache(); res.json({ success: true }); });

// Import soal Word
app.post('/import-soal', requireAdminAuth, upload.single('file_soal'), (req, res) => {
    const { kelas, mapel } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
    if (!mapel || !kelas) { fs.unlinkSync(req.file.path); return res.status(400).json({ success: false, message: 'Mapel dan Kelas wajib diisi!' }); }
    mammoth.convertToHtml({ path: req.file.path }, {
        convertImage: mammoth.images.imgElement((image) => {
            return image.read().then((buf) => {
                const fn = Date.now() + '-' + Math.random().toString(36).substring(2, 8) + '.png';
                fs.writeFileSync(path.join(imagesDir, fn), buf);
                return { src: '/images/' + fn };
            });
        })
    }).then(result => {
        const paragraphs = result.value.split(/<p[^>]*>/g);
        let daftarSoal = [], currentSoal = null, currentKonten = '';
        paragraphs.forEach(p => {
            let htmlPar = p.replace(/<\/p>/g, '').trim();
            let txt = htmlPar.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            const mS = txt.match(/^(\d+)[\.\)\-]/);
            const mO = txt.match(/^([A-Ea-e])[\.\)]/);
            if (mS) {
                if (currentSoal) { currentSoal.konten = currentKonten; currentSoal.kunci = normalizeKunci(currentSoal.kunci); daftarSoal.push(currentSoal); }
                currentSoal = { id: Date.now() + Math.random(), konten: '', pilihan: [], kunci: '' };
                currentKonten = htmlPar.replace(/^([\s<]*<[^>]*>[\s]*)*\d+\s*[\.\)\-]\s*/i, '').trim();
            } else if (currentSoal) {
                if (/^KUNCI\s*:/i.test(txt)) { currentSoal.kunci = txt.replace(/^KUNCI\s*[:\s]+/i, '').trim(); }
                else if (mO) { currentSoal.pilihan.push(txt.replace(/^([A-Ea-e])[\.\)]/, '').trim()); }
                else if (htmlPar !== '') { currentKonten += '<br>' + htmlPar; }
            }
        });
        if (currentSoal) { currentSoal.konten = currentKonten; currentSoal.kunci = normalizeKunci(currentSoal.kunci); daftarSoal.push(currentSoal); }
        let processed = [];
        for (let i = 0; i < daftarSoal.length; i++) {
            const soal = daftarSoal[i];
            const kunci = (soal.kunci || '').toUpperCase().trim();
            const isMatchKey = /^\d+-[A-E](,\d+-[A-E])+$/i.test(kunci);
            if (isMatchKey && processed.length > 0) {
                let subItems = [];
                while (processed.length > 0) { const last = processed[processed.length - 1]; if (last.kunci) break; if (last.pilihan && last.pilihan.length > 0) break; subItems.unshift(processed.pop()); }
                if (subItems.length > 0) {
                    const pilihanIdx = soal.konten.toLowerCase().indexOf('pilihan');
                    if (pilihanIdx !== -1) {
                        let optText = soal.konten.substring(pilihanIdx).replace(/^.*?pilihan\s*[:\s]*/i, '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
                        const optParts = optText.split(/\s+(?=[A-E]\.)/);
                        soal.pilihan = [];
                        for (const part of optParts) { const cleaned = part.replace(/^[A-E]\.\s*/, '').trim(); if (cleaned) soal.pilihan.push(cleaned); }
                        soal.konten = soal.konten.substring(0, pilihanIdx).replace(/<br>\s*$/, '').replace(/<br>\s*$/, '').trim();
                    }
                    soal.konten = subItems.map(s => s.konten).join(' | ') + ' | ' + soal.konten;
                    soal.tipe = 'MENJODOHKAN';
                }
            }
            processed.push(soal);
        }
        daftarSoal = processed;
        if (!daftarSoal.length) { fs.unlinkSync(req.file.path); return res.status(400).json({ success: false, message: 'Tidak ada soal terdeteksi.' }); }
        db.get('bankSoal').push({ id: Date.now(), mapel, kelas, daftarSoal }).write();
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        flushCache(); res.json({ success: true, total: daftarSoal.length });
    }).catch(err => { try { fs.unlinkSync(req.file.path); } catch (e) {} res.status(500).json({ success: false, message: 'Gagal parsing Word: ' + err.message }); });
});

// Import Excel
app.post('/import-soal-excel', requireAdminAuth, upload.single('file_excel'), (req, res) => {
    const { kelas, mapel } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
    if (!mapel || !kelas) { fs.unlinkSync(req.file.path); return res.status(400).json({ success: false, message: 'Mapel dan Kelas wajib diisi!' }); }
    try {
        const wb = XLSX.readFile(req.file.path);
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        if (!rows.length) throw new Error('File kosong');
        let daftarSoal = [];
        rows.forEach(row => {
            const tipe = (row.tipe || row.Tipe || '').toString().toUpperCase();
            const kunci = normalizeKunci(row.kunci || row.Kunci || '');
            const soalText = (row.soal || row.Soal || '').toString().trim();
            if (!soalText) return;
            let pilihan = [];
            if (tipe !== 'ESAI' && tipe !== 'ESAY' && kunci !== 'ESAI') {
                for (let i = 0; i <= 4; i++) { const t = row['pilihan_' + String.fromCharCode(65 + i)] || row['Pilihan_' + String.fromCharCode(65 + i)] || ''; if (t.toString().trim()) pilihan.push(t.toString().trim()); }
            }
            daftarSoal.push({ id: Date.now() + Math.random(), konten: soalText, pilihan, kunci, tipe });
        });
        if (!daftarSoal.length) throw new Error('Tidak ada soal valid');
        db.get('bankSoal').push({ id: Date.now(), mapel, kelas, daftarSoal }).write();
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        flushCache(); res.json({ success: true, total: daftarSoal.length });
    } catch (err) { try { fs.unlinkSync(req.file.path); } catch (e) {} res.status(500).json({ success: false, message: err.message }); }
});

// ===== JADWAL UJIAN =====
app.get('/get-jadwal', requireAdminAuth, (req, res) => {
    try {
        const jadwal = db.get('jadwal').value() || [];
        res.json(jadwal);
    } catch (e) { res.json([]); }
});

app.post('/save-jadwal', requireAdminAuth, (req, res) => {
    try {
        const { jadwal } = req.body;
        if (!Array.isArray(jadwal)) return res.status(400).json({ success: false, message: 'Data tidak valid' });
        if (!db.has('jadwal').value()) db.set('jadwal', []).write();
        db.set('jadwal', jadwal).write();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.get('/backup', requireAdminAuth, (req, res) => {
    try { const data = JSON.stringify(db.getState(), null, 2); res.setHeader('Content-Type', 'application/json'); res.setHeader('Content-Disposition', 'attachment; filename=cbt_backup_' + new Date().toISOString().slice(0, 10) + '.json'); res.send(data); }
    catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

app.post('/restore', requireAdminAuth, upload.single('file_backup'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
    try {
        const raw = fs.readFileSync(req.file.path, 'utf-8');
        const data = JSON.parse(raw);
        if (!data.siswa || !data.bankSoal || !data.ujian) throw new Error('Format backup tidak valid');
        const oldPengaturan = db.get('pengaturan').value();
        db.setState(data).write();
        if (oldPengaturan) db.set('pengaturan', oldPengaturan).write();
        try { fs.unlinkSync(req.file.path); } catch (e) {}
        flushCache(); res.json({ success: true, message: 'Data berhasil direstore!' });
    } catch (e) { try { fs.unlinkSync(req.file.path); } catch (err) {} res.status(500).json({ success: false, message: 'Gagal restore: ' + e.message }); }
});

app.get('/template/soal.xlsx', (req, res) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['tipe', 'soal', 'pilihan_A', 'pilihan_B', 'pilihan_C', 'pilihan_D', 'pilihan_E', 'kunci'],
        ['PG', 'Ibu kota Indonesia adalah?', 'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'A'],
        ['KOMPLEKS', 'Pilih jawaban yang benar:', 'Pilihan A', 'Pilihan B', 'Pilihan C', '', '', 'A,B'],
        ['BENAR/SALAH', 'Indonesia merdeka tahun 1945', 'Benar', 'Salah', '', '', '', 'A'],
        ['MENJODOHKAN', 'Pasangkan: | Item1 | Item2', 'Jawaban1', 'Jawaban2', '', '', '', '1-A,2-B'],
        ['ESAI', 'Jelaskan pengertian gotong royong!', '', '', '', '', '', 'ESAI']
    ]), 'Template');
    res.setHeader('Content-Disposition', 'attachment; filename=template_soal.xlsx');
    res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
});

app.get('/template/siswa.xlsx', (req, res) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['NIS', 'Nama', 'Kelas'], ['1001', 'Ahmad Fauzi', '7A'], ['1002', 'Siti Aminah', '7B']]), 'Template');
    res.setHeader('Content-Disposition', 'attachment; filename=template_siswa.xlsx');
    res.send(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
});

app.get('/template/soal.doc', (req, res) => {
    const namaSekolah = (db.get('pengaturan').value().namaSekolah || 'SCHOOL NAME').toUpperCase();
    const docContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>body{font-family:'Times New Roman',serif;font-size:12pt;margin:2.5cm 3cm;line-height:1.6}h1{text-align:center;font-size:14pt;margin-bottom:2pt}h2{text-align:center;font-size:12pt;font-weight:normal;margin-top:0;margin-bottom:18pt}.hr{border:none;border-top:2px solid #000;margin:10px 0 20px}.soal{margin-bottom:16pt}.opsi{margin-left:30pt;margin-top:2pt}.kunci{font-weight:bold;margin-top:4pt}.petunjuk{margin-top:30pt;padding:12px 16px;border:1pt solid #999;background:#f9f9f9;font-size:11pt;line-height:1.5}</style></head><body><h1>${namaSekolah}</h1><h2>UJIAN AKHIR SEMESTER</h2><div style="text-align:center;margin-bottom:16pt"><b>Mata Pelajaran : ..........................</b><br><b>Kelas : ..........................</b></div><div class="hr"></div><div class="soal"><p><b>1.</b> Ibu kota negara Indonesia adalah ...</p><p class="opsi">A. Surabaya</p><p class="opsi">B. Jakarta</p><p class="opsi">C. Bandung</p><p class="opsi">D. Medan</p><p class="opsi">E. Semarang</p><p class="kunci">Kunci: B</p></div><div class="soal"><p><b>2.</b> Berikut sumber energi terbarukan ...<br>(Pilih lebih dari satu)</p><p class="opsi">A. Sinar matahari</p><p class="opsi">B. Batu bara</p><p class="opsi">C. Angin</p><p class="opsi">D. Bahan bakar minyak</p><p class="kunci">Kunci: A,C</p></div><div class="soal"><p><b>3.</b> Indonesia merdeka pada tanggal 17 Agustus 1945</p><p class="opsi">A. Benar</p><p class="opsi">B. Salah</p><p class="kunci">Kunci: A</p></div><div class="soal"><p><b>4.</b> Pasangkan pernyataan berikut!</p><p class="opsi">1. Lambang negara</p><p class="opsi">2. Lagu kebangsaan</p><p class="opsi">3. Hari kemerdekaan</p><p style="margin-left:30pt;margin-top:8pt"><b>Pilihan:</b>&nbsp;&nbsp;A. Indonesia Raya&nbsp;&nbsp;&nbsp;B. 17 Agustus&nbsp;&nbsp;&nbsp;C. Garuda Pancasila</p><p class="kunci">Kunci: 1-C,2-A,3-B</p></div><div class="soal"><p><b>5.</b> Jelaskan pengertian gotong royong!</p><p>...................................................................................................................................................</p><p class="kunci">Kunci: ESAI</p></div><div class="petunjuk"><b>PETUNJUK:</b><br>1. Soal diawali nomor urut diikuti titik<br>2. Pilihan diawali huruf kapital diikuti titik (A. B. C. D. E.)<br>3. Kunci: <b>Kunci: huruf jawaban</b><br>4. Kompleks: kunci dipisah koma (Kunci: A,C)<br>5. Benar/Salah: A=Benar, B=Salah<br>6. Menjodohkan: Kunci: 1-A,2-B,3-C<br>7. Esai: Kunci: ESAI</div></body></html>`;
    res.setHeader('Content-Type', 'application/msword');
    res.setHeader('Content-Disposition', 'attachment; filename=template_soal.doc');
    res.send(docContent);
});

app.get('/analisis-soal/:paketId', requireAdminAuth, (req, res) => {
    try {
        const paketId = Number(req.params.paketId);
        const bank = db.get('bankSoal').find({ id: paketId }).value();
        if (!bank) return res.json({ success: false, message: 'Paket tidak ditemukan' });
        const siswa = db.get('siswa').filter(s => s.paketId === paketId && s.status === 'Selesai').value();
        const totalSiswa = siswa.length;
        const analisis = bank.daftarSoal.map((soal, idx) => {
            let benar = 0;
            siswa.forEach(s => {
                const jawaban = s.jawabanSiswa ? s.jawabanSiswa[String(idx)] : null;
                const kunci = normalizeKunci(soal.kunci);
                if (kunci === 'ESAI') return;
                let isBenar = false;
                if (typeof jawaban === 'string') isBenar = jawaban.toUpperCase().trim() === kunci;
                else if (typeof jawaban === 'object') isBenar = JSON.stringify(jawaban) === kunci;
                if (isBenar) benar++;
            });
            const persen = totalSiswa ? Math.round((benar / totalSiswa) * 100) : 0;
            return { nomor: idx+1, konten: soal.konten.substring(0, 60), benar, totalSiswa, persen };
        });
        res.json({ success: true, data: analisis });
    } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// ─── UPLOAD LOGO SEKOLAH ──────────────────────────────────────────────────────
const uploadLogo = multer({ dest: 'public/', limits: { fileSize: 2 * 1024 * 1024 } });
app.post('/upload-logo', requireAdminAuth, uploadLogo.single('logo'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'Tidak ada file' });
    const oldPath = req.file.path;
    const newPath = path.join(__dirname, 'public', 'logo_sekolah.png');
    try {
        fs.renameSync(oldPath, newPath);
        res.json({ success: true, path: '/logo_sekolah.png' });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Gagal menyimpan logo: ' + e.message });
    }
});

// ─── BULK DELETE SISWA ────────────────────────────────────────────────────────
app.delete('/delete-siswa-bulk', requireAdminAuth, (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'ids array required' });
    }
    ids.forEach(id => {
        db.get('siswa').remove({ id }).write();
    });
    flushCache();
    res.json({ success: true, deleted: ids.length });
});
// ─────────────────────────────────────────────────────────────────────────────

app.use((err, req, res, next) => { console.error('Server Error:', err); res.status(500).json({ success: false, message: 'Terjadi kesalahan server' }); });

const PORT = process.env.PORT || 3001;
const server = http.createServer(app);
server.listen(PORT, () => console.log('CBT Server berjalan di port ' + PORT));