# REDIGMA Magang — Capstone Project

Aplikasi Web Manajemen Pengajuan & Peserta Magang (PKL & Magang Mandiri) untuk Tim Human Capital REDIGMA.

---

## 🚀 Ringkasan Sistem

REDIGMA Magang adalah platform internal terintegrasi untuk mengelola seluruh siklus hidup program magang, mulai dari penerimaan dokumen surat pengajuan institusi, alokasi jurusan dan kuota, penugasan posisi oleh Human Capital, pencatatan data riil peserta, monitoring absensi/periode, hingga audit log riwayat perubahan status.

### Modul Utama:
1. **Dashboard (`/dashboard`)**: KPI metrik pengajuan & peserta, grafik komposisi status, serta daftar pengajuan yang memerlukan perhatian segera.
2. **Pengajuan Magang (`/pengajuan`)**: Manajemen permohonan PKL sekolah dan Magang Mandiri, rincian jurusan, posisi yang diminati, kuota diajukan/disetujui, dan alur konfirmasi surat.
3. **Peserta Magang (`/peserta`)**: Pendaftaran data identitas peserta, penugasan nyata oleh HC (*positioning by HC*), dan pencatatan tanggal pelaksanaan riil.
4. **Monitoring Magang (`/monitoring`)**: Tabulasi terpadu kuota pengajuan dan keaktifan peserta di kantor.
5. **Riwayat Log Status (`/riwayat`)**: Log audit terpusat atas setiap perubahan tahap dan keputusan pengajuan.
6. **Master Data (`/master`)**: Pengelolaan data master Institusi, Jurusan/Program Studi, dan Posisi penempatan.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Server Actions, Turbopack)
- **Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security, Supabase Auth)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: Heroicons SVG

---

## ⚙️ Memulai Pengembangan

### 1. Kloning & Instalasi Dependensi
```bash
git clone <repository-url>
cd redigma-magang-capstone
npm install
```

### 2. Konfigurasi Environment Variables
Buat file `.env.local` pada direktori root:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Perhatian:** File `.env.local` berisi kunci konfigurasi lingkungan dan tidak pernah dikomit ke repositori Git.

### 3. Menjalankan Server Lokal
```bash
npm run dev
```
Akses aplikasi melalui peramban di `http://localhost:3000`.

### 4. Validasi Kode & Kompilasi
```bash
# Validasi tipe TypeScript
npm run typecheck

# Validasi kompilasi build produksi Next.js
npm run build
```

---

## 🔒 Keamanan & Kebijakan RLS

- Seluruh 11 tabel basis data dilindungi dengan PostgreSQL Row Level Security (RLS).
- Mutasi data dibatasi khusus bagi staf Human Capital aktif (`public.is_hc_user()`).
- Proteksi rute internal dikelola di tingkat server menggunakan konvensi Next.js 16 (`proxy.ts`).
