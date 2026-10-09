'use client'

import { useState, useTransition } from 'react'
import { formatDate } from '@/lib/utils/date'
import type { InstitutionItem } from '@/app/(app)/master/institusi/types'
import {
  createInstitutionAction,
  updateInstitutionAction,
  deleteInstitutionAction,
} from '@/app/(app)/master/institusi/actions'

import { INSTITUTION_TYPES } from '@/lib/constants/institution'

interface InstitutionManagerProps {
  initialInstitutions: InstitutionItem[]
  queryParam?: string
  typeParam?: string
}


export function InstitutionManager({
  initialInstitutions,
  queryParam = '',
  typeParam = 'ALL',
}: InstitutionManagerProps) {
  const [institutions, setInstitutions] = useState<InstitutionItem[]>(initialInstitutions)
  const [search, setSearch] = useState(queryParam)
  const [selectedType, setSelectedType] = useState(typeParam)

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InstitutionItem | null>(null)
  const [deletingItem, setDeletingItem] = useState<InstitutionItem | null>(null)

  // Feedback states
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filtered List
  const filteredList = institutions.filter((inst) => {
    const qLower = search.toLowerCase().trim()
    const nameMatch = inst.name.toLowerCase().includes(qLower)
    const emailMatch = inst.contact_email?.toLowerCase().includes(qLower) || false
    const addressMatch = inst.address?.toLowerCase().includes(qLower) || false
    const matchesSearch = !qLower || nameMatch || emailMatch || addressMatch

    const matchesType =
      selectedType === 'ALL' ||
      inst.type.toUpperCase() === selectedType.toUpperCase()

    return matchesSearch && matchesType
  })

  const getTypeBadge = (type: string) => {
    const tUpper = type.toUpperCase()
    if (tUpper === 'SMK') {
      return (
        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 border border-purple-200">
          SMK
        </span>
      )
    }
    if (tUpper === 'UNIVERSITAS' || tUpper === 'INSTITUT') {
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
          {type}
        </span>
      )
    }
    if (tUpper === 'POLITEKNIK') {
      return (
        <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 border border-teal-200">
          Politeknik
        </span>
      )
    }
    if (tUpper === 'PESANTREN') {
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
          Pesantren
        </span>
      )
    }
    if (tUpper === 'SEKOLAH_TINGGI' || tUpper === 'SEKOLAH TINGGI') {
      return (
        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200">
          Sekolah Tinggi
        </span>
      )
    }
    if (tUpper === 'AKADEMI') {
      return (
        <span className="inline-flex items-center rounded-md bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700 border border-cyan-200">
          Akademi
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">
        {type}
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
      const res = await createInstitutionAction(formData)
      if (res.error) {
        setErrorMessage(res.error)
      } else if (res.data) {
        setInstitutions((prev) => [res.data!, ...prev])
        setSuccessMessage(`Institusi "${res.data.name}" berhasil ditambahkan.`)
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
      const res = await updateInstitutionAction(editingItem.id, formData)
      if (res.error) {
        setErrorMessage(res.error)
      } else if (res.data) {
        setInstitutions((prev) =>
          prev.map((item) => (item.id === res.data!.id ? { ...item, ...res.data! } : item))
        )
        setSuccessMessage(`Data institusi "${res.data.name}" berhasil diperbarui.`)
        setEditingItem(null)
      }
    })
  }

  const handleDeleteConfirm = () => {
    if (!deletingItem) return
    setErrorMessage(null)
    setSuccessMessage(null)

    startTransition(async () => {
      const res = await deleteInstitutionAction(deletingItem.id)
      if (res.error) {
        setErrorMessage(res.error)
        setDeletingItem(null)
      } else {
        setInstitutions((prev) => prev.filter((item) => item.id !== deletingItem.id))
        setSuccessMessage(`Institusi "${deletingItem.name}" berhasil dihapus.`)
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
            className="text-red-400 hover:text-red-600 font-bold ml-2"
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
            className="text-green-400 hover:text-green-600 font-bold ml-2"
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
              placeholder="Cari nama institusi, kontak, alamat..."
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Tipe</option>
              {INSTITUTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tambah Institusi Button */}
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
          Tambah Institusi
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
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="text-base font-semibold text-gray-800">
              {search || selectedType !== 'ALL'
                ? 'Tidak ditemukan institusi yang sesuai pencarian'
                : 'Belum ada data institusi terdaftar'}
            </p>
            <p className="mt-1 text-sm text-gray-400">
              {search || selectedType !== 'ALL'
                ? 'Coba gunakan kata kunci pencarian atau tipe yang lain.'
                : 'Klik tombol "Tambah Institusi" untuk mendaftarkan institusi pertama.'}
            </p>
            {(!search && selectedType === 'ALL') && (
              <button
                onClick={() => setIsCreateOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
              >
                + Tambah Institusi Baru
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50/75 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                <tr>
                  <th className="px-4 py-3.5">Nama Institusi</th>
                  <th className="px-4 py-3.5">Tipe</th>
                  <th className="px-4 py-3.5">Kontak</th>
                  <th className="px-4 py-3.5">Alamat</th>
                  <th className="px-4 py-3.5 text-center">Pengajuan Terkait</th>
                  <th className="px-4 py-3.5">Terdaftar</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredList.map((inst) => {
                  const hasApplications = (inst.applications_count || 0) > 0
                  return (
                    <tr
                      key={inst.id}
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-4 py-3.5 font-medium text-gray-900">
                        {inst.name}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {getTypeBadge(inst.type)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">
                        {inst.contact_email && (
                          <div className="text-xs text-gray-700">{inst.contact_email}</div>
                        )}
                        {inst.contact_phone && (
                          <div className="text-xs text-gray-400">{inst.contact_phone}</div>
                        )}
                        {!inst.contact_email && !inst.contact_phone && (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 max-w-xs truncate" title={inst.address || ''}>
                        {inst.address || <span className="text-xs text-gray-300">-</span>}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${hasApplications
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-gray-100 text-gray-500'
                            }`}
                        >
                          {inst.applications_count || 0} berkas
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500">
                        {formatDate(inst.created_at)}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-right text-xs">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => {
                              setErrorMessage(null)
                              setEditingItem(inst)
                            }}
                            className="font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            onClick={() => {
                              setErrorMessage(null)
                              setDeletingItem(inst)
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
                <h3 className="text-lg font-bold text-gray-900">Tambah Institusi Baru</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Daftarkan sekolah mitra atau perguruan tinggi ke dalam master data.
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

            <form onSubmit={handleCreateSubmit} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Nama Institusi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: SMKN 1 Jakarta atau Universitas Indonesia"
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Tipe Institusi <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  required
                  defaultValue="SMK"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Alamat Lengkap
                </label>
                <textarea
                  name="address"
                  rows={2}
                  placeholder="Contoh: Jl. Pendidikan No. 45, Jakarta Pusat"
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Email Kontak
                  </label>
                  <input
                    type="email"
                    name="contact_email"
                    placeholder="humas@sekolah.sch.id"
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    No. Telepon / Fax
                  </label>
                  <input
                    type="tel"
                    name="contact_phone"
                    placeholder="021-12345678"
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
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
                  {isPending ? 'Menyimpan...' : 'Simpan Institusi'}
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
                <h3 className="text-lg font-bold text-gray-900">Edit Institusi</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Perbarui informasi profil dan kontak institusi mitra.
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

            <form onSubmit={handleUpdateSubmit} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Nama Institusi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingItem.name}
                  placeholder="Contoh: SMKN 1 Jakarta"
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Tipe Institusi <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  required
                  defaultValue={editingItem.type}
                  className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                >
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                  Alamat Lengkap
                </label>
                <textarea
                  name="address"
                  rows={2}
                  defaultValue={editingItem.address || ''}
                  placeholder="Alamat kampus atau sekolah..."
                  autoComplete="off"
                  className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Email Kontak
                  </label>
                  <input
                    type="email"
                    name="contact_email"
                    defaultValue={editingItem.contact_email || ''}
                    placeholder="email@institusi.ac.id"
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700">
                    No. Telepon / Fax
                  </label>
                  <input
                    type="tel"
                    name="contact_phone"
                    defaultValue={editingItem.contact_phone || ''}
                    placeholder="021-12345678"
                    autoComplete="off"
                    className="mt-1.5 w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
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
                  {isPending ? 'Menyimpan...' : 'Perbarui Institusi'}
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
              Apakah Anda yakin ingin menghapus institusi{' '}
              <strong className="text-gray-900">{deletingItem.name}</strong>?
            </p>

            {(deletingItem.applications_count || 0) > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>Peringatan Integritas Relasi:</strong> Institusi ini tercatat memiliki{' '}
                <strong>{deletingItem.applications_count} pengajuan</strong> magang terkait.
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
                disabled={isPending || (deletingItem.applications_count || 0) > 0}
                onClick={handleDeleteConfirm}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? 'Menghapus...' : 'Hapus Institusi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
