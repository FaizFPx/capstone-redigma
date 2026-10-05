import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/date'
import type { ApplicationItem, Stage, Decision } from './types'

export default async function PengajuanPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    type?: string
    stage?: string
    decision?: string
  }>
}) {
  const params = await searchParams
  const query = (params.q || '').trim()
  const filterType = (params.type || 'ALL').trim()
  const filterStage = (params.stage || 'ALL').trim()
  const filterDecision = (params.decision || 'ALL').trim()

  const supabase = await createClient()

  // Ambil data referensi filter
  const { data: stagesData } = await supabase
    .from('application_stages')
    .select('id, name')
  const stages: Stage[] = stagesData || []

  const { data: decisionsData } = await supabase
    .from('application_decisions')
    .select('id, name')
  const decisions: Decision[] = decisionsData || []

  // Query tabel applications dengan relasinya
  let dbQuery = supabase
    .from('applications')
    .select(
      `
      id,
      application_type,
      apply_date,
      stage_id,
      decision_id,
      kop_letter_number,
      proposed_start_date,
      proposed_end_date,
      approved_start_date,
      approved_end_date,
      created_at,
      updated_at,
      institution:institutions ( id, name, type ),
      pic_user:users!pic_hc_id ( id, full_name, email ),
      stage:application_stages ( id, name ),
      decision:application_decisions ( id, name ),
      details:application_details (
        id,
        requested_quota,
        approved_quota
      )
    `
    )
    .order('created_at', { ascending: false })

  if (filterType !== 'ALL') {
    dbQuery = dbQuery.eq('application_type', filterType)
  }

  if (filterStage !== 'ALL') {
    dbQuery = dbQuery.eq('stage_id', filterStage)
  }

  if (filterDecision !== 'ALL') {
    dbQuery = dbQuery.eq('decision_id', filterDecision)
  }

  const { data: rawApps, error } = await dbQuery

  // Client-side text search filtering untuk relasi (institusi, nomor kop, pic)
  const applications: ApplicationItem[] = (
    (rawApps as unknown as ApplicationItem[]) || []
  ).filter((app) => {
    if (!query) return true
    const qLower = query.toLowerCase()
    const instName = app.institution?.name?.toLowerCase() || ''
    const kop = app.kop_letter_number?.toLowerCase() || ''
    const pic = app.pic_user?.full_name?.toLowerCase() || ''
    const type = app.application_type.toLowerCase()
    return (
      instName.includes(qLower) ||
      kop.includes(qLower) ||
      pic.includes(qLower) ||
      type.includes(qLower)
    )
  })

  // Decision Badge Helper
  const getDecisionBadge = (id: string, name?: string) => {
    const label = name || id
    if (id === 'diterima') {
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 border border-green-200">
          {label}
        </span>
      )
    }
    if (id === 'ditolak') {
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
          {label}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
        {label}
      </span>
    )
  }

  const getStageBadge = (id: string, name?: string) => {
    const label = name || id
    if (id === 'sudah_ditanggapi') {
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
          {label}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">
        {label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengajuan Magang</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar permohonan magang PKL sekolah dan magang mandiri mahasiswa.
          </p>
        </div>
        <Link
          href="/pengajuan/baru"
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
          Tambah Pengajuan
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
        <form method="GET" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search box */}
          <div className="lg:col-span-2">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Cari institusi, nomor KOP, atau PIC..."
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Filter Jenis */}
          <div>
            <select
              name="type"
              defaultValue={filterType}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Jenis</option>
              <option value="PKL">PKL</option>
              <option value="MAGANG_MANDIRI">Magang Mandiri</option>
            </select>
          </div>

          {/* Filter Tahap */}
          <div>
            <select
              name="stage"
              defaultValue={filterStage}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Tahap</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Keputusan */}
          <div className="flex gap-2">
            <select
              name="decision"
              defaultValue={filterDecision}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Keputusan</option>
              {decisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
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

      {/* Error alert if any */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal memuat data pengajuan: {error.message}
        </div>
      )}

      {/* Applications Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-semibold uppercase tracking-wider text-gray-600">
                <th className="px-4 py-3.5">Tanggal</th>
                <th className="px-4 py-3.5">Jenis</th>
                <th className="px-4 py-3.5">Institusi</th>
                <th className="px-4 py-3.5">Tahap</th>
                <th className="px-4 py-3.5">Keputusan</th>
                <th className="px-4 py-3.5">PIC</th>
                <th className="px-4 py-3.5">Mulai</th>
                <th className="px-4 py-3.5">Selesai</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
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
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-sm font-medium text-gray-600">
                        Belum ada data pengajuan magang.
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Klik tombol "Tambah Pengajuan" untuk membuat data baru.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-gray-900">
                      <Link href={`/pengajuan/${app.id}`} className="block">
                        {formatDate(app.apply_date)}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Link href={`/pengajuan/${app.id}`} className="block">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                            app.application_type === 'PKL'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-teal-50 text-teal-700 border border-teal-200'
                          }`}
                        >
                          {app.application_type}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5">
                      <Link href={`/pengajuan/${app.id}`} className="block">
                        <div className="font-medium text-gray-900 line-clamp-1">
                          {app.institution?.name || '-'}
                        </div>
                        {app.kop_letter_number && (
                          <div className="text-xs text-gray-400">
                            KOP: {app.kop_letter_number}
                          </div>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Link href={`/pengajuan/${app.id}`} className="block">
                        {getStageBadge(app.stage_id, app.stage?.name)}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Link href={`/pengajuan/${app.id}`} className="block">
                        {getDecisionBadge(app.decision_id, app.decision?.name)}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">
                      <Link href={`/pengajuan/${app.id}`} className="block">
                        {app.pic_user?.full_name || '-'}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-gray-600 text-xs">
                      <Link href={`/pengajuan/${app.id}`} className="block">
                        {formatDate(app.approved_start_date || app.proposed_start_date)}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-gray-600 text-xs">
                      <Link href={`/pengajuan/${app.id}`} className="block">
                        {formatDate(app.approved_end_date || app.proposed_end_date)}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <Link
                        href={`/pengajuan/${app.id}`}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Detail &rarr;
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
