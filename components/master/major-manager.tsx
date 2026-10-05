'use client'

import { useState, useTransition } from 'react'
import { formatDate } from '@/lib/utils/date'
import type { MajorItem } from '@/app/(app)/master/jurusan/types'
import {
  createMajorAction,
  updateMajorAction,
  deleteMajorAction,
} from '@/app/(app)/master/jurusan/actions'

interface MajorManagerProps {
  initialMajors: MajorItem[]
  queryParam?: string
  levelParam?: string
}

const INSTITUTION_LEVELS = [
  { value: 'SMK', label: 'SMK (Sekolah Menengah Kejuruan)' },
  { value: 'D3', label: 'Diploma 3 (D3)' },
  { value: 'D4', label: 'Diploma 4 / Sarjana Terapan (D4)' },
  { value: 'S1', label: 'Sarjana (S1)' },
  { value: 'S2', label: 'Magister (S2)' },
  { value: 'LAINNYA', label: 'Lainnya' },
]

export function MajorManager({
  initialMajors,
  queryParam = '',
  levelParam = 'ALL',
}: MajorManagerProps) {
  const [majors, setMajors] = useState<MajorItem[]>(initialMajors)
  const [search, setSearch] = useState(queryParam)
  const [selectedLevel, setSelectedLevel] = useState(levelParam)
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<MajorItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<MajorItem | null>(null)

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filtered List
  const filteredList = majors.filter((m) => {
    const qLower = search.toLowerCase().trim()
    const nameMatch = m.name.toLowerCase().includes(qLower)
    const codeMatch = m.code?.toLowerCase().includes(qLower) || false
    const matchesSearch = !qLower || nameMatch || codeMatch

    const matchesLevel =
      selectedLevel === 'ALL' ||
      m.institution_level?.toUpperCase() === selectedLevel.toUpperCase()

    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'active' && m.is_active) ||
      (selectedStatus === 'inactive' && !m.is_active)

    return matchesSearch && matchesLevel && matchesStatus
  })

  const getLevelBadge = (level?: string | null) => {
    if (!level) return <span className="text-xs text-gray-300">-</span>
    const lUpper = level.toUpperCase()
    if (lUpper === 'SMK') {
      return (
        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
          SMK
        </span>
      )
    }
    if (lUpper === 'S1' || lUpper === 'S2') {
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
          {level}
        </span>
      )
    }
    if (lUpper === 'D3' || lUpper === 'D4') {
      return (
        <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200">
          {level}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">
        {level}
      </span>
    )
  }

  // Handlers
  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createMajorAction(formData)
      if (res.error) {
        setErrorMessage(res.error)
      } else if (res.data) {
        setMajors((prev) => [res.data!, ...prev])
        setSuccessMessage(`Jurusan "${res.data.name}" berhasil ditambahkan.`)
        setIsCreateOpen(false)
      }
    })
  }

  const handleUpdateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingItem) return
    setErrorMessage(null)
    setSuccessMessage(null)

    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateMajorAction(editingItem.id, formData)
      if (res.error) {
        setErrorMessage(res.error)
      } else if (res.data) {
        setMajors((prev) =>
          prev.map((item) => (item.id === res.data!.id ? { ...item, ...res.data! } : item))
        )
        setSuccessMessage(`Data jurusan "${res.data.name}" berhasil diperbarui.`)
        setEditingItem(null)
      }
    })
  }

  const handleDeleteConfirm = () => {
    if (!deletingItem) return
    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const res = await deleteMajorAction(deletingItem.id)
      if (res.error) {
        setErrorMessage(res.error)
        setDeletingItem(null)
      } else {
        setMajors((prev) => prev.filter((item) => item.id !== deletingItem.id))
        setSuccessMessage(`Jurusan "${deletingItem.name}" berhasil dihapus.`)
        setDeletingItem(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Alert Banners */}
      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-600 font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-green-400 hover:text-green-600 font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Action & Filter Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama jurusan atau kode..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Level Filter */}
          <div className="w-full sm:w-44">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Jenjang</option>
              {INSTITUTION_LEVELS.map((lvl) => (
                <option key={lvl.value} value={lvl.value}>
                  {lvl.value}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-36">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>

        {/* Tambah Jurusan Button */}
        <button
          onClick={() => {
            setErrorMessage(null)
            setIsCreateOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Jurusan
        </button>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <p className="text-base font-semibold text-gray-800">
              {search || selectedLevel !== 'ALL' || selectedStatus !== 'ALL'
                ? 'Tidak ditemukan jurusan yang sesuai filter pencarian'
                : 'Belum ada data jurusan terdaftar'}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {search || selectedLevel !== 'ALL' || selectedStatus !== 'ALL'
                ? 'Coba ubah kata kunci pencarian atau reset filter jenjang.'
                : 'Klik tombol "Tambah Jurusan" untuk menambahkan program keahlian pertama.'}
            </p>
            {(!search && selectedLevel === 'ALL' && selectedStatus === 'ALL') && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                + Tambah Jurusan Baru
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50/75 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <tr>
                  <th className="px-4 py-3.5">Nama Jurusan</th>
                  <th className="px-4 py-3.5">Kode</th>
                  <th className="px-4 py-3.5">Jenjang</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-center">Data Terkait</th>
                  <th className="px-4 py-3.5">Terdaftar</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredList.map((m) => {
                  const totalRefs = m.total_references || 0
                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-4 py-3.5 font-medium text-gray-900">
                        {m.name}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">
                        {m.code ? (
                          <span className="font-mono text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                            {m.code}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getLevelBadge(m.institution_level)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        {m.is_active ? (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 border border-gray-200">
                            Nonaktif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            totalRefs > 0
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                          title={`${m.application_details_count || 0} di pengajuan, ${m.participants_count || 0} di peserta`}
                        >
                          {totalRefs} record
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500">
                        {formatDate(m.created_at)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              setErrorMessage(null)
                              setEditingItem(m)
                            }}
                            className="font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => {
                              setErrorMessage(null)
                              setDeletingItem(m)
                            }}
                            className="font-semibold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Tambah Jurusan Baru</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Daftarkan program studi atau kompetensi keahlian pemohon.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
                aria-label="Tutup modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Nama Jurusan / Program Studi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Rekayasa Perangkat Lunak atau Teknik Informatika"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Kode Jurusan
                  </label>
                  <input
                    type="text"
                    name="code"
                    placeholder="Contoh: RPL, TKJ, TI"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Jenjang Institusi
                  </label>
                  <select
                    name="institution_level"
                    defaultValue="SMK"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">Pilih Jenjang</option>
                    {INSTITUTION_LEVELS.map((lvl) => (
                      <option key={lvl.value} value={lvl.value}>
                        {lvl.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="create_is_active"
                  name="is_active"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="create_is_active" className="text-sm font-medium text-gray-700">
                  Status Aktif (dapat dipilih pada form pengajuan & peserta)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Jurusan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Jurusan</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Perbarui nama, kode, atau jenjang program studi.
                </p>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
                aria-label="Tutup modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Nama Jurusan / Program Studi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingItem.name}
                  placeholder="Contoh: Rekayasa Perangkat Lunak"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Kode Jurusan
                  </label>
                  <input
                    type="text"
                    name="code"
                    defaultValue={editingItem.code || ''}
                    placeholder="Contoh: RPL"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Jenjang Institusi
                  </label>
                  <select
                    name="institution_level"
                    defaultValue={editingItem.institution_level || ''}
                    className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="">Pilih Jenjang</option>
                    {INSTITUTION_LEVELS.map((lvl) => (
                      <option key={lvl.value} value={lvl.value}>
                        {lvl.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  name="is_active"
                  defaultChecked={editingItem.is_active}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                  Status Aktif (dapat dipilih pada form pengajuan & peserta)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Perbarui Jurusan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-red-600">
              <div className="rounded-full bg-red-100 p-2.5">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Konfirmasi Hapus</h3>
            </div>

            <p className="text-sm text-gray-600">
              Apakah Anda yakin ingin menghapus jurusan{' '}
              <strong className="text-gray-900">{deletingItem.name}</strong>?
            </p>

            {(deletingItem.total_references || 0) > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Peringatan Integritas Relasi:</strong> Jurusan ini tercatat digunakan pada{' '}
                <strong>{deletingItem.total_references} data pengajuan / peserta</strong>.
                Penghapusan akan ditolak sistem untuk menjaga konsistensi database.
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isPending || (deletingItem.total_references || 0) > 0}
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? 'Menghapus...' : 'Hapus Jurusan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
