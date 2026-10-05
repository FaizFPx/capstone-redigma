import { createClient } from '@/lib/supabase/server'
import { PositionManager } from '@/components/master/position-manager'
import type { PositionItem } from './types'

export default async function MasterPosisiPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    status?: string
  }>
}) {
  const params = await searchParams
  const query = (params.q || '').trim()
  const filterStatus = (params.status || 'ALL').trim()

  const supabase = await createClient()

  // 1. Fetch all positions
  let dbQuery = supabase
    .from('positions')
    .select('id, name, is_active, created_at')
    .order('created_at', { ascending: false })

  if (filterStatus === 'ACTIVE') {
    dbQuery = dbQuery.eq('is_active', true)
  } else if (filterStatus === 'INACTIVE') {
    dbQuery = dbQuery.eq('is_active', false)
  }

  // 2. Fetch references to count dependencies safely
  const [
    { data: rawPositions, error: positionsError },
    { data: rawAppDetails },
    { data: rawParticipants },
  ] = await Promise.all([
    dbQuery,
    supabase.from('application_details').select('id, requested_position_id'),
    supabase
      .from('participants')
      .select('id, positioning_by_request_id, positioning_by_hc_id'),
  ])

  if (positionsError) {
    console.error('Error fetching positions:', positionsError)
  }

  // Compute application_details count map
  const appDetailCountMap: Record<string, number> = {}
  if (rawAppDetails) {
    for (const item of rawAppDetails) {
      if (item.requested_position_id) {
        appDetailCountMap[item.requested_position_id] =
          (appDetailCountMap[item.requested_position_id] || 0) + 1
      }
    }
  }

  // Compute participants count map (from both requested and hc assigned positions)
  const participantCountMap: Record<string, number> = {}
  if (rawParticipants) {
    for (const item of rawParticipants) {
      if (item.positioning_by_request_id) {
        participantCountMap[item.positioning_by_request_id] =
          (participantCountMap[item.positioning_by_request_id] || 0) + 1
      }
      if (
        item.positioning_by_hc_id &&
        item.positioning_by_hc_id !== item.positioning_by_request_id
      ) {
        participantCountMap[item.positioning_by_hc_id] =
          (participantCountMap[item.positioning_by_hc_id] || 0) + 1
      }
    }
  }

  const positions: PositionItem[] = (rawPositions || []).map((pos) => ({
    ...pos,
    application_details_count: appDetailCountMap[pos.id] || 0,
    participants_count: participantCountMap[pos.id] || 0,
  }))

  // KPI Metrics
  const totalPositions = positions.length
  const totalActive = positions.filter((p) => p.is_active).length
  const totalInactive = positions.filter((p) => !p.is_active).length
  const totalLinked =
    Object.values(appDetailCountMap).reduce((a, b) => a + b, 0) +
    Object.values(participantCountMap).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-8 pb-12">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Master Posisi
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola data posisi dan divisi penempatan magang bagi pemohon dan peserta REDIGMA.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Total Posisi
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{totalPositions}</span>
            <span className="text-xs text-gray-400">bidang</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Terdaftar di sistem</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Posisi Aktif
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{totalActive}</span>
            <span className="text-xs text-gray-400">tersedia</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Siap menerima peserta</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Posisi Nonaktif
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-600">{totalInactive}</span>
            <span className="text-xs text-gray-400">tertutup</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Tidak menerima kuota</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Data Terhubung
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600">{totalLinked}</span>
            <span className="text-xs text-gray-400">relasi</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Pengajuan & Peserta</div>
        </div>
      </div>

      {/* Main Interactive Manager */}
      <PositionManager
        initialPositions={positions}
        queryParam={query}
        statusParam={filterStatus}
      />
    </div>
  )
}
