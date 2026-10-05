import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatDate, formatDateTime } from '@/lib/utils/date'
import { DeleteApplicationButton } from '@/components/pengajuan/delete-application-button'
import type { ApplicationItem } from '../types'

export default async function DetailPengajuanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ success?: string }>
}) {
  const { id } = await params
  const { success } = await searchParams

  const supabase = await createClient()

  // Ambil detail pengajuan lengkap beserta relasi
  const { data: rawApp, error } = await supabase
    .from('applications')
    .select(
      `
      id,
      application_type,
      institution_id,
      apply_date,
      pic_hc_id,
      stage_id,
      decision_id,
      kop_letter_number,
      confirmation_deadline,
      confirmation_date,
      proposed_start_date,
      proposed_end_date,
      approved_start_date,
      approved_end_date,
      notes,
      created_at,
      updated_at,
      institution:institutions ( id, name, type, contact_email, contact_phone ),
      pic_user:users!pic_hc_id ( id, full_name, email, role ),
      stage:application_stages ( id, name ),
      decision:application_decisions ( id, name ),
      details:application_details (
        id,
        major_id,
        requested_position_id,
        requested_quota,
        approved_quota,
        notes,
        major:majors ( id, name, code ),
        position:positions ( id, name )
      )
    `
    )
    .eq('id', id)
    .single()

  if (error || !rawApp) {
    notFound()
  }

  const app = rawApp as unknown as ApplicationItem

  // Ambil log riwayat status
  const { data: logsData } = await supabase
    .from('application_status_logs')
    .select(
      `
      id,
      previous_stage_id,
      new_stage_id,
      previous_decision_id,
      new_decision_id,
      change_notes,
      created_at,
      changed_by:users ( id, full_name, email )
    `
    )
    .eq('application_id', id)
    .order('created_at', { ascending: false })

  // Hitung total kuota secara dinamis (Single source of truth dari application_details)
  const totalRequestedQuota = (app.details || []).reduce(
    (sum, d) => sum + (d.requested_quota || 0),
    0
  )
  const totalApprovedQuota = (app.details || []).reduce(
    (sum, d) => sum + (d.approved_quota || 0),
    0
  )

  return (
    <div className="space-y-6">
      {/* Toast / Notification Banner */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>
              {success === 'created'
                ? 'Pengajuan baru berhasil disimpan ke dalam sistem.'
                : 'Data pengajuan berhasil diperbarui.'}
            </span>
          </div>
        </div>
      )}

      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/pengajuan"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            title="Kembali ke daftar pengajuan"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                  app.application_type === 'PKL'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'bg-teal-50 text-teal-700 border border-teal-200'
                }`}
              >
                {app.application_type}
              </span>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                {app.institution?.name || 'Detail Pengajuan'}
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Diajukan pada {formatDate(app.apply_date)} &bull; Dibuat {formatDateTime(app.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href={`/pengajuan/${app.id}/edit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
          >
            <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Pengajuan
          </Link>
          <DeleteApplicationButton
            applicationId={app.id}
            institutionName={app.institution?.name}
          />
        </div>
      </div>

      {/* Grid Informasi Utama & Periode */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Card 1: Data Dokumen Administrasi */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Dokumen & Informasi Institusi
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-xs text-gray-400 block font-medium">Institusi Pemohon</span>
              <span className="font-semibold text-gray-800">
                {app.institution?.name || '-'}
              </span>
              <span className="text-xs text-gray-500 block">
                Tipe: {app.institution?.type || '-'}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400 block font-medium">PIC Human Capital</span>
              <span className="font-semibold text-gray-800">
                {app.pic_user?.full_name || '-'}
              </span>
              <span className="text-xs text-gray-500 block">
                {app.pic_user?.email || 'Belum ditugaskan'}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400 block font-medium">Nomor KOP Surat</span>
              <span className="font-medium text-gray-800">
                {app.kop_letter_number || '-'}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400 block font-medium">Batas Waktu Konfirmasi</span>
              <span className="font-medium text-gray-800">
                {formatDate(app.confirmation_deadline)}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400 block font-medium">Tanggal Konfirmasi Surat</span>
              <span className="font-medium text-gray-800">
                {formatDate(app.confirmation_date)}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400 block font-medium">Status Tahapan</span>
              <span className="inline-flex mt-1 items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                {app.stage?.name || app.stage_id}
              </span>
            </div>

            <div>
              <span className="text-xs text-gray-400 block font-medium">Keputusan Akhir</span>
              <span className="inline-flex mt-1 items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-semibold text-gray-700 border border-gray-200">
                {app.decision?.name || app.decision_id}
              </span>
            </div>
          </div>

          {/* Catatan Admin */}
          {app.notes && (
            <div className="pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400 block font-medium">Catatan Administratif:</span>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">
                {app.notes}
              </p>
            </div>
          )}
        </div>

        {/* Card 2: Periode Pelaksanaan & Total Kuota */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Jadwal Pelaksanaan
            </h2>

            <div className="space-y-3 text-sm">
              <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
                <span className="text-xs font-medium text-gray-500 block uppercase tracking-wider">
                  Rencana Yang Diajukan
                </span>
                <div className="mt-1 font-semibold text-gray-800">
                  {formatDate(app.proposed_start_date)} &ndash; {formatDate(app.proposed_end_date)}
                </div>
              </div>

              <div className="rounded-lg bg-blue-50/70 p-3 border border-blue-100">
                <span className="text-xs font-semibold text-blue-700 block uppercase tracking-wider">
                  Persetujuan Resmi HC
                </span>
                <div className="mt-1 font-semibold text-gray-900">
                  {formatDate(app.approved_start_date)} &ndash; {formatDate(app.approved_end_date)}
                </div>
              </div>
            </div>
          </div>

          {/* Ringkasan Kuota */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
            <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
              Total Kuota Peserta
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg bg-gray-50 p-3 border border-gray-100">
                <div className="text-2xl font-bold text-gray-800">{totalRequestedQuota}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">Diajukan</div>
              </div>
              <div className="rounded-lg bg-blue-50 p-3 border border-blue-100">
                <div className="text-2xl font-bold text-blue-600">{totalApprovedQuota}</div>
                <div className="text-xs text-blue-700 font-medium mt-1">Disetujui</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Rincian Jurusan, Posisi & Kuota (application_details) */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            Rincian Jurusan & Penempatan (Application Details)
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Rincian alokasi jurusan dan posisi yang diajukan pemohon.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-600">
                <th className="px-6 py-3">No</th>
                <th className="px-6 py-3">Jurusan</th>
                <th className="px-6 py-3">Posisi Diminta</th>
                <th className="px-6 py-3 text-center">Kuota Diajukan</th>
                <th className="px-6 py-3 text-center">Kuota Disetujui</th>
                <th className="px-6 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {!app.details || app.details.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    Tidak ada data rincian jurusan untuk pengajuan ini.
                  </td>
                </tr>
              ) : (
                app.details.map((detail, index) => (
                  <tr key={detail.id || index} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-xs font-bold text-gray-400">
                      #{index + 1}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {detail.major?.name || '-'}
                      {detail.major?.code && (
                        <span className="text-xs text-gray-400 ml-1">
                          ({detail.major.code})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {detail.position?.name || (
                        <span className="text-gray-400 italic">Tidak ditentukan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-800">
                      {detail.requested_quota ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-center font-semibold text-blue-600">
                      {detail.approved_quota ?? '-'}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {detail.notes || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 4: Riwayat Status Log (application_status_logs) */}
      {logsData && logsData.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
          <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
            Riwayat Perubahan Status (Status Logs)
          </h2>
          <div className="mt-4 space-y-3">
            {logsData.map((log: any) => (
              <div
                key={log.id}
                className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50/60 p-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-gray-800">
                    {log.change_notes || 'Perubahan status'}
                  </div>
                  <div className="mt-1 text-gray-500">
                    Tahap: <span className="font-medium text-gray-700">{log.new_stage_id || '-'}</span> &bull; Keputusan:{' '}
                    <span className="font-medium text-gray-700">{log.new_decision_id || '-'}</span>
                  </div>
                </div>
                <div className="text-right text-gray-400">
                  <div>{formatDateTime(log.created_at)}</div>
                  {log.changed_by?.full_name && (
                    <div className="text-gray-600 font-medium">
                      Oleh: {log.changed_by.full_name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
