'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DateInput } from '@/components/ui/date-input'
import { isValidDateRange } from '@/lib/utils/date'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes'
import type {
  ParticipantItem,
  InternshipStatus,
  ApplicationOption,
} from '@/app/(app)/peserta/types'
import type { Major, Position } from '@/app/(app)/pengajuan/types'
import {
  createParticipantAction,
  updateParticipantAction,
  type ParticipantActionResponse,
} from '@/app/(app)/peserta/actions'

interface ApplicationDetailOption {
  id: string
  application_id: string
  major_id?: string | null
  requested_position_id?: string | null
  requested_quota?: number | null
  approved_quota?: number | null
  notes?: string | null
  major?: { id: string; name: string; code?: string | null } | null
  position?: { id: string; name: string } | null
  current_count?: number
}

interface ParticipantFormProps {
  initialData?: ParticipantItem | null
  defaultApplicationId?: string
  applications: ApplicationOption[]
  applicationDetails?: ApplicationDetailOption[]
  majors: Major[]
  positions: Position[]
  statuses: InternshipStatus[]
  isEdit?: boolean
}

export function ParticipantForm({
  initialData,
  defaultApplicationId,
  applications,
  applicationDetails = [],
  majors,
  positions,
  statuses,
  isEdit = false,
}: ParticipantFormProps) {
  const router = useRouter()
  const [isDirty, setIsDirty] = useState<boolean>(false)

  const { markClean, DialogElement } = useUnsavedChangesGuard({
    isDirty,
    fallbackBackUrl:
      isEdit && initialData ? `/peserta/${initialData.id}` : '/peserta',
  })

  const initialAppId =
    initialData?.application_id ||
    (defaultApplicationId && applications.some((a) => a.id === defaultApplicationId)
      ? defaultApplicationId
      : applications.length > 0
      ? applications[0].id
      : '')

  const [selectedAppId, setSelectedAppId] = useState<string>(initialAppId)
  const [selectedDetailId, setSelectedDetailId] = useState<string>(
    initialData?.application_detail_id || ''
  )
  const [selectedMajorId, setSelectedMajorId] = useState<string>(
    initialData?.major_id || ''
  )
  const [positionReqId, setPositionReqId] = useState<string>(
    initialData?.positioning_by_request_id || ''
  )
  const [positionHcId, setPositionHcId] = useState<string>(
    initialData?.positioning_by_hc_id || ''
  )

  const [startDate, setStartDate] = useState<string>(
    initialData?.actual_start_date || ''
  )
  const [endDate, setEndDate] = useState<string>(
    initialData?.actual_end_date || ''
  )

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  // Filter application details sesuai application yang dipilih
  const availableDetails = useMemo(() => {
    if (!selectedAppId) return []
    return applicationDetails.filter((d) => d.application_id === selectedAppId)
  }, [selectedAppId, applicationDetails])

  // Rincian pengajuan yang sedang dipilih oleh user
  const selectedDetail = useMemo(() => {
    if (!selectedDetailId) return null
    return availableDetails.find((d) => d.id === selectedDetailId) || null
  }, [selectedDetailId, availableDetails])

  // Hitung status kuota untuk rincian yang dipilih
  const selectedQuotaInfo = useMemo(() => {
    if (!selectedDetail) return null

    const approvedQuota =
      typeof selectedDetail.approved_quota === 'number'
        ? selectedDetail.approved_quota
        : null
    const currentCount = selectedDetail.current_count ?? 0

    // Pada mode edit: jika peserta ini sudah terdaftar pada detail ini sebelumnya,
    // maka slotnya sudah termasuk dalam currentCount, sehingga tidak mengurangi slot lagi
    const isCurrentParticipantDetail =
      isEdit && initialData?.application_detail_id === selectedDetail.id

    const effectiveCount = isCurrentParticipantDetail
      ? Math.max(0, currentCount - 1)
      : currentCount

    const isQuotaCapped = approvedQuota !== null
    const available = isQuotaCapped
      ? Math.max(0, approvedQuota - effectiveCount)
      : null
    const isFull = isQuotaCapped && available !== null && available <= 0

    return {
      approvedQuota,
      currentCount,
      effectiveCount,
      available,
      isQuotaCapped,
      isFull,
      isCurrentParticipantDetail,
    }
  }, [selectedDetail, isEdit, initialData?.application_detail_id])

  const isSubmitBlocked = selectedQuotaInfo?.isFull === true

  // Saat detail pengajuan dipilih, otomatis bantu isi jurusan & posisi jika belum ada
  const handleDetailSelect = (detailId: string) => {
    setIsDirty(true)
    setSelectedDetailId(detailId)
    if (!detailId) return

    const detail = applicationDetails.find((d) => d.id === detailId)
    if (detail) {
      if (detail.major_id && !selectedMajorId) {
        setSelectedMajorId(detail.major_id)
      }
      if (detail.requested_position_id) {
        setPositionReqId(detail.requested_position_id)
      } else {
        setPositionReqId('')
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return

    // Validasi kuota di client-side
    if (selectedQuotaInfo?.isFull) {
      setErrorMessage(
        `Kuota untuk rincian ini sudah penuh (${selectedQuotaInfo.approvedQuota}/${selectedQuotaInfo.approvedQuota}). Peserta tidak dapat ditambahkan ke rincian ini.`
      )
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    // Validasi client-side tanggal
    if (startDate && endDate) {
      if (!isValidDateRange(startDate, endDate)) {
        setErrorMessage(
          'Tanggal selesai magang tidak boleh lebih awal dari tanggal mulai magang.'
        )
        setIsSubmitting(false)
        return
      }
    }

    const formData = new FormData(e.currentTarget)

    try {
      let res: ParticipantActionResponse
      if (isEdit && initialData) {
        res = await updateParticipantAction(initialData.id, null, formData)
      } else {
        res = await createParticipantAction(null, formData)
      }

      if (res?.error) {
        setErrorMessage(res.error)
        setIsSubmitting(false)
      } else if (res?.success) {
        markClean()
        if (isEdit && initialData) {
          router.push(`/peserta/${initialData.id}?success=updated`)
        } else {
          router.push(`/peserta/${res.id || ''}?success=created`)
        }
        router.refresh()
      } else {
        markClean()
        router.push('/peserta')
        router.refresh()
      }
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'digest' in err &&
        typeof (err as { digest: string }).digest === 'string' &&
        (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
      ) {
        markClean()
        throw err
      }
      setErrorMessage(
        err instanceof Error ? err.message : 'Terjadi kesalahan sistem.'
      )
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onChange={() => setIsDirty(true)}
      onInput={() => setIsDirty(true)}
      autoComplete="off"
      className="space-y-8"
    >
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Perhatian:</strong> {errorMessage}
        </div>
      )}

      {/* Bagian 1: Identitas Peserta */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">
          Identitas Peserta Magang
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Informasi pribadi dan kontak siswa / mahasiswa peserta program.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Nama Lengkap */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              defaultValue={initialData?.name || ''}
              placeholder="Contoh: Muhammad Rizki Pratama"
              required
              autoComplete="off"
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Email Pribadi
            </label>
            <input
              type="email"
              name="email"
              defaultValue={initialData?.email || ''}
              placeholder="nama@email.com"
              autoComplete="off"
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Nomor Telepon */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Nomor Telepon / WhatsApp
            </label>
            <input
              type="text"
              name="phone"
              defaultValue={initialData?.phone || ''}
              placeholder="081234567890"
              autoComplete="off"
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Bagian 2: Keterkaitan Pengajuan & Institusi */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">
          Berkas Pengajuan & Penempatan
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Hubungkan peserta ke berkas pengajuan induk untuk menelusuri asal institusi.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Berkas Pengajuan */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Berkas Pengajuan Terkait <span className="text-red-500">*</span>
            </label>
            <select
              name="application_id"
              value={selectedAppId}
              onChange={(e) => {
                setSelectedAppId(e.target.value)
                setSelectedDetailId('')
              }}
              required
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              {applications.length === 0 ? (
                <option value="">
                  Belum ada berkas pengajuan (Buat pengajuan terlebih dahulu)
                </option>
              ) : (
                applications.map((app) => (
                  <option key={app.id} value={app.id}>
                    [{app.application_type}] {app.institution?.name || 'Institusi'}
                    {app.kop_letter_number ? ` - KOP: ${app.kop_letter_number}` : ''} ({app.apply_date})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Rincian Pengajuan (opsional, khusus PKL multi-jurusan) */}
          {availableDetails.length > 0 && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Alokasi Rincian Pengajuan (Application Detail)
              </label>
              <select
                name="application_detail_id"
                value={selectedDetailId}
                onChange={(e) => handleDetailSelect(e.target.value)}
                className={`mt-2 block w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:outline-hidden ${
                  selectedQuotaInfo?.isFull
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-gray-300 focus:border-blue-500'
                }`}
              >
                <option value="">-- Tanpa Rincian Spesifik --</option>
                {availableDetails.map((det) => {
                  const approvedQuota =
                    typeof det.approved_quota === 'number'
                      ? det.approved_quota
                      : null
                  const currentCount = det.current_count ?? 0
                  const isCurrentParticipantDetail =
                    isEdit && initialData?.application_detail_id === det.id
                  const effectiveCount = isCurrentParticipantDetail
                    ? Math.max(0, currentCount - 1)
                    : currentCount
                  const isQuotaCapped = approvedQuota !== null
                  const available = isQuotaCapped
                    ? Math.max(0, approvedQuota - effectiveCount)
                    : null
                  const isFull =
                    isQuotaCapped && available !== null && available <= 0

                  let quotaLabel = ''
                  if (isQuotaCapped) {
                    quotaLabel = ` \u2022 Kuota: ${approvedQuota} (Terdaftar: ${currentCount}, Sisa: ${available})${
                      isFull ? ' [PENUH]' : ''
                    }`
                  } else if (det.requested_quota) {
                    quotaLabel = ` \u2022 Kuota: ${det.requested_quota}`
                  }

                  return (
                    <option key={det.id} value={det.id}>
                      Jurusan: {det.major?.name || 'Umum'} &bull; Posisi:{' '}
                      {det.position?.name || 'Tidak ditentukan'}
                      {quotaLabel}
                    </option>
                  )
                })}
              </select>

              {/* Tampilan Informasi Kuota & Peringatan Jika Penuh */}
              {selectedDetail && selectedQuotaInfo && (
                <div
                  className={`mt-3 rounded-xl border p-4 transition-all ${
                    selectedQuotaInfo.isFull
                      ? 'border-red-200 bg-red-50/70'
                      : 'border-blue-100 bg-blue-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-2.5 w-2.5 rounded-full ${
                          selectedQuotaInfo.isFull ? 'bg-red-500' : 'bg-blue-600'
                        }`}
                      />
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Informasi Kuota Rincian Pengajuan
                      </span>
                    </div>
                    {selectedQuotaInfo.isQuotaCapped && (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          selectedQuotaInfo.isFull
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {selectedQuotaInfo.isFull ? 'Kuota Penuh' : 'Kuota Tersedia'}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-2xs">
                      <span className="text-gray-400 block font-medium">Jurusan</span>
                      <span className="font-semibold text-gray-800 text-sm truncate block mt-0.5">
                        {selectedDetail.major?.name || 'Umum'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-2xs">
                      <span className="text-gray-400 block font-medium">Kuota</span>
                      <span className="font-bold text-gray-900 text-sm block mt-0.5">
                        {selectedQuotaInfo.approvedQuota !== null
                          ? selectedQuotaInfo.approvedQuota
                          : '-'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-2xs">
                      <span className="text-gray-400 block font-medium">Terdaftar</span>
                      <span className="font-bold text-gray-900 text-sm block mt-0.5">
                        {selectedQuotaInfo.currentCount}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-gray-100 shadow-2xs">
                      <span className="text-gray-400 block font-medium">Sisa</span>
                      <span
                        className={`font-bold text-sm block mt-0.5 ${
                          selectedQuotaInfo.isFull
                            ? 'text-red-600 font-extrabold'
                            : 'text-emerald-600'
                        }`}
                      >
                        {selectedQuotaInfo.available !== null
                          ? selectedQuotaInfo.available
                          : '-'}
                      </span>
                    </div>
                  </div>

                  {selectedQuotaInfo.isFull && (
                    <div className="mt-3 rounded-lg bg-red-100/90 p-3 border border-red-200 text-xs text-red-800 flex items-start gap-2.5">
                      <svg
                        className="h-4 w-4 shrink-0 text-red-600 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                      <div>
                        <strong className="font-bold">Kuota untuk rincian ini sudah penuh.</strong>
                        <p className="mt-0.5 text-red-700 leading-relaxed">
                          Kuota peserta untuk rincian{' '}
                          {selectedDetail.major?.name || 'ini'} sudah mencapai
                          batas maksimal ({selectedQuotaInfo.approvedQuota}/
                          {selectedQuotaInfo.approvedQuota}). Peserta tidak
                          dapat ditambahkan ke rincian ini. Silakan pilih
                          rincian lain yang masih memiliki kuota.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Jurusan */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Jurusan / Program Studi
            </label>
            <select
              name="major_id"
              value={selectedMajorId}
              onChange={(e) => setSelectedMajorId(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">-- Pilih Jurusan --</option>
              {majors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.code ? `(${m.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Posisi Berdasarkan Permintaan */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Posisi Berdasarkan Permintaan
            </label>
            <select
              name="positioning_by_request_id"
              value={positionReqId}
              onChange={(e) => setPositionReqId(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">-- Belum Ditentukan --</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Posisi Penugasan Nyata oleh HC */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Posisi Penugasan Nyata (Keputusan HC)
            </label>
            <select
              name="positioning_by_hc_id"
              value={positionHcId}
              onChange={(e) => setPositionHcId(e.target.value)}
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">-- Belum Ditetapkan HC --</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bagian 3: Siklus Hidup & Jadwal Magang Riil */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">
          Status & Jadwal Pelaksanaan Riil
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Pencatatan status keaktifan di kantor dan tanggal pelaksanaan nyata.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Status Keaktifan */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Status Magang Peserta <span className="text-red-500">*</span>
            </label>
            <select
              name="status_id"
              defaultValue={initialData?.status_id || 'belum_mulai'}
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
              required
            >
              {statuses.length > 0 ? (
                statuses.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="belum_mulai">Belum Mulai</option>
                  <option value="sedang_magang">Sedang Magang</option>
                  <option value="sudah_selesai">Sudah Selesai</option>
                  <option value="mengundurkan_diri">Mengundurkan Diri</option>
                </>
              )}
            </select>
          </div>

          {/* Tanggal Mulai Riil */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Tanggal Mulai Riil
            </label>
            <DateInput
              name="actual_start_date"
              value={startDate}
              onChange={(iso) => setStartDate(iso)}
              containerClassName="mt-2"
            />
          </div>

          {/* Tanggal Selesai Riil */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Tanggal Selesai Riil
            </label>
            <DateInput
              name="actual_end_date"
              value={endDate}
              onChange={(iso) => setEndDate(iso)}
              containerClassName="mt-2"
            />
          </div>
        </div>

        {/* Catatan Administratif */}
        <div className="mt-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
            Catatan Administratif Peserta
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={initialData?.notes || ''}
            placeholder="Catatan administratif operasional terkait peserta ini (bukan penilaian kinerja)..."
            autoComplete="off"
            className="mt-2 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-3 pt-2">
        {isSubmitBlocked && (
          <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
            Kuota untuk rincian ini sudah penuh.
          </p>
        )}
        <div className="flex items-center gap-3">
          <Link
            href={isEdit && initialData ? `/peserta/${initialData.id}` : '/peserta'}
            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || isSubmitBlocked}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Menyimpan...</span>
              </>
            ) : (
              <span>{isEdit ? 'Simpan Perubahan' : 'Daftarkan Peserta'}</span>
            )}
          </button>
        </div>
      </div>
      {DialogElement}
    </form>
  )
}

export default ParticipantForm
