# CHANGELOG — CBT MJS

---
# PATCHNOTES — TAHAP 1 (server.js)
**Tanggal:** 06 Juni 2026  
**File diubah:** `server.js`, `package.json`

---

## 🆕 Fitur Baru

### 1. Auth Admin (Login/Logout)
- Tambah `POST /login-admin` — login admin dengan password, support first-time setup
- Tambah `POST /logout-admin` — logout dan hapus session
- Tambah `GET /check-admin-auth` — cek status login (dipakai oleh admin.html)
- Tambah `GET /admin-auth-status` — cek apakah password sudah pernah diset
- Tambah `GET /admin-login` — serve halaman `public/admin-login.html`
- Password di-hash menggunakan SHA256 (crypto bawaan Node, tanpa library tambahan)
- Session token acak 32 byte disimpan di cookie `admin_token` (httpOnly, 8 jam)

### 2. Proteksi Endpoint Admin
Middleware `requireAdminAuth` dipasang di semua endpoint admin:
| Endpoint | Sebelum | Sesudah |
|---|---|---|
| `GET /admin` | ❌ Bebas | ✅ Diproteksi |
| `GET /get-siswa` | ❌ Bebas | ✅ Diproteksi |
| `GET /get-bank-soal` | ❌ Bebas | ✅ Diproteksi |
| `GET /admin/stats` | ❌ Bebas | ✅ Diproteksi |
| `GET /review-jawaban/:id` | ❌ Bebas | ✅ Diproteksi |
| `GET /backup` | ❌ Bebas | ✅ Diproteksi |
| `GET /analisis-soal/:id` | ❌ Bebas | ✅ Diproteksi |
| `POST /add-siswa` | ❌ Bebas | ✅ Diproteksi |
| `POST /import-siswa` | ❌ Bebas | ✅ Diproteksi |
| `POST /reset-siswa` | ❌ Bebas | ✅ Diproteksi |
| `POST /reset-semua-siswa` | ❌ Bebas | ✅ Diproteksi |
| `POST /import-soal` | ❌ Bebas | ✅ Diproteksi |
| `POST /import-soal-excel` | ❌ Bebas | ✅ Diproteksi |
| `POST /simpan-semua-ujian` | ❌ Bebas | ✅ Diproteksi |
| `POST /set-tampilkan-nilai` | ❌ Bebas | ✅ Diproteksi |
| `POST /set-diblokir` | ❌ Bebas | ✅ Diproteksi |
| `POST /update-keamanan` | ❌ Bebas | ✅ Diproteksi |
| `POST /update-tema` | ❌ Bebas | ✅ Diproteksi |
| `POST /update-pengaturan` | ❌ Bebas | ✅ Diproteksi |
| `POST /update-nilai-esai` | ❌ Bebas | ✅ Diproteksi |
| `POST /restore` | ❌ Bebas | ✅ Diproteksi |
| `DELETE /delete-siswa/:id` | ❌ Bebas | ✅ Diproteksi |
| `DELETE /delete-bank/:id` | ❌ Bebas | ✅ Diproteksi |

Endpoint yang tetap publik (untuk siswa): `/`, `/ujian`, `/get-ujian`, `/get-pengaturan`, `/login-siswa`, `/simpan-hasil`, `/autosave`, `/log-pelanggaran`

### 3. Upload Logo Sekolah
- Tambah `POST /upload-logo` — upload file gambar, disimpan ke `public/logo_sekolah.png`
- Hanya bisa diakses admin (diproteksi)
- Validasi ukuran file maksimal 2MB

### 4. Bulk Delete Siswa
- Tambah `DELETE /delete-siswa-bulk` — hapus banyak siswa sekaligus dengan array `ids`
- Hanya bisa diakses admin (diproteksi)

---

## 🔧 Perubahan / Perbaikan

### 5. Socket.IO Dihapus Total
- Hapus `const { Server } = require('socket.io')`
- Hapus `const io = new Server(server)`
- Hapus `global.io = io`
- Hapus `global.io.emit(...)` di endpoint `/simpan-hasil`
- Socket.IO masih ada di `package.json` (dependency tidak dihapus, aman)

### 6. Tambah cookie-parser
- `require('cookie-parser')` ditambah
- `app.use(cookieParser())` dipasang sebelum routes

### 7. adminAuth di database default
- `adminAuth: { password: '', isSet: false }` ditambah ke `db.defaults()`
- Juga ditambah ke fallback `db.json` jika file corrupt

---

## 📦 Perubahan package.json
```
+ "cookie-parser": "^1.4.0"
+ "scripts.dev": "nodemon server.js"
```

---

## ⚠️ Langkah Setelah Install
1. Ganti `server.js` lama dengan file ini
2. Ganti `package.json` lama dengan file ini
3. Jalankan di terminal/CMD: `npm install`
4. Jalankan server: `npm start`
5. Buka browser: `http://localhost:3001/admin` → otomatis redirect ke halaman login
6. **Pertama kali:** masukkan password baru minimal 6 karakter → password tersimpan

---

## ✅ Checklist TAHAP 1
- [x] `cookie-parser` terinstall & digunakan
- [x] `adminAuth` ada di db.json default
- [x] Hash password pakai crypto SHA256
- [x] `POST /login-admin` berfungsi (setup pertama + login)
- [x] `POST /logout-admin` berfungsi
- [x] `GET /check-admin-auth` berfungsi
- [x] Middleware `requireAdminAuth` dipasang di semua endpoint admin
- [x] `POST /upload-logo` berfungsi, simpan ke `public/logo_sekolah.png`
- [x] `DELETE /delete-siswa-bulk` terima array ids
- [x] Socket.IO dibersihkan total
- [x] `GET /admin-login` serve halaman login admin

---
# PATCHNOTES — TAHAP 2 (admin-login.html)
**Tanggal:** 06 Juni 2026  
**File baru:** `public/admin-login.html`

---

## 🆕 File Baru Dibuat

### public/admin-login.html
Halaman login khusus admin yang sebelumnya tidak ada.

---

## ✨ Fitur Halaman Login

### Tampilan & Desain
- Background gelap gradasi hijau dengan animasi orb melayang
- Grid texture overlay untuk kedalaman visual
- Card putih dengan shadow dalam dan border-radius modern
- Font Plus Jakarta Sans (bersih dan profesional)
- Animasi slide-up saat halaman pertama load

### Logo & Identitas Sekolah
- Menampilkan `logo_sekolah.png` jika ada
- Fallback otomatis ke Material Icon `school` jika logo tidak ditemukan
- Nama sekolah diambil otomatis dari endpoint `/get-pengaturan`
- Badge "Panel Administrator" di bawah nama sekolah

### Form Login
- Input password dengan icon kunci
- Tombol show/hide password (visibility toggle)
- Hint teks "Password minimal 6 karakter"
- Loading spinner saat proses login
- State button berubah sesuai kondisi (loading / berhasil / gagal)

### First-Time Setup
- Deteksi otomatis via `GET /admin-auth-status`
- Jika password belum pernah diset, tampil banner kuning "Setup Pertama"
- Label dan tombol berubah: "Buat Password Admin Baru" / "Buat Password"
- Placeholder input berubah: "Buat password baru"

### Alert & Feedback
- Alert merah jika login gagal (dengan pesan dari server)
- Alert hijau jika login berhasil sebelum redirect
- Icon alert berubah sesuai jenis (error, check_circle, wifi_off)
- Input otomatis terfokus dan terseleksi setelah gagal login

### Keamanan & UX
- Redirect ke `/admin` setelah login sukses (800ms delay untuk feedback visual)
- Tidak ada emoji — semua ikon pakai Material Icons
- Tidak ada data sensitif di localStorage/sessionStorage

---

## 📋 Endpoint yang Digunakan
| Endpoint | Metode | Fungsi |
|---|---|---|
| `/admin-auth-status` | GET | Cek apakah password sudah pernah diset |
| `/get-pengaturan` | GET | Ambil nama sekolah untuk ditampilkan |
| `/login-admin` | POST | Submit password login |

Semua endpoint ini sudah dibuat di **TAHAP 1**.

---

## ⚠️ Langkah Instalasi
1. Copy file `admin-login.html` ke folder `public/` di CBT kamu
2. Pastikan `server.js` sudah diupdate (Tahap 1)
3. Buka `http://localhost:3001/admin` → otomatis redirect ke halaman ini
4. Masukkan password (jika pertama kali: buat password baru minimal 6 karakter)

---

## ✅ Checklist TAHAP 2
- [x] File `public/admin-login.html` dibuat
- [x] Halaman tampil logo sekolah dengan fallback placeholder
- [x] Nama sekolah dimuat dari `/get-pengaturan`
- [x] Deteksi first-time setup via `/admin-auth-status`
- [x] Banner setup pertama tampil jika password belum diset
- [x] Form login kirim `POST /login-admin`
- [x] Setelah sukses redirect ke `/admin`
- [x] Jika gagal tampilkan pesan error
- [x] Show/hide password toggle
- [x] Loading state pada tombol submit
- [x] Tidak ada emoji, pakai Material Icons
- [x] Animasi halaman yang halus

---
# PATCHNOTES — TAHAP 3 (ujian.html)
**Tanggal:** 06 Juni 2026  
**File diubah:** `public/ujian.html`

---

## ✨ Fitur Baru & Perubahan

### 3.1 Fullscreen Otomatis
- Fungsi `enterFullscreen()` baru — memanggil Fullscreen API lintas browser (standard, webkit, moz, ms)
- Dipanggil otomatis setelah soal berhasil diload di `renderExam()`
- Deteksi iOS Safari: menampilkan toast peringatan, tidak error
- Listener `fullscreenchange` + `webkitfullscreenchange`: keluar fullscreen = pelanggaran (`handleViolation('keluar_fullscreen')`)
- Fungsi `showToast()` baru untuk notifikasi ringan non-blocking
- Fungsi `handleViolation(reason)` sebagai wrapper `triggerViolation()` (extensible untuk future)

### 3.2 Volume Alarm Dimaksimalkan (AudioContext)
- `initAudio()` diupgrade: tambah `masterGain` (gain = 1.0) dan `DynamicsCompressorNode` di chain
- Chain audio: `oscillator → gain → masterGain → compressor → destination`
- **Semua** fungsi alarm diupdate: `playBeep`, `playWarning`, `playSirene`, `playLongBeep`, `playAlarmClock`
  - Semua `gain.gain.setValueAtTime` diubah dari `0.3`/`0.4`/`0.5` → **`1.0`**
  - Semua `gain.connect(audioCtx.destination)` → **`gain.connect(masterGain)`**
  - `exponentialRampToValueAtTime` diubah dari `0.00001` → `0.01` (aman, tidak error)
  - `playBeep` kini pakai `osc.type = 'square'` + frekuensi 800Hz (lebih keras dan tajam)

### 3.3 Lock Navigasi Soal (Anti-Cheat)
- `goToQuestion(idx)`: cek `idx < state.currentIndex` → tampil toast "hanya bisa maju", return
- `prevQuestion()`: hanya tampil toast peringatan, tidak pindah soal
- `updateNavButtons()`: tombol "Sebelumnya" selalu `disabled = true` (backward locked)
- Navigator bawah (`.q-nav-item`): soal yang sudah dilewati masih kelihatan tapi tidak bisa diklik balik

### 3.4 Standardisasi Field Login
- `startAutosave()`: field sudah konsisten `userId` lowercase — tidak ada duplikasi

### 3.5 Hapus console.log Debug
- Dihapus: `console.error(e)` di `init()`
- Dihapus: `console.error(err)` di `triggerViolation()`
- Dihapus: `console.error(e)` di `submitExam()`
- Dihapus: `console.log('Autosave gagal')` di `startAutosave()`

---

## 📋 Checklist TAHAP 3
- [x] `enterFullscreen()` dipanggil setelah soal diload
- [x] `fullscreenchange` listener ada (keluar fullscreen = pelanggaran)
- [x] Deteksi iOS Safari tampilkan peringatan toast
- [x] AudioContext `masterGain` = 1.0
- [x] `DynamicsCompressorNode` di chain audio
- [x] Semua alarm connect ke `masterGain`, bukan langsung `destination`
- [x] `goToQuestion()` lock backward (tidak bisa kembali ke soal sebelumnya)
- [x] Tombol "Sebelumnya" dinonaktifkan (disabled)
- [x] Field `userId` lowercase konsisten di autosave
- [x] Semua `console.log` / `console.error` debug dihapus

---

## ⚠️ Catatan Penting
- Fullscreen memerlukan **interaksi pengguna** sebelumnya (browser policy). Karena login dilakukan sebelum halaman ujian, ini terpenuhi otomatis.
- Di browser yang tidak support Fullscreen API (browser lama), fullscreen akan silent-fail — ujian tetap berjalan.
- Lock navigasi hanya berlaku satu arah: siswa bisa maju ke soal nomor berapa saja, tapi tidak bisa kembali.
- Perubahan ini tidak mengubah struktur database atau endpoint server.

---
# PATCHNOTES — TAHAP 4 Part 1 (admin.html)
**Tanggal:** 06 Juni 2026  
**File diubah:** `public/admin.html`

---

## ✨ Fitur Baru & Perubahan

### 4.1 Auth Check & Redirect
- `checkAdminAuth()` dipanggil di awal `initApp()` — jika belum login, redirect ke `/admin-login.html`
- Jika request ke `/check-admin-auth` error/gagal, redirect otomatis ke `/admin-login.html`
- Panel sama sekali tidak dimuat sebelum auth terkonfirmasi

### 4.2 Tombol Logout
- Fungsi `logoutAdmin()` ditambah — memanggil `POST /logout-admin` lalu redirect ke `/admin-login.html`
- Tombol logout ditambahkan di bagian bawah sidebar dengan ikon Material Icons `logout`
- Warna tombol merah soft agar mudah dikenali

### 4.3 Bulk Delete Siswa
- Checkbox "check all" ditambahkan di header tabel siswa (`id="checkAllSiswa"`)
- Setiap baris siswa kini memiliki checkbox individual (`class="check-siswa"`)
- Fungsi `toggleCheckAllSiswa()` — centang/uncentang semua checkbox sekaligus
- Fungsi `hapusTerpilih()` — hapus semua siswa yang dicentang via `DELETE /delete-siswa-bulk`
  - Validasi minimal 1 siswa dipilih
  - Konfirmasi modal sebelum hapus
  - Loading state saat proses berjalan
  - Toast sukses/error setelah selesai
  - Refresh tabel dan dashboard otomatis
- Tombol "Hapus Terpilih" dengan ikon Material Icons `delete` ditambah di atas tabel siswa

### 4.4 Material Icons — Ganti Emoji Sidebar
- CDN Material Icons ditambah di `<head>`: `https://fonts.googleapis.com/icon?family=Material+Icons`
- CSS `.sidebar .material-icons` ditambah (font-size 20px, vertical-align middle, margin-right 8px)
- Semua emoji di navigasi sidebar diganti ke Material Icons:

| Sebelum (Emoji) | Sesudah (Material Icons) |
|---|---|
| 📊 Dashboard | `dashboard` |
| 📚 Bank Soal | `menu_book` |
| 👥 Data Siswa | `people` |
| 📝 Setting Ujian | `assignment` |
| 📈 Hasil & Monitoring | `assessment` |
| 🛡️ Keamanan | `security` |
| ⚙️ Pengaturan | `settings` |
| *(baru)* Logout | `logout` |

### 4.5 Kurangi Tema dari 8 ke 4
- **Dihapus:** CSS dan opsi tema `orange`, `pink`, `teal`, `brown`
- **Tersisa:** `green` (Hijau), `blue` (Biru), `purple` (Ungu), `dark` (Gelap)
- Dropdown tema admin panel dan dropdown tema login siswa keduanya diupdate hanya menampilkan 4 tema

---

## 📋 Checklist TAHAP 4 Part 1
- [x] Check auth redirect ke `/admin-login.html` jika belum login
- [x] Tombol logout berfungsi (`POST /logout-admin`)
- [x] Checkbox "check all" di header tabel siswa
- [x] Checkbox per row siswa
- [x] Tombol "Hapus Terpilih" berfungsi via `DELETE /delete-siswa-bulk`
- [x] Material Icons CDN ditambah di `<head>`
- [x] CSS `.sidebar .material-icons` ditambah
- [x] Semua emoji di sidebar diganti Material Icons
- [x] Tema dikurangi dari 8 ke 4 (hijau, biru, ungu, gelap)
- [x] CSS tema orange/pink/teal/brown dihapus

---

## ⚠️ Catatan
- Endpoint yang dibutuhkan (`/check-admin-auth`, `/logout-admin`, `/delete-siswa-bulk`) sudah dibuat di **TAHAP 1**.
- Jika user membuka `/admin` tanpa login, akan langsung redirect ke `/admin-login.html` tanpa sempat render halaman.
- Tema yang sebelumnya disimpan di `db.json` dengan nilai `orange`/`pink`/`teal`/`brown` akan fallback ke tema default `green` secara otomatis karena opsi tersebut tidak ada lagi di dropdown.

---
# PATCHNOTES — TAHAP 5 Part 2 (admin.html)
**Tanggal:** 06 Juni 2026  
**File diubah:** `public/admin.html`

---

## ✨ Fitur Baru & Perubahan

### 5.1 Badge Kelas Bisa Diklik (Filter Bank Soal)
- Badge kelas di daftar bank soal diubah dari `<span>` menjadi `<button>` dengan class `kelas-badge`
- Klik badge kelas → filter daftar bank soal hanya menampilkan paket kelas tersebut
- Klik ulang badge yang sama → filter direset (toggle behavior)
- Bar filter aktif muncul di atas daftar bank soal saat filter aktif, menampilkan label kelas yang difilter
- Fungsi `filterBankByKelas(kelas)` ditambah
- Fungsi `resetBankFilter()` ditambah
- Tombol "Reset Filter" dengan ikon `filter_alt_off` ditambah di filter bar
- CSS `.kelas-badge` ditambah (cursor pointer + hover opacity)

### 5.2 Preview Soal Grid Card
- Fungsi `previewBankSoal()` diupgrade dari tampilan list panjang ke **grid card 3 kolom** (responsive: 2 kolom di md, 3 kolom di lg)
- Setiap card menampilkan:
  - Badge tipe soal dengan warna berbeda: `PG` (biru), `ESAI` (kuning), `MENJODOHKAN` (cyan), `KOMPLEKS` (hijau)
  - Nomor soal di pojok kanan
  - Preview 80 karakter pertama konten soal (terpotong rapi)
  - Jumlah pilihan jawaban dengan ikon Material Icons `list`
  - Badge kunci jawaban di kanan bawah card
- CSS `.text-truncate-3` ditambah (clamp 3 baris)
- Tombol Preview di daftar bank soal diganti pakai ikon Material Icons `visibility`

### 5.3 Tab Koreksi Esai (Baru)
- Menu "Koreksi Esai" dengan ikon `edit_note` ditambah di sidebar antara Keamanan dan Pengaturan
- Section baru `id="koreksi"` ditambah di main content
- **Filter** per paket soal dan per kelas
- **Tabel koreksi** menampilkan per siswa per soal esai:
  - Nomor urut
  - Nama siswa + username
  - Kelas
  - Preview soal esai (60 karakter)
  - Jawaban siswa (80 karakter, truncate)
  - Input nilai (0–100)
  - Tombol simpan individual dengan ikon `save`
- Fungsi `populateKoreksiFilters()` — mengisi dropdown filter dari data `allBanks` dan `allSiswa`
- Fungsi `loadKoreksiEsai()` — filter dan render tabel koreksi dari data lokal
- Fungsi `simpanNilaiKoreksi(siswaId, inputId)` — kirim `POST /update-nilai-esai`
  - Feedback visual: `is-valid` (hijau) jika berhasil, `is-invalid` (merah) jika gagal
  - Update data lokal `allSiswa` agar tidak perlu reload
- `populateKoreksiFilters()` dipanggil otomatis di `loadAllData()` setiap kali data direfresh
- `loadKoreksiEsai` didaftarkan ke nav loader sehingga tabel otomatis dimuat saat tab dibuka

---

## 📋 Checklist TAHAP 5
- [x] Badge kelas di bank soal jadi `<button>` dengan onclick filter
- [x] Fungsi `filterBankByKelas()` toggle filter aktif/nonaktif
- [x] Bar filter aktif + tombol "Reset Filter" dengan ikon `filter_alt_off`
- [x] Preview soal tampil dalam grid card 3 kolom (responsive)
- [x] Card preview punya badge tipe soal (PG/ESAI/KOMPLEKS/MENJODOHKAN) dengan warna berbeda
- [x] Card preview tampilkan 80 karakter pertama konten soal
- [x] Card preview tampilkan jumlah pilihan jawaban
- [x] Card preview tampilkan kunci jawaban
- [x] Tab "Koreksi Esai" ada di sidebar menu (ikon `edit_note`)
- [x] Section koreksi esai dengan tabel 7 kolom
- [x] Filter per paket soal dan kelas berfungsi
- [x] Input nilai esai (0–100) per siswa per soal esai
- [x] Tombol simpan nilai esai dengan validasi visual (is-valid/is-invalid)
- [x] `populateKoreksiFilters()` dipanggil otomatis saat data dimuat

---

## ⚠️ Catatan
- Endpoint `POST /update-nilai-esai` sudah tersedia sejak Tahap 1 (server.js).
- Koreksi esai di tabel baru menggunakan nilai esai global per siswa (`nilaiEsai`), sesuai skema `db.json` yang ada.
- Jika siswa belum selesai ujian, tidak akan muncul di tabel koreksi.

---
# PATCHNOTES — TAHAP 6 Part 3 (admin.html)
**Tanggal:** 06 Juni 2026  
**File diubah:** `public/admin.html`

---

## ✨ Fitur Baru & Perubahan

### 6.1 Upload Logo Sekolah
- Card baru "Logo Sekolah" ditambahkan di awal section Pengaturan (sebelum card Identitas Sekolah)
- Preview logo aktif: menampilkan `logo_sekolah.png` dari server jika ada
- Fallback placeholder otomatis dengan ikon `school` (Material Icons) jika logo tidak ditemukan
- Input file dengan `accept="image/*"` + preview real-time via `FileReader` sebelum upload
- Fungsi `previewLogoFile()` ditambah — preview gambar instan saat file dipilih
- Fungsi `uploadLogo()` ditambah — kirim `POST /upload-logo` via `FormData`
  - Loading state saat proses upload
  - Toast sukses/gagal setelah selesai
  - Semua `<img>` bertag `logo_sekolah` di halaman otomatis direfresh dengan cache-busting `?t=timestamp`
  - Input file di-reset setelah upload berhasil

### 6.2 Toggle Dark Mode
- Tombol "Mode Gelap" / "Mode Terang" ditambahkan di sidebar, di atas tombol Logout
- Style tombol menyatu dengan sidebar (background transparan, border putih tipis)
- Fungsi `toggleDarkMode()` ditambah:
  - Toggle class `theme-dark` pada `body`
  - State disimpan di `localStorage` dengan key `cbt_dark_mode`
  - Tema sebelumnya disimpan ke `cbt_saved_theme` agar bisa dipulihkan saat mode terang diaktifkan kembali
  - Icon toggle berubah: `dark_mode` ↔ `light_mode`
  - Teks tombol berubah: "Mode Gelap" ↔ "Mode Terang"
- IIFE `initDarkMode()` dipanggil saat halaman load untuk memulihkan state dark mode dari localStorage
- Fungsi `applyTheme()` diupdate: tidak override `theme-dark` jika dark mode toggle sedang aktif

### 6.3 CSS Dark Mode Overrides
Blok CSS `body.theme-dark` diperluas dengan override komprehensif:
- `.card`, `.card-header-custom` — background gelap, teks terang
- `.form-control`, `.form-select` — background dan border gelap
- `.table`, `.table thead th`, `.table tbody tr:hover` — teks dan warna sesuai
- `.config-item`, `.confirm-box`, `.modal-content` — background gelap
- `.alert`, `.text-muted`, `.badge.bg-light`, `.kelas-check` — kontras disesuaikan
- `.loading-overlay`, `.rekap-item:hover` — ditambah

### 6.4 Standardisasi Field Pengaturan
Semua field di `simpanPengaturanLengkap()` sudah menggunakan lowercase camelCase:
- `namaSekolah`, `namaAplikasi`, `ukuranSekolah`, `ukuranAplikasi`
- `tema`, `temaLogin`, `layoutLogin`

---

## 📋 Checklist TAHAP 6
- [x] UI upload logo di section Pengaturan (card terpisah di atas Identitas Sekolah)
- [x] Preview logo aktif dari server (`/logo_sekolah.png`)
- [x] Fallback placeholder ikon `school` jika logo tidak ada
- [x] Preview logo lokal sebelum upload (FileReader)
- [x] Upload logo via `POST /upload-logo`
- [x] Logo terefresh otomatis setelah upload (cache-busting)
- [x] Input file di-reset setelah upload berhasil
- [x] Tombol toggle dark mode di sidebar (di atas Logout)
- [x] Dark mode state tersimpan di `localStorage`
- [x] Icon toggle berubah (`dark_mode` ↔ `light_mode`)
- [x] Teks tombol berubah ("Mode Gelap" ↔ "Mode Terang")
- [x] State dark mode dipulihkan saat halaman reload (`initDarkMode`)
- [x] CSS `theme-dark` diperluas (card, form, table, modal, dll)
- [x] `applyTheme()` tidak override dark mode toggle
- [x] Semua field pengaturan pakai lowercase camelCase
- [x] Tidak ada emoji baru — semua ikon pakai Material Icons

---

## ⚠️ Catatan
- Endpoint `POST /upload-logo` sudah tersedia sejak Tahap 1 (server.js).
- Dark mode toggle bersifat **sementara per-session**: tidak mengubah pengaturan tema di database, hanya `localStorage` browser.
- Jika user memilih tema dari dropdown Pengaturan → Simpan, tema baru akan diterapkan dan dark mode toggle akan reset ke kondisi mati.
- Dark mode dan tema `theme-dark` dari dropdown adalah dua hal berbeda: toggle (sidebar) = preferensi tampilan personal; dropdown tema = setting sistem yang tersimpan ke db.

---
# PATCHNOTES — TAHAP 7 (index.html)
**Tanggal:** 06 Juni 2026  
**File diubah:** `public/index.html`

---

## ✨ Fitur Baru & Perubahan

### 7.1 Load Logo Sekolah
- `<div class="school-icon">` kosong diganti dengan struktur logo + fallback
- `<img id="schoolLogo">` menampilkan `/logo_sekolah.png` dari server
- Jika logo tidak ada / gagal load, `onerror` otomatis menyembunyikan `<img>` dan menampilkan fallback
- Fallback: `<div id="schoolIconFallback">` dengan ikon Material Icons `school` (48px)
- Wrapper `school-icon-wrapper` ditambahkan agar layout tetap rapi

### 7.2 Material Icons CDN
- CDN ditambahkan di `<head>`:  
  `https://fonts.googleapis.com/icon?family=Material+Icons`
- Dekorasi melayang (float-decoration) diubah dari emoji ke Material Icons:
  - `📚` → `menu_book`
  - `✏️` → `edit`
  - `🎓` → `school`

### 7.3 Kurangi Tema dari 8 ke 4
- **Dihapus** CSS tema: `theme-orange`, `theme-pink`, `theme-teal`, `theme-brown`
- **Tersisa:** `green` (default di `:root`), `theme-blue`, `theme-purple`, `theme-dark`
- Array `classList.remove()` di `loadSettings()` juga diupdate — tidak lagi menyebut 4 tema yang dihapus

### 7.4 Fix Penamaan Field Login
- `body: JSON.stringify({ Username: Username, username: Username })` → **`{ username: Username }`**
  - Hapus duplikasi field
  - Hapus versi kapital `Username`
- Input field diupdate:
  - `id="UsernameInput"` → **`id="username"`**
  - Ditambah **`name="username"`** (sebelumnya tidak ada `name`)
  - Dihapus `inputmode="numeric"` (username bisa berisi huruf, bukan hanya angka)
  - `<label for="...">` diupdate sesuai id baru
- Semua referensi `getElementById('UsernameInput')` di JavaScript → **`getElementById('username')`**

### 7.5 Hapus console.log Debug
- Dihapus: `console.warn('Gagal muat pengaturan...')`
- Dihapus: `console.error('Gagal simpan sessionStorage...')`
- Dihapus: `console.error('Error login...')`
- Dihapus: `console.error('Error init...')`
- Dihapus: `window.onerror` handler global
- Dihapus: `window.addEventListener('unhandledrejection')` handler

---

## 📋 Checklist TAHAP 7
- [x] `<img id="schoolLogo">` dengan `onerror` fallback ke Material Icons
- [x] `<div id="schoolIconFallback">` dengan ikon `school`
- [x] Material Icons CDN ditambah di `<head>`
- [x] Dekorasi melayang diubah dari emoji ke Material Icons
- [x] CSS tema orange/pink/teal/brown dihapus
- [x] Hanya 4 tema tersisa: green, blue, purple, dark
- [x] `classList.remove()` diupdate (tidak sebut tema yang sudah dihapus)
- [x] Field login hanya kirim `username` (huruf kecil, tidak duplikat)
- [x] Input field `id="username"` dan `name="username"`
- [x] `inputmode="numeric"` dihapus
- [x] Semua referensi `UsernameInput` → `username`
- [x] Semua `console.log/warn/error` debug dihapus

---

## ⚠️ Catatan
- Tidak ada perubahan di `server.js` atau `db.json` untuk tahap ini.
- Logo `/logo_sekolah.png` tetap diload dari server — akan tampil jika sudah diupload via fitur **Upload Logo** di Pengaturan (Tahap 6).
- Field `Username` kapital di server.js (jika ada) sudah dihandle di Tahap 1 — server menerima `username` lowercase.

---
# PATCHNOTES — TAHAP 8 Final (package.json + Checklist)
**Tanggal:** 06 Juni 2026  
**File diubah:** `package.json` (tidak ada perubahan — sudah lengkap)

---

## 8.1 Status package.json

Package.json yang diupload **sudah lengkap dan tidak perlu diubah**.

Semua dependency yang dibutuhkan sudah ada:

| Package | Versi | Status |
|---|---|---|
| `express` | ^5.2.1 | ✅ Ada |
| `lowdb` | ^1.0.0 | ✅ Ada |
| `socket.io` | ^4.8.3 | ✅ Ada (dependency, tidak dipakai di runtime) |
| `multer` | ^2.1.1 | ✅ Ada |
| `mammoth` | ^1.12.0 | ✅ Ada |
| `xlsx` | ^0.18.5 | ✅ Ada |
| `cookie-parser` | ^1.4.0 | ✅ Ada |

Scripts juga sudah lengkap:
- `npm start` → `node server.js`
- `npm run dev` → `nodemon server.js`

---

## 8.2 Final Checklist Global — Semua Tahap

### 🔐 Keamanan & Anti-Cheat
- [x] Admin tidak bisa diakses tanpa login (`/admin` redirect ke `/admin-login.html`) — *Tahap 1 & 4*
- [x] Password admin bisa diset pertama kali via UI (first-time setup) — *Tahap 2*
- [x] Fullscreen aktif otomatis saat ujian dimulai — *Tahap 3*
- [x] Keluar fullscreen → pelanggaran tercatat via `fullscreenchange` listener — *Tahap 3*
- [x] Volume alarm dimaksimalkan (gain = 1.0, DynamicsCompressor) — *Tahap 3*
- [x] Navigasi soal lock backward (tidak bisa kembali ke soal sebelumnya) — *Tahap 3*
- [x] iOS Safari terdeteksi dan tampil peringatan toast — *Tahap 3*

### ⚙️ Fungsional
- [x] Siswa bisa dihapus massal (checkbox + `DELETE /delete-siswa-bulk`) — *Tahap 1 & 4*
- [x] Preview soal tampil dalam grid card 3 kolom dengan badge tipe soal — *Tahap 5*
- [x] Badge kelas di bank soal bisa diklik untuk filter (toggle) — *Tahap 5*
- [x] Logo sekolah bisa diupload via admin (`POST /upload-logo`) — *Tahap 1 & 6*
- [x] Dark mode toggle berfungsi dan state tersimpan di `localStorage` — *Tahap 6*
- [x] Panel koreksi esai ada di admin dengan tabel 7 kolom — *Tahap 5*
- [x] Filter koreksi esai per paket soal & kelas berfungsi — *Tahap 5*

### 🎨 UI/UX & Kebersihan
- [x] Tema dikurangi dari 8 ke 4 (hijau, biru, ungu, gelap) — *Tahap 4 & 7*
- [x] Tidak ada emoji di navigasi admin (sudah pakai Material Icons) — *Tahap 4*
- [x] Tidak ada emoji di dekorasi login siswa (sudah pakai Material Icons) — *Tahap 7*
- [x] Semua `console.log` debug dihapus dari production code — *Tahap 3 & 7*
- [x] Socket.IO dibersihkan total dari `server.js` — *Tahap 1*
- [x] Penamaan variabel konsisten (`username` lowercase di semua file) — *Tahap 3 & 7*
- [x] `cookie-parser` terinstall dan digunakan di `server.js` — *Tahap 1*
- [x] `adminAuth` ada di `db.json` default — *Tahap 1*

---

## 🚀 Langkah Install Final

Jalankan perintah ini **satu kali** setelah semua file diganti:

```bash
npm install
```

Lalu jalankan server:

```bash
npm start
```

Buka browser: `http://localhost:3001/admin`

---

## 📁 Rekap File yang Diubah Per Tahap

| Tahap | File | Perubahan Utama |
|---|---|---|
| 1 | `server.js` | Auth admin, proteksi endpoint, upload logo, bulk delete, hapus Socket.IO |
| 2 | `public/admin-login.html` | File baru — halaman login admin |
| 3 | `public/ujian.html` | Fullscreen, alarm volume, lock navigasi, hapus console.log |
| 4 | `public/admin.html` | Auth check, logout, bulk delete UI, Material Icons, kurangi tema |
| 5 | `public/admin.html` | Badge filter kelas, preview grid card, tab koreksi esai |
| 6 | `public/admin.html` | Upload logo UI, dark mode toggle, CSS dark mode |
| 7 | `public/index.html` | Load logo sekolah, kurangi tema, fix field login, hapus console.log |
| 8 | `package.json` | Tidak ada perubahan — sudah lengkap |

