# SUPABASE MIGRATION

## Sistem Manajemen Pengajuan & Monitoring Magang / PKL REDIGMA

Dokumen ini merupakan cetak biru teknis (*Technical Migration Blueprint*) untuk menerjemahkan spesifikasi basis data pada **`docs/DATABASE_SCHEMA.md`** ke dalam skema fisik PostgreSQL pada platform Supabase. Dokumen ini berfungsi sebagai pedoman persiapan migrasi SQL tanpa melakukan modifikasi langsung terhadap basis data aktif maupun mengeksekusi migrasi fisik.

---

### 1. Tujuan

1. Menyediakan cetak biru terstruktur (*blueprint*) bagi perekayasa perangkat lunak untuk menyusun naskah migrasi DDL (*Data Definition Language*) PostgreSQL/Supabase secara terukur dan deterministik.
2. Memastikan seluruh spesifikasi tabel, tipe data, batasan (*constraints*), indeks, dan integritas referensial yang telah ditetapkan pada `docs/DATABASE_SCHEMA.md` diimplementasikan secara presisi tanpa penyimpangan.
3. Mendokumentasikan urutan eksekusi (*execution dependency order*), penanganan siklus hidup data, prinsip keamanan berbasis baris (*Row Level Security*), serta batasan-batasan teknis yang ditangguhkan (*deferred validation*).
4. Menegaskan bahwa dokumen ini **belum merupakan berkas eksekusi SQL migrasi aktif** dan **tidak melakukan perubahan apapun** terhadap basis data Supabase pada tahap ini.

---

### 2. Migration Scope

Ruang lingkup migrasi difokuskan secara ketat pada pemodelan basis data internal Human Capital (HC) REDIGMA untuk rilis Minimum Viable Product (MVP).

Migrasi ini mencakup:
- Pembuatan **11 tabel** fisik yang terdefinisi pada skema.
- Penerapan kunci primer (*Primary Key*) dan kunci asing (*Foreign Key*).
- Penetapan aturan *nullability* dan nilai default (*default values*).
- Penerapan *Check Constraints* yang didukung skema.
- Pembuatan indeks performa wajib (*required indexes*) dan indeks rekomendasi (*recommended FK indexes*).
- Pemuatan data awal referensi (*reference seed data*) untuk tahapan, keputusan, dan status.
- Pengaktifan *Row Level Security* (RLS) dasar pada seluruh tabel.

Daftar 11 tabel yang dicakup:
1. `users` (Master)
2. `institutions` (Master)
3. `majors` (Master)
4. `positions` (Master)
5. `application_stages` (Reference)
6. `application_decisions` (Reference)
7. `internship_statuses` (Reference)
8. `applications` (Transaction)
9. `application_details` (Transaction Detail)
10. `participants` (Transaction)
11. `application_status_logs` (History)

*Batasan Ruang Lingkup (Out of Scope)*:
Tidak mencakup portal pengajuan publik, akun anonim, integrasi WhatsApp/Telegram, sistem penggajian/stipend, presensi harian, penilaian kinerja/evaluasi berkala, rekrutmen umum karyawan, maupun algoritma pencocokan berbasis AI.

---

### 3. Migration Principles

Pelaksanaan migrasi berpegang teguh pada prinsip-prinsip berikut:

1. **PostgreSQL Native Standard**: Seluruh definisi skema memanfaatkan kapabilitas asli PostgreSQL yang didukung penuh oleh platform Supabase.
2. **Supabase-Compatible Architecture**: Struktur disiapkan agar selaras dengan ekosistem Supabase, khususnya dalam pengelolaan skema publik dan perlindungan RLS.
3. **Kunci Primer UUID Global**: Seluruh tabel entitas utama dan master menggunakan tipe data `UUID` dengan nilai baku yang dihasilkan melalui fungsi native `gen_random_uuid()`.
4. **Identifier Deskriptif pada Reference Table**: Tabel referensi tahapan, keputusan, dan status menggunakan kunci primer `VARCHAR(50)` berupa kode deskriptif (*slug*) untuk menjaga keterbacaan kueri.
5. **Konvensi Penamaan `snake_case`**: Seluruh penamaan objek basis data (tabel, kolom, batasan, indeks) wajib menggunakan format huruf kecil dengan garis bawah.
6. **Integritas Referensial Eksplisit**: Seluruh relasi antar-tabel wajib dideklarasikan secara formal melalui *Foreign Key* dengan aturan aksi hapus (*ON DELETE behavior*) yang telah ditetapkan.
7. **Bebas Kolom Redundan & Turunan Fisik**: Informasi turunan waktu seperti "Bulan Apply" tidak disimpan secara fisik. Sumber data kuota pengajuan berpusat pada rincian permohonan (`application_details`).
8. **Bebas Atribut Presentasi UI**: Kolom visual seperti kode warna atau styling badge (`badge_color`) dilarang masuk ke dalam skema database.
9. **Retensi Data Historis Non-Destruktif**: Data peserta yang menyelesaikan program atau mengundurkan diri dipertahankan permanen melalui status siklus hidup data.
10. **Ketiadaan Akses Publik (*No Public Access*)**: Sistem diperuntukkan secara eksklusif bagi staf internal HC terotentikasi; tidak ada perizinan baca/tulis bagi peran `anon` (publik).

---

### 4. Migration Execution Order

Pembuatan tabel harus mengikuti urutan ketergantungan (*foreign key dependency hierarchy*) agar tidak terjadi kegagalan eksekusi (*dependency failure*) saat DDL dijalankan:

```
[Level 1: Independent Master & Reference Tables]
  ├── users
  ├── institutions
  ├── majors
  ├── positions
  ├── application_stages
  ├── application_decisions
  └── internship_statuses
            │
            ▼
[Level 2: Main Transaction Table]
  └── applications (depends on: institutions, users, application_stages, application_decisions)
            │
            ▼
[Level 3: Transaction Detail Table]
  └── application_details (depends on: applications, majors, positions)
            │
            ▼
[Level 4: Participant Transaction Table]
  └── participants (depends on: applications, application_details, majors, positions, internship_statuses)
            │
            ▼
[Level 5: Status History Table]
  └── application_status_logs (depends on: applications, users)
```

**Alasan Teknis Urutan Eksekusi**:
- Tabel pada **Level 1** tidak memiliki ketergantungan kunci asing ke tabel lain dalam skema publik, sehingga harus dibuat terlebih dahulu.
- `applications` (**Level 2**) membutuhkan `institutions`, `users`, `application_stages`, dan `application_decisions` sebagai referensi validasi header pengajuan.
- `application_details` (**Level 3**) mereferensikan `applications`, `majors`, dan `positions`.
- `participants` (**Level 4**) mereferensikan `applications` dan rincian `application_details`, sehingga harus dibuat setelah kedua tabel transaksi tersebut ada.
- `application_status_logs` (**Level 5**) bergantung pada `applications` dan `users`.

---

### 5. Extension / PostgreSQL Prerequisites

Skema basis data memerlukan prasyarat teknis berikut pada tingkat klaster PostgreSQL:

1. **Fungsi Pembangkit UUID (`gen_random_uuid()`)**:
   - Skema basis data menggunakan fungsi bawaan (*built-in*) PostgreSQL `gen_random_uuid()` untuk menghasilkan nilai *default* kunci primer UUID pada seluruh tabel transaksional dan master.
   - Skema ini tidak menetapkan *extension* tambahan apa pun yang diperlukan, karena `gen_random_uuid()` telah tersedia secara native pada PostgreSQL versi 13 ke atas (termasuk lingkungan standar Supabase).
2. **Ketiadaan Extension Tambahan**: Tidak ada *extension* tambahan yang didefinisikan atau diperlukan untuk kebutuhan skema MVP saat ini.

---

### 6. Table Creation Blueprint

Berikut adalah spesifikasi fisik terperinci untuk ke-11 tabel yang diturunkan langsung dari `docs/DATABASE_SCHEMA.md`:

#### 6.1. `users`
- **Tujuan**: Menyimpan data identitas pengguna internal staf Human Capital (HC) REDIGMA yang mengoperasikan sistem dan bertindak sebagai PIC penanganan pengajuan.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer identitas pengguna internal. |
| `full_name` | `VARCHAR(150)` | No | - | - | - | Nama lengkap staf internal HC. |
| `email` | `VARCHAR(150)` | No | - | - | UNIQUE | Surel dinas staf HC untuk korespondensi/PIC. |
| `role` | `VARCHAR(50)` | No | `'hc_staff'` | - | - | Peran internal (e.g., `hc_staff`, `hc_lead`). |
| `is_active` | `BOOLEAN` | No | `TRUE` | - | - | Flag status keaktifan akun pengguna. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu pembuatan data pengguna. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu pembaruan profil terakhir. |

---

#### 6.2. `institutions`
- **Tujuan**: Menampung data induk lembaga pendidikan asal pemohon (SMK, Universitas, Politeknik, Pesantren).
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer institusi pendidikan. |
| `name` | `VARCHAR(200)` | No | - | - | - | Nama resmi institusi pendidikan. |
| `type` | `VARCHAR(50)` | No | - | - | - | Kategori: `SMK`, `UNIVERSITAS`, `POLITEKNIK`, `PESANTREN`, `LAINNYA`. |
| `address` | `TEXT` | Yes | `NULL` | - | - | Alamat fisik lembaga (*Perlu Validasi HC*). |
| `contact_email` | `VARCHAR(150)` | Yes | `NULL` | - | - | Surel narahubung institusi atau Humas/BKK. |
| `contact_phone` | `VARCHAR(50)` | Yes | `NULL` | - | - | Nomor telepon/kontak resmi institusi. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu pendaftaran institusi. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu pembaruan data institusi. |

---

#### 6.3. `majors`
- **Tujuan**: Menyediakan master daftar jurusan atau program keahlian resmi terstandarisasi.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer master jurusan. |
| `name` | `VARCHAR(150)` | No | - | - | - | Nama lengkap program keahlian/program studi. |
| `code` | `VARCHAR(30)` | Yes | `NULL` | - | - | Kode singkatan resmi (e.g., TJKT, PPLG). |
| `institution_level` | `VARCHAR(30)` | Yes | `NULL` | - | - | Klasifikasi jenjang: `SMK`, `DIPLOMA`, `SARJANA`, `SEMUA`. |
| `is_active` | `BOOLEAN` | No | `TRUE` | - | - | Status keaktifan jurusan dalam seleksi. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu pembuatan master jurusan. |

---

#### 6.4. `positions`
- **Tujuan**: Menstandarkan penamaan master posisi/divisi magang di REDIGMA (mengakomodasi 33+ opsi penempatan kerja pada spreadsheet).
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer master posisi/divisi magang. |
| `name` | `VARCHAR(100)` | No | - | - | UNIQUE | Nama resmi posisi/divisi di REDIGMA. |
| `is_active` | `BOOLEAN` | No | `TRUE` | - | - | Status ketersediaan kuota divisi. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu pembuatan data posisi. |

---

#### 6.5. `application_stages`
- **Tujuan**: Menyimpan nilai referensi tahapan pemrosesan tiket pengajuan oleh staf HC.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `VARCHAR(50)` | No | - | **PK** | Primary Key | Identifier kode string (e.g., `belum_ditanggapi`). |
| `name` | `VARCHAR(100)` | No | - | - | - | Label teks tahapan penanganan pengajuan. |
| `sequence_order` | `INTEGER` | No | - | - | - | Urutan alur tahapan penanganan (1, 2, dst.). |
| `description` | `TEXT` | Yes | `NULL` | - | - | Penjelasan definisi tahapan operasional. |

---

#### 6.6. `application_decisions`
- **Tujuan**: Menyimpan nilai referensi hasil putusan akhir seleksi administrasi oleh HC.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `VARCHAR(50)` | No | - | **PK** | Primary Key | Identifier kode string (e.g., `dalam_proses`). |
| `name` | `VARCHAR(100)` | No | - | - | - | Label teks putusan seleksi administrasi. |
| `is_final` | `BOOLEAN` | No | `FALSE` | - | - | TRUE jika keputusan berstatus final (`diterima`/`ditolak`). |
| `description` | `TEXT` | Yes | `NULL` | - | - | Keterangan logis status keputusan. |

---

#### 6.7. `internship_statuses`
- **Tujuan**: Menyimpan nilai referensi status keaktifan riil peserta selama masa penugasan di REDIGMA.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `VARCHAR(50)` | No | - | **PK** | Primary Key | Identifier kode string (e.g., `sedang_magang`). |
| `name` | `VARCHAR(100)` | No | - | - | - | Label teks status keaktifan peserta. |
| `is_active_intern` | `BOOLEAN` | No | `FALSE` | - | - | TRUE khusus status `sedang_magang` untuk monitoring. |
| `description` | `TEXT` | Yes | `NULL` | - | - | Deskripsi penjelasan status keaktifan. |

---

#### 6.8. `applications`
- **Tujuan**: Menyimpan berkas transaksi utama pengajuan magang (jalur PKL sekolah maupun Magang Mandiri individu).
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer berkas pengajuan. |
| `application_type` | `VARCHAR(30)` | No | - | - | CHECK (`application_type IN ('PKL', 'MAGANG_MANDIRI')`) | Jalur program pengajuan. |
| `institution_id` | `UUID` | No | - | **FK** | institutions(`id`) ON DELETE RESTRICT | Lembaga pemohon (sekolah/kampus). |
| `apply_date` | `DATE` | No | - | - | - | Tanggal permohonan masuk / mendaftar. |
| `pic_hc_id` | `UUID` | Yes | `NULL` | **FK** | users(`id`) ON DELETE SET NULL | Staf HC penanggung jawab penanganan berkas. |
| `stage_id` | `VARCHAR(50)` | No | `'belum_ditanggapi'` | **FK** | application_stages(`id`) ON DELETE RESTRICT | Tahapan proses penanganan tiket. |
| `decision_id` | `VARCHAR(50)` | No | `'dalam_proses'` | **FK** | application_decisions(`id`) ON DELETE RESTRICT | Keputusan akhir seleksi berkas. |
| `kop_letter_number`| `VARCHAR(100)` | Yes | `NULL` | - | - | Nomor KOP surat sekolah (khusus PKL, tidak unik). |
| `confirmation_deadline`| `DATE` | Yes | `NULL` | - | - | Batas waktu tanggapan ke pemohon (PKL). |
| `confirmation_date`| `DATE` | Yes | `NULL` | - | - | Tanggal surat balasan dikirim (PKL). |
| `proposed_start_date`| `DATE` | Yes | `NULL` | - | - | Tanggal rencana mulai yang diajukan pemohon. |
| `proposed_end_date`| `DATE` | Yes | `NULL` | - | - | Tanggal rencana selesai yang diajukan pemohon. |
| `approved_start_date`| `DATE` | Yes | `NULL` | - | - | Tanggal mulai magang yang disetujui resmi oleh HC. |
| `approved_end_date`| `DATE` | Yes | `NULL` | - | - | Tanggal selesai magang yang disetujui resmi oleh HC. |
| `notes` | `TEXT` | Yes | `NULL` | - | - | Catatan administratif tambahan dari staf HC. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu rekaman pengajuan dibuat. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu pembaruan rekaman pengajuan. |

---

#### 6.9. `application_details`
- **Tujuan**: Menampung rincian permohonan jurusan, posisi yang diminati pemohon, dan kuota siswa untuk jalur pengajuan `PKL` sekolah.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer detail pengajuan PKL. |
| `application_id` | `UUID` | No | - | **FK** | applications(`id`) ON DELETE CASCADE | Relasi ke berkas induk pengajuan PKL. |
| `major_id` | `UUID` | Yes | `NULL` | **FK** | majors(`id`) ON DELETE RESTRICT | Jurusan yang diajukan (Nullable jika non-kejuruan). |
| `requested_position_id`| `UUID` | Yes | `NULL` | **FK** | positions(`id`) ON DELETE RESTRICT | Posisi yang diminta (*Positioning by Request*). |
| `requested_quota`| `INTEGER` | Yes | `NULL` | - | CHECK (`requested_quota IS NULL OR requested_quota >= 0`) | **Sumber tunggal kuota yang diajukan** jurusan ini. |
| `approved_quota` | `INTEGER` | Yes | `NULL` | - | CHECK (`approved_quota IS NULL OR approved_quota >= 0`) | Kuota disetujui HC (**Perlu Validasi HC**). |
| `notes` | `TEXT` | Yes | `NULL` | - | - | Catatan administratif khusus per jurusan. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu pembuatan baris rincian. |

---

#### 6.10. `participants`
- **Tujuan**: Menyimpan data individu setiap siswa/mahasiswa yang menjalani program magang/PKL di REDIGMA.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer data peserta magang. |
| `application_id` | `UUID` | No | - | **FK** | applications(`id`) ON DELETE RESTRICT | Menelusuri peserta ke pengajuan asalnya. |
| `application_detail_id`| `UUID` | Yes | `NULL` | **FK** | application_details(`id`) ON DELETE SET NULL | Rincian jurusan asal peserta PKL (NULL untuk Mandiri). |
| `major_id` | `UUID` | Yes | `NULL` | **FK** | majors(`id`) ON DELETE RESTRICT | Jurusan peserta (**Khusus Magang Mandiri** saat detail NULL). |
| `name` | `VARCHAR(150)` | No | - | - | - | Nama lengkap siswa atau mahasiswa magang. |
| `email` | `VARCHAR(150)` | Yes | `NULL` | - | - | Surel pribadi peserta magang. |
| `phone` | `VARCHAR(50)` | Yes | `NULL` | - | - | Nomor kontak/WhatsApp pribadi peserta. |
| `positioning_by_request_id`| `UUID` | Yes | `NULL` | **FK** | positions(`id`) ON DELETE RESTRICT | Posisi minat pelamar (**Khusus Magang Mandiri**). |
| `positioning_by_hc_id`| `UUID` | Yes | `NULL` | **FK** | positions(`id`) ON DELETE RESTRICT | Posisi penempatan definitif hasil keputusan HC. |
| `actual_start_date`| `DATE` | Yes | `NULL` | - | - | Tanggal riil mulai magang (menyesuaikan siklus hidup). |
| `actual_end_date`| `DATE` | Yes | `NULL` | - | - | Tanggal riil selesai magang (menyesuaikan siklus hidup). |
| `status_id` | `VARCHAR(50)` | No | `'belum_mulai'` | **FK** | internship_statuses(`id`) ON DELETE RESTRICT | Status keaktifan operasional peserta. |
| `notes` | `TEXT` | Yes | `NULL` | - | - | **Catatan administratif terkait peserta**. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu pencatatan data peserta. |
| `updated_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu pemutakhiran data peserta. |

---

#### 6.11. `application_status_logs`
- **Tujuan**: Menyimpan rekaman riwayat kronologis perubahan tahapan dan keputusan pengajuan oleh staf HC.
- **Columns**:

| Column | PostgreSQL Type | Nullable | Default | PK/FK | Constraint | Description |
| :--- | :--- | :---: | :--- | :---: | :--- | :--- |
| `id` | `UUID` | No | `gen_random_uuid()` | **PK** | Primary Key | Kunci primer rekaman histori status. |
| `application_id` | `UUID` | No | - | **FK** | applications(`id`) ON DELETE CASCADE | Relasi ke berkas pengajuan induk. |
| `previous_stage_id`| `VARCHAR(50)` | Yes | `NULL` | - | - | Snapshot teks tahapan proses sebelum perubahan. |
| `new_stage_id` | `VARCHAR(50)` | Yes | `NULL` | - | - | Snapshot teks tahapan proses sesudah perubahan. |
| `previous_decision_id`| `VARCHAR(50)` | Yes | `NULL` | - | - | Snapshot teks keputusan akhir sebelum perubahan. |
| `new_decision_id`| `VARCHAR(50)` | Yes | `NULL` | - | - | Snapshot teks keputusan akhir sesudah perubahan. |
| `changed_by_user_id`| `UUID` | Yes | `NULL` | **FK** | users(`id`) ON DELETE SET NULL | Staf internal HC yang melakukan tindakan pembaruan. |
| `change_notes` | `TEXT` | Yes | `NULL` | - | - | Catatan administratif alasan perubahan status. |
| `created_at` | `TIMESTAMPTZ` | No | `NOW()` | - | - | Stempel waktu pencatatan perubahan status. |

---

### 7. Foreign Key Dependency

Daftar seluruh ketergantungan kunci asing (*Foreign Key*) pada skema migrasi:

| Child Table | Column | Parent Table | Parent Column | ON DELETE |
| :--- | :--- | :--- | :--- | :--- |
| `applications` | `institution_id` | `institutions` | `id` | `RESTRICT` |
| `applications` | `pic_hc_id` | `users` | `id` | `SET NULL` |
| `applications` | `stage_id` | `application_stages` | `id` | `RESTRICT` |
| `applications` | `decision_id` | `application_decisions` | `id` | `RESTRICT` |
| `application_details` | `application_id` | `applications` | `id` | `CASCADE` |
| `application_details` | `major_id` | `majors` | `id` | `RESTRICT` |
| `application_details` | `requested_position_id` | `positions` | `id` | `RESTRICT` |
| `participants` | `application_id` | `applications` | `id` | `RESTRICT` |
| `participants` | `application_detail_id` | `application_details` | `id` | `SET NULL` |
| `participants` | `major_id` | `majors` | `id` | `RESTRICT` |
| `participants` | `positioning_by_request_id` | `positions` | `id` | `RESTRICT` |
| `participants` | `positioning_by_hc_id` | `positions` | `id` | `RESTRICT` |
| `participants` | `status_id` | `internship_statuses` | `id` | `RESTRICT` |
| `application_status_logs` | `application_id` | `applications` | `id` | `CASCADE` |
| `application_status_logs` | `changed_by_user_id` | `users` | `id` | `SET NULL` |

*Catatan Khusus Kolom Snapshot Log*:
Kolom `previous_stage_id`, `new_stage_id`, `previous_decision_id`, dan `new_decision_id` pada tabel `application_status_logs` mempertahankan nilai sebagai **snapshot identifier teks**. Penambahan batasan Foreign Key fisik pada kolom-kolom log ini berstatus **Perlu Validasi / Keputusan Implementasi** guna menjaga rekam jejak tetap permanen jika kode referensi di masa depan dimodifikasi.

---

### 8. Constraint Blueprint

#### 8.1. Check Constraints yang Diterapkan

1. **Validasi Jalur Pengajuan (`applications.application_type`)**:
   ```sql
   ALTER TABLE applications 
     ADD CONSTRAINT chk_applications_type 
     CHECK (application_type IN ('PKL', 'MAGANG_MANDIRI'));
   ```
2. **Validasi Kuota Permohonan (`application_details.requested_quota`)**:
   ```sql
   ALTER TABLE application_details 
     ADD CONSTRAINT chk_app_details_requested_quota 
     CHECK (requested_quota IS NULL OR requested_quota >= 0);
   ```
3. **Validasi Kuota Disetujui (`application_details.approved_quota`)**:
   ```sql
   ALTER TABLE application_details 
     ADD CONSTRAINT chk_app_details_approved_quota 
     CHECK (approved_quota IS NULL OR approved_quota >= 0);
   ```
   *Catatan*: Kolom ini bersifat *nullable* dan pemanfaatannya berstatus **Perlu Validasi HC**.
4. **Validasi Rentang Tanggal Pelaksanaan Peserta (`participants`)**:
   ```sql
   ALTER TABLE participants 
     ADD CONSTRAINT chk_participants_actual_dates 
     CHECK (
       actual_start_date IS NULL OR 
       actual_end_date IS NULL OR 
       actual_end_date >= actual_start_date
     );
   ```

#### 8.2. Constraints yang Sengaja Tidak Dibuat

1. **Tidak Ada `UNIQUE (kop_letter_number)`**:
   Nomor KOP surat sekolah tidak dipasangi batasan unik karena pada operasional aktual di spreadsheet satu nomor surat resmi digunakan bersama untuk mengajukan beberapa jurusan yang berbeda.
2. **Tidak Ada `UNIQUE (participants.application_id)`**:
   Relasi basis data antara pengajuan dan peserta secara konsisten bernilai **1 : N** untuk seluruh jalur pengajuan (PKL maupun Magang Mandiri).
3. **Tidak Ada Constraint Wajib `confirmation_date >= apply_date`**:
   Aturan perbandingan tanggal konfirmasi terhadap tanggal apply **bukan merupakan batasan basis data wajib**, melainkan pertimbangan opsional (*optional implementation consideration*) yang dapat diakomodasi pada lapisan validasi aplikasi.

---

### 9. Index Blueprint

#### 9.1. Required Indexes (Indeks Wajib Kueri Pemantauan)

Indeks berikut wajib dibuat untuk menjamin performa filter dan agregasi dasbor internal HC:

| Nama Indeks | Tabel Target | Definisi Kolom | Tujuan Penggunaan |
| :--- | :--- | :--- | :--- |
| `idx_applications_application_type` | `applications` | `(application_type)` | Pemisahan filter cepat antara jalur PKL dan Magang Mandiri. |
| `idx_applications_stage_id` | `applications` | `(stage_id)` | Penyaringan berkas menurut tahap penanganan (`belum_ditanggapi`). |
| `idx_applications_decision_id` | `applications` | `(decision_id)` | Penyaringan menurut keputusan seleksi (`dalam_proses`, `diterima`). |
| `idx_applications_apply_date` | `applications` | `(apply_date DESC)` | Pengurutan berkas pendaftaran masuk terbaru secara cepat. |
| `idx_participants_status_id` | `participants` | `(status_id)` | Agregasi penghitungan jumlah peserta magang aktif (`sedang_magang`). |
| `idx_participants_actual_dates` | `participants` | `(actual_start_date, actual_end_date)` | Pemfilteran rentang keaktifan peserta dan tanggal berakhir magang. |

#### 9.2. Recommended Indexes (Indeks Rekomendasi Kunci Asing)

Indeks pada kolom kunci asing berikut direkomendasikan untuk mencegah penurunan performa operasi penggabungan (*JOIN*) dan eliminasi *table locks*:

| Nama Indeks | Tabel Target | Definisi Kolom | Keterangan |
| :--- | :--- | :--- | :--- |
| `idx_applications_institution_id` | `applications` | `(institution_id)` | Rekomendasi: Mempercepat kueri riwayat pengajuan per institusi. |
| `idx_applications_pic_hc_id` | `applications` | `(pic_hc_id)` | Rekomendasi: Mempercepat penyaringan berkas tugas per staf PIC HC. |
| `idx_application_details_application_id`| `application_details`| `(application_id)` | Rekomendasi: Mempercepat pembacaan rincian jurusan per pengajuan. |
| `idx_participants_application_id` | `participants` | `(application_id)` | Rekomendasi: Mempercepat penelusuran seluruh siswa dalam satu berkas. |
| `idx_status_logs_application_id` | `application_status_logs`| `(application_id)` | Rekomendasi: Mempercepat pemuatan riwayat perubahan status tiket. |

---

### 10. Reference Seed Data

Migrasi awal **hanya boleh mengisi data referensi status** yang telah disepakati pada `docs/DATABASE_SCHEMA.md`.

#### 10.1. `application_stages`
| id | name | sequence_order | description |
| :--- | :--- | :---: | :--- |
| `belum_ditanggapi` | Belum Ditanggapi | 1 | Berkas pengajuan baru diterima dan belum ditindaklanjuti oleh staf HC. |
| `sudah_ditanggapi` | Sudah Ditanggapi | 2 | Berkas telah ditinjau dan staf HC telah menghubungi pemohon atau menugaskan PIC. |

#### 10.2. `application_decisions`
| id | name | is_final | description |
| :--- | :--- | :---: | :--- |
| `dalam_proses` | Dalam Proses | FALSE | Permohonan magang sedang dalam tahap peninjauan kualifikasi dan kuota divisi. |
| `diterima` | Diterima | TRUE | Permohonan magang disetujui resmi untuk melaksanakan program di REDIGMA. |
| `ditolak` | Ditolak | TRUE | Permohonan magang tidak dapat diakomodasi oleh perusahaan. |

#### 10.3. `internship_statuses`
| id | name | is_active_intern | description |
| :--- | :--- | :---: | :--- |
| `belum_mulai` | Belum Mulai | FALSE | Peserta telah disetujui namun tanggal pelaksanaan magang belum dimulai. |
| `sedang_magang` | Sedang Magang | TRUE | Peserta aktif melaksanakan tugas magang di lingkungan operasional REDIGMA. |
| `sudah_selesai` | Sudah Selesai | FALSE | Peserta telah menuntaskan seluruh masa penugasan program magang. |
| `mengundurkan_diri` | Mengundurkan Diri | FALSE | Peserta membatalkan keikutsertaan sebelum atau saat program berjalan. |

*Batasan Mutlak*: Dilarang membuat rekaman *seed* untuk tabel `users`, `institutions`, `majors`, dan `positions`. Data tersebut wajib bersumber dari input administratif resmi atau berkas impor awal data operasional nyata REDIGMA.

---

### 11. Supabase Auth Architecture

Hubungan arsitektural antara otentikasi Supabase dan entitas operasional internal HC didefinisikan sebagai berikut:

```
[Supabase Auth Engine]
         │
         ▼
[auth.users (Private Schema)]
         │
         ▼
[Authenticated Session Context (JWT: auth.uid())]
         │
         ▼
[public.users (Application Profile Table)]
         │
         ▼
[Operasional & Penugasan PIC Magang (applications / participants)]
```

**Ketentuan Arsitektur**:
- Tabel `public.users` bertindak sebagai entitas profil staf internal HC untuk keperluan operasional bisnis dan penugasan relasi `pic_hc_id`.
- Mekanisme teknis sinkronisasi antara `auth.users` dan `public.users` (apakah menggunakan kunci asing langsung `public.users.id REFERENCES auth.users(id)`, pemicu pendaftaran otomatis `AFTER INSERT ON auth.users`, atau prosedur backend terpisah) berstatus:
  **"Perlu Validasi / Keputusan Arsitektur"**
- Migrasi skema ini tidak memaksakan dependensi langsung tanpa keputusan arsitektur otentikasi formal.

---

### 12. Row Level Security Blueprint

Seluruh **11 tabel** dalam skema publik wajib mengaktifkan proteksi RLS tanpa pengecualian:

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE internship_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_logs ENABLE ROW LEVEL SECURITY;
```

**Prinsip dan Penundaan Kebijakan Keamanan**:
1. **Sifat Dasar Pengaktifan RLS**:
   - Perintah `ENABLE ROW LEVEL SECURITY` semata-mata mengaktifkan mekanisme isolasi keamanan pada tingkat tabel dan secara default menolak (*deny all*) seluruh akses data bagi pengguna non-superuser/klien aplikasi.
   - Pengaktifan RLS ini **belum menetapkan hak akses operasional apa pun** kepada pengguna sistem.
2. **Penolakan Akses Publik (*Public/Anonymous Access*)**:
   - Akses publik atau tanpa autentikasi (`anon`) ditolak secara menyeluruh tanpa pengecualian.
3. **Penundaan Penyusunan Policy Akses Operasional**:
   - Penyusunan naskah kebijakan (*RLS Policies*) untuk hak akses operasional internal staf HC ditunda sepenuhnya sampai arsitektur autentikasi/otorisasi disepakati dan aturan pembagian wewenang PIC HC divalidasi.
   - Tidak ada penetapan atau asumsi bahwa pengguna internal terotentikasi sudah otomatis dapat membaca atau menulis data sebelum *policy* spesifik disahkan dan dibuat.
4. **Keputusan yang Menunggu Validasi**:
   - Terkait pembagian hak akses: *"Apakah hanya staf PIC yang berhak menyunting berkas pengajuannya, atau seluruh staf HC aktif berhak menyunting data secara kolaboratif?"*
   - Status: **Perlu Validasi HC / Keputusan Arsitektur**. Pembuatan pernyataan `CREATE POLICY` final tidak dilakukan pada tahap ini.

---

### 13. Delete and Lifecycle Behavior

Pengelolaan siklus hidup data (*data lifecycle*) dan aturan penghapusan dirancang untuk mempertahankan integritas riwayat:

1. **Kaskade Rincian Pengajuan (`applications` $\rightarrow$ `application_details`)**:
   - Menetapkan aturan `ON DELETE CASCADE`. Jika suatu rekaman berkas pengajuan induk dihapus secara sah sesuai kewenangan sistem, seluruh baris rincian jurusan terkait otomatis terhapus.
2. **Perlindungan Data Master (`RESTRICT`)**:
   - Master data lembaga (`institutions`), jurusan (`majors`), dan posisi (`positions`) memberlakukan batasan `ON DELETE RESTRICT` untuk mencegah terhapusnya master data yang telah terikat pada transaksi.
3. **Integritas Riwayat Peserta**:
   - Kolom `participants.application_id` menggunakan aturan `ON DELETE RESTRICT` guna memastikan data individu peserta tidak terhapus secara tidak disengaja.
4. **Preservasi Peserta Selesai**:
   - Peserta dengan status `sudah_selesai` atau `mengundurkan_diri` dipertahankan permanen dalam tabel `participants` sebagai rekaman historis.
5. **Ketiadaan Kolom Soft Delete**:
   - Tidak menambahkan kolom `is_deleted` atau `deleted_at`. Seluruh pemfilteran data operasional dilakukan berbasis status keaktifan referensial (`internship_statuses`).

---

### 14. Deferred Decisions / Validation

Tabel berikut merangkum 7 poin bisnis dan teknis yang masih berstatus menunggu konfirmasi langsung dari Human Capital REDIGMA, beserta dampaknya terhadap pelaksanaan migrasi:

| No | Item / Topik | Status | Dampak terhadap Migration |
| :---: | :--- | :--- | :--- |
| 1 | **Granularitas Kuota Siswa PKL** | Perlu Validasi HC | Draf migrasi menetapkan `application_details.requested_quota` sebagai sumber tunggal data kuota. Jika validasi menyatakan ada pengajuan kuota global tanpa jurusan, migrasi lanjutan dapat menambahkan kolom di `applications`. |
| 2 | **Kebutuhan Kolom Kuota Disetujui (`approved_quota`)** | Perlu Validasi HC | Kolom disiapkan sebagai `INTEGER NULLABLE` pada `application_details`. Tidak ada dependensi wajib yang mengunci operasional awal jika kolom ini tidak diisi. |
| 3 | **Penanganan Permohonan Multi-Posisi** | Perlu Validasi HC | Draf migrasi membatasi 1 posisi per detail/peserta mandiri. Jika HC memvalidasi bahwa multi-posisi wajib didukung, tabel perantara (*junction table*) akan dibuat pada migrasi tahap kedua. |
| 4 | **Keunikan Nomor KOP Surat PKL** | Perlu Validasi HC | Kolom `kop_letter_number` dibiarkan tanpa batasan `UNIQUE`. Jika HC menetapkan nomor surat harus unik per tahun/sekolah, indeks unik dapat ditambahkan pada migrasi terpisah. |
| 5 | **Pelamar Mandiri Belum Diterima / Ditolak** | Perlu Validasi HC | Skema mendukung relasi fleksibel 1:N ke `participants`. Alur apakah pelamar langsung dicatat di tabel peserta atau hanya di pengajuan diatur pada logika aplikasi tanpa mengubah skema tabel. |
| 6 | **Otomasi Status Peserta Berdasarkan Tanggal** | Perlu Validasi HC | Kolom tanggal aktual dibuat *nullable* tanpa pemicu (*trigger*) otomatis. Otomasi penjadwalan status dapat diimplementasikan di kemudian hari jika disetujui HC. |
| 7 | **Hak Akses & Otorisasi Berdasarkan PIC HC** | Perlu Validasi HC | RLS diaktifkan secara menyeluruh (*enabled*), namun penulisan klausa kebijakan (*policy*) spesifik berbasis PIC ditangguhkan hingga pembagian kewenangan final diputuskan. |

---

### 15. Migration Safety

Prinsip keamanan migrasi yang wajib dipatuhi:

1. **Review Sebelum Eksekusi**: Seluruh skrip DDL SQL wajib ditinjau dan divalidasi silang terhadap dokumen ini sebelum dijalankan di lingkungan pengujian.
2. **Ketiadaan Perintah Destruktif**: Dilarang menyertakan perintah pembersihan basis data yang merusak seperti `DROP DATABASE`, `DROP SCHEMA public CASCADE`, atau penghapusan data massal (*TRUNCATE*) tanpa otorisasi formal.
3. **Isolasi Lingkungan Pengembangan**: Dilarang menjalankan pengujian migrasi pada lingkungan produksi REDIGMA. Eksekusi pengujian wajib dilakukan pada proyek Supabase khusus lingkungan Capstone.
4. **Migrasi Terkelola (*Version-Controlled Migration*)**: Naskah migrasi SQL yang akan disusun harus diberi penomoran urut versi (*timestamp-prefixed migrations*) guna memfasilitasi pelacakan perubahan.

---

### 16. Migration Verification Checklist

Daftar verifikasi yang wajib dipenuhi sebelum naskah SQL migrasi dieksekusi:

- [ ] Seluruh 11 tabel didefinisikan persis sesuai `docs/DATABASE_SCHEMA.md`.
- [ ] Tidak ada penambahan tabel baru di luar skema.
- [ ] Tidak ada penambahan atau penghilangan kolom pada masing-masing tabel.
- [ ] Seluruh Kunci Primer (*Primary Key*) terpasang sesuai spesifikasi.
- [ ] Seluruh 15 Kunci Asing (*Foreign Key*) dan aksi `ON DELETE` terpasang secara tepat.
- [ ] Seluruh batasan *Check Constraints* terpasang sesuai aturan skema.
- [ ] Tidak ada batasan `UNIQUE` yang tidak disepakati (khususnya pada nomor KOP surat dan relasi pengajuan ke peserta).
- [ ] 6 indeks performa wajib (*required indexes*) terdefinisi.
- [ ] 5 indeks relasi rekomendasi (*recommended indexes*) terdefinisi.
- [ ] Pemuatan *seed* data awal hanya mencakup 3 tabel referensi status (total 9 rekaman).
- [ ] Tidak ada pemuatan *seed* spekulatif untuk master data `users`, `institutions`, `majors`, dan `positions`.
- [ ] Pengaktifan RLS (`ENABLE ROW LEVEL SECURITY`) diterapkan pada seluruh 11 tabel.
- [ ] Hak akses publik/anonim tidak dibuka.
- [ ] Kebijakan RLS spesifik berbasis PIC belum dipaksakan sebelum validasi selesai.
- [ ] Mekanisme integrasi terhadap `auth.users` tidak diputuskan sepihak.
- [ ] Seluruh 7 poin keraguan operasional tetap terdokumentasi sebagai hal yang ditangguhkan (*deferred validation*).

---

### 17. Traceability

Matriks ketertelusuran komponen teknis terhadap dokumen persyaratan acuan:

| Komponen Migrasi | Dokumen Sumber Acuan |
| :--- | :--- |
| **Daftar Tabel (11 Tabel)** | `docs/DATABASE_SCHEMA.md` & `docs/ERD.md` |
| **Spesifikasi Kolom & Tipe Data** | `docs/DATABASE_SCHEMA.md` |
| **Ketergantungan Relasi & FK** | `docs/DATABASE_SCHEMA.md` & `docs/ERD.md` |
| **Check Constraints** | `docs/DATABASE_SCHEMA.md` |
| **Daftar Indeks (Wajib & Rekomendasi)** | `docs/DATABASE_SCHEMA.md` |
| **Data Awal Referensi (Seed)** | `docs/DATABASE_SCHEMA.md` |
| **Konteks Alur Proses Operasional** | `docs/BUSINESS_FLOW.md` & `INPUT_PENGAJUAN_MAGANG.xlsx` |
| **Ruang Lingkup Fungsional Sistem** | `docs/REQUIREMENTS.md` |

---

### 18. Final Status

Status dokumen saat ini ditetapkan sebagai:

```
STATUS: READY FOR SQL MIGRATION REVIEW
```

*Dokumen ini merupakan cetak biru teknis resmi yang telah siap untuk ditinjau oleh perekayasa perangkat lunak sebelum penulisan naskah migrasi SQL. Dokumen ini belum berstatus "READY FOR PRODUCTION" mengingat naskah SQL aktual belum disusun dan beberapa aspek operasional internal masih memerlukan validasi lanjutan dari pihak Human Capital REDIGMA.*
