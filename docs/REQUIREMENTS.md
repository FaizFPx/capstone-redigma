# Requirements Specification
## Sistem Informasi Pengelolaan dan Monitoring Peserta Magang REDIGMA

**Project:** Capstone Project  
**Organization:** REDIGMA  
**Status:** Draft  
**Version:** 1.0

---

## 1. Tujuan Sistem

Sistem ini dirancang untuk membantu Human Capital REDIGMA dalam mengelola
pengajuan magang/PKL, data peserta, penempatan, timeline tindak lanjut,
serta monitoring status peserta secara terstruktur melalui aplikasi berbasis web.

Sistem merupakan pengembangan dari proses pencatatan yang saat ini dilakukan
menggunakan spreadsheet dan komunikasi internal Human Capital.

---

## 2. Dasar Kebutuhan

Perancangan sistem didasarkan pada:

1. Hasil wawancara dengan Human Capital REDIGMA.
2. Spreadsheet `INPUT_PENGAJUAN_MAGANG.xlsx` yang digunakan oleh Human Capital.
3. Audit struktur sistem Human Capital REDIGMA yang telah dilakukan.
4. Proposal Capstone Project.

Spreadsheet aktual digunakan sebagai referensi utama untuk memahami atribut data,
status, tahapan proses, master data, serta kebutuhan monitoring yang telah berjalan.

---

# 3. Pengguna Sistem

## 3.1 Human Capital

Human Capital merupakan pengguna utama sistem.

Hak dan kebutuhan utama:

- Login ke sistem.
- Melihat dashboard.
- Mengelola data institusi.
- Mencatat pengajuan magang/PKL.
- Mengelola detail pengajuan.
- Mengelola data peserta.
- Menentukan atau mencatat posisi/divisi peserta.
- Menentukan PIC Human Capital.
- Memperbarui tahapan proses.
- Memperbarui keputusan.
- Memperbarui status peserta.
- Memantau deadline dan tindak lanjut.
- Mencari dan memfilter data.

## 3.2 Head of Human Capital

Head of Human Capital berperan sebagai pengguna/peninjau.

Kebutuhan awal:

- Melihat dashboard.
- Melihat pengajuan.
- Melihat status proses.
- Melihat informasi kapasitas dan penempatan.
- Melihat data peserta.
- Melihat monitoring.
- Melakukan peninjauan sesuai hak akses yang diberikan.

Hak perubahan data final akan ditentukan berdasarkan validasi kebutuhan pengguna.

---

# 4. Jenis Pengajuan

Sistem menangani dua jenis pengajuan:

1. PKL Sekolah
2. Magang Mandiri

Keduanya menggunakan konsep pengajuan yang sama secara umum,
tetapi memiliki atribut dan alur yang dapat berbeda.

---

# 5. Modul Sistem

## 5.1 Dashboard

Dashboard menampilkan ringkasan kondisi pengajuan dan peserta.

Informasi yang direncanakan:

- Jumlah pengajuan.
- Pengajuan yang belum ditanggapi.
- Pengajuan yang sudah ditanggapi.
- Pengajuan diterima.
- Pengajuan ditolak.
- Peserta yang belum mulai.
- Peserta yang sedang magang.
- Peserta yang sudah selesai.
- Informasi deadline/tindak lanjut.
- Ringkasan penempatan posisi/divisi.

Dashboard harus mengambil data dari database secara langsung.

---

## 5.2 Pengajuan

Modul Pengajuan merupakan pusat pengelolaan pengajuan magang.

Pengguna dapat:

- Melihat daftar pengajuan.
- Menambahkan pengajuan.
- Melihat detail pengajuan.
- Mengubah data pengajuan.
- Mencari pengajuan.
- Memfilter pengajuan.
- Melihat status proses pengajuan.

Pengajuan memiliki jenis:

- PKL
- Magang Mandiri

---

# 6. Data Pengajuan PKL

Data utama yang perlu dapat dicatat:

- Tanggal Apply
- Bulan Apply
- Nama Sekolah
- Jurusan yang diajukan
- Deadline Konfirmasi
- Tanggal Konfirmasi ke sekolah terkait
- Positioning by Request
- Nomor KOP Surat
- Jumlah siswa yang akan PKL
- Tahapan Proses
- Keputusan Akhir
- Tanggal Mulai Magang
- Tanggal Selesai Magang
- Positioning by HC
- PIC Human Capital
- Status

Atribut tersebut berasal dari struktur `PENGAJUAN PKL`
pada spreadsheet aktual.

---

# 7. Data Magang Mandiri

Data utama yang perlu dapat dicatat:

- Tanggal Apply
- Nama Pelamar
- Asal Universitas
- Tahapan Proses
- Keputusan Akhir
- PIC Human Capital
- Bulan Apply
- Tanggal Mulai Magang
- Tanggal Selesai Magang
- Positioning By Request
- Positioning By HC
- Status

Atribut tersebut berasal dari struktur `DATABASE_PELAMAR`
pada spreadsheet aktual.

---

# 8. Detail Pengajuan

Pengajuan PKL dapat berkaitan dengan lebih dari satu jurusan.

Sistem harus mampu merepresentasikan hubungan:

Pengajuan
→ beberapa jurusan/detail pengajuan.

Contoh:

Pengajuan dari satu sekolah dapat memiliki:

- PPLG
- AKL
- MPLB
- PM

Data yang sama mengenai pengajuan tidak perlu diduplikasi
secara struktural pada database.

Jumlah peserta yang diajukan dapat dicatat sesuai kebutuhan pengajuan.

---

# 9. Data Peserta

Data peserta digunakan untuk mencatat individu yang menjalani
program magang/PKL.

Data yang diperlukan berdasarkan `DATABASE_SISWA`:

- Nama Siswa
- Asal Sekolah
- Jurusan
- Tanggal Mulai Magang
- Tanggal Selesai Magang
- Positioning By HC
- Status

Untuk kebutuhan aplikasi, hubungan peserta dengan pengajuan asalnya
harus dapat ditelusuri.

---

# 10. Positioning

Sistem membedakan dua informasi posisi:

### Positioning By Request

Posisi/divisi yang diminta oleh pihak pengaju atau pelamar.

### Positioning By HC

Posisi/divisi yang ditentukan atau dicatat oleh Human Capital.

Kedua informasi tersebut tidak boleh digabung menjadi satu field
karena memiliki makna yang berbeda dalam proses pengajuan.

---

# 11. Tahapan Proses

Berdasarkan spreadsheet aktual, tahapan proses merupakan informasi
yang berbeda dari keputusan akhir dan status magang.

Nilai yang digunakan pada spreadsheet antara lain:

- Belum Ditanggapi
- Sudah Ditanggapi

Daftar nilai final harus mengikuti master data yang divalidasi oleh HC.

---

# 12. Keputusan Akhir

Keputusan akhir merupakan informasi terpisah dari tahapan proses.

Nilai yang digunakan pada spreadsheet antara lain:

- Dalam Proses
- Diterima
- Ditolak

Daftar nilai final harus mengikuti master data yang divalidasi oleh HC.

---

# 13. Status Peserta / Magang

Status magang digunakan untuk menggambarkan kondisi peserta.

Nilai yang digunakan pada spreadsheet antara lain:

- Belum Mulai
- Sedang Magang
- Sudah Selesai
- Mengundurkan Diri

Status merupakan informasi yang berbeda dari tahapan proses pengajuan
dan keputusan akhir.

---

# 14. Institusi

Sistem harus menyediakan pencatatan institusi pengaju.

Institusi dapat berasal dari:

- Sekolah
- Universitas

Data institusi digunakan kembali pada pengajuan dan data peserta
sehingga nama institusi tidak perlu diketik berulang kali.

Data tambahan institusi seperti alamat, kontak, atau PIC eksternal
hanya ditambahkan apabila dibutuhkan dan telah divalidasi.

---

# 15. Master Data

Sistem membutuhkan master data untuk menjaga konsistensi input.

Master data yang direncanakan:

- Institusi
- Jurusan
- Posisi/Divisi
- PIC Human Capital
- Tahapan Proses
- Keputusan Akhir
- Status Magang

Master data harus dapat digunakan sebagai sumber pilihan pada form
untuk mengurangi kesalahan penulisan dan duplikasi data.

---

# 16. Monitoring

Sistem harus menyediakan monitoring terhadap:

### Pengajuan

- Pengajuan baru.
- Pengajuan belum ditanggapi.
- Pengajuan sudah ditanggapi.
- Pengajuan dalam proses.
- Pengajuan diterima.
- Pengajuan ditolak.

### Deadline

- Deadline konfirmasi.
- Tanggal konfirmasi aktual.

### Peserta

- Belum mulai.
- Sedang magang.
- Sudah selesai.
- Mengundurkan diri.

---

# 17. Pencarian dan Filter

Pengguna harus dapat mencari dan memfilter data.

Minimal pencarian/filter untuk:

- Nama institusi.
- Nama peserta/pelamar.
- Jenis pengajuan.
- Jurusan.
- Posisi/divisi.
- Tahapan proses.
- Keputusan.
- Status.
- PIC Human Capital.
- Periode/tanggal.

Filter dapat dikembangkan sesuai kebutuhan aktual pengguna.

---

# 18. Riwayat

Sistem menyediakan akses terhadap data pengajuan dan peserta
yang telah selesai atau tidak lagi aktif.

Tujuannya agar Human Capital dapat melakukan penelusuran
terhadap data terdahulu tanpa kehilangan data historis.

---

# 19. Autentikasi dan Hak Akses

Sistem membutuhkan autentikasi pengguna.

Hak akses direncanakan berdasarkan peran:

- Human Capital
- Head of Human Capital

Implementasi hak akses harus memastikan pengguna hanya dapat
mengakses fungsi sesuai kewenangannya.

Detail permission akan divalidasi sebelum implementasi final.

---

# 20. Kebutuhan Nonfungsional

## 20.1 Usability

Antarmuka harus sederhana dan mudah digunakan oleh Human Capital
untuk pekerjaan administratif sehari-hari.

## 20.2 Security

Sistem harus menerapkan autentikasi dan pembatasan hak akses.

Data pribadi peserta harus dilindungi sesuai kebutuhan operasional
dan ketentuan pelindungan data yang berlaku.

## 20.3 Reliability

Data yang telah disimpan harus dapat diakses kembali secara konsisten
dan tidak mudah hilang akibat proses operasional biasa.

## 20.4 Maintainability

Struktur aplikasi dan database harus modular agar dapat dikembangkan
atau diintegrasikan dengan sistem REDIGMA di kemudian hari.

## 20.5 Responsiveness

Sistem dapat digunakan melalui browser pada komputer desktop
dan laptop, dengan tampilan yang tetap dapat digunakan pada ukuran
layar yang berbeda.

---

# 21. Batasan MVP

MVP tidak mencakup:

- Payroll.
- Absensi karyawan reguler.
- Performance appraisal.
- Recruitment umum di luar program magang.
- Pengelolaan HR di luar proses magang.
- Otomatisasi WhatsApp.
- Integrasi sistem eksternal sebagai kebutuhan wajib.
- Sistem rekomendasi AI untuk menentukan posisi peserta.

Fitur tambahan hanya dikembangkan apabila telah divalidasi
sebagai kebutuhan prioritas.

---

# 22. Prinsip Data

Sistem harus menghindari duplikasi data yang tidak diperlukan.

Contoh:

Satu institusi dapat memiliki banyak pengajuan.

Satu pengajuan PKL dapat memiliki beberapa detail jurusan.

Satu pengajuan dapat menghasilkan beberapa peserta.

Struktur database harus merepresentasikan hubungan tersebut
secara relasional.

---

# 23. Prinsip Pengembangan

Pengembangan sistem menggunakan pendekatan iteratif.

Tahapan utama:

1. Analisis kebutuhan.
2. Perancangan.
3. Implementasi.
4. Pengujian.
5. Evaluasi dan perbaikan.

Perubahan kebutuhan yang ditemukan selama validasi dengan HC
dapat menyebabkan penyesuaian terhadap rancangan sistem.

---

# 24. Status Dokumen

Dokumen ini merupakan baseline kebutuhan awal.

Beberapa bagian seperti:

- detail permission,
- aturan kapasitas,
- struktur detail jurusan,
- aturan perubahan status,
- atribut tambahan institusi,

harus divalidasi kembali dengan Human Capital sebelum database
dan implementasi final dibuat.