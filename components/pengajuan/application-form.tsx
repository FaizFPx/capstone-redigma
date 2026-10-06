'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DateInput } from '@/components/ui/date-input'
import { useUnsavedChangesGuard } from '@/hooks/use-unsaved-changes'
import type {
  ApplicationItem,
  Institution,
  Major,
  Position,
  UserSummary,
  Stage,
  Decision,
  ApplicationType,
} from '@/app/(app)/pengajuan/types'
import {
  createApplicationAction,
  updateApplicationAction,
  type ActionResponse,
} from '@/app/(app)/pengajuan/actions'
import { INSTITUTION_TYPES } from '@/lib/constants/institution'

interface FormDetailRow {
  major_id: string
  new_major_name: string
  requested_position_id: string
  new_position_name: string
  requested_quota: number | string
  approved_quota: number | string
  notes: string
}

interface ApplicationFormProps {
  initialData?: ApplicationItem | null
  institutions: Institution[]
  majors: Major[]
  positions: Position[]
  users: UserSummary[]
  stages: Stage[]
  decisions: Decision[]
  isEdit?: boolean
}

export function ApplicationForm({
  initialData,
  institutions,
  majors,
  positions,
  users,
  stages,
  decisions,
  isEdit = false,
}: ApplicationFormProps) {
  const router = useRouter()
  const [appType, setAppType] = useState<ApplicationType>(
    initialData?.application_type || 'PKL'
  )
  const [selectedInstId, setSelectedInstId] = useState<string>(
    initialData?.institution_id || ''
  )
  const [isNewInst, setIsNewInst] = useState<boolean>(
    !initialData && institutions.length === 0
  )
  const [newInstName, setNewInstName] = useState<string>('')
  const [newInstType, setNewInstType] = useState<string>('SMK')

  const [details, setDetails] = useState<FormDetailRow[]>(
    initialData?.details && initialData.details.length > 0
      ? initialData.details.map((d) => ({
          major_id: d.major_id || '',
          new_major_name: '',
          requested_position_id: d.requested_position_id || '',
          new_position_name: '',
          requested_quota: d.requested_quota ?? '',
          approved_quota: d.approved_quota ?? '',
          notes: d.notes || '',
        }))
      : [
          {
            major_id: '',
            new_major_name: '',
            requested_position_id: '',
            new_position_name: '',
            requested_quota: '',
            approved_quota: '',
            notes: '',
          },
        ]
  )

  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [isDirty, setIsDirty] = useState<boolean>(false)

  const { markClean, DialogElement } = useUnsavedChangesGuard({
    isDirty,
    fallbackBackUrl:
      isEdit && initialData ? `/pengajuan/${initialData.id}` : '/pengajuan',
  })

  // Tanggal default hari ini jika baru
  const defaultApplyDate =
    initialData?.apply_date || new Date().toISOString().split('T')[0]

  const handleAddDetail = () => {
    setIsDirty(true)
    setDetails((prev) => [
      ...prev,
      {
        major_id: '',
        new_major_name: '',
        requested_position_id: '',
        new_position_name: '',
        requested_quota: '',
        approved_quota: '',
        notes: '',
      },
    ])
  }

  const handleRemoveDetail = (index: number) => {
    setIsDirty(true)
    setDetails((prev) => prev.filter((_, i) => i !== index))
  }

  const handleDetailChange = (
    index: number,
    field: keyof FormDetailRow,
    value: string | number
  ) => {
    setIsDirty(true)
    setDetails((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting) return

    // Validasi institusi pendidikan
    if (!isNewInst && !selectedInstId) {
      setErrorMessage('Institusi pendidikan wajib dipilih.')
      return
    }
    if (isNewInst && !newInstName.trim()) {
      setErrorMessage('Nama institusi baru wajib diisi.')
      return
    }

    // Validasi rincian: jika memilih tambah baru, pastikan nama diisi
    for (let i = 0; i < details.length; i++) {
      const d = details[i]
      if (d.major_id === 'NEW' && (!d.new_major_name || !d.new_major_name.trim())) {
        setErrorMessage(
          `Nama jurusan baru pada Rincian #${i + 1} wajib diisi jika memilih opsi tambah jurusan baru.`
        )
        return
      }
      if (
        d.requested_position_id === 'NEW' &&
        (!d.new_position_name || !d.new_position_name.trim())
      ) {
        setErrorMessage(
          `Nama posisi baru pada Rincian #${i + 1} wajib diisi jika memilih opsi tambah posisi baru.`
        )
        return
      }
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    const formData = new FormData(e.currentTarget)
    formData.set('details_json', JSON.stringify(details))

    try {
      let res: ActionResponse
      if (isEdit && initialData) {
        res = await updateApplicationAction(initialData.id, null, formData)
      } else {
        res = await createApplicationAction(null, formData)
      }

      if (res?.error) {
        setErrorMessage(res.error)
        setIsSubmitting(false)
      } else if (res?.id) {
        markClean()
        router.push(`/pengajuan/${res.id}?success=${isEdit ? 'updated' : 'created'}`)
        router.refresh()
      } else {
        markClean()
        router.push('/pengajuan')
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
      onInput={(e) => {
        if ((e.target as HTMLElement)?.tagName !== 'SELECT') {
          setIsDirty(true)
        }
      }}
      autoComplete="off"
      className="space-y-8"
    >
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Perhatian:</strong> {errorMessage}
        </div>
      )}

      {/* Bagian 1: Data Pokok Pengajuan */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">
          Informasi Utama Pengajuan
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Kelola rincian dasar dokumen pengajuan magang yang diterima.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Jenis Pengajuan */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Jenis Pengajuan <span className="text-red-500">*</span>
            </label>
            <select
              name="application_type"
              value={appType}
              onChange={(e) => {
                setAppType(e.target.value as ApplicationType)
                setIsDirty(true)
              }}
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
              required
            >
              <option value="PKL">PKL (Praktik Kerja Lapangan / Sekolah)</option>
              <option value="MAGANG_MANDIRI">Magang Mandiri (Mahasiswa / Perorangan)</option>
            </select>
          </div>

          {/* Institusi */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Institusi Pendidikan <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsNewInst(!isNewInst)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                {isNewInst ? 'Pilih dari Daftar' : '+ Tambah Institusi Baru'}
              </button>
            </div>

            {isNewInst ? (
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="hidden"
                  name="institution_id"
                  value="NEW"
                />
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    name="new_institution_name"
                    value={newInstName}
                    onChange={(e) => setNewInstName(e.target.value)}
                    placeholder="Nama Sekolah / Universitas baru..."
                    autoComplete="off"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                    required
                  />
                </div>
                <div>
                  <select
                    name="new_institution_type"
                    value={newInstType}
                    onChange={(e) => {
                      setNewInstType(e.target.value)
                      setIsDirty(true)
                    }}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  >
                    {INSTITUTION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <select
                name="institution_id"
                value={selectedInstId}
                onChange={(e) => {
                  setSelectedInstId(e.target.value)
                  setIsDirty(true)
                }}
                className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                required
              >
                {institutions.length === 0 ? (
                  <option value="NEW">Belum ada institusi (Gunakan opsi Tambah)</option>
                ) : (
                  <>
                    <option value="">-- Pilih Institusi --</option>
                    {institutions.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name} ({inst.type})
                      </option>
                    ))}
                  </>
                )}
              </select>
            )}
          </div>

          {/* Tanggal Pengajuan */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Tanggal Pengajuan <span className="text-red-500">*</span>
            </label>
            <DateInput
              name="apply_date"
              defaultValue={defaultApplyDate}
              required
              containerClassName="mt-2"
            />
          </div>

          {/* PIC HC */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              PIC Human Capital
            </label>
            <select
              name="pic_hc_id"
              defaultValue={initialData?.pic_hc_id || ''}
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="">-- Belum Ditentukan --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.role || 'HC'})
                </option>
              ))}
            </select>
          </div>

          {/* Nomor KOP Surat */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Nomor KOP Surat
            </label>
            <input
              type="text"
              name="kop_letter_number"
              defaultValue={initialData?.kop_letter_number || ''}
              placeholder="Contoh: 421.5/028/SMK/2026"
              autoComplete="off"
              className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Tahapan Proses */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Tahap Proses
            </label>
            <select
              name="stage_id"
              defaultValue={initialData?.stage_id || 'belum_ditanggapi'}
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              {stages.length > 0 ? (
                stages.map((stg) => (
                  <option key={stg.id} value={stg.id}>
                    {stg.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="belum_ditanggapi">Belum Ditanggapi</option>
                  <option value="sudah_ditanggapi">Sudah Ditanggapi</option>
                </>
              )}
            </select>
          </div>

          {/* Keputusan */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Keputusan
            </label>
            <select
              name="decision_id"
              defaultValue={initialData?.decision_id || 'dalam_proses'}
              className="mt-2 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              {decisions.length > 0 ? (
                decisions.map((dec) => (
                  <option key={dec.id} value={dec.id}>
                    {dec.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="dalam_proses">Dalam Proses</option>
                  <option value="diterima">Diterima</option>
                  <option value="ditolak">Ditolak</option>
                </>
              )}
            </select>
          </div>

          {/* Tanggal Konfirmasi */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Tanggal Konfirmasi Surat
            </label>
            <DateInput
              name="confirmation_date"
              defaultValue={initialData?.confirmation_date || ''}
              containerClassName="mt-2"
            />
          </div>

          {/* Batas Konfirmasi */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Batas Waktu Konfirmasi
            </label>
            <DateInput
              name="confirmation_deadline"
              defaultValue={initialData?.confirmation_deadline || ''}
              containerClassName="mt-2"
            />
          </div>
        </div>
      </div>

      {/* Bagian 2: Periode Magang */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-semibold text-gray-900">
          Periode Pelaksanaan Magang
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Jadwal pelaksanaan yang diajukan oleh pemohon dan tanggal resmi yang disetujui HC.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Mulai (Diajukan)
            </label>
            <DateInput
              name="proposed_start_date"
              defaultValue={initialData?.proposed_start_date || ''}
              containerClassName="mt-2"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Selesai (Diajukan)
            </label>
            <DateInput
              name="proposed_end_date"
              defaultValue={initialData?.proposed_end_date || ''}
              containerClassName="mt-2"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Mulai (Disetujui HC)
            </label>
            <DateInput
              name="approved_start_date"
              defaultValue={initialData?.approved_start_date || ''}
              containerClassName="mt-2"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
              Selesai (Disetujui HC)
            </label>
            <DateInput
              name="approved_end_date"
              defaultValue={initialData?.approved_end_date || ''}
              containerClassName="mt-2"
            />
          </div>
        </div>

        {/* Catatan Administratif */}
        <div className="mt-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
            Catatan Dokumen Pengajuan
          </label>
          <textarea
            name="notes"
            rows={3}
            defaultValue={initialData?.notes || ''}
            placeholder="Tambahkan keterangan atau instruksi khusus dari pihak sekolah / pendaftar..."
            autoComplete="off"
            className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Bagian 3: Rincian Jurusan, Posisi & Kuota (application_details) */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Rincian Jurusan, Posisi & Kuota
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Sumber data kuota peserta berada pada rincian ini.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddDetail}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-blue-600 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Tambah Rincian
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {details.map((row, idx) => (
            <div
              key={idx}
              className="relative rounded-lg border border-gray-200 bg-gray-50/70 p-4 transition-all"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Rincian #{idx + 1}
                </span>
                {details.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDetail(idx)}
                    className="text-xs font-medium text-red-600 hover:text-red-800"
                  >
                    Hapus
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Jurusan */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Jurusan
                  </label>
                  {row.major_id === 'NEW' ? (
                    <div className="mt-1.5 space-y-1.5">
                      <input
                        type="text"
                        placeholder="Nama jurusan baru..."
                        value={row.new_major_name}
                        onChange={(e) =>
                          handleDetailChange(idx, 'new_major_name', e.target.value)
                        }
                        autoComplete="off"
                        className="block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleDetailChange(idx, 'major_id', '')}
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Pilih dari daftar
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 space-y-1">
                      <select
                        value={row.major_id}
                        onChange={(e) =>
                          handleDetailChange(idx, 'major_id', e.target.value)
                        }
                        className="block w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-hidden"
                      >
                        <option value="">-- Pilih Jurusan --</option>
                        {majors.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.code ? `(${m.code})` : ''}
                          </option>
                        ))}
                        <option value="NEW">+ Tambah Jurusan Baru</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Posisi yang Diminta */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Posisi yang Diminta
                  </label>
                  {row.requested_position_id === 'NEW' ? (
                    <div className="mt-1.5 space-y-1.5">
                      <input
                        type="text"
                        placeholder="Nama posisi baru..."
                        value={row.new_position_name}
                        onChange={(e) =>
                          handleDetailChange(idx, 'new_position_name', e.target.value)
                        }
                        autoComplete="off"
                        className="block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleDetailChange(idx, 'requested_position_id', '')
                        }
                        className="text-[11px] text-blue-600 hover:underline"
                      >
                        Pilih dari daftar
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 space-y-1">
                      <select
                        value={row.requested_position_id}
                        onChange={(e) =>
                          handleDetailChange(idx, 'requested_position_id', e.target.value)
                        }
                        className="block w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-hidden"
                      >
                        <option value="">-- Tidak ditentukan --</option>
                        {positions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                        <option value="NEW">+ Tambah Posisi Baru</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Kuota yang Diajukan */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Kuota Diajukan
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 4"
                    value={row.requested_quota}
                    onChange={(e) =>
                      handleDetailChange(idx, 'requested_quota', e.target.value)
                    }
                    autoComplete="off"
                    className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Kuota yang Disetujui */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Kuota Disetujui
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Contoh: 2"
                    value={row.approved_quota}
                    onChange={(e) =>
                      handleDetailChange(idx, 'approved_quota', e.target.value)
                    }
                    autoComplete="off"
                    className="mt-1.5 block w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Catatan Per Rincian */}
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Catatan khusus rincian ini (opsional)..."
                  value={row.notes}
                  onChange={(e) => handleDetailChange(idx, 'notes', e.target.value)}
                  autoComplete="off"
                  className="block w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Link
          href={isEdit && initialData ? `/pengajuan/${initialData.id}` : '/pengajuan'}
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
              <svg
                className="h-4 w-4 animate-spin text-white"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              <span>Menyimpan...</span>
            </>
          ) : (
            <span>{isEdit ? 'Simpan Perubahan' : 'Buat Pengajuan'}</span>
          )}
        </button>
      </div>
      {DialogElement}
    </form>
  )
}

export default ApplicationForm
