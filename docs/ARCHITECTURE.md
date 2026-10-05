# REDIGMA Magang Capstone
# System Architecture

## 1. Document Purpose

Dokumen ini menjadi acuan teknis untuk pembangunan Sistem Informasi Pengelolaan dan Monitoring Peserta Magang REDIGMA.

Dokumen digunakan sebagai blueprint sebelum implementasi aplikasi dan menjadi penghubung antara:

- kebutuhan bisnis Human Capital REDIGMA;
- proposal Capstone Project;
- ERD;
- database schema;
- Supabase migration;
- frontend;
- backend;
- authentication;
- authorization;
- deployment.

Dokumen ini tidak menggantikan ERD atau database schema. ERD dan database schema tetap menjadi sumber acuan utama untuk struktur data.

---

# 2. System Objective

Sistem bertujuan membantu Human Capital REDIGMA mengelola informasi pengajuan magang dan peserta magang secara lebih terstruktur.

Sistem mencakup:

1. pencatatan pengajuan magang;
2. pencatatan informasi institusi;
3. pencatatan jurusan;
4. pencatatan posisi;
5. pencatatan peserta;
6. pencatatan penempatan;
7. monitoring status pengajuan;
8. monitoring status peserta;
9. pencatatan riwayat perubahan status;
10. pencarian dan penyaringan data.

Sistem difokuskan untuk penggunaan internal Human Capital REDIGMA.

---

# 3. Scope

## 3.1 In Scope

### Application Management

Pengelolaan pengajuan:

- PKL;
- Magang Mandiri.

Data utama pengajuan meliputi:

- jenis pengajuan;
- institusi;
- tanggal pengajuan;
- PIC;
- tahapan proses;
- keputusan;
- nomor KOP;
- tanggal konfirmasi;
- tanggal pengajuan/proposed internship;
- tanggal yang telah disetujui;
- catatan.

### Application Details

Untuk pengajuan yang membutuhkan detail peserta:

- jurusan;
- posisi yang diminta;
- jumlah peserta yang diminta;
- jumlah peserta yang disetujui;
- catatan.

### Participant Management

Pengelolaan peserta magang:

- nama;
- email;
- nomor telepon;
- pengajuan;
- detail pengajuan;
- jurusan;
- posisi berdasarkan permintaan;
- posisi berdasarkan keputusan HC;
- tanggal mulai;
- tanggal selesai;
- status;
- catatan administrasi.

### Monitoring

Sistem menyediakan monitoring terhadap:

- pengajuan;
- tahapan proses;
- keputusan;
- tanggal;
- peserta;
- status peserta;
- penempatan;
- riwayat perubahan.

### History

Perubahan status pengajuan dicatat melalui:

`application_status_logs`

Data historis peserta tetap dipertahankan setelah program magang selesai.

---

# 4. Out of Scope

Fitur berikut tidak termasuk dalam MVP:

- portal publik pendaftaran;
- payroll;
- absensi karyawan reguler;
- penilaian kinerja;
- sistem recruitment umum;
- pengelolaan seluruh data Human Capital;
- otomatisasi WhatsApp;
- integrasi API eksternal;
- AI matching posisi;
- rekomendasi posisi berbasis AI.

Fitur tambahan hanya dapat ditambahkan setelah kebutuhan dan validasinya disepakati.

---

# 5. High-Level Architecture

Sistem menggunakan arsitektur aplikasi web dengan pemisahan:

```text
┌──────────────────────────────────────────┐
│              User / Browser              │
└────────────────────┬─────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────┐
│             Next.js Application          │
│                                          │
│  ┌────────────┐     ┌─────────────────┐ │
│  │   Pages /  │     │ Server Actions  │ │
│  │ Components │     │ / Server Logic  │ │
│  └────────────┘     └────────┬────────┘ │
│                              │          │
│                         Supabase Client │
└──────────────────────────────┼──────────┘
                               │
                               ▼
┌──────────────────────────────────────────┐
│               Supabase                   │
│                                          │
│  ┌──────────────┐    ┌────────────────┐ │
│  │ PostgreSQL   │    │ Supabase Auth  │ │
│  │ Database     │    │                │ │
│  └──────────────┘    └────────────────┘ │
│                                          │
│             Row Level Security           │
└──────────────────────────────────────────┘