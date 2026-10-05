-- ============================================================
-- REDIGMA MAGANG CAPSTONE
-- Initial Database Schema Migration
-- Migration: 20261003053038_initial_schema
--
-- Scope:
-- - 11 tables
-- - 15 foreign keys
-- - 4 check constraints
-- - 6 required indexes
-- - 5 recommended FK indexes
-- - 9 reference seed records
-- - RLS enabled on all 11 tables
--
-- This migration intentionally does NOT:
-- - create auth.users integration
-- - create RLS policies
-- - seed users/institutions/majors/positions
-- - create public portal access
-- - create AI matching
-- ============================================================


-- ============================================================
-- 1. MASTER TABLES
-- ============================================================

CREATE TABLE public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    role VARCHAR(50) NOT NULL DEFAULT 'hc_staff',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(50) NOT NULL,
    address TEXT NULL,
    contact_email VARCHAR(150) NULL,
    contact_phone VARCHAR(50) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE public.majors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30) NULL,
    institution_level VARCHAR(30) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


CREATE TABLE public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 2. REFERENCE TABLES
-- ============================================================

CREATE TABLE public.application_stages (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sequence_order INTEGER NOT NULL,
    description TEXT NULL
);


CREATE TABLE public.application_decisions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT NULL
);


CREATE TABLE public.internship_statuses (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    is_active_intern BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT NULL
);


-- ============================================================
-- 3. MAIN TRANSACTION TABLE
-- ============================================================

CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_type VARCHAR(30) NOT NULL,

    institution_id UUID NOT NULL,

    apply_date DATE NOT NULL,

    pic_hc_id UUID NULL,

    stage_id VARCHAR(50) NOT NULL DEFAULT 'belum_ditanggapi',

    decision_id VARCHAR(50) NOT NULL DEFAULT 'dalam_proses',

    kop_letter_number VARCHAR(100) NULL,

    confirmation_deadline DATE NULL,

    confirmation_date DATE NULL,

    proposed_start_date DATE NULL,

    proposed_end_date DATE NULL,

    approved_start_date DATE NULL,

    approved_end_date DATE NULL,

    notes TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_applications_type
        CHECK (
            application_type IN ('PKL', 'MAGANG_MANDIRI')
        ),

    CONSTRAINT fk_applications_institution
        FOREIGN KEY (institution_id)
        REFERENCES public.institutions(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_applications_pic_hc
        FOREIGN KEY (pic_hc_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_applications_stage
        FOREIGN KEY (stage_id)
        REFERENCES public.application_stages(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_applications_decision
        FOREIGN KEY (decision_id)
        REFERENCES public.application_decisions(id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 4. APPLICATION DETAILS
-- ============================================================

CREATE TABLE public.application_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL,

    major_id UUID NULL,

    requested_position_id UUID NULL,

    requested_quota INTEGER NULL,

    approved_quota INTEGER NULL,

    notes TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_app_details_requested_quota
        CHECK (
            requested_quota IS NULL
            OR requested_quota >= 0
        ),

    CONSTRAINT chk_app_details_approved_quota
        CHECK (
            approved_quota IS NULL
            OR approved_quota >= 0
        ),

    CONSTRAINT fk_app_details_application
        FOREIGN KEY (application_id)
        REFERENCES public.applications(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_app_details_major
        FOREIGN KEY (major_id)
        REFERENCES public.majors(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_app_details_requested_position
        FOREIGN KEY (requested_position_id)
        REFERENCES public.positions(id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 5. PARTICIPANTS
-- ============================================================

CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL,

    application_detail_id UUID NULL,

    major_id UUID NULL,

    name VARCHAR(150) NOT NULL,

    email VARCHAR(150) NULL,

    phone VARCHAR(50) NULL,

    positioning_by_request_id UUID NULL,

    positioning_by_hc_id UUID NULL,

    actual_start_date DATE NULL,

    actual_end_date DATE NULL,

    status_id VARCHAR(50) NOT NULL DEFAULT 'belum_mulai',

    notes TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_participants_actual_dates
        CHECK (
            actual_start_date IS NULL
            OR actual_end_date IS NULL
            OR actual_end_date >= actual_start_date
        ),

    CONSTRAINT fk_participants_application
        FOREIGN KEY (application_id)
        REFERENCES public.applications(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_participants_application_detail
        FOREIGN KEY (application_detail_id)
        REFERENCES public.application_details(id)
        ON DELETE SET NULL,

    CONSTRAINT fk_participants_major
        FOREIGN KEY (major_id)
        REFERENCES public.majors(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_participants_position_request
        FOREIGN KEY (positioning_by_request_id)
        REFERENCES public.positions(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_participants_position_hc
        FOREIGN KEY (positioning_by_hc_id)
        REFERENCES public.positions(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_participants_status
        FOREIGN KEY (status_id)
        REFERENCES public.internship_statuses(id)
        ON DELETE RESTRICT
);


-- ============================================================
-- 6. APPLICATION STATUS LOGS
-- ============================================================

CREATE TABLE public.application_status_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL,

    previous_stage_id VARCHAR(50) NULL,

    new_stage_id VARCHAR(50) NULL,

    previous_decision_id VARCHAR(50) NULL,

    new_decision_id VARCHAR(50) NULL,

    changed_by_user_id UUID NULL,

    change_notes TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_status_logs_application
        FOREIGN KEY (application_id)
        REFERENCES public.applications(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_status_logs_changed_by
        FOREIGN KEY (changed_by_user_id)
        REFERENCES public.users(id)
        ON DELETE SET NULL
);


-- ============================================================
-- 7. REQUIRED INDEXES
-- ============================================================

CREATE INDEX idx_applications_application_type
    ON public.applications (application_type);

CREATE INDEX idx_applications_stage_id
    ON public.applications (stage_id);

CREATE INDEX idx_applications_decision_id
    ON public.applications (decision_id);

CREATE INDEX idx_applications_apply_date
    ON public.applications (apply_date DESC);

CREATE INDEX idx_participants_status_id
    ON public.participants (status_id);

CREATE INDEX idx_participants_actual_dates
    ON public.participants (
        actual_start_date,
        actual_end_date
    );


-- ============================================================
-- 8. RECOMMENDED FOREIGN KEY INDEXES
-- ============================================================

CREATE INDEX idx_applications_institution_id
    ON public.applications (institution_id);

CREATE INDEX idx_applications_pic_hc_id
    ON public.applications (pic_hc_id);

CREATE INDEX idx_application_details_application_id
    ON public.application_details (application_id);

CREATE INDEX idx_participants_application_id
    ON public.participants (application_id);

CREATE INDEX idx_status_logs_application_id
    ON public.application_status_logs (application_id);


-- ============================================================
-- 9. REFERENCE SEED DATA
-- ============================================================

-- Application stages
INSERT INTO public.application_stages (
    id,
    name,
    sequence_order,
    description
)
VALUES
(
    'belum_ditanggapi',
    'Belum Ditanggapi',
    1,
    'Berkas pengajuan baru diterima dan belum ditindaklanjuti oleh staf HC.'
),
(
    'sudah_ditanggapi',
    'Sudah Ditanggapi',
    2,
    'Berkas telah ditinjau dan staf HC telah menghubungi pemohon atau menugaskan PIC.'
);


-- Application decisions
INSERT INTO public.application_decisions (
    id,
    name,
    is_final,
    description
)
VALUES
(
    'dalam_proses',
    'Dalam Proses',
    FALSE,
    'Permohonan magang sedang dalam tahap peninjauan kualifikasi dan kuota divisi.'
),
(
    'diterima',
    'Diterima',
    TRUE,
    'Permohonan magang disetujui resmi untuk melaksanakan program di REDIGMA.'
),
(
    'ditolak',
    'Ditolak',
    TRUE,
    'Permohonan magang tidak dapat diakomodasi oleh perusahaan.'
);


-- Internship statuses
INSERT INTO public.internship_statuses (
    id,
    name,
    is_active_intern,
    description
)
VALUES
(
    'belum_mulai',
    'Belum Mulai',
    FALSE,
    'Peserta telah disetujui namun tanggal pelaksanaan magang belum dimulai.'
),
(
    'sedang_magang',
    'Sedang Magang',
    TRUE,
    'Peserta aktif melaksanakan tugas magang di lingkungan operasional REDIGMA.'
),
(
    'sudah_selesai',
    'Sudah Selesai',
    FALSE,
    'Peserta telah menuntaskan seluruh masa penugasan program magang.'
),
(
    'mengundurkan_diri',
    'Mengundurkan Diri',
    FALSE,
    'Peserta membatalkan keikutsertaan sebelum atau saat program berjalan.'
);


-- ============================================================
-- 10. ROW LEVEL SECURITY
-- ============================================================
--
-- RLS is intentionally ENABLED but no policies are created yet.
-- Operational RLS policies will be added after authentication,
-- authorization, and HC/PIC access rules are validated.
--

ALTER TABLE public.users
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.institutions
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.majors
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.positions
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.application_stages
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.application_decisions
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.internship_statuses
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.applications
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.application_details
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.participants
    ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.application_status_logs
    ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- END OF INITIAL SCHEMA MIGRATION
-- ============================================================