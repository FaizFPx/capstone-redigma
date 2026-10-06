# Business Flow
## Sistem Informasi Pengelolaan dan Monitoring Peserta Magang REDIGMA

**Project:** Capstone Project  
**Organization:** REDIGMA  
**Status:** Draft  
**Version:** 1.0

---

# 1. Tujuan Dokumen

Dokumen ini mendeskripsikan alur bisnis yang akan digunakan sebagai dasar
perancangan sistem informasi pengelolaan dan monitoring peserta magang REDIGMA.

Alur disusun berdasarkan proses yang tercermin pada spreadsheet
`INPUT_PENGAJUAN_MAGANG.xlsx`, hasil wawancara dengan Human Capital,
serta kebutuhan sistem yang telah dirumuskan dalam `REQUIREMENTS.md`.

Dokumen ini berfungsi sebagai dasar untuk perancangan database,
user flow, dan implementasi aplikasi.

---

# 2. Aktor

## 2.1 Human Capital

Human Capital merupakan aktor utama dalam proses operasional.

Tanggung jawab:

- Mencatat pengajuan.
- Mengelola informasi institusi.
- Mencatat detail pengajuan.
- Memantau deadline.
- Mencatat tahapan proses.
- Mencatat keputusan.
- Mencatat penempatan.
- Mengelola data peserta.
- Memperbarui status peserta.
- Memantau data magang.

---

## 2.2 Head of Human Capital

Head of Human Capital berperan sebagai pengguna dan peninjau informasi.

Tanggung jawab awal:

- Meninjau pengajuan.
- Meninjau informasi posisi/divisi.
- Meninjau kapasitas yang tersedia apabila data kapasitas telah tersedia.
- Memantau status pengajuan.
- Memantau peserta.

Detail kewenangan perubahan data akan ditentukan melalui validasi kebutuhan.

---

# 3. Konsep Umum Proses

Sistem menangani dua jenis pengajuan:

1. PKL Sekolah
2. Magang Mandiri

Kedua jenis pengajuan menggunakan konsep dasar:

```text
Pengajuan
    ↓
Tahapan Proses
    ↓
Keputusan
    ↓
Penempatan
    ↓
Peserta
    ↓
Status Magang