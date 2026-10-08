import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatDateTime } from '@/lib/utils/date'
import { DeleteParticipantButton } from '@/components/peserta/delete-participant-button'
import { ParticipantQuickStatus } from '@/components/peserta/quick-status-modal'
import type { ParticipantItem } from '../types'

export default async function DetailPesertaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string }>
}) {
  const { id } = await params
  const { success } = await searchParams

  const supabase = await createClient()

  // Ambil detail peserta lengkap beserta relasi
  const { data: rawParticipant, error } = await supabase
    .from('participants')
    .select(
      `
      id,
      application_id,
      application_detail_id,
      major_id,
      name,
      email,
      phone,
      positioning_by_request_id,
      positioning_by_hc_id,
      actual_start_date,
      actual_end_date,
      status_id,
      notes,
      created_at,
      updated_at,
      application:applications!application_id (
        id,
        application_type,
        apply_date,
        kop_letter_number,
        institution:institutions!institution_id (
          id,
          name,
          type,
          contact_email,
          contact_phone,
          address
        )
      ),
      application_detail:application_details!application_detail_id (
        id,
        requested_quota,
        approved_quota
      ),
      major:majors!major_id (
        id,
        name,
        code
      ),
      position_requested:positions!positioning_by_request_id (
        id,
        name
      ),
      position_assigned:positions!positioning_by_hc_id (
        id,
        name
      ),
      status:internship_statuses!status_id (
        id,
        name,
        is_active_intern,
        description
      )
    `
    )
    .eq('id', id)
    .single()

  if (error || !rawParticipant) {
    notFound()
  }

  const p = rawParticipant as unknown as ParticipantItem

  // Hitung durasi magang jika ada tanggal mulai & selesai
  const calculateDuration = (start?: string | null, end?: string | null) => {
    if (!start || !end) return '-'
    const s = new Date(start)
    const e = new Date(end)
    const diffTime = Math.abs(e.getTime() - s.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    const months = Math.floor(diffDays / 30)
    const days = diffDays % 30
    if (months > 0) {
      return `${months} bulan ${days > 0 ? `${days} hari` : ''} (${diffDays} hari)`
    }
    return `${diffDays} hari`
  }

  const getStatusBadge = (statusId: string, statusName?: string) => {
    const label = statusName || statusId
    switch (statusId) {
      case 'sedang_magang':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            {label}
          </span>
        )
      case 'sudah_selesai':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            {label}
          </span>
        )
      case 'mengundurkan_diri':
        return (
          <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
            {label}
          </span>
        )
      default: // belum_mulai
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            {label}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {success === 'created'
                ? 'Data peserta magang baru berhasil disimpan.'
                : 'Data peserta magang berhasil diperbarui.'}
            </span>
          </div>
        </div>
      )}

      {/* Header & Aksi */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
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
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                {p.name}
              </h1>
              {getStatusBadge(p.status_id, p.status?.name)}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Tercatat sejak {formatDateTime(p.created_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <ParticipantQuickStatus
            participantId={p.id}
            participantName={p.name}
            currentStatusId={p.status_id}
            actualStartDate={p.actual_start_date}
            actualEndDate={p.actual_end_date}
          />
          <Link
            href={
              p.application_id
                ? `/peserta/baru?application_id=${p.application_id}`
                : '/peserta/baru'
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Tambah Peserta Lagi</span>
          </Link>
          <Link
            href={`/peserta/${p.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Peserta
          </Link>
          <DeleteParticipantButton participantId={p.id} participantName={p.name} />
        </div>
      </div>

      {/* Grid Informasi Lengkap */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom Kiri: Data Identitas & Penempatan */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Data Identitas Kontak */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Informasi Pribadi & Kontak
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-400 block font-medium">Nama Lengkap</span>
                <span className="font-semibold text-gray-800">{p.name}</span>
              </div>

              <div>
                <span className="text-xs text-gray-400 block font-medium">Email Pribadi</span>
                <span className="font-medium text-gray-800">{p.email || '-'}</span>
              </div>

              <div>
                <span className="text-xs text-gray-400 block font-medium">Nomor Telepon / WA</span>
                <span className="font-medium text-gray-800">{p.phone || '-'}</span>
              </div>

              <div>
                <span className="text-xs text-gray-400 block font-medium">Status Keaktifan</span>
                <span className="font-medium text-gray-800">{p.status?.name || p.status_id}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Penempatan & Jurusan */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Jurusan & Posisi Penempatan
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-xs text-gray-400 block font-medium">Program Keahlian / Jurusan</span>
                <span className="font-semibold text-gray-800">
                  {p.major?.name || '-'}
                </span>
                {p.major?.code && (
                  <span className="text-xs text-gray-400 block">Kode: {p.major.code}</span>
                )}
              </div>

              <div>
                <span className="text-xs text-gray-400 block font-medium">Minat Posisi / Divisi (Permintaan Pemohon)</span>
                <span className="font-medium text-gray-700">
                  {p.position_requested?.name || '-'}
                </span>
              </div>

              <div className="sm:col-span-2 rounded-lg bg-blue-50/60 p-4 border border-blue-100">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-700 block">
                  Penempatan Posisi / Divisi (Keputusan HC)
                </span>
                <div className="mt-1 text-base font-bold text-gray-900">
                  {p.position_assigned?.name || 'Belum Ditetapkan HC'}
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Catatan Administratif */}
          {p.notes && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-2">
              <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
                Catatan Administratif
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                {p.notes}
              </p>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Pengajuan Terkait & Jadwal Riil */}
        <div className="space-y-6">
          {/* Card: Berkas Pengajuan & Institusi (Ditelusuri via FK application_id) */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-base font-semibold text-gray-900">
                Berkas Pengajuan Terkait
              </h2>
              {p.application && (
                <Link
                  href={`/pengajuan/${p.application.id}`}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Buka Pengajuan &rarr;
                </Link>
              )}
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-gray-400 block font-medium">Institusi Asal</span>
                <div className="font-semibold text-gray-900">
                  {p.application?.institution?.name || '-'}
                </div>
                <div className="text-xs text-gray-500">
                  Tipe: {p.application?.institution?.type || '-'}
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-400 block font-medium">Jalur Program</span>
                <span
                  className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold mt-1 ${
                    p.application?.application_type === 'PKL'
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'bg-teal-50 text-teal-700 border border-teal-200'
                  }`}
                >
                  {p.application?.application_type || '-'}
                </span>
              </div>

              {p.application?.kop_letter_number && (
                <div>
                  <span className="text-xs text-gray-400 block font-medium">Nomor KOP Surat</span>
                  <span className="font-medium text-gray-800">
                    {p.application.kop_letter_number}
                  </span>
                </div>
              )}

              <div>
                <span className="text-xs text-gray-400 block font-medium">Tanggal Pengajuan</span>
                <span className="font-medium text-gray-800">
                  {formatDate(p.application?.apply_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Masa Pelaksanaan Magang Riil */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Masa Pelaksanaan Riil
            </h2>

            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
                <span className="text-xs font-medium text-gray-500 block uppercase tracking-wider">
                  Tanggal Mulai Riil
                </span>
                <div className="mt-1 font-semibold text-gray-800">
                  {formatDate(p.actual_start_date)}
                </div>
              </div>

              <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
                <span className="text-xs font-medium text-gray-500 block uppercase tracking-wider">
                  Tanggal Selesai Riil
                </span>
                <div className="mt-1 font-semibold text-gray-800">
                  {formatDate(p.actual_end_date)}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50/70 p-3 border border-blue-100 text-center">
                <span className="text-xs font-semibold text-blue-700 block uppercase tracking-wider">
                  Total Durasi Riil
                </span>
                <div className="mt-1 font-bold text-gray-900">
                  {calculateDuration(p.actual_start_date, p.actual_end_date)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
