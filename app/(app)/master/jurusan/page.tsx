import { createClient } from '@/lib/supabase/server'
import { MajorManager } from '@/components/master/major-manager'
import type { MajorItem } from './types'

export default async function MasterJurusanPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    level?: string
  }>
}) {
  const params = await searchParams
  const query = (params.q || '').trim()
  const filterLevel = (params.level || 'ALL').trim()

  const supabase = await createClient()

  // 1. Fetch all majors
  let dbQuery = supabase
    .from('majors')
    .select('id, name, code, institution_level, is_active, created_at')
    .order('created_at', { ascending: false })

  if (filterLevel !== 'ALL') {
    dbQuery = dbQuery.eq('institution_level', filterLevel)
  }

  // 2. Fetch references to count dependencies safely
  const [
    { data: rawMajors, error: majorsError },
    { data: rawAppDetails },
    { data: rawParticipants },
  ] = await Promise.all([
    dbQuery,
    supabase.from('application_details').select('id, major_id'),
    supabase.from('participants').select('id, major_id'),
  ])

  if (majorsError) {
    console.error('Error fetching majors:', majorsError)
  }

  // Compute application_details count map
  const appDetailCountMap: Record<string, number> = {}
  if (rawAppDetails) {
    for (const item of rawAppDetails) {
      if (item.major_id) {
        appDetailCountMap[item.major_id] = (appDetailCountMap[item.major_id] || 0) + 1
      }
    }
  }

  // Compute participants count map
  const participantCountMap: Record<string, number> = {}
  if (rawParticipants) {
    for (const item of rawParticipants) {
      if (item.major_id) {
        participantCountMap[item.major_id] = (participantCountMap[item.major_id] || 0) + 1
      }
    }
  }

  const majors: MajorItem[] = (rawMajors || []).map((m) => ({
    ...m,
    application_details_count: appDetailCountMap[m.id] || 0,
    participants_count: participantCountMap[m.id] || 0,
  }))

  // KPI Metrics
  const totalMajors = majors.length
  const totalSmk = majors.filter((m) => m.institution_level?.toUpperCase() === 'SMK').length
  const totalHigherEdu = majors.filter((m) =>
    ['D3', 'D4', 'S1', 'S2'].includes(m.institution_level?.toUpperCase() || '')
  ).length
  const totalLinked =
    Object.values(appDetailCountMap).reduce((a, b) => a + b, 0) +
    Object.values(participantCountMap).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-8 pb-12">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Master Jurusan
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola data jurusan, program studi, dan kompetensi keahlian pemohon magang REDIGMA.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Total Jurusan
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{totalMajors}</span>
            <span className="text-xs text-gray-400">program</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Terdaftar di sistem</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Jenjang SMK
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600">{totalSmk}</span>
            <span className="text-xs text-gray-400">keahlian</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Program kejuruan</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Perguruan Tinggi
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{totalHigherEdu}</span>
            <span className="text-xs text-gray-400">prodi</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">D3 / D4 / S1 / S2</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Data Terhubung
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{totalLinked}</span>
            <span className="text-xs text-gray-400">relasi</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Pengajuan & Peserta</div>
        </div>
      </div>

      {/* Main Interactive Manager */}
      <MajorManager
        initialMajors={majors}
        queryParam={query}
        levelParam={filterLevel}
      />
    </div>
  )
}
