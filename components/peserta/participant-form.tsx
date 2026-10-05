'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { DateInput } from '@/components/ui/date-input'
import { isValidDateRange } from '@/lib/utils/date'
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
  major?: { id: string; name: string } | null
  position?: { id: string; name: string } | null
}

interface ParticipantFormProps {
  initialData?: ParticipantItem | null
  applications: ApplicationOption[]
  applicationDetails?: ApplicationDetailOption[]
  majors: Major[]
  positions: Position[]
  statuses: InternshipStatus[]
  isEdit?: boolean
}

export function ParticipantForm({
  initialData,
  applications,
  applicationDetails = [],
  majors,
  positions,
  statuses,
  isEdit = false,
}: ParticipantFormProps) {
  const [selectedAppId, setSelectedAppId] = useState<string>(
    initialData?.application_id || (applications.length > 0 ? applications[0].id : '')
  )
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

  // Saat detail pengajuan dipilih, otomatis bantu isi jurusan & posisi jika belum ada
  const handleDetailSelect = (detailId: string) => {
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
      }
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'digest' in err &&
        typeof (err as { digest: string }).digest === 'string' &&
        (err as { digest: string }).digest.startsWith('NEXT_REDIRECT')
      ) {
        throw err
      }
      setErrorMessage(
        err instanceof Error ? err.message : 'Terjadi kesalahan sistem.'
      )
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">-- Tanpa Rincian Spesifik --</option>
                {availableDetails.map((det) => (
                  <option key={det.id} value={det.id}>
                    Jurusan: {det.major?.name || 'Umum'} &bull; Posisi: {det.position?.name || 'Tidak ditentukan'} &bull; Kuota: {det.approved_quota || det.requested_quota || '-'}
                  </option>
                ))}
              </select>
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
            className="mt-2 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href={isEdit && initialData ? `/peserta/${initialData.id}` : '/peserta'}
          className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Batal
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 focus:outline-hidden disabled:opacity-50 transition-colors"
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
    </form>
  )
}

export default ParticipantForm
