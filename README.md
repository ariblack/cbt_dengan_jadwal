# CBT MJS — Computer Based Test Offline

Aplikasi ujian berbasis komputer (CBT) untuk sekolah, berjalan secara offline.

## Cara Menjalankan

### Windows (Tanpa Terminal)
Double-click `run.vbs` — server akan berjalan di background dan browser otomatis terbuka.

### Windows (Manual)
Double-click `start.bat` atau jalankan:
```
node server.js
```
Buka browser ke `http://localhost:3000`

## Struktur Project
```
CBT_MJS/
├── server.js          ← Backend utama (Node.js + Express)
├── db.json            ← Database (lowdb JSON)
├── package.json       ← Konfigurasi npm
├── run.vbs            ← Launcher Windows (silent, tanpa terminal)
├── start.bat          ← Launcher Windows (dengan terminal)
├── public/
│   ├── index.html         ← Halaman login siswa
│   ├── ujian.html         ← Halaman ujian siswa
│   ├── admin.html         ← Dashboard admin
│   ├── admin-login.html   ← Login admin
│   ├── cetak-kartu.html   ← Cetak kartu peserta
│   ├── logo_sekolah.png   ← Logo sekolah (dapat diganti via admin)
│   └── images/            ← Gambar soal (di-generate otomatis dari import)
├── uploads/               ← Folder upload sementara (di-generate otomatis)
└── docs/
    ├── CHANGELOG.md               ← Riwayat perubahan
    └── format_import_soal_teks.txt ← Contoh format import soal teks
```

## Dependensi
- Node.js (v16+)
- express, socket.io, lowdb, multer, mammoth, xlsx, cookie-parser
