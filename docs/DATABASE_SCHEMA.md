# DATABASE SCHEMA
## Sistem Manajemen Pengajuan & Monitoring Magang / PKL REDIGMA

Dokumen ini merupakan spesifikasi teknis basis data (*Technical Database Schema Specification*) yang diturunkan secara langsung dari dokumen **ERD final (`docs/ERD.md`)**, dengan merujuk pada kebutuhan fungsional di `docs/REQUIREMENTS.md`, alur bisnis di `docs/BUSINESS_FLOW.md`, serta pola data operasional aktual pada berkas `INPUT_PENGAJUAN_MAGANG.xlsx`.

Spesifikasi ini dirancang sebagai acuan definitif bagi perekayasa perangkat lunak (*software engineer*) dalam menyusun berkas migrasi SQL (PostgreSQL/Supabase) tanpa mengubah model bisnis yang telah disepakati.

---

### 1. Tujuan dan Scope

#### 1.1. Tujuan
1. Menyediakan spesifikasi teknis tingkat skema (tipe data PostgreSQL, batasan *nullability*, *default values*, kunci primer, kunci asing, dan aturan integritas) yang selaras 100% dengan `docs/ERD.md`.
2. Menjadi jembatan antara perancangan konseptual/logikal (ERD) dengan perancangan fisik (*Physical Schema Migration*) pada platform PostgreSQL/Supabase.
3. Menjamin standardisasi penamaan tabel, kolom, batasan (*constraints*), dan indeks agar konsisten di seluruh lapisan arsitektur.

#### 1.2. Scope Sistem (MVP)
- **Target Platform**: PostgreSQL (melalui layanan Supabase).
- **Target Pengguna**: Pengguna internal *Human Capital* (HC) REDIGMA sebagai pengelola berkas pengajuan, penempatan, pemantauan keaktifan, dan pengarsipan data.
- **Ruang Lingkup Fungsional**:
  - Pengelolaan berkas pengajuan kelompok sekolah (`PKL`).
  - Pengelolaan pendaftaran perorangan mahasiswa (`MAGANG_MANDIRI`).
  - Pengelolaan rincian jurusan dan kuota pengajuan PKL.
  - Pencatatan dan penelusuran peserta magang/PKL aktif maupun historis.
  - Pemantauan status proses, keputusan akhir seleksi, dan status keaktifan di lapangan.
  - Pencatatan histori perubahan status pengajuan sederhana.
- **Di Luar Scope MVP (Out of Scope)**:
  - Portal pengajuan publik atau akses terbuka pihak luar (*public/anonymous access*).
  - Sistem penggajian atau kompensasi (*payroll / stipend*).
  - Presensi/kehadiran harian peserta (*employee attendance*).
  - Evaluasi kinerja atau penilaian kompetensi formal (*performance appraisal*).
  - Modul rekrutmen karyawan umum/PKWT/PKWTT.
  - Otomasi notifikasi pesan instan (WhatsApp/Telegram automation).
  - Integrasi API eksternal atau algoritma pencocokan berbasis AI (*AI matching*).

---

### 2. Prinsip Implementasi Database

Spesifikasi skema mengadopsi prinsip implementasi teknis berikut:

1. **Kompatibilitas Penuh PostgreSQL**: Seluruh tipe data, klausa batasan (*constraints*), dan fungsi generator nilai mengacu pada standar PostgreSQL native yang didukung Supabase.
2. **Kunci Primer UUID**: Seluruh tabel transaksional dan master utama menggunakan tipe data `UUID` dengan nilai awal `gen_random_uuid()` untuk memastikan keunikan global dan keamanan identitas rekaman.
3. **Identifier String pada Tabel Referensi Status**: Tabel referensi tahapan (`application_stages`), keputusan (`application_decisions`), dan status magang (`internship_statuses`) menggunakan kunci primer `VARCHAR(50)` berupa kode deskriptif (*natural key/slug*) seperti `belum_ditanggapi`, `diterima`, atau `sedang_magang` guna mempermudah keterbacaan data saat *querying* tanpa mengorbankan integritas relasi.
4. **Konvensi Penamaan `snake_case`**: Seluruh nama tabel, kolom, batasan (*constraint*), dan indeks wajib menggunakan huruf kecil dengan pemisah garis bawah dalam bahasa Inggris.
5. **Pencegahan Redundansi Kolom Waktu Virtual**: Kolom `Bulan Apply` dari spreadsheet tidak dibuat sebagai kolom fisik terpisah, melainkan diderivasi secara virtual menggunakan fungsi ekstraksi waktu PostgreSQL (`EXTRACT(MONTH FROM apply_date)`).
6. **Sumber Tunggal Data Kuota (*Single Source of Truth*)**: Kuota yang diajukan dicatat pada level rincian pengajuan (`application_details.requested_quota`). Total kuota per surat pengajuan dihitung melalui agregasi `SUM()`, tidak disimpan fisik pada tabel induk `applications`.
7. **Eliminasi Redundansi Data Peserta**: Institusi peserta tidak disimpan di tabel `participants`, melainkan diperoleh secara relasional via `applications.institution_id`.
8. **Integritas Referensial Berlapis**: Seluruh keterhubungan data antar-entitas dijamin melalui *Foreign Key* (FK) eksplisit.
9. **Penolakan Batasan Unik Tanpa Bukti Mutlak**: Kolom seperti `kop_letter_number` dan `participants.application_id` **tidak dipasangi batasan unik (`UNIQUE`)** karena data operasional aktual menunjukkan adanya penggunaan nomor surat yang sama untuk multi-jurusan dan struktur relasi pengajuan ke peserta bersifat 1:N.
10. **Pemisahan Data Bisnis dari Antarmuka UI**: Kolom visual seperti kode warna atau styling badge (`badge_color`) ditiadakan dari basis data; pengaturan warna merupakan tanggung jawab frontend.
11. **Retensi Data Historis Non-Destruktif**: Rekaman peserta yang telah berstatus `sudah_selesai` atau `mengundurkan_diri` dipertahankan permanen dalam basis data untuk keperluan arsip institusi dan pembuktian riwayat magang.

---

### 3. Database Schema Overview

Skema basis data terdiri dari 11 tabel yang terbagi ke dalam 3 kelompok fungsional:

| Nama Tabel | Tipe Tabel | Tujuan Bisnis |
| :--- | :--- | :--- |
| `users` | Master | Akun pengguna internal staf Human Capital (HC) REDIGMA yang bertindak sebagai PIC pengajuan. |
| `institutions` | Master | Data induk lembaga pendidikan asal pelamar/peserta (SMK, Universitas, Politeknik, Pesantren). |
| `majors` | Master | Data referensi program keahlian atau program studi pendidikan formal. |
| `positions` | Master | Master daftar posisi/divisi magang di lingkungan REDIGMA (mengakomodasi opsi Divisi/Area spreadsheet). |
| `application_stages` | Reference | Referensi tahapan penanganan administrasi berkas pengajuan oleh staf HC. |
| `application_decisions` | Reference | Referensi keputusan akhir kelayakan seleksi administrasi oleh HC. |
| `internship_statuses` | Reference | Referensi siklus hidup dan status keaktifan riil peserta magang di kantor. |
| `applications` | Transaction | Header berkas transaksi pengajuan magang (jalur PKL sekolah maupun Magang Mandiri individu). |
| `application_details` | Transaction Detail | Rincian jurusan, posisi yang diminati pemohon, dan kuota untuk berkas pengajuan PKL sekolah. |
| `participants` | Transaction | Data individu setiap peserta/pelamar yang menjalani program magang di REDIGMA. |
| `application_status_logs` | History | Rekam jejak kronologis perpindahan tahapan dan keputusan pengajuan oleh staf HC. |

---

### 4. Detail Tabel

Berikut adalah spesifikasi teknis lengkap dari setiap tabel.

---

#### 4.1. `users`
- **Tujuan**: Menyimpan data identitas pengguna internal staf Human Capital (HC) REDIGMA yang mengoperasikan sistem dan bertindak sebagai PIC penanganan pengajuan.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer identitas pengguna internal. |
| `full_name` | `VARCHAR(150)` | No | - | - | - | Nama lengkap staf HC (e.g., Fitri Indriyani). |
| `email` | `VARCHAR(150)` | No | - | - | UNIQUE | Surel staf HC untuk korespondensi internal. |
| `role` | `VARCHAR(50)` | No | `'hc_staff'` | - | - | Peran internal (e.g., `hc_staff`, `hc_lead`). |
| `is_active` | `BOOLEAN` | No | `TRUE` | - | - | Flag keaktifan akun pengguna. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Waktu pencatatan data pengguna. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Waktu pemutakhiran data profil terakhir. |

---

#### 4.2. `institutions`
- **Tujuan**: Menampung data induk institusi pendidikan asal pemohon (baik SMK, Universitas, Politeknik, maupun Pesantren) guna mencegah inkonsistensi penulisan nama institusi.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer institusi pendidikan. |
| `name` | `VARCHAR(200)` | No | - | - | - | Nama resmi institusi (e.g., SMK N Pringsurat). |
| `type` | `VARCHAR(50)` | No | - | - | - | Tipe: `SMK`, `UNIVERSITAS`, `POLITEKNIK`, `PESANTREN`, `LAINNYA`. |
| `address` | `TEXT` | Yes | `NULL` | - | - | Alamat fisik institusi (*Perlu Validasi HC*). |
| `contact_email` | `VARCHAR(150)` | Yes | `NULL` | - | - | Surel narahubung institusi atau BKK/Humas. |
| `contact_phone` | `VARCHAR(50)` | Yes | `NULL` | - | - | Nomor kontak/telepon resmi institusi. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Waktu pencatatan institusi. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Waktu pembaruan data institusi. |

---

#### 4.3. `majors`
- **Tujuan**: Menyediakan master daftar jurusan atau program keahlian terstandarisasi untuk menjamin keseragaman data kualifikasi pendidikan.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer jurusan. |
| `name` | `VARCHAR(150)` | No | - | - | - | Nama jurusan (e.g., Teknik Jaringan Komputer & Telekomunikasi (TJKT)). |
| `code` | `VARCHAR(30)` | Yes | `NULL` | - | - | Kode singkatan resmi (e.g., TJKT, PPLG, AKL). |
| `institution_level` | `VARCHAR(30)` | Yes | `NULL` | - | - | Klasifikasi jenjang: `SMK`, `DIPLOMA`, `SARJANA`, `SEMUA`. |
| `is_active` | `BOOLEAN` | No | `TRUE` | - | - | Status keaktifan jurusan di sistem. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Waktu pembuatan data jurusan. |

---

#### 4.4. `positions`
- **Tujuan**: Menstandarkan penamaan posisi/divisi magang di REDIGMA. Mengakomodasi 33+ opsi penempatan kerja operasional pada spreadsheet (seperti *Core Management, Revenue Commercial Lead, Human Capital, CS & CRM, Advertiser TikTok, Advertiser Shopee, CC Soscom, Editor MP, MCN, Data & IT*, dll). Kolom hierarki tambahan ditiadakan untuk menjaga kesederhanaan skema MVP.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer posisi/divisi magang. |
| `name` | `VARCHAR(100)` | No | - | - | UNIQUE | Nama resmi posisi/divisi magang di REDIGMA. |
| `is_active` | `BOOLEAN` | No | `TRUE` | - | - | Status ketersediaan penempatan pada posisi ini. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Waktu pencatatan posisi/divisi. |

---

#### 4.5. `application_stages`
- **Tujuan**: Menyimpan nilai referensi tahapan pemrosesan tiket pengajuan oleh staf HC. Nilai awal operasional: `belum_ditanggapi` dan `sudah_ditanggapi`.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `VARCHAR(50)` | No | - | **PK** | Primary Key | Identifier string (e.g., `belum_ditanggapi`). |
| `name` | `VARCHAR(100)` | No | - | - | - | Label teks tahapan proses. |
| `sequence_order` | `INTEGER` | No | - | - | - | Urutan alur tahapan penanganan (1, 2, dst.). |
| `description` | `TEXT` | Yes | `NULL` | - | - | Deskripsi penjelasan tahapan operasional. |

---

#### 4.6. `application_decisions`
- **Tujuan**: Menyimpan nilai referensi hasil putusan akhir seleksi administrasi oleh HC. Nilai operasional: `dalam_proses`, `diterima`, dan `ditolak`.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `VARCHAR(50)` | No | - | **PK** | Primary Key | Identifier string (e.g., `dalam_proses`). |
| `name` | `VARCHAR(100)` | No | - | - | - | Label teks keputusan seleksi administrasi. |
| `is_final` | `BOOLEAN` | No | `FALSE` | - | - | TRUE jika keputusan berstatus final (`diterima`/`ditolak`). |
| `description` | `TEXT` | Yes | `NULL` | - | - | Deskripsi penjelasan keputusan. |

---

#### 4.7. `internship_statuses`
- **Tujuan**: Menyimpan nilai referensi status keaktifan riil peserta selama masa penugasan di REDIGMA. Nilai operasional: `belum_mulai`, `sedang_magang`, `sudah_selesai`, dan `mengundurkan_diri`.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `VARCHAR(50)` | No | - | **PK** | Primary Key | Identifier string (e.g., `sedang_magang`). |
| `name` | `VARCHAR(100)` | No | - | - | - | Label teks status keaktifan peserta. |
| `is_active_intern` | `BOOLEAN` | No | `FALSE` | - | - | TRUE khusus status `sedang_magang` untuk monitoring. |
| `description` | `TEXT` | Yes | `NULL` | - | - | Deskripsi penjelasan status magang. |

---

#### 4.8. `applications`
- **Tujuan**: Menyimpan data transaksi utama pengajuan magang yang masuk ke REDIGMA, mencakup berkas kelompok dari sekolah (`PKL`) maupun pendaftaran mandiri mahasiswa (`MAGANG_MANDIRI`).
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer pengajuan magang. |
| `application_type` | `VARCHAR(30)` | No | - | - | CHECK (`application_type IN ('PKL', 'MAGANG_MANDIRI')`) | Jalur program pengajuan. |
| `institution_id` | `UUID` | No | - | **FK** | institutions(`id`) | Institusi asal pemohon (sekolah PKL/kampus mandiri). |
| `apply_date` | `DATE` | No | - | - | - | Tanggal permohonan diajukan / apply. |
| `pic_hc_id` | `UUID` | Yes | `NULL` | **FK** | users(`id`) | Staf HC penanggung jawab (kosong di awal). |
| `stage_id` | `VARCHAR(50)` | No | `'belum_ditanggapi'` | **FK** | application_stages(`id`) | Tahapan proses penanganan pengajuan. |
| `decision_id` | `VARCHAR(50)` | No | `'dalam_proses'` | **FK** | application_decisions(`id`) | Keputusan akhir seleksi berkas. |
| `kop_letter_number`| `VARCHAR(100)` | Yes | `NULL` | - | - | Nomor KOP surat permohonan sekolah (khusus PKL). |
| `confirmation_deadline`| `DATE` | Yes | `NULL` | - | - | Batas waktu tanggapan ke pemohon (khusus PKL). |
| `confirmation_date`| `DATE` | Yes | `NULL` | - | - | Tanggal surat konfirmasi dikirim ke sekolah (PKL). |
| `proposed_start_date`| `DATE` | Yes | `NULL` | - | - | Tanggal rencana mulai yang diajukan pemohon. |
| `proposed_end_date`| `DATE` | Yes | `NULL` | - | - | Tanggal rencana selesai yang diajukan pemohon. |
| `approved_start_date`| `DATE` | Yes | `NULL` | - | - | Tanggal mulai magang yang disetujui resmi oleh HC. |
| `approved_end_date`| `DATE` | Yes | `NULL` | - | - | Tanggal selesai magang yang disetujui resmi oleh HC. |
| `notes` | `TEXT` | Yes | `NULL` | - | - | Catatan administratif pengajuan dari staf HC. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Waktu rekaman pengajuan dibuat di sistem. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Waktu rekaman pengajuan diperbarui. |

---

#### 4.9. `application_details`
- **Tujuan**: Menampung rincian permohonan jurusan, posisi yang diminati pemohon, dan kuota siswa untuk jalur pengajuan `PKL` sekolah. Memfasilitasi sekolah yang mengajukan beberapa jurusan sekaligus pada satu nomor surat.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer detail pengajuan PKL. |
| `application_id` | `UUID` | No | - | **FK** | applications(`id`) ON DELETE CASCADE | Relasi ke berkas pengajuan induk PKL. |
| `major_id` | `UUID` | Yes | `NULL` | **FK** | majors(`id`) | Jurusan yang diajukan (Nullable jika non-kejuruan). |
| `requested_position_id`| `UUID` | Yes | `NULL` | **FK** | positions(`id`) | Posisi/divisi yang diminati pemohon (*Positioning by Request*). |
| `requested_quota`| `INTEGER` | Yes | `NULL` | - | CHECK (`requested_quota IS NULL OR requested_quota >= 0`) | **Sumber utama kuota yang diajukan** untuk rincian jurusan ini. |
| `approved_quota` | `INTEGER` | Yes | `NULL` | - | CHECK (`approved_quota IS NULL OR approved_quota >= 0`) | Kuota yang disetujui oleh HC (**Perlu Validasi HC**). |
| `notes` | `TEXT` | Yes | `NULL` | - | - | Catatan administratif khusus per jurusan. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Waktu pembuatan rincian pengajuan. |

---

#### 4.10. `participants`
- **Tujuan**: Menyimpan data individu setiap siswa/mahasiswa yang menjalani program magang/PKL di REDIGMA.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer data peserta magang. |
| `application_id` | `UUID` | No | - | **FK** | applications(`id`) | Menelusuri peserta ke pengajuan asalnya (*traceability*). |
| `application_detail_id`| `UUID` | Yes | `NULL` | **FK** | application_details(`id`) | Rincian jurusan asal peserta PKL (NULL untuk Magang Mandiri). |
| `major_id` | `UUID` | Yes | `NULL` | **FK** | majors(`id`) | Jurusan peserta (**Khusus Magang Mandiri** saat detail NULL). |
| `name` | `VARCHAR(150)` | No | - | - | - | Nama lengkap siswa atau mahasiswa magang. |
| `email` | `VARCHAR(150)` | Yes | `NULL` | - | - | Surel pribadi peserta magang. |
| `phone` | `VARCHAR(50)` | Yes | `NULL` | - | - | Nomor kontak/WhatsApp peserta. |
| `positioning_by_request_id`| `UUID` | Yes | `NULL` | **FK** | positions(`id`) | Posisi minat pemohon (**Khusus Magang Mandiri** saat detail NULL). |
| `positioning_by_hc_id`| `UUID` | Yes | `NULL` | **FK** | positions(`id`) | Posisi penempatan penugasan nyata hasil keputusan HC. |
| `actual_start_date`| `DATE` | Yes | `NULL` | - | - | Tanggal riil mulai magang (nullable, menyesuaikan siklus hidup). |
| `actual_end_date`| `DATE` | Yes | `NULL` | - | - | Tanggal riil selesai magang (nullable, menyesuaikan siklus hidup). |
| `status_id` | `VARCHAR(50)` | No | `'belum_mulai'` | **FK** | internship_statuses(`id`) | Status keaktifan operasional peserta di kantor. |
| `notes` | `TEXT` | Yes | `NULL` | - | - | **Catatan administratif terkait peserta** (bukan evaluasi kinerja). |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Waktu pencatatan data peserta. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Waktu pemutakhiran data peserta. |

---

#### 4.11. `application_status_logs`
- **Tujuan**: Menyediakan mekanisme pencatatan riwayat perpindahan tahapan dan keputusan pengajuan secara sederhana untuk keperluan akuntabilitas tim internal HC (bukan *full audit log system*).
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer rekaman histori status. |
| `application_id` | `UUID` | No | - | **FK** | applications(`id`) ON DELETE CASCADE | Relasi ke berkas pengajuan yang statusnya berubah. |
| `previous_stage_id`| `VARCHAR(50)` | Yes | `NULL` | - | - | Snapshot tahapan proses sebelum perubahan. |
| `new_stage_id` | `VARCHAR(50)` | Yes | `NULL` | - | - | Snapshot tahapan proses sesudah perubahan. |
| `previous_decision_id`| `VARCHAR(50)` | Yes | `NULL` | - | - | Snapshot keputusan akhir sebelum perubahan. |
| `new_decision_id`| `VARCHAR(50)` | Yes | `NULL` | - | - | Snapshot keputusan akhir sesudah perubahan. |
| `changed_by_user_id`| `UUID` | Yes | `NULL` | **FK** | users(`id`) | Staf internal HC yang melakukan tindakan perubahan. |
| `change_notes` | `TEXT` | Yes | `NULL` | - | - | Alasan atau catatan administratif perubahan status. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu terjadinya pembaruan status. |

---

### 5. Primary Key dan Foreign Key

Tabel berikut merangkum seluruh relasi kunci primer (*Primary Key*) dan kunci asing (*Foreign Key*) dalam skema basis data:

| Child Table | Column | Parent Table | Parent Column | On Delete | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `applications` | `institution_id` | `institutions` | `id` | `RESTRICT` | Mencegah penghapusan institusi yang memiliki berkas pengajuan aktif/riwayat. |
| `applications` | `pic_hc_id` | `users` | `id` | `SET NULL` | Jika akun staf HC dihapus/dinonaktifkan, berkas pengajuan tetap utuh dengan PIC kosong. |
| `applications` | `stage_id` | `application_stages` | `id` | `RESTRICT` | Mencegah penghapusan master tahapan yang sedang digunakan transaksi. |
| `applications` | `decision_id` | `application_decisions`| `id` | `RESTRICT` | Mencegah penghapusan master keputusan yang sedang digunakan transaksi. |
| `application_details`| `application_id`| `applications` | `id` | `CASCADE` | Jika berkas pengajuan dihapus, seluruh rincian jurusan terkait ikut terhapus. |
| `application_details`| `major_id` | `majors` | `id` | `RESTRICT` | Mencegah penghapusan master jurusan yang masih dirujuk rincian pengajuan. |
| `application_details`| `requested_position_id`| `positions`| `id` | `RESTRICT` | Mencegah penghapusan master posisi yang masih dirujuk permohonan. |
| `participants` | `application_id`| `applications` | `id` | `RESTRICT` | Menjamin rekam jejak peserta selalu terhubung ke berkas pengajuan induknya. |
| `participants` | `application_detail_id`| `application_details`| `id` | `SET NULL` | Khusus peserta PKL; jika baris rincian diubah, relasi peserta tidak memicu error. |
| `participants` | `major_id` | `majors` | `id` | `RESTRICT` | Khusus Magang Mandiri (saat detail NULL); mencegah hapus master jurusan terpakai. |
| `participants` | `positioning_by_request_id`| `positions`| `id` | `RESTRICT` | Khusus Magang Mandiri (saat detail NULL); menyimpan preferensi posisi pelamar. |
| `participants` | `positioning_by_hc_id`| `positions` | `id` | `RESTRICT` | Menyimpan posisi penugasan nyata oleh HC; mencegah hapus master divisi terpakai. |
| `participants` | `status_id` | `internship_statuses`| `id` | `RESTRICT` | Mencegah penghapusan status magang yang masih dimiliki peserta aktif/selesai. |
| `application_status_logs`| `application_id`| `applications`| `id` | `CASCADE` | Histori status terikat penuh pada siklus hidup berkas pengajuan induk. |
| `application_status_logs`| `changed_by_user_id`| `users` | `id` | `SET NULL` | Rekam waktu perubahan tetap terjaga meskipun profil staf HC terhapus. |

#### Catatan Implementasi FK pada Status Log:
Kolom `previous_stage_id`, `new_stage_id`, `previous_decision_id`, dan `new_decision_id` pada tabel `application_status_logs` dirancang untuk **menyimpan snapshot identifier** teks dari tahapan dan keputusan pada saat kejadian perubahan berlangsung.
- *Status*: **Perlu Validasi/Keputusan Implementasi** apakah kolom snapshot ini perlu dipasangi batasan Foreign Key fisik ke tabel referensi (`ON DELETE SET NULL/RESTRICT`) atau dibiarkan murni sebagai rekaman teks snapshot historis agar rekam jejak lama tetap abadi jika ada perubahan kode referensi di masa depan.

---

### 6. Constraint dan Data Integrity

Berdasarkan kesepakatan model data final pada `docs/ERD.md`, aturan integritas dan batasan (*constraints*) didefinisikan sebagai berikut:

1. **Jalur Pengajuan Valid (`applications.application_type`)**:
   - Dibatasi menggunakan klausa *Check Constraint*:
     ```sql
     CHECK (application_type IN ('PKL', 'MAGANG_MANDIRI'))
     ```
2. **Integritas Nilai Kuota (`application_details.requested_quota` & `approved_quota`)**:
   - Kuota harus berupa bilangan bulat non-negatif:
     ```sql
     CHECK (requested_quota IS NULL OR requested_quota >= 0)
     CHECK (approved_quota IS NULL OR approved_quota >= 0)
     ```
   - *Catatan Desain*: `approved_quota` berstatus *nullable* dan **tidak diwajibkan**, karena merupakan kebutuhan pengembangan sistem yang belum ada di spreadsheet operasional (**Perlu Validasi HC**).
3. **Integritas Rentang Tanggal Pelaksanaan Peserta (`participants`)**:
   - Jika kedua tanggal pelaksanaan telah terisi oleh staf HC, tanggal selesai wajib sama dengan atau setelah tanggal mulai:
     ```sql
     CHECK (
       actual_start_date IS NULL OR 
       actual_end_date IS NULL OR 
       actual_end_date >= actual_start_date
     )
     ```
4. **Penolakan Batasan Unik Tidak Berdasar**:
   - **`applications.kop_letter_number` TIDAK diberi batasan `UNIQUE`**: Spreadsheet membuktikan satu nomor KOP surat sekolah digunakan bersama oleh 4 jurusan berbeda (contoh: SMK N 2 Magelang).
   - **`participants.application_id` TIDAK diberi batasan `UNIQUE`**: Relasi antara pengajuan dan peserta secara skema database adalah **1 : N** untuk seluruh jenis pengajuan (baik PKL maupun Magang Mandiri).
5. **Integritas Alur Relasi Jurusan dan Posisi Peserta**:
   - Pada pengajuan `PKL`, peserta terhubung ke rincian jurusan via `application_detail_id`.
   - Pada pengajuan `MAGANG_MANDIRI`, `application_detail_id` bernilai `NULL`, sehingga jurusan dan preferensi posisi disimpan langsung pada `participants.major_id` dan `participants.positioning_by_request_id`.

#### 6.1. Optional Implementation Considerations
- *Pertimbangan Validasi Tanggal Konfirmasi (`applications.confirmation_date`)*: Rekomendasi logika bahwa jika tanggal konfirmasi terisi maka nilainya tidak boleh mendahului tanggal apply (`confirmation_date >= apply_date`) dicatat sebagai opsi implementasi di lapisan aplikasi atau pemicu sistem, dan **bukan sebagai constraint wajib skema database**, karena aturan ini belum didefinisikan secara eksplisit pada `docs/ERD.md`.

---

### 7. Index

Untuk mengoptimalkan kinerja pembacaan data pada antarmuka pemantauan internal HC tanpa membebani proses tulis (*write overhead*), indeks B-Tree berikut ditetapkan sebagai acuan migrasi:

#### 7.1. Indeks Utama (Wajib Berdasarkan Pola Akses ERD)

| Nama Indeks | Tabel Target | Kolom yang Diindeks | Tujuan Indeks |
| :--- | :--- | :--- | :--- |
| `idx_applications_application_type` | `applications` | `application_type` | Mempercepat pemisahan filter antara daftar pengajuan PKL dan Magang Mandiri. |
| `idx_applications_stage_id` | `applications` | `stage_id` | Mempercepat penyaringan berkas berdasarkan tahapan penanganan (`belum_ditanggapi`). |
| `idx_applications_decision_id` | `applications` | `decision_id` | Mempercepat penyaringan pengajuan berdasarkan putusan seleksi (`dalam_proses`, `diterima`). |
| `idx_applications_apply_date` | `applications` | `apply_date DESC` | Mengoptimalkan pengurutan berkas pengajuan masuk dari yang paling baru ke lama. |
| `idx_participants_status_id` | `participants` | `status_id` | Mempercepat agregasi penghitungan jumlah peserta aktif (`sedang_magang`) pada monitoring. |
| `idx_participants_actual_dates` | `participants` | `actual_start_date, actual_end_date` | Mengoptimalkan penyaringan rentang aktif magang dan pendeteksian peserta yang mendekati akhir periode. |

#### 7.2. Indeks Kunci Asing / Relasional (Rekomendasi Performa Tambahan)

Indeks pada kolom *Foreign Key* berikut direkomendasikan secara teknis untuk mengoptimalkan operasi penggabungan tabel (*JOIN queries*) dan pencegahan *table lock* saat penghapusan rekaman induk:

| Nama Indeks | Tabel Target | Kolom yang Diindeks | Keterangan |
| :--- | :--- | :--- | :--- |
| `idx_applications_institution_id` | `applications` | `institution_id` | Opsional: Mempercepat pencarian seluruh riwayat pengajuan per institusi. |
| `idx_applications_pic_hc_id` | `applications` | `pic_hc_id` | Opsional: Mempercepat penyaringan daftar tugas berkas per staf PIC HC. |
| `idx_application_details_application_id`| `application_details`| `application_id` | Opsional: Mempercepat pengambilan rincian jurusan untuk satu berkas pengajuan. |
| `idx_participants_application_id` | `participants` | `application_id` | Opsional: Mempercepat penelusuran seluruh siswa/pelamar dalam satu pengajuan. |
| `idx_status_logs_application_id` | `application_status_logs`| `application_id` | Opsional: Mempercepat pemuatan riwayat perubahan status tiket pengajuan. |

---

### 8. Seed / Reference Data

Data awal (*initial seed data*) dibatasi murni pada data referensi status yang telah terbukti secara eksplisit pada berkas operasional aktual dan `docs/ERD.md`:

#### 8.1. `application_stages`
```sql
INSERT INTO application_stages (id, name, sequence_order, description) VALUES
('belum_ditanggapi', 'Belum Ditanggapi', 1, 'Berkas pengajuan baru diterima dan belum ditindaklanjuti oleh staf HC.'),
('sudah_ditanggapi', 'Sudah Ditanggapi', 2, 'Berkas telah ditinjau dan staf HC telah menghubungi pemohon atau menugaskan PIC.');
```

#### 8.2. `application_decisions`
```sql
INSERT INTO application_decisions (id, name, is_final, description) VALUES
('dalam_proses', 'Dalam Proses', FALSE, 'Permohonan magang sedang dalam tahap peninjauan kualifikasi dan kuota divisi.'),
('diterima', 'Diterima', TRUE, 'Permohonan magang disetujui resmi untuk melaksanakan program di REDIGMA.'),
('ditolak', 'Ditolak', TRUE, 'Permohonan magang tidak dapat diakomodasi oleh perusahaan.');
```

#### 8.3. `internship_statuses`
```sql
INSERT INTO internship_statuses (id, name, is_active_intern, description) VALUES
('belum_mulai', 'Belum Mulai', FALSE, 'Peserta telah disetujui namun tanggal pelaksanaan magang belum dimulai.'),
('sedang_magang', 'Sedang Magang', TRUE, 'Peserta aktif melaksanakan tugas magang di lingkungan operasional REDIGMA.'),
('sudah_selesai', 'Sudah Selesai', FALSE, 'Peserta telah menuntaskan seluruh masa penugasan program magang.'),
('mengundurkan_diri', 'Mengundurkan Diri', FALSE, 'Peserta membatalkan keikutsertaan sebelum atau saat program berjalan.');
```

#### 8.4. Ketentuan Pengisian Master Data Operasional (`positions`, `institutions`, `majors`, `users`):
- Data master posisi/divisi, institusi, jurusan, dan pengguna staf HC **tidak dibuat melalui tebakan statis** pada skema ini.
- Master data posisi/divisi magang (mengacu pada daftar 33+ divisi di spreadsheet seperti *Core Management, Human Capital, CC Soscom, Editor MP, MCN, Data & IT*, dll.), institusi asal, jurusan resmi, serta data akun pengguna internal HC akan diimpor atau diisi melalui proses administrasi data awal saat inisialisasi lingkungan operasional.

---

### 9. Supabase Considerations

Dalam menerapkan skema basis data di lingkungan Supabase, tim pengembang wajib memperhatikan batasan arsitektur berikut:

1. **Pemisahan Skema Antara `auth.users` dan `public.users`**:
   - Tabel `public.users` dalam skema ini merepresentasikan entitas profil pengguna internal HC yang memegang data bisnis (seperti nama lengkap, surel dinas, peran operasional, dan relasi PIC).
   - Layanan Supabase Auth mengelola akun autentikasi pada skema privat `auth.users`.
   - Hubungan konseptual autentikasi dan otorisasi:
     $$\text{Supabase Auth } (\text{auth.users}) \longrightarrow \text{Authenticated User Session} \longrightarrow \text{public.users} \longrightarrow \text{Operasional HC}$$
   - *Batasan Teknis*: Keputusan detail mengenai apakah `public.users.id` akan mereferensikan langsung `auth.users(id)` melalui pemicu (*PostgreSQL Trigger*) otomatis atau dikelola melalui mekanisme lain dialokasikan ke dokumen arsitektur autentikasi terpisah. Skema ini tidak memaksakan dependensi langsung tanpa keputusan arsitektur final.
2. **Ketiadaan Akses Publik**:
   - Seluruh koneksi ke basis data melalui Supabase Client API harus mewajibkan konteks pengguna yang terotentikasi (*Authenticated Context*).
   - Pengunjung publik/anonim (`anon` key) tidak diberikan hak akses membaca maupun memanipulasi tabel-tabel ini.

---

### 10. Row Level Security (RLS)

Kebijakan keamanan tingkat baris (*Row Level Security*) pada Supabase wajib diaktifkan pada seluruh tabel dengan prinsip-prinsip konseptual berikut:

1. **Prinsip Utama Akses Internal**:
   - Seluruh tabel (`users`, `institutions`, `majors`, `positions`, `application_stages`, `application_decisions`, `internship_statuses`, `applications`, `application_details`, `participants`, `application_status_logs`) wajib mengaktifkan proteksi RLS:
     ```sql
     ALTER TABLE <nama_tabel> ENABLE ROW LEVEL SECURITY;
     ```
2. **Akses Pengguna Terotentikasi (*Authenticated Only*)**:
   - Hanya pengguna internal yang berhasil login ke sistem yang berhak mengeksekusi operasi baca (`SELECT`), tambah (`INSERT`), dan ubah (`UPDATE`).
   - Akses publik tanpa autentikasi (*anonymous/public role*) ditolak secara menyeluruh (*Deny All by default*).
3. **Kewenangan Operasional Staf HC**:
   - Staf HC yang berstatus aktif (`is_active = TRUE`) memiliki hak akses penuh untuk meninjau master data, memproses berkas pengajuan masuk, memperbarui rincian jurusan, mencatat siswa, dan memperbarui status peserta.
4. **Batasan Hak Akses Berdasarkan PIC**:
   - Pada spreadsheet operasional terdapat pencatatan `PIC Human Capital`.
   - *Status*: **Perlu Validasi HC / Keputusan Arsitektur** apakah hak penyuntingan berkas pengajuan dibatasi murni untuk staf yang bertindak sebagai PIC berkas tersebut (dan peran supervisor/lead), ataukah seluruh staf HC yang aktif diperbolehkan saling memperbarui data pengajuan secara kolaboratif. Pembuatan policy SQL spesifik ditunda hingga aturan ini divalidasi.

---

### 11. Aturan Delete dan Lifecycle

Aturan penghapusan data dirancang untuk mempertahankan keutuhan riwayat transaksi dan mencegah hilangnya arsip peserta:

1. **Penghapusan Berjenjang Pengajuan (`applications` $\rightarrow$ `application_details`)**:
   - Relasi antara berkas pengajuan induk dan rincian jurusan menggunakan aturan `ON DELETE CASCADE`. Jika suatu pengajuan memang dihapus secara sah sesuai kewenangan sistem, rincian jurusannya ikut terhapus melalui ON DELETE CASCADE.
2. **Perlindungan Data Master dari Penghapusan (*Restricted Master Data*)**:
   - Kunci asing dari `applications` dan `application_details` ke tabel master (`institutions`, `majors`, `positions`) memberlakukan aturan `ON DELETE RESTRICT`. Master data lembaga pendidikan, jurusan, atau posisi kerja tidak dapat dihapus dari sistem jika telah dirujuk oleh rekaman pengajuan atau peserta.
3. **Siklus Hidup Peserta Non-Destruktif**:
   - Peserta yang telah menuntaskan program magang (`status_id = 'sudah_selesai'`) maupun peserta yang membatalkan keikutsertaan (`status_id = 'mengundurkan_diri'`) **tidak boleh dihapus** dari tabel `participants`.
   - Pemantauan peserta aktif di antarmuka HC difilter berdasarkan kriteria logis `status_id = 'sedang_magang'`, sehingga rekaman peserta yang telah selesai otomatis terarsip tanpa manipulasi data fisik.
4. **Ketiadaan Kolom Soft Delete Tambahan**:
   - Skema ini tidak menambahkan kolom buatan seperti `is_deleted` atau `deleted_at` karena `docs/ERD.md` tidak mendefinisikannya dan pengelolaan siklus hidup peserta telah diakomodasi secara terstruktur melalui status keaktifan referensial (`internship_statuses`).

---

### 12. Hal yang Perlu Validasi HC

Poin-poin teknis dan operasional berikut belum didukung secara mutlak oleh sumber data aktual spreadsheet maupun dokumen persyaratan, dan tetap dipertahankan sebagai aspek yang **membutuhkan validasi langsung dari pihak Human Capital REDIGMA**:

1. **Granularitas Kuota Siswa PKL (Level Surat vs Level Jurusan)**:
   - *Temuan Spreadsheet*: SMK N Pringsurat merinci kuota per jurusan (4 TJKT, 3 DKV). Namun SMK Muhammadiyah Mungkid hanya mencatat kuota di baris pertama, sedangkan SMK N 2 Magelang mengosongkannya.
   - *Status*: **Perlu Validasi HC** apakah pihak sekolah selalu merinci kuota per jurusan sehingga penetapan `application_details.requested_quota` sebagai sumber tunggal sudah memadai, atau sistem perlu mengantisipasi pengajuan yang hanya menyebut kuota total sekolah.
2. **Kebutuhan Kolom Kuota Disetujui (`approved_quota`)**:
   - *Temuan Spreadsheet*: Spreadsheet hanya mencatat *Jumlah siswa yang akan PKL* (kuota permohonan sekolah); tidak terdapat kolom kuota yang disetujui HC.
   - *Status*: **Perlu Validasi HC** apakah sistem memerlukan kolom persetujuan kuota formal per jurusan (`application_details.approved_quota`), atau jumlah kuota disetujui cukup dihitung dari total baris siswa yang diinputkan ke tabel peserta.
3. **Penanganan Permohonan Multi-Posisi (*Positioning by Request*)**:
   - *Temuan Spreadsheet*: Ditemukan isian posisi gabungan pada spreadsheet (contoh: `"CC Tiktok, CC Sales Support, CC Soscom"`).
   - *Status*: **Perlu Validasi HC** apakah sekolah diperbolehkan memilih beberapa posisi prioritas sekaligus (yang membutuhkan skema lanjutan tabel perantara / *junction table* di fase mendatang), ataukah sistem form pengajuan cukup membatasi 1 pilihan posisi per rincian jurusan.
4. **Keunikan dan Standar Nomor KOP Surat PKL**:
   - *Temuan Spreadsheet*: Satu nomor KOP surat (misal `B/400.14.5.4/2338/2026`) muncul pada 4 baris berbeda karena memiliki 4 jurusan.
   - *Status*: **Perlu Validasi HC** apakah nomor KOP surat dijamin selalu unik untuk setiap surat masuk dari sekolah yang sama, atau dapat berulang antar periode/tahun ajaran. Sementara ini kolom `kop_letter_number` tidak dipasangi batasan unik (`UNIQUE`).
5. **Mekanisme Pelamar Magang Mandiri yang Belum Diterima / Ditolak**:
   - *Temuan Spreadsheet*: Sheet `DATABASE_PELAMAR` mencatat identitas pelamar langsung sejak tahap pendaftaran awal.
   - *Status*: **Perlu Validasi HC** apakah pelamar mandiri yang masih berstatus 'Dalam Proses' atau 'Ditolak' perlu dibuatkan rekaman peserta (`participants`) sejak awal apply, atau cukup dicatat di level berkas pengajuan hingga berstatus diterima resmi.
6. **Mekanisme Otomasi Pemindahan Status Peserta Berdasarkan Tanggal**:
   - *Temuan Spreadsheet*: Status siswa di sheet `DATABASE_SISWA` bergantung pada formula manual yang membaca lembar pengajuan.
   - *Status*: **Perlu Validasi HC** apakah status keaktifan peserta (`sedang_magang` menjadi `sudah_selesai`) ingin dialihkan secara otomatis oleh sistem saat tanggal selesai magang terlewati, atau tetap membutuhkan penutupan berkas manual oleh staf HC.
7. **Kriteria Penugasan dan Batasan Hak Akses PIC Human Capital**:
   - *Temuan Spreadsheet*: Terdapat kolom penugasan staf tertentu (Fitri Indriyani).
   - *Status*: **Perlu Validasi HC** mengenai alur kerja PIC: apakah satu pengajuan dapat dialihkan penugasannya ke staf lain, dan bagaimana aturan otorisasi antar staf HC dalam melihat maupun memperbarui berkas pengajuan rekannya.

---

### 13. Mapping ERD → Database Schema

Tabel berikut menunjukkan keselarasan 100% antara entitas logikal pada `docs/ERD.md` dengan tabel fisik pada spesifikasi skema basis data ini:

| ERD Entity | Database Table | Status | Catatan Teknis / Validasi |
| :--- | :--- | :---: | :--- |
| `users` | `users` | **Ready** | Master staf internal HC sebagai PIC pengajuan. Detail integrasi auth dibahas terpisah. |
| `institutions` | `institutions` | **Ready** | Master lembaga pendidikan asal (SMK, universitas, pesantren). Kolom alamat nullable (*Perlu Validasi HC*). |
| `majors` | `majors` | **Ready** | Master referensi jurusan/program studi. |
| `positions` | `positions` | **Ready** | Master daftar posisi/divisi magang (33+ opsi penempatan). Kolom hierarki tambahan dihilangkan untuk MVP. |
| `application_stages` | `application_stages` | **Ready** | Master referensi tahapan penanganan pengajuan (`belum_ditanggapi`, `sudah_ditanggapi`). |
| `application_decisions`| `application_decisions`| **Ready** | Master referensi putusan seleksi administrasi (`dalam_proses`, `diterima`, `ditolak`). |
| `internship_statuses` | `internship_statuses` | **Ready** | Master referensi status keaktifan peserta (`belum_mulai`, `sedang_magang`, `sudah_selesai`, `mengundurkan_diri`). |
| `applications` | `applications` | **Ready** | Header transaksi pengajuan PKL & Magang Mandiri. `kop_letter_number` tidak unik (*Perlu Validasi HC*). |
| `application_details` | `application_details` | **Ready** | Rincian jurusan pengajuan PKL. `approved_quota` berstatus *nullable* (*Perlu Validasi HC*). |
| `participants` | `participants` | **Ready** | Data individu peserta magang. `institution_id` dihilangkan (redundansi). Tanggal aktual *nullable*. |
| `application_status_logs`| `application_status_logs`| **Ready** | Rekam jejak kronologis perubahan status sederhana untuk akuntabilitas internal HC. |

---

### Pemeriksaan Kepatuhan Spesifikasi (Compliance Checklist)
- [x] Tidak ada tabel baru di luar `docs/ERD.md`.
- [x] Tidak ada kolom baru di luar `docs/ERD.md`.
- [x] Tidak ada relasi FK yang menyimpang dari `docs/ERD.md`.
- [x] Tidak ada batasan constraint yang bertentangan dengan prinsip ERD.
- [x] Batasan `UNIQUE` pada `kop_letter_number` dan `participants.application_id` tidak dipaksakan.
- [x] Akses publik / portal anonim dieliminasi sepenuhnya dari ruang lingkup.
- [x] Tidak ada modul penilaian kinerja / *performance appraisal*.
- [x] Tidak ada modul otomasi WhatsApp atau integrasi pihak ketiga.
- [x] Tidak ada modul pencocokan berbasis AI (*AI matching*).
- [x] Seluruh 7 poin keraguan operasional tetap ditandai sebagai **"Perlu Validasi HC"**.
- [x] Dokumen `docs/ERD.md`, `docs/REQUIREMENTS.md`, dan `docs/BUSINESS_FLOW.md` tidak diubah.
