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
  show_major?: boolean
  show_position?: boolean
  show_quota?: boolean
  show_notes?: boolean
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
        show_major: Boolean(d.major_id),
        show_position: Boolean(d.requested_position_id),
        show_quota:
          (d.requested_quota !== null && d.requested_quota !== undefined) ||
          (d.approved_quota !== null && d.approved_quota !== undefined),
        show_notes: Boolean(d.notes && d.notes.trim()),
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
          show_major: false,
          show_position: false,
          show_quota: false,
          show_notes: false,
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
        show_major: false,
        show_position: false,
        show_quota: false,
        show_notes: false,
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

  const handleToggleField = (
    index: number,
    field: 'show_major' | 'show_position' | 'show_quota' | 'show_notes',
    value: boolean
  ) => {
    setIsDirty(true)
    setDetails((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const handleRemoveMajor = (index: number) => {
    setIsDirty(true)
    setDetails((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        show_major: false,
        major_id: '',
        new_major_name: '',
      }
      return next
    })
  }

  const handleRemovePosition = (index: number) => {
    setIsDirty(true)
    setDetails((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        show_position: false,
        requested_position_id: '',
        new_position_name: '',
      }
      return next
    })
  }

  const handleRemoveQuota = (index: number) => {
    setIsDirty(true)
    setDetails((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        show_quota: false,
        requested_quota: '',
        approved_quota: '',
      }
      return next
    })
  }

  const handleRemoveNotes = (index: number) => {
    setIsDirty(true)
    setDetails((prev) => {
      const next = [...prev]
      next[index] = {
        ...next[index],
        show_notes: false,
        notes: '',
      }
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

    // Validasi rincian dengan progressive disclosure rules
    for (let i = 0; i < details.length; i++) {
      const d = details[i]

      // Jika HC memilih + Tambah Jurusan pada rincian ini, Jurusan menjadi wajib
      if (d.show_major) {
        if (!d.major_id || d.major_id === '-- Pilih Jurusan --') {
          setErrorMessage(
            details.length === 1
              ? 'Jurusan wajib dipilih untuk rincian ini.'
              : `Jurusan wajib dipilih untuk Rincian #${i + 1}.`
          )
          return
        }
        if (d.major_id === 'NEW' && (!d.new_major_name || !d.new_major_name.trim())) {
          setErrorMessage(
            details.length === 1
              ? 'Nama jurusan baru wajib diisi jika memilih opsi tambah jurusan baru.'
              : `Nama jurusan baru pada Rincian #${i + 1} wajib diisi jika memilih opsi tambah jurusan baru.`
          )
          return
        }
      }

      // Jika posisi baru diinput teks manual
      if (
        d.show_position &&
        d.requested_position_id === 'NEW' &&
        (!d.new_position_name || !d.new_position_name.trim())
      ) {
        setErrorMessage(
          details.length === 1
            ? 'Nama posisi baru wajib diisi jika memilih opsi tambah posisi baru.'
            : `Nama posisi baru pada Rincian #${i + 1} wajib diisi jika memilih opsi tambah posisi baru.`
        )
        return
      }

      // Validasi kuota jika diisi
      if (d.show_quota) {
        if (d.requested_quota !== '' && Number(d.requested_quota) < 0) {
          setErrorMessage(
            details.length === 1
              ? 'Kuota yang diajukan tidak boleh bernilai negatif.'
              : `Kuota yang diajukan pada Rincian #${i + 1} tidak boleh bernilai negatif.`
          )
          return
        }
        if (d.approved_quota !== '' && Number(d.approved_quota) < 0) {
          setErrorMessage(
            details.length === 1
              ? 'Kuota yang disetujui tidak boleh bernilai negatif.'
              : `Kuota yang disetujui pada Rincian #${i + 1} tidak boleh bernilai negatif.`
          )
          return
        }
      }
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    // Filter & bersihkan details sebelum dikirim ke server action
    const sanitizedDetails = details
      .filter(
        (d) =>
          d.show_major ||
          d.show_position ||
          d.show_quota ||
          d.show_notes ||
          d.major_id ||
          d.requested_position_id ||
          d.requested_quota !== '' ||
          d.approved_quota !== '' ||
          d.notes
      )
      .map((d) => ({
        major_id: d.show_major ? d.major_id : null,
        new_major_name: d.show_major ? d.new_major_name : null,
        requested_position_id: d.show_position ? d.requested_position_id : null,
        new_position_name: d.show_position ? d.new_position_name : null,
        requested_quota: d.show_quota && d.requested_quota !== '' ? d.requested_quota : null,
        approved_quota: d.show_quota && d.approved_quota !== '' ? d.approved_quota : null,
        notes: d.show_notes ? d.notes : null,
      }))

    const formData = new FormData(e.currentTarget)
    formData.set('details_json', JSON.stringify(sanitizedDetails))

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
          <div className="sm:col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between gap-2 sm:max-w-md">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                Institusi Pendidikan <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsNewInst(!isNewInst)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                {isNewInst ? 'Pilih dari Daftar' : '+ Tambah Institusi Baru'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Jika belum tersedia, tambahkan institusi baru.
            </p>

            {isNewInst ? (
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-1 lg:grid-cols-3">
                <input
                  type="hidden"
                  name="institution_id"
                  value="NEW"
                />
                <div className="lg:col-span-2">
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
            <p className="mt-1 text-xs text-gray-500 sm:hidden">
              Batas terakhir HC memberikan konfirmasi kepada pemohon.
            </p>
          </div>

          {/* Explanatory Context untuk Batas Waktu Konfirmasi (Desktop/Tablet) */}
          <div className="hidden sm:flex sm:col-span-1 lg:col-span-2 items-center pt-6">
            <p className="flex items-center gap-1.5 text-xs text-gray-500">
              <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Batas terakhir HC memberikan konfirmasi kepada pemohon.</span>
            </p>
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
              Tambahkan informasi jurusan, posisi, dan kuota yang tersedia dari pengajuan.
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
          {details.map((row, idx) => {
            const hasAnyField =
              Boolean(row.show_major) ||
              Boolean(row.show_position) ||
              Boolean(row.show_quota) ||
              Boolean(row.show_notes)

            return (
              <div
                key={idx}
                className="relative rounded-xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5 transition-all shadow-2xs"
              >
                {/* Header Rincian */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3.5">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Rincian #{idx + 1}
                  </span>
                  {details.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDetail(idx)}
                      className="text-xs font-semibold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                    >
                      Hapus Rincian
                    </button>
                  )}
                </div>

                {hasAnyField ? (
                  <div className="space-y-4">
                    {/* Baris 1: Jurusan & Posisi yang Diminta */}
                    {(row.show_major || row.show_position) && (
                      <div
                        className={`grid grid-cols-1 ${row.show_major && row.show_position ? 'sm:grid-cols-2' : ''
                          } gap-4`}
                      >
                        {/* Field Jurusan */}
                        {row.show_major && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                                Jurusan <span className="text-red-500">*</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleRemoveMajor(idx)}
                                className="text-[11px] font-medium text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Batal / Sembunyikan jurusan"
                              >
                                Hapus
                              </button>
                            </div>
                            {row.major_id === 'NEW' ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  placeholder="Nama jurusan baru..."
                                  value={row.new_major_name}
                                  onChange={(e) =>
                                    handleDetailChange(idx, 'new_major_name', e.target.value)
                                  }
                                  autoComplete="off"
                                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                                  required
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDetailChange(idx, 'major_id', '')}
                                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                                >
                                  ← Pilih dari daftar
                                </button>
                              </div>
                            ) : (
                              <select
                                value={row.major_id}
                                onChange={(e) =>
                                  handleDetailChange(idx, 'major_id', e.target.value)
                                }
                                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                                required
                              >
                                <option value="">-- Pilih Jurusan --</option>
                                {majors.map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name} {m.code ? `(${m.code})` : ''}
                                  </option>
                                ))}
                                <option value="NEW">+ Tambah Jurusan Baru</option>
                              </select>
                            )}
                          </div>
                        )}

                        {/* Field Posisi yang Diminta */}
                        {row.show_position && (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                                Posisi yang Diminta
                              </label>
                              <button
                                type="button"
                                onClick={() => handleRemovePosition(idx)}
                                className="text-[11px] font-medium text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Batal / Sembunyikan posisi"
                              >
                                Hapus
                              </button>
                            </div>
                            <p className="text-[11px] text-gray-500 pb-0.5">
                              Posisi yang diajukan oleh pemohon. Dapat dikosongkan jika belum ditentukan.
                            </p>
                            {row.requested_position_id === 'NEW' ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  placeholder="Nama posisi baru..."
                                  value={row.new_position_name}
                                  onChange={(e) =>
                                    handleDetailChange(idx, 'new_position_name', e.target.value)
                                  }
                                  autoComplete="off"
                                  className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDetailChange(idx, 'requested_position_id', '')
                                  }
                                  className="text-xs text-blue-600 hover:underline cursor-pointer"
                                >
                                  ← Pilih dari daftar
                                </button>
                              </div>
                            ) : (
                              <select
                                value={row.requested_position_id}
                                onChange={(e) =>
                                  handleDetailChange(idx, 'requested_position_id', e.target.value)
                                }
                                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                              >
                                <option value="">-- Tidak ditentukan --</option>
                                {positions.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                                <option value="NEW">+ Tambah Posisi Baru</option>
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Baris 2: Kuota */}
                    {row.show_quota && (
                      <div className="rounded-lg border border-gray-200/80 bg-white p-3.5 space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                          <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                            Informasi Kuota
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuota(idx)}
                            className="text-[11px] font-medium text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Batal / Sembunyikan kuota"
                          >
                            Hapus
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
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
                              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
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
                              className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                            />
                            <p className="mt-1 text-[11px] text-gray-400">
                              Isi setelah kuota resmi ditentukan oleh HC.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Baris 3: Catatan Khusus */}
                    {row.show_notes && (
                      <div className="rounded-lg border border-gray-200/80 bg-white p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-medium text-gray-700">
                            Catatan Khusus Rincian (Opsional)
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveNotes(idx)}
                            className="text-[11px] font-medium text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                            title="Batal / Sembunyikan catatan"
                          >
                            Hapus
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Catatan khusus rincian ini (opsional)..."
                          value={row.notes}
                          onChange={(e) => handleDetailChange(idx, 'notes', e.target.value)}
                          autoComplete="off"
                          className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:outline-hidden"
                        />
                      </div>
                    )}

                    {/* Baris 4: Progressive Disclosure Action Buttons untuk field yang belum ditambahkan */}
                    {(!row.show_major || !row.show_position || !row.show_quota || !row.show_notes) && (
                      <div className="pt-2.5 border-t border-gray-200/80 flex flex-wrap items-center gap-2">
                        {!row.show_major && (
                          <button
                            type="button"
                            onClick={() => handleToggleField(idx, 'show_major', true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-400 bg-blue-50/50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100/70 hover:border-blue-500 transition-colors cursor-pointer"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Jurusan
                          </button>
                        )}
                        {!row.show_position && (
                          <button
                            type="button"
                            onClick={() => handleToggleField(idx, 'show_position', true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
                          >
                            <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Posisi
                          </button>
                        )}
                        {!row.show_quota && (
                          <button
                            type="button"
                            onClick={() => handleToggleField(idx, 'show_quota', true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
                          >
                            <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Kuota
                          </button>
                        )}
                        {!row.show_notes && (
                          <button
                            type="button"
                            onClick={() => handleToggleField(idx, 'show_notes', true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors cursor-pointer"
                          >
                            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Tambah Catatan
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Initial State saat belum ada field yang ditambahkan */
                  <div className="py-2 text-left">
                    <p className="text-xs font-semibold text-gray-700">
                      Tambahkan informasi yang tersedia dari pengajuan.
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Informasi yang belum diketahui dapat dilengkapi kemudian.
                    </p>

                    <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleField(idx, 'show_major', true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue-400 bg-blue-50/60 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 hover:border-blue-500 transition-colors cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Jurusan
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleField(idx, 'show_position', true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Posisi
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleField(idx, 'show_quota', true)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer"
                      >
                        <svg className="h-3.5 w-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Tambah Kuota
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
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
