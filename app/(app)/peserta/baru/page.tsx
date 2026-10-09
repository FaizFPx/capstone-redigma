import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ParticipantForm } from '@/components/peserta/participant-form'
import type { InternshipStatus, ApplicationOption } from '../types'
import type { Major, Position } from '../../pengajuan/types'

export default async function TambahPesertaPage({
  searchParams,
}: {
  searchParams?: Promise<{ application_id?: string; app_id?: string }>
}) {
  const resolvedParams = searchParams ? await searchParams : {}
  const targetApplicationId =
    resolvedParams.application_id || resolvedParams.app_id || ''

  const supabase = await createClient()

  // Ambil data referensi pendukung untuk form
  const [
    { data: appsData },
    { data: appDetailsData },
    { data: participantsCountData },
    { data: majorsData },
    { data: positionsData },
    { data: statusesData },
  ] = await Promise.all([
    supabase
      .from('applications')
      .select(
        `
        id,
        application_type,
        apply_date,
        kop_letter_number,
        decision_id,
        stage_id,
        decision:application_decisions ( id, name ),
        institution:institutions!institution_id ( id, name, type )
      `
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('application_details')
      .select(
        `
        id,
        application_id,
        major_id,
        requested_position_id,
        requested_quota,
        approved_quota,
        major:majors!major_id ( id, name, code ),
        position:positions!requested_position_id ( id, name )
      `
      ),
    supabase.from('participants').select('id, application_detail_id'),
    supabase.from('majors').select('id, name, code, is_active').order('name'),
    supabase.from('positions').select('id, name, is_active').order('name'),
    supabase
      .from('internship_statuses')
      .select('id, name, is_active_intern')
      .order('id'),
  ])

  const allApplications: ApplicationOption[] =
    (appsData as unknown as ApplicationOption[]) || []

  // Saring pengajuan yang eligible (pengajuan yang tidak ditolak)
  const eligibleApplications = allApplications.filter(
    (app) => app.decision_id !== 'ditolak'
  )

  // Prioritaskan pengajuan target jika ada, disusul yang berstatus diterima
  const sortedEligibleApplications = [...eligibleApplications].sort((a, b) => {
    if (targetApplicationId && a.id === targetApplicationId) return -1
    if (targetApplicationId && b.id === targetApplicationId) return 1
    if (a.decision_id === 'diterima' && b.decision_id !== 'diterima') return -1
    if (b.decision_id === 'diterima' && a.decision_id !== 'diterima') return 1
    return 0
  })

  // Hitung jumlah peserta yang sudah terdaftar pada setiap application_detail
  const participantCountByDetail = new Map<string, number>()
  for (const p of participantsCountData || []) {
    if (p.application_detail_id) {
      participantCountByDetail.set(
        p.application_detail_id,
        (participantCountByDetail.get(p.application_detail_id) || 0) + 1
      )
    }
  }

  const applicationDetails = (appDetailsData || []).map((det: any) => ({
    ...det,
    current_count: participantCountByDetail.get(det.id) || 0,
  }))
  const majors: Major[] = majorsData || []
  const positions: Position[] = positionsData || []
  const statuses: InternshipStatus[] = statusesData || []

  // KONDISI 1: Database sama sekali belum memiliki pengajuan (P0-3 Empty State)
  if (allApplications.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/peserta"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Kembali ke daftar peserta"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tambah Peserta Magang</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Pendaftaran peserta magang memerlukan berkas pengajuan induk.
            </p>
          </div>
        </div>

        {/* Empty State Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 sm:p-12 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-lg font-bold text-gray-900">
            Belum ada pengajuan magang
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 leading-relaxed">
            Peserta harus didaftarkan berdasarkan pengajuan magang yang sudah tercatat.
            Silakan catat berkas surat/permohonan magang terlebih dahulu.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/pengajuan/baru"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Buat Pengajuan Sekarang</span>
            </Link>
            <Link
              href="/peserta"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Kembali ke Daftar Peserta
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // KONDISI 2: Pengajuan ada, tetapi tidak ada yang eligible (misal semua ditolak)
  if (sortedEligibleApplications.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/peserta"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Kembali ke daftar peserta"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tambah Peserta Magang</h1>
            <p className="mt-0.5 text-xs text-gray-500">
              Pendaftaran peserta magang memerlukan berkas pengajuan yang valid.
            </p>
          </div>
        </div>

        {/* Ineligible Empty State */}
        <div className="rounded-2xl border border-amber-200 bg-white p-8 sm:p-12 text-center shadow-xs">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.75"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2 className="mt-4 text-lg font-bold text-gray-900">
            Belum ada pengajuan yang memenuhi syarat
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 leading-relaxed">
            Semua pengajuan magang yang tercatat saat ini berstatus ditolak. Peserta hanya
            dapat didaftarkan untuk pengajuan yang aktif atau diterima.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/pengajuan/baru"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>+ Buat Pengajuan Sekarang</span>
            </Link>
            <Link
              href="/pengajuan"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Kelola Pengajuan
            </Link>
            <Link
              href="/peserta"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Kembali ke Daftar Peserta
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Cek apakah target application yang diminta via URL berstatus ditolak
  const targetApp = allApplications.find((a) => a.id === targetApplicationId)
  const isTargetAppRejected = targetApp?.decision_id === 'ditolak'

  return (
    <div className="space-y-6">
      {/* Header Halaman Tambah */}
      <div className="flex items-center gap-3">
        <Link
          href="/peserta"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Kembali ke daftar peserta"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tambah Peserta Magang</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Catat data individu siswa / mahasiswa magang yang terhubung dengan berkas pengajuan.
          </p>
        </div>
      </div>

      {isTargetAppRejected && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-start gap-3">
          <svg className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <strong className="font-semibold">Perhatian:</strong> Pengajuan yang Anda pilih sebelumnya berstatus{' '}
            <span className="font-semibold text-red-600">ditolak</span>. Peserta tidak dapat didaftarkan pada pengajuan yang ditolak. Silakan pilih dari pengajuan aktif lainnya di bawah.
          </div>
        </div>
      )}

      <ParticipantForm
        defaultApplicationId={isTargetAppRejected ? '' : targetApplicationId}
        applications={sortedEligibleApplications}
        applicationDetails={applicationDetails}
        majors={majors}
        positions={positions}
        statuses={statuses}
        isEdit={false}
      />
    </div>
  )
}
