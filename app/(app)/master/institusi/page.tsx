import { createClient } from '@/lib/supabase/server'
import { InstitutionManager } from '@/components/master/institution-manager'
import type { InstitutionItem } from './types'

export default async function MasterInstitusiPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    type?: string
  }>
}) {
  const params = await searchParams
  const query = (params.q || '').trim()
  const filterType = (params.type || 'ALL').trim()

  const supabase = await createClient()

  // 1. Fetch all institutions
  let dbQuery = supabase
    .from('institutions')
    .select('id, name, type, address, contact_email, contact_phone, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (filterType !== 'ALL') {
    dbQuery = dbQuery.eq('type', filterType)
  }

  // 2. Fetch applications to count references
  const [{ data: rawInstitutions, error: instError }, { data: rawApps }] = await Promise.all([
    dbQuery,
    supabase.from('applications').select('id, institution_id'),
  ])

  if (instError) {
    console.error('Error fetching institutions:', instError)
  }

  // Compute application count map
  const appCountMap: Record<string, number> = {}
  if (rawApps) {
    for (const app of rawApps) {
      if (app.institution_id) {
        appCountMap[app.institution_id] = (appCountMap[app.institution_id] || 0) + 1
      }
    }
  }

  const institutions: InstitutionItem[] = (rawInstitutions || []).map((inst) => ({
    ...inst,
    applications_count: appCountMap[inst.id] || 0,
  }))

  // KPI Metrics
  const totalInstitutions = institutions.length
  const totalSmk = institutions.filter((i) => i.type.toUpperCase() === 'SMK').length
  const totalUniv = institutions.filter((i) =>
    ['UNIVERSITAS', 'POLITEKNIK', 'INSTITUT', 'SEKOLAH_TINGGI', 'AKADEMI'].includes(
      i.type.toUpperCase()
    )
  ).length
  const totalLinkedApps = Object.values(appCountMap).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-8 pb-12">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Master Institusi
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola data direktori sekolah menengah kejuruan dan perguruan tinggi mitra magang REDIGMA.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Total Institusi
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{totalInstitutions}</span>
            <span className="text-xs text-gray-400">mitra</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Terdaftar di sistem</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Sekolah SMK
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600">{totalSmk}</span>
            <span className="text-xs text-gray-400">sekolah</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Mitra PKL</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Perguruan Tinggi
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{totalUniv}</span>
            <span className="text-xs text-gray-400">kampus</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Universitas & Politeknik</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Pengajuan Terkait
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{totalLinkedApps}</span>
            <span className="text-xs text-gray-400">berkas</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Dalam database</div>
        </div>
      </div>

      {/* Main Interactive Manager */}
      <InstitutionManager
        initialInstitutions={institutions}
        queryParam={query}
        typeParam={filterType}
      />
    </div>
  )
}
