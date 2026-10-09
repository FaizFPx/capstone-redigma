# REDIGMA Magang — Capstone Project

> **Sistem Informasi Manajemen Pengajuan & Monitoring Peserta Magang (PKL & Magang Mandiri) untuk Tim Human Capital REDIGMA.**

Aplikasi web terintegrasi yang mendigitalisasi dan memodernisasi pengelolaan siklus hidup program magang/PKL di PT REDIGMA—beralih dari pencatatan spreadsheet manual (`INPUT_PENGAJUAN_MAGANG.xlsx`) menuju sistem terpusat berbasis basis data relasional dengan pengawasan kuota, otomatisasi status, dan audit log lengkap.

---

## 🌟 Fitur Utama & Pembaruan Terkini

### 1. 🧭 Panduan Cepat & Alur Kerja Terpandu (*Self-Guiding Workflow*)
- **Dashboard Quick Start Guide**: Banner interaktif di dashboard yang memandu staf HC memahami 4 tahapan alur magang secara terstruktur:
  1. **Catat Pengajuan**: Registrasi surat permohonan magang (PKL / Magang Mandiri).
  2. **Tindak Lanjut & Keputusan**: Verifikasi kuota per jurusan, tahap disposisi, dan keputusan penerimaan.
  3. **Daftarkan Peserta**: Registrasi data identitas peserta dari pengajuan yang telah disetujui.
  4. **Pantau Masa Magang**: Pengawasan periode aktif, kuota terisi, hingga kelulusan peserta.
- Menyediakan tombol aksi cepat (*Quick Action*) langsung menuju form pembuatan pengajuan baru.

### 2. ⚡ Transisi Status Cepat (*Quick Status Transitions*)
- **Quick Status Pengajuan**: Modal pembaruan instan tahap (`belum_ditanggapi` / `sudah_ditanggapi`) dan keputusan (`dalam_proses`, `diterima`, `ditolak`) disertai catatan audit tanpa perlu masuk ke form edit penuh. Dilengkapi umpan balik visual kelayakan pendaftaran peserta.
- **Quick Lifecycle Peserta**: Aksi transisi status 1-klik untuk siklus hidup peserta:
  - `belum_mulai` ➔ **"Mulai Magang"** (mengubah status ke `sedang_magang` dan mencatat `actual_start_date`).
  - `sedang_magang` ➔ **"Selesaikan Magang"** (mengubah status ke `sudah_selesai` dan mencatat `actual_end_date`).
  - Otomatis memvalidasi input tanggal riil dan mencegah transisi status ilegal.

### 3. ⏳ Perhitungan Sisa Masa Magang Real-Time & Badge Urgensi
- Logika kalkulasi sisa hari magang yang tahan perbedaan zona waktu (*timezone-safe*) di [`lib/utils/date.ts`](file:///c:/MataKuliah/CAPSTONE/redigma-magang-capstone/lib/utils/date.ts).
- 5 klasifikasi urgensi visual dinamis:
  - **Normal** (> 14 hari tersisa) — Badge Hijau
  - **Mendekati Selesai** (8–14 hari tersisa) — Badge Kuning Muda
  - **Segera Selesai** (1–7 hari tersisa) — Badge Oranye
  - **Berakhir Hari Ini** (0 hari) — Badge Merah dengan animasi denyut (*pulsing*)
  - **Lewat Waktu / Overdue** (< 0 hari) — Badge Abu-abu Peringatan
- Terintegrasi di seluruh tampilan utama: Dashboard, Halaman Peserta, dan Halaman Monitoring.

### 4. 📊 Dashboard Komprehensif & Tabel Peserta Aktif
- Ringkasan KPI metrik: Pengajuan Masuk, Dalam Proses, Disetujui, Peserta Belum Mulai, Sedang Magang, dan Sudah Selesai.
- **Tabel Peserta Aktif (`ActiveInternsTable`)**: Komponen interaktif khusus memantau peserta yang sedang bertugas di kantor dengan:
  - Filter dinamis berdasarkan Institusi, Jurusan, Posisi Penempatan, dan Rentang Sisa Hari.
  - Pencarian cepat instan nama dan identitas.
  - Paginasi rapi (10 baris per halaman) dan tampilan adaptif.

### 5. 👥 Manajemen Peserta Lanjutan (`/peserta`)
- **Navigasi Multi-Tab**: Beralih cepat antara tab *Sedang Magang* (fokus operasional) dan *Semua Peserta* (arsip menyeluruh).
- Penugasan posisi oleh Human Capital (*Positioning by HC*) yang fleksibel membedakan posisi yang diajukan institusi dengan penempatan riil divisi kantor.
- Tombol aksi cepat siklus hidup magang langsung pada tabel daftar peserta.

### 6. 📈 Monitoring Terpadu 4-in-1 (`/monitoring`)
- Panel pengawasan holistik dengan 4 tab terdedikasi:
  1. **Semua Ringkasan**: Ikhtisar gabungan KPI dan status operasional.
  2. **Perlu Perhatian**: Deteksi otomatis permohonan yang melewati batas waktu konfirmasi (*overdue deadline*), mendekati batas waktu (≤ 7 hari), atau belum ditanggapi HC.
  3. **Peserta Magang**: Tabel peserta lengkap dengan indikator sisa hari, tanggal riil, dan status keaktifan.
  4. **Daftar Pengajuan**: Tabulasi surat pengajuan dengan visualisasi kuota diajukan vs disetujui per jurusan.
- Filter pencarian komprehensif (Jenis Pengajuan, Tahap, Keputusan, Status Peserta, Institusi, Jurusan, Posisi, Sisa Waktu) dengan tombol reset instan.

### 7. 🛡️ Validasi Kuota, Penghapusan Aman & Proteksi Data
- **Penegakan Kuota (*Quota Enforcement*)**: Sinkronisasi alokasi kuota per jurusan (`requested_quota` dan `approved_quota`), mencegah pendaftaran peserta melebihi kuota yang telah disetujui.
- **Penghapusan Aman (*Safe/Cascade Delete*)**: Modal konfirmasi penghapusan data peserta dan pengajuan dengan pembersihan relasi aman dan pencatatan audit log.
- **Pencegahan Kehilangan Data Form (`use-unsaved-changes`)**: Dialog peringatan otomatis jika pengguna mencoba meninggalkan halaman saat formulir sedang diisi namun belum disimpan.
- **Standardisasi Format Tanggal Indonesia**: Input dan tampilan seragam `DD/MM/YYYY` (misalnya `15/07/2026`) dengan komponen input kalender interaktif ([`DateInput`](file:///c:/MataKuliah/CAPSTONE/redigma-magang-capstone/components/ui/date-input.tsx)).

---

## 🛠️ Tech Stack & Arsitektur

| Komponen | Teknologi | Keterangan |
|---|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) | App Router, Server Actions, SSR, Turbopack |
| **UI Library** | [React 19](https://react.dev/) | React Server Components & Client Hooks |
| **Bahasa** | [TypeScript 5](https://www.typescriptlang.org/) | Type-safe end-to-end dengan validasi kompilasi ketat |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Styling modern berbasis utility classes |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL 15+) | Database relasional dengan 14 script migrasi |
| **Keamanan** | PostgreSQL Row Level Security (RLS) | Akses terotentikasi & pembatasan mutasi via `is_hc_user()` |
| **Autentikasi** | Supabase SSR Auth | Sesi berbasis HTTP-only cookies aman |

---

## 👥 Aktor & Hak Akses Pengguna

Berdasarkan perancangan bisnis pada [`docs/BUSINESS_FLOW.md`](file:///c:/MataKuliah/CAPSTONE/redigma-magang-capstone/docs/BUSINESS_FLOW.md) dan [`docs/REQUIREMENTS.md`](file:///c:/MataKuliah/CAPSTONE/redigma-magang-capstone/docs/REQUIREMENTS.md):

1. **Human Capital (HC Specialist / Admin)**:
   - Mengelola master data institusi, jurusan, dan posisi.
   - Menerima dan mencatat surat pengajuan permohonan magang (PKL & Mandiri).
   - Menetapkan kuota disetujui, tanggal periode, PIC HC, dan keputusan.
   - Mendaftarkan peserta, mengatur penempatan divisi/posisi, dan memperbarui status magang.
   - Memantau masa aktif peserta hingga kelulusan.
2. **Head of Human Capital (Reviewer / Supervisor)**:
   - Meninjau metrik dashboard, ketersediaan kapasitas kuota, dan laporan monitoring.
   - Memantau pengajuan yang memerlukan tindak lanjut darurat (*urgent deadlines*).

---

## 📁 Struktur Rute Aplikasi

```text
app/
├── (app)/                       # Halaman terproteksi (Khusus Pengguna Terotentikasi)
│   ├── dashboard/               # Ringkasan KPI, Quick Start Guide & Tabel Peserta Aktif
│   ├── pengajuan/               # Daftar pengajuan surat magang
│   │   ├── baru/                # Form pengajuan baru (PKL / Magang Mandiri)
│   │   └── [id]/                # Detail pengajuan, verifikasi kuota, & quick status modal
│   ├── peserta/                 # Daftar peserta magang (Tab Aktif vs Semua)
│   │   ├── baru/                # Form pendaftaran peserta baru
│   │   └── [id]/                # Detail profil peserta & transisi status lifecycle
│   │       └── edit/            # Edit data identitas, jurusan, & posisi penempatan
│   ├── monitoring/              # Panel terpadu 4-in-1 (Ringkasan, Urgent, Peserta, Pengajuan)
│   ├── riwayat/                 # Log audit riwayat perubahan status & mutasi pengajuan
│   └── master/                  # Manajemen Master Data terpusat
│       ├── institusi/           # Master Sekolah / Universitas (sinkronisasi tipe institusi)
│       ├── jurusan/             # Master Jurusan / Program Studi
│       └── posisi/              # Master Posisi Penempatan Magang
├── login/                       # Halaman masuk sistem (Autentikasi HC)
└── layout.tsx                   # Layout global root & metadata aplikasi
```

---

## ⚙️ Panduan Menjalankan Aplikasi

### 1. Prasyarat Sistem
- **Node.js** versi 18.18+ atau 20+
- **npm** versi 9+ atau manajer paket yang kompatibel

### 2. Kloning & Instalasi Dependensi
```bash
git clone <repository-url>
cd redigma-magang-capstone
npm install
```

### 3. Konfigurasi Environment Variables
Buat berkas `.env.local` pada direktori root proyek:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Catatan Keamanan:** File `.env.local` berisi kunci koneksi lingkungan dan tidak boleh dikomit ke repositori publik Git.

### 4. Menjalankan Server Pengembangan Lokal
```bash
npm run dev
```
Akses aplikasi melalui peramban web di `http://localhost:3000`.

### 5. Verifikasi & Pengujian Otomatis
Repositori ini dilengkapi suite pengujian verifikasi logika bisnis, sistem tanggal, dan kompilasi tipe data:

```bash
# 1. Menjalankan verifikasi alur P1 (Sisa masa magang, lifecycle peserta, transisi status)
node scripts/test-p1-verification.mjs

# 2. Menjalankan verifikasi parser format tanggal Indonesia (DD/MM/YYYY)
node scripts/test-date-system.mjs

# 3. Menjalankan validasi tipe TypeScript
npm run typecheck

# 4. Melakukan kompilasi build produksi Next.js
npm run build
```

---

## 🔒 Keamanan & Kebijakan Basis Data (Row Level Security)

Seluruh 14 berkas migrasi pada direktori [`supabase/migrations/`](file:///c:/MataKuliah/CAPSTONE/redigma-magang-capstone/supabase/migrations) menerapkan kebijakan keamanan berstandar tinggi:
- **Enkripsi Sesi**: Token otentikasi dikelola oleh Supabase Auth via SSR cookie adapter.
- **Row Level Security (RLS)**: Diaktifkan secara penuh pada seluruh tabel: `applications`, `participants`, `institutions`, `majors`, `positions`, `application_details`, `application_status_logs`, dan tabel referensi.
- **Fungsi Otorisasi `public.is_hc_user()`**: Menjamin hanya akun staf Human Capital yang aktif di basis data yang diizinkan melakukan operasi Create, Update, dan Delete.
- **Audit Logging Terpusat**: Setiap perubahan tahap dan keputusan pengajuan tercatat secara otomatis pada tabel riwayat `application_status_logs` untuk transparansi audit.

---

## 📚 Dokumentasi Terkait

Untuk pemahaman mendalam mengenai alur bisnis dan perumusan spesifikasi kebutuhan:
- 📄 [Alur Bisnis Lengkap (`docs/BUSINESS_FLOW.md`)](file:///c:/MataKuliah/CAPSTONE/redigma-magang-capstone/docs/BUSINESS_FLOW.md)
- 📄 [Spesifikasi Kebutuhan Sistem (`docs/REQUIREMENTS.md`)](file:///c:/MataKuliah/CAPSTONE/redigma-magang-capstone/docs/REQUIREMENTS.md)

---

&copy; 2026 Tim Capstone Project REDIGMA Magang. All rights reserved.
