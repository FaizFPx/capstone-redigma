'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  formatDate,
  calculateRemainingDays,
  getRemainingDaysInfo,
  matchesRemainingDaysFilter,
} from '@/lib/utils/date'
import type { ParticipantItem, InternshipStatus } from '@/app/(app)/peserta/types'

interface PesertaViewProps {
  initialParticipants: ParticipantItem[]
  statuses: InternshipStatus[]
  initialQuery?: string
  initialInstitution?: string
  initialPosition?: string
  initialStatus?: string
}

interface FormattedParticipant {
  id: string
  name: string
  email: string | null
  phone: string | null
  institutionName: string
  applicationType: string | null
  majorName: string
  positionName: string | null
  requestedPositionName: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  status_id: string
  status_name: string
}

const ITEMS_PER_PAGE = 10

function RemainingBadge({ date }: { date?: string | null }) {
  const days = calculateRemainingDays(date)
  const { text, urgency } = getRemainingDaysInfo(days)

  if (urgency === 'NONE') {
    return <span className="text-gray-400 font-medium">-</span>
  }

  if (urgency === 'NORMAL') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
        {text}
      </span>
    )
  }

  if (urgency === 'WARNING_LOW') {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
        {text}
      </span>
    )
  }

  if (urgency === 'WARNING_HIGH') {
    return (
      <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
        {text}
      </span>
    )
  }

  if (urgency === 'TODAY') {
    return (
      <span
        className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700 border border-red-200"
        title="Berakhir hari ini"
      >
        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        {text}
      </span>
    )
  }

  // OVERDUE (< 0 hari)
  return (
    <span
      className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 border border-gray-200"
      title="Sudah berakhir"
    >
      {text}
    </span>
  )
}

function StatusBadge({
  statusId,
  statusName,
}: {
  statusId: string
  statusName?: string
}) {
  const label = statusName || statusId
  switch (statusId) {
    case 'sedang_magang':
      return (
        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
          <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {label}
        </span>
      )
    case 'sudah_selesai':
      return (
        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
          {label}
        </span>
      )
    case 'mengundurkan_diri':
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
          {label}
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          {label}
        </span>
      )
  }
}

export function PesertaView({
  initialParticipants,
  statuses,
  initialQuery = '',
  initialInstitution = 'ALL',
  initialPosition = 'ALL',
  initialStatus = 'ALL',
}: PesertaViewProps) {
  // Tab state: default ke 'ALL' (Semua Peserta)
  const [activeTab, setActiveTab] = useState<'sedang_magang' | 'ALL'>(
    initialStatus === 'sedang_magang' ? 'sedang_magang' : 'ALL'
  )

  // State Filter
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery)
  const [selectedInstitution, setSelectedInstitution] = useState<string>(
    initialInstitution
  )
  const [selectedMajor, setSelectedMajor] = useState<string>('ALL')
  const [selectedPosition, setSelectedPosition] = useState<string>(
    initialPosition
  )
  const [selectedRemaining, setSelectedRemaining] = useState<string>('ALL')
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL')

  // State Pagination
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Normalisasi data peserta
  const normalizedParticipants: FormattedParticipant[] = useMemo(() => {
    return initialParticipants.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email || null,
      phone: p.phone || null,
      institutionName: p.application?.institution?.name || '-',
      applicationType: p.application?.application_type || null,
      majorName: p.major?.name || '-',
      positionName:
        p.position_assigned?.name || p.position_requested?.name || null,
      requestedPositionName: p.position_requested?.name || null,
      actual_start_date: p.actual_start_date || null,
      actual_end_date: p.actual_end_date || null,
      status_id: p.status_id,
      status_name: p.status?.name || p.status_id,
    }))
  }, [initialParticipants])

  // Dataset berdasarkan tab aktif
  const tabDataset = useMemo(() => {
    if (activeTab === 'sedang_magang') {
      return normalizedParticipants.filter((p) => p.status_id === 'sedang_magang')
    }
    return normalizedParticipants
  }, [activeTab, normalizedParticipants])

  // Total peserta aktif untuk badge tab
  const activeCount = useMemo(() => {
    return normalizedParticipants.filter((p) => p.status_id === 'sedang_magang')
      .length
  }, [normalizedParticipants])

  // Opsi Filter Dinamis dari dataset
  const institutionOptions = useMemo(() => {
    const set = new Set<string>()
    tabDataset.forEach((item) => {
      if (item.institutionName && item.institutionName !== '-') {
        set.add(item.institutionName)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [tabDataset])

  const majorOptions = useMemo(() => {
    const set = new Set<string>()
    tabDataset.forEach((item) => {
      if (item.majorName && item.majorName !== '-') {
        set.add(item.majorName)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [tabDataset])

  const positionOptions = useMemo(() => {
    const set = new Set<string>()
    tabDataset.forEach((item) => {
      if (item.positionName && item.positionName !== '-') {
        set.add(item.positionName)
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [tabDataset])

  // Cek apakah ada filter yang sedang aktif
  const isFilterActive =
    searchQuery.trim() !== '' ||
    selectedInstitution !== 'ALL' ||
    selectedMajor !== 'ALL' ||
    selectedPosition !== 'ALL' ||
    selectedRemaining !== 'ALL' ||
    (activeTab === 'ALL' && selectedStatus !== 'ALL')

  // Filter Data Peserta
  const filteredParticipants = useMemo(() => {
    return tabDataset.filter((item) => {
      // 1. Search Nama Peserta & Kontak (case-insensitive)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = item.name.toLowerCase().includes(q)
        const matchEmail = item.email ? item.email.toLowerCase().includes(q) : false
        const matchPhone = item.phone ? item.phone.includes(q) : false
        const matchInst = item.institutionName
          ? item.institutionName.toLowerCase().includes(q)
          : false
        const matchMajor = item.majorName
          ? item.majorName.toLowerCase().includes(q)
          : false
        if (!matchName && !matchEmail && !matchPhone && !matchInst && !matchMajor) {
          return false
        }
      }

      // 2. Filter Institusi
      if (selectedInstitution !== 'ALL') {
        if (item.institutionName !== selectedInstitution) return false
      }

      // 3. Filter Jurusan
      if (selectedMajor !== 'ALL') {
        if (item.majorName !== selectedMajor) return false
      }

      // 4. Filter Posisi Penugasan
      if (selectedPosition !== 'ALL') {
        if (
          item.positionName !== selectedPosition &&
          item.requestedPositionName !== selectedPosition
        ) {
          return false
        }
      }

      // 5. Filter Sisa Magang
      if (selectedRemaining !== 'ALL') {
        const days = calculateRemainingDays(item.actual_end_date)
        if (!matchesRemainingDaysFilter(days, selectedRemaining)) {
          return false
        }
      }

      // 6. Filter Status (Hanya pada tab 'ALL')
      if (activeTab === 'ALL' && selectedStatus !== 'ALL') {
        if (item.status_id !== selectedStatus) return false
      }

      return true
    })
  }, [
    tabDataset,
    searchQuery,
    selectedInstitution,
    selectedMajor,
    selectedPosition,
    selectedRemaining,
    selectedStatus,
    activeTab,
  ])

  // Handler Perubahan Filter
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    setCurrentPage(1)
  }

  const handleInstitutionChange = (val: string) => {
    setSelectedInstitution(val)
    setCurrentPage(1)
  }

  const handleMajorChange = (val: string) => {
    setSelectedMajor(val)
    setCurrentPage(1)
  }

  const handlePositionChange = (val: string) => {
    setSelectedPosition(val)
    setCurrentPage(1)
  }

  const handleRemainingChange = (val: string) => {
    setSelectedRemaining(val)
    setCurrentPage(1)
  }

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val)
    setCurrentPage(1)
  }

  const handleReset = () => {
    setSearchQuery('')
    setSelectedInstitution('ALL')
    setSelectedMajor('ALL')
    setSelectedPosition('ALL')
    setSelectedRemaining('ALL')
    setSelectedStatus('ALL')
    setCurrentPage(1)
  }

  const handleTabChange = (tab: 'sedang_magang' | 'ALL') => {
    setActiveTab(tab)
    handleReset()
  }

  // Hitung Pagination berdasarkan hasil filter
  const totalFiltered = filteredParticipants.length
  const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE)
  const safeCurrentPage = Math.min(
    Math.max(1, currentPage),
    Math.max(1, totalPages)
  )

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE
  const currentItems = filteredParticipants.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  )

  return (
    <div className="space-y-4">
      {/* Tab Navigasi Status */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => handleTabChange('ALL')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'ALL'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Semua Peserta</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              activeTab === 'ALL'
                ? 'bg-blue-700/80 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {normalizedParticipants.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('sedang_magang')}
          className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
            activeTab === 'sedang_magang'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span>Sedang Magang</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              activeTab === 'sedang_magang'
                ? 'bg-blue-700/80 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {activeCount}
          </span>
        </button>
      </div>

      {/* Card Utama */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-xs">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {activeTab === 'sedang_magang'
                ? 'Peserta yang Sedang Magang'
                : 'Seluruh Peserta Magang'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeTab === 'sedang_magang'
                ? 'Daftar peserta yang saat ini sedang menjalani program magang di REDIGMA.'
                : 'Daftar seluruh siswa dan mahasiswa dari semua status magang.'}
            </p>
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 self-start sm:self-auto shrink-0">
            {activeTab === 'sedang_magang'
              ? `Sedang Magang: ${totalFiltered} peserta`
              : `Total: ${totalFiltered} peserta`}
          </div>
        </div>

        {/* Jika basis data kosong */}
        {tabDataset.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">
              {activeTab === 'sedang_magang'
                ? 'Belum ada peserta yang sedang magang.'
                : 'Belum ada data peserta magang yang tercatat.'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {activeTab === 'sedang_magang'
                ? 'Saat peserta berstatus aktif "Sedang Magang", daftar akan ditampilkan di sini.'
                : 'Klik tombol "Tambah Peserta" untuk menambahkan data peserta baru.'}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Area Filter */}
            <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3.5">
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${
                  activeTab === 'ALL'
                    ? 'xl:grid-cols-7'
                    : 'xl:grid-cols-6'
                } gap-3 items-center`}
              >
                {/* 1. Search Nama Peserta */}
                <div className="relative">
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
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Cari nama peserta..."
                    className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-xs text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-colors"
                  />
                </div>

                {/* 2. Filter Institusi */}
                <div>
                  <select
                    value={selectedInstitution}
                    onChange={(e) => handleInstitutionChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-colors"
                  >
                    <option value="ALL">Semua Institusi</option>
                    {institutionOptions.map((inst) => (
                      <option key={inst} value={inst}>
                        {inst}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Filter Jurusan */}
                <div>
                  <select
                    value={selectedMajor}
                    onChange={(e) => handleMajorChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-colors"
                  >
                    <option value="ALL">Semua Jurusan</option>
                    {majorOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Filter Posisi Penugasan */}
                <div>
                  <select
                    value={selectedPosition}
                    onChange={(e) => handlePositionChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-colors"
                  >
                    <option value="ALL">Semua Posisi</option>
                    {positionOptions.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Filter Sisa Magang */}
                <div>
                  <select
                    value={selectedRemaining}
                    onChange={(e) => handleRemainingChange(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-colors"
                  >
                    <option value="ALL">Semua</option>
                    <option value="LE_7">&le; 7 hari</option>
                    <option value="LE_14">&le; 14 hari</option>
                    <option value="LE_30">&le; 30 hari</option>
                    <option value="GT_30">&gt; 30 hari</option>
                    <option value="OVERDUE">Sudah berakhir</option>
                  </select>
                </div>

                {/* 6. Filter Status (khusus tab 'ALL') */}
                {activeTab === 'ALL' && (
                  <div>
                    <select
                      value={selectedStatus}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden transition-colors"
                    >
                      <option value="ALL">Semua Status</option>
                      {statuses.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Tombol Reset Filter */}
                <div className="flex justify-start sm:justify-end">
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={!isFilterActive}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-2xs hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="h-3.5 w-3.5 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>

            {/* Konten Tabel atau Empty State Filter */}
            {filteredParticipants.length === 0 ? (
              <div className="py-12 px-4 text-center rounded-xl border border-dashed border-gray-200 bg-gray-50/30">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-700">
                  Tidak ada peserta yang sesuai dengan filter.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Coba ubah kata kunci pencarian atau reset filter untuk melihat peserta lainnya.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 transition-colors"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-600">
                        <th className="px-4 py-3.5 text-center w-14">No</th>
                        <th className="px-4 py-3.5">Nama Peserta</th>
                        <th className="px-4 py-3.5 min-w-[180px] sm:min-w-[200px]">Institusi</th>
                        <th className="px-4 py-3.5">Jurusan</th>
                        <th className="px-4 py-3.5">Posisi Penugasan</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Tanggal Selesai</th>
                        <th className="px-4 py-3.5 whitespace-nowrap">Sisa Magang</th>
                        {activeTab === 'ALL' && (
                          <th className="px-4 py-3.5 whitespace-nowrap">Status</th>
                        )}
                        <th className="px-4 py-3.5 text-right whitespace-nowrap">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {currentItems.map((item, index) => {
                        const rowNumber = startIndex + index + 1
                        return (
                          <tr
                            key={item.id}
                            className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                          >
                            {/* No */}
                            <td className="px-4 py-3.5 text-center text-xs text-gray-500 font-medium">
                              {rowNumber}
                            </td>

                            {/* Nama Peserta */}
                            <td className="px-4 py-3.5">
                              <Link
                                href={`/peserta/${item.id}`}
                                className="block"
                              >
                                <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {item.name}
                                </div>
                                {(item.email || item.phone) && (
                                  <div className="text-xs text-gray-500">
                                    {item.email || item.phone}
                                  </div>
                                )}
                              </Link>
                            </td>

                            {/* Institusi */}
                            <td className="px-4 py-3.5 text-gray-700 min-w-[180px] sm:min-w-[200px] max-w-[280px]">
                              <Link
                                href={`/peserta/${item.id}`}
                                className="block"
                                title={item.institutionName || undefined}
                              >
                                <div className="font-medium text-gray-900 truncate">
                                  {item.institutionName || '-'}
                                </div>
                                {item.applicationType && (
                                  <div className="text-[11px] text-gray-400">
                                    [{item.applicationType}]
                                  </div>
                                )}
                              </Link>
                            </td>

                            {/* Jurusan */}
                            <td className="px-4 py-3.5 text-gray-700">
                              <Link
                                href={`/peserta/${item.id}`}
                                className="block"
                              >
                                {item.majorName}
                              </Link>
                            </td>

                            {/* Posisi Penugasan */}
                            <td className="px-4 py-3.5">
                              <Link
                                href={`/peserta/${item.id}`}
                                className="block"
                              >
                                {item.positionName ? (
                                  <span className="font-medium text-gray-900">
                                    {item.positionName}
                                  </span>
                                ) : (
                                  <span className="text-gray-400 italic text-xs">
                                    -- Belum ditetapkan --
                                  </span>
                                )}
                                {item.requestedPositionName &&
                                  item.positionName !==
                                    item.requestedPositionName && (
                                    <div className="text-[11px] text-gray-400">
                                      Minat: {item.requestedPositionName}
                                    </div>
                                  )}
                              </Link>
                            </td>

                            {/* Tanggal Selesai */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-700">
                              <Link
                                href={`/peserta/${item.id}`}
                                className="block"
                              >
                                {item.actual_end_date
                                  ? formatDate(item.actual_end_date)
                                  : '-'}
                              </Link>
                            </td>

                            {/* Sisa Magang */}
                            <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                              <Link
                                href={`/peserta/${item.id}`}
                                className="block"
                              >
                                <RemainingBadge date={item.actual_end_date} />
                              </Link>
                            </td>

                            {/* Status (Hanya pada tab 'ALL') */}
                            {activeTab === 'ALL' && (
                              <td className="px-4 py-3.5 whitespace-nowrap text-xs">
                                <Link
                                  href={`/peserta/${item.id}`}
                                  className="block"
                                >
                                  <StatusBadge
                                    statusId={item.status_id}
                                    statusName={item.status_name}
                                  />
                                </Link>
                              </td>
                            )}

                            {/* Aksi */}
                            <td className="px-4 py-3.5 text-right whitespace-nowrap">
                              <Link
                                href={`/peserta/${item.id}`}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                              >
                                Detail &rarr;
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                    <div className="text-xs text-gray-500">
                      Menampilkan{' '}
                      <span className="font-semibold text-gray-700">
                        {startIndex + 1}
                      </span>
                      –
                      <span className="font-semibold text-gray-700">
                        {Math.min(startIndex + ITEMS_PER_PAGE, totalFiltered)}
                      </span>{' '}
                      dari{' '}
                      <span className="font-semibold text-gray-700">
                        {totalFiltered}
                      </span>{' '}
                      peserta
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={safeCurrentPage === 1}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Sebelumnya
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                          (pageNum) => (
                            <button
                              key={pageNum}
                              type="button"
                              onClick={() => setCurrentPage(pageNum)}
                              className={`min-w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                                safeCurrentPage === pageNum
                                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                  : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          )
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={safeCurrentPage === totalPages}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
