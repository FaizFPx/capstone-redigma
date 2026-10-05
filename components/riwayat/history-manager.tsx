'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/date'
import type { StatusLogItem } from '@/app/(app)/riwayat/types'

interface HistoryManagerProps {
  initialLogs: StatusLogItem[]
  stageMap: Record<string, string>
  decisionMap: Record<string, string>
  queryParam?: string
  stageParam?: string
  decisionParam?: string
  typeParam?: string
}

export function HistoryManager({
  initialLogs,
  stageMap,
  decisionMap,
  queryParam = '',
  stageParam = 'ALL',
  decisionParam = 'ALL',
  typeParam = 'ALL',
}: HistoryManagerProps) {
  const [search, setSearch] = useState(queryParam)
  const [selectedStage, setSelectedStage] = useState(stageParam)
  const [selectedDecision, setSelectedDecision] = useState(decisionParam)
  const [selectedType, setSelectedType] = useState(typeParam)

  // Filter logs
  const filteredLogs = initialLogs.filter((log) => {
    const q = search.toLowerCase().trim()
    const instName = log.application?.institution?.name?.toLowerCase() || ''
    const kopLetter = log.application?.kop_letter_number?.toLowerCase() || ''
    const notes = log.change_notes?.toLowerCase() || ''
    const userName = log.changed_by?.full_name?.toLowerCase() || ''
    const userEmail = log.changed_by?.email?.toLowerCase() || ''

    const matchesSearch =
      q === '' ||
      instName.includes(q) ||
      kopLetter.includes(q) ||
      notes.includes(q) ||
      userName.includes(q) ||
      userEmail.includes(q)

    const matchesStage =
      selectedStage === 'ALL' ||
      log.new_stage_id === selectedStage ||
      log.previous_stage_id === selectedStage

    const matchesDecision =
      selectedDecision === 'ALL' ||
      log.new_decision_id === selectedDecision ||
      log.previous_decision_id === selectedDecision

    const matchesType =
      selectedType === 'ALL' ||
      log.application?.application_type === selectedType

    return matchesSearch && matchesStage && matchesDecision && matchesType
  })

  const getStageBadge = (stageId: string | null) => {
    if (!stageId) return <span className="text-gray-400 italic text-xs">-</span>
    const label = stageMap[stageId] || stageId
    if (stageId === 'belum_ditanggapi') {
      return (
        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
          {label}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
        {label}
      </span>
    )
  }

  const getDecisionBadge = (decisionId: string | null) => {
    if (!decisionId) return <span className="text-gray-400 italic text-xs">-</span>
    const label = decisionMap[decisionId] || decisionId
    if (decisionId === 'diterima') {
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
          {label}
        </span>
      )
    } else if (decisionId === 'ditolak') {
      return (
        <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
          {label}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 border border-gray-200">
        {label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Control Bar: Search & Filter Controls */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        {/* Search */}
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
            placeholder="Cari institusi, nomor surat, catatan, atau petugas..."
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

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Tahapan */}
          <div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Semua Tahapan</option>
              {Object.entries(stageMap).map(([id, name]) => (
                <option key={id} value={id}>
                  Tahap: {name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Keputusan */}
          <div>
            <select
              value={selectedDecision}
              onChange={(e) => setSelectedDecision(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Semua Keputusan</option>
              {Object.entries(decisionMap).map(([id, name]) => (
                <option key={id} value={id}>
                  Keputusan: {name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tipe Pengajuan */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Semua Tipe</option>
              <option value="PKL">PKL</option>
              <option value="MAGANG_MANDIRI">Magang Mandiri</option>
            </select>
          </div>

          {(search || selectedStage !== 'ALL' || selectedDecision !== 'ALL' || selectedType !== 'ALL') && (
            <button
              onClick={() => {
                setSearch('')
                setSelectedStage('ALL')
                setSelectedDecision('ALL')
                setSelectedType('ALL')
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Table / Timeline View */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50/75">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap"
                >
                  Waktu & Tanggal
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Pengajuan & Institusi
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Perubahan Tahapan
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Perubahan Keputusan
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Petugas / PIC
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-gray-500"
                >
                  Catatan Perubahan
                </th>
                <th
                  scope="col"
                  className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap"
                >
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-gray-900">
                      Tidak ada catatan riwayat
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {search || selectedStage !== 'ALL' || selectedDecision !== 'ALL' || selectedType !== 'ALL'
                        ? 'Coba sesuaikan kata kunci pencarian atau ubah pilihan filter.'
                        : 'Belum ada catatan aktivitas perubahan status pengajuan di sistem.'}
                    </p>
                    {(search || selectedStage !== 'ALL' || selectedDecision !== 'ALL' || selectedType !== 'ALL') && (
                      <button
                        onClick={() => {
                          setSearch('')
                          setSelectedStage('ALL')
                          setSelectedDecision('ALL')
                          setSelectedType('ALL')
                        }}
                        className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const date = new Date(log.created_at)
                  const formattedDate = formatDate(log.created_at)
                  const formattedTime = date.toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <tr
                      key={log.id}
                      className="group transition-colors hover:bg-gray-50/60"
                    >
                      {/* Timestamp */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900 text-xs">
                          {formattedDate}
                        </div>
                        <div className="mt-0.5 text-xs text-gray-400">
                          {formattedTime} WIB
                        </div>
                      </td>

                      {/* Application & Institution */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">
                          {log.application?.institution?.name || 'Institusi Tanpa Nama'}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
                          {log.application?.application_type && (
                            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600">
                              {log.application.application_type}
                            </span>
                          )}
                          {log.application?.kop_letter_number && (
                            <span className="text-gray-400">
                              No: {log.application.kop_letter_number}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stage Transition */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getStageBadge(log.previous_stage_id)}
                          <svg className="h-3 w-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                          {getStageBadge(log.new_stage_id)}
                        </div>
                      </td>

                      {/* Decision Transition */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {getDecisionBadge(log.previous_decision_id)}
                          <svg className="h-3 w-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                          {getDecisionBadge(log.new_decision_id)}
                        </div>
                      </td>

                      {/* Changed By User */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {log.changed_by ? (
                          <div>
                            <div className="font-medium text-gray-900">
                              {log.changed_by.full_name || 'Staff HC'}
                            </div>
                            <div className="text-gray-400">
                              {log.changed_by.email}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-400 italic">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Sistem / Otomatis
                          </span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="px-6 py-4 text-xs text-gray-600 max-w-xs">
                        {log.change_notes || (
                          <span className="text-gray-400 italic">Tidak ada catatan</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        {log.application_id ? (
                          <Link
                            href={`/pengajuan/${log.application_id}`}
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                          >
                            Detail Pengajuan
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
