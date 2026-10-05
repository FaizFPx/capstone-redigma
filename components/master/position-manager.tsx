'use client'

import { useState, useTransition } from 'react'
import { formatDate } from '@/lib/utils/date'
import type { PositionItem } from '@/app/(app)/master/posisi/types'
import {
  createPositionAction,
  updatePositionAction,
  deletePositionAction,
} from '@/app/(app)/master/posisi/actions'

interface PositionManagerProps {
  initialPositions: PositionItem[]
  queryParam?: string
  statusParam?: string
}

export function PositionManager({
  initialPositions,
  queryParam = '',
  statusParam = 'ALL',
}: PositionManagerProps) {
  const [positions, setPositions] = useState<PositionItem[]>(initialPositions)
  const [search, setSearch] = useState(queryParam)
  const [selectedStatus, setSelectedStatus] = useState<string>(statusParam)

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PositionItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<PositionItem | null>(null)

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filtered positions
  const filteredPositions = positions.filter((pos) => {
    const matchesSearch =
      search === '' ||
      pos.name.toLowerCase().includes(search.toLowerCase())

    const matchesStatus =
      selectedStatus === 'ALL' ||
      (selectedStatus === 'ACTIVE' && pos.is_active) ||
      (selectedStatus === 'INACTIVE' && !pos.is_active)

    return matchesSearch && matchesStatus
  })

  // Handle Create
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const res = await createPositionAction(formData)
      if (res.error) {
        setErrorMessage(res.error)
      } else if (res.data) {
        setPositions((prev) => [
          {
            ...res.data!,
            application_details_count: 0,
            participants_count: 0,
          },
          ...prev,
        ])
        setSuccessMessage(`Posisi "${res.data.name}" berhasil ditambahkan.`)
        setIsCreateOpen(false)
        form.reset()
      }
    })
  }

  // Handle Edit
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingItem) return
    setErrorMessage(null)
    setSuccessMessage(null)

    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const res = await updatePositionAction(editingItem.id, formData)
      if (res.error) {
        setErrorMessage(res.error)
      } else if (res.data) {
        setPositions((prev) =>
          prev.map((item) =>
            item.id === editingItem.id
              ? {
                  ...res.data!,
                  application_details_count: item.application_details_count || 0,
                  participants_count: item.participants_count || 0,
                }
              : item
          )
        )
        setSuccessMessage(`Data posisi "${res.data.name}" berhasil diperbarui.`)
        setEditingItem(null)
      }
    })
  }

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return
    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const res = await deletePositionAction(deletingItem.id)
      if (res.error) {
        setErrorMessage(res.error)
        setDeletingItem(null)
      } else {
        setPositions((prev) => prev.filter((item) => item.id !== deletingItem.id))
        setSuccessMessage(`Posisi "${deletingItem.name}" berhasil dihapus.`)
        setDeletingItem(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {errorMessage && (
        <div className="flex items-start justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 shadow-xs">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-red-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-600 transition-colors"
          >
            <span className="sr-only">Tutup</span>
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-xs">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-emerald-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-600 transition-colors"
          >
            <span className="sr-only">Tutup</span>
            &times;
          </button>
        </div>
      )}

      {/* Control Bar: Search, Filters & Action Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama posisi magang..."
              className="block w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                aria-label="Hapus pencarian"
              >
                &times;
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setSelectedStatus('ALL')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedStatus === 'ALL'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Semua Status
            </button>
            <button
              onClick={() => setSelectedStatus('ACTIVE')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedStatus === 'ACTIVE'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setSelectedStatus('INACTIVE')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedStatus === 'INACTIVE'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Nonaktif
            </button>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => {
            setErrorMessage(null)
            setIsCreateOpen(true)
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Tambah Posisi
        </button>
      </div>

      {/* Table Section */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50/75">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Posisi Penempatan
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center"
                >
                  Data Terhubung
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Tanggal Dibuat
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredPositions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-gray-900">
                      Tidak ada posisi ditemukan
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search || selectedStatus !== 'ALL'
                        ? 'Coba sesuaikan kata kunci pencarian atau ubah filter status.'
                        : 'Belum ada data posisi penempatan terdaftar di sistem.'}
                    </p>
                    {search && (
                      <button
                        onClick={() => {
                          setSearch('')
                          setSelectedStatus('ALL')
                        }}
                        className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredPositions.map((pos) => {
                  const totalLinked =
                    (pos.application_details_count || 0) + (pos.participants_count || 0)

                  return (
                    <tr
                      key={pos.id}
                      className="group transition-colors hover:bg-gray-50/60"
                    >
                      {/* Name & ID */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {pos.name}
                        </div>
                        <div className="mt-0.5 text-xs font-mono text-gray-400">
                          ID: {pos.id.slice(0, 8)}...
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {pos.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Connected Data */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="inline-flex items-center gap-2">
                          <span
                            title="Pengajuan Terkait"
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                              (pos.application_details_count || 0) > 0
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-gray-50 text-gray-400'
                            }`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5L19 7.5V19a2 2 0 01-2 2z" />
                            </svg>
                            {pos.application_details_count || 0} Pengajuan
                          </span>
                          <span
                            title="Peserta Terkait"
                            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                              (pos.participants_count || 0) > 0
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-50 text-gray-400'
                            }`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {pos.participants_count || 0} Peserta
                          </span>
                        </div>
                      </td>

                      {/* Created At */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                        {formatDate(pos.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setErrorMessage(null)
                              setEditingItem(pos)
                            }}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                            title="Edit Posisi"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setErrorMessage(null)
                              setDeletingItem(pos)
                            }}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Hapus Posisi"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Tambah Posisi Magang</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Tutup modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              {/* Nama Posisi */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Nama Posisi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Web Developer, UI/UX Designer"
                  className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Nama divisi atau lingkup tugas pemagangan. Wajib unik.
                </p>
              </div>

              {/* Status Keaktifan */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="create_is_active"
                  name="is_active"
                  value="true"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="create_is_active" className="text-sm font-medium text-gray-700">
                  Status Aktif (dapat dipilih di form pengajuan & peserta)
                </label>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={isPending}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Menyimpan...' : 'Simpan Posisi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Edit Data Posisi</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="rounded-lg p-1 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Tutup modal"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mt-5 space-y-4">
              {/* ID info (Read-only) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  ID Posisi (Primary Key)
                </label>
                <input
                  type="text"
                  disabled
                  value={editingItem.id}
                  className="mt-1 block w-full rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-mono text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Nama Posisi */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Nama Posisi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingItem.name}
                  placeholder="Contoh: Web Developer, Technical Writer"
                  className="mt-1.5 block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Status Keaktifan */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="edit_is_active"
                  name="is_active"
                  value="true"
                  defaultChecked={editingItem.is_active}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="edit_is_active" className="text-sm font-medium text-gray-700">
                  Status Aktif
                </label>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  disabled={isPending}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? 'Memperbarui...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">Konfirmasi Hapus Posisi</h3>
            </div>

            <p className="mt-4 text-sm text-gray-600">
              Apakah Anda yakin ingin menghapus data posisi{' '}
              <span className="font-semibold text-gray-900">
                &ldquo;{deletingItem.name}&rdquo;
              </span>
              ?
            </p>

            {/* Warning if referenced */}
            {((deletingItem.application_details_count || 0) > 0 ||
              (deletingItem.participants_count || 0) > 0) && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <div className="font-semibold flex items-center gap-1.5">
                  <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Perhatian: Data Terhubung
                </div>
                <p className="mt-1 text-amber-700">
                  Posisi ini terhubung dengan{' '}
                  <strong>{deletingItem.application_details_count || 0}</strong> detail pengajuan dan{' '}
                  <strong>{deletingItem.participants_count || 0}</strong> peserta. Sesuai aturan database,
                  penghapusan akan ditolak.
                </p>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                disabled={isPending}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isPending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Menghapus...' : 'Ya, Hapus Posisi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
