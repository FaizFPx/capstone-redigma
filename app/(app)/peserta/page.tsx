import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/date'
import type { ParticipantItem, InternshipStatus } from './types'
import type { Institution, Position } from '../pengajuan/types'

export default async function PesertaPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: string
    pos?: string
    inst?: string
    success?: string
  }>
}) {
  const params = await searchParams
  const query = (params.q || '').trim()
  const filterStatus = (params.status || 'ALL').trim()
  const filterPosition = (params.pos || 'ALL').trim()
  const filterInstitution = (params.inst || 'ALL').trim()

  const supabase = await createClient()

  // Ambil referensi status magang, posisi, dan institusi untuk filter
  const [
    { data: statusesData },
    { data: positionsData },
    { data: institutionsData },
  ] = await Promise.all([
    supabase
      .from('internship_statuses')
      .select('id, name, is_active_intern')
      .order('id'),
    supabase.from('positions').select('id, name').order('name'),
    supabase.from('institutions').select('id, name, type').order('name'),
  ])

  const statuses: InternshipStatus[] = statusesData || []
  const positions: Position[] = positionsData || []
  const institutions: Institution[] = institutionsData || []

  // Query tabel participants dengan seluruh relasinya
  let dbQuery = supabase
    .from('participants')
    .select(
      `
      id,
      application_id,
      application_detail_id,
      major_id,
      name,
      email,
      phone,
      positioning_by_request_id,
      positioning_by_hc_id,
      actual_start_date,
      actual_end_date,
      status_id,
      notes,
      created_at,
      updated_at,
      application:applications!application_id (
        id,
        application_type,
        apply_date,
        kop_letter_number,
        institution:institutions!institution_id (
          id,
          name,
          type
        )
      ),
      application_detail:application_details!application_detail_id (
        id,
        requested_quota,
        approved_quota
      ),
      major:majors!major_id (
        id,
        name,
        code
      ),
      position_requested:positions!positioning_by_request_id (
        id,
        name
      ),
      position_assigned:positions!positioning_by_hc_id (
        id,
        name
      ),
      status:internship_statuses!status_id (
        id,
        name,
        is_active_intern
      )
    `
    )
    .order('created_at', { ascending: false })

  if (filterStatus !== 'ALL') {
    dbQuery = dbQuery.eq('status_id', filterStatus)
  }

  if (filterPosition !== 'ALL') {
    dbQuery = dbQuery.or(
      `positioning_by_hc_id.eq.${filterPosition},positioning_by_request_id.eq.${filterPosition}`
    )
  }

  const { data: rawParticipants, error } = await dbQuery

  // Filter teks pencarian & institusi pada sisi aplikasi
  const participants: ParticipantItem[] = (
    (rawParticipants as unknown as ParticipantItem[]) || []
  ).filter((p) => {
    // Filter institusi jika dipilih
    if (
      filterInstitution !== 'ALL' &&
      p.application?.institution?.id !== filterInstitution
    ) {
      return false
    }

    if (!query) return true
    const qLower = query.toLowerCase()
    const nameMatch = p.name.toLowerCase().includes(qLower)
    const emailMatch = p.email ? p.email.toLowerCase().includes(qLower) : false
    const phoneMatch = p.phone ? p.phone.includes(qLower) : false
    const instMatch = p.application?.institution?.name
      ? p.application.institution.name.toLowerCase().includes(qLower)
      : false
    const majorMatch = p.major?.name
      ? p.major.name.toLowerCase().includes(qLower)
      : false

    return nameMatch || emailMatch || phoneMatch || instMatch || majorMatch
  })

  const getStatusBadge = (statusId: string, statusName?: string) => {
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
      default: // belum_mulai
        return (
          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            {label}
          </span>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi Sukses Hapus */}
      {params.success === 'deleted' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>Peserta berhasil dihapus.</span>
          </div>
        </div>
      )}

      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Data Peserta Magang</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar seluruh siswa dan mahasiswa yang mengikuti program magang di REDIGMA.
          </p>
        </div>
        <Link
          href="/peserta/baru"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors self-start sm:self-auto"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Peserta
        </Link>
      </div>

      {/* Filter & Pencarian */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
        <form method="GET" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Kolom Pencarian */}
          <div className="lg:col-span-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Cari nama peserta, email, institusi, jurusan..."
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Filter Status */}
          <div>
            <select
              name="status"
              defaultValue={filterStatus}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Status</option>
              {statuses.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Posisi */}
          <div>
            <select
              name="pos"
              defaultValue={filterPosition}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Posisi</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Institusi & Submit */}
          <div className="flex gap-2">
            <select
              name="inst"
              defaultValue={filterInstitution}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Institusi</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Error alert jika query gagal */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal memuat data peserta: {error.message}
        </div>
      )}

      {/* Tabel Peserta */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3.5">Nama Peserta</th>
                <th className="px-4 py-3.5">Institusi Asal</th>
                <th className="px-4 py-3.5">Jurusan</th>
                <th className="px-4 py-3.5">Posisi Penugasan</th>
                <th className="px-4 py-3.5">Mulai Riil</th>
                <th className="px-4 py-3.5">Selesai Riil</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <svg
                        className="h-10 w-10 text-gray-300 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-gray-600">
                        Belum ada data peserta magang yang tercatat.
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Klik tombol "Tambah Peserta" untuk menambahkan data baru.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                participants.map((p) => {
                  const assignedPos = p.position_assigned?.name
                  const reqPos = p.position_requested?.name
                  const positionLabel = assignedPos || reqPos || '-'

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                    >
                      {/* Nama */}
                      <td className="px-4 py-3.5">
                        <Link href={`/peserta/${p.id}`} className="block">
                          <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {p.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {p.email || p.phone || '-'}
                          </div>
                        </Link>
                      </td>

                      {/* Institusi */}
                      <td className="px-4 py-3.5">
                        <Link href={`/peserta/${p.id}`} className="block">
                          <div className="font-medium text-gray-900 line-clamp-1">
                            {p.application?.institution?.name || '-'}
                          </div>
                          <div className="text-xs text-gray-400">
                            {p.application?.application_type ? `[${p.application.application_type}]` : ''}
                          </div>
                        </Link>
                      </td>

                      {/* Jurusan */}
                      <td className="px-4 py-3.5 text-gray-700">
                        <Link href={`/peserta/${p.id}`} className="block">
                          {p.major?.name || '-'}
                        </Link>
                      </td>

                      {/* Posisi */}
                      <td className="px-4 py-3.5">
                        <Link href={`/peserta/${p.id}`} className="block">
                          <div className="font-medium text-gray-800">
                            {positionLabel}
                          </div>
                          {assignedPos && reqPos && assignedPos !== reqPos && (
                            <div className="text-[11px] text-gray-400">
                              Minat: {reqPos}
                            </div>
                          )}
                        </Link>
                      </td>

                      {/* Mulai Riil */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">
                        <Link href={`/peserta/${p.id}`} className="block">
                          {formatDate(p.actual_start_date)}
                        </Link>
                      </td>

                      {/* Selesai Riil */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-600">
                        <Link href={`/peserta/${p.id}`} className="block">
                          {formatDate(p.actual_end_date)}
                        </Link>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link href={`/peserta/${p.id}`} className="block">
                          {getStatusBadge(p.status_id, p.status?.name)}
                        </Link>
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <Link
                          href={`/peserta/${p.id}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          Detail &rarr;
                        </Link>
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
