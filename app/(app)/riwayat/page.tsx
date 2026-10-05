import { createClient } from '@/lib/supabase/server'
import { HistoryManager } from '@/components/riwayat/history-manager'
import type { StatusLogItem, RiwayatKPI } from './types'

export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    stage?: string
    decision?: string
    type?: string
  }>
}) {
  const params = await searchParams
  const query = (params.q || '').trim()
  const filterStage = (params.stage || 'ALL').trim()
  const filterDecision = (params.decision || 'ALL').trim()
  const filterType = (params.type || 'ALL').trim()

  const supabase = await createClient()

  // 1. Fetch reference maps for stages and decisions
  const [{ data: rawStages }, { data: rawDecisions }] = await Promise.all([
    supabase.from('application_stages').select('id, name'),
    supabase.from('application_decisions').select('id, name'),
  ])

  const stageMap: Record<string, string> = Object.fromEntries(
    (rawStages || []).map((s) => [s.id, s.name])
  )
  const decisionMap: Record<string, string> = Object.fromEntries(
    (rawDecisions || []).map((d) => [d.id, d.name])
  )

  // 2. Fetch application_status_logs with relations
  const { data: rawLogs, error: logsError } = await supabase
    .from('application_status_logs')
    .select(
      `
      id,
      application_id,
      previous_stage_id,
      new_stage_id,
      previous_decision_id,
      new_decision_id,
      changed_by_user_id,
      change_notes,
      created_at,
      application:applications!application_id (
        id,
        application_type,
        kop_letter_number,
        apply_date,
        institution:institutions!institution_id ( id, name, type )
      ),
      changed_by:users!changed_by_user_id ( id, full_name, email )
    `
    )
    .order('created_at', { ascending: false })

  if (logsError) {
    console.error('Error fetching application_status_logs:', logsError)
  }

  const logs: StatusLogItem[] = (rawLogs || []).map((row: any) => {
    const app = Array.isArray(row.application) ? row.application[0] : row.application
    const inst = app?.institution
      ? Array.isArray(app.institution)
        ? app.institution[0]
        : app.institution
      : null
    const changedBy = Array.isArray(row.changed_by) ? row.changed_by[0] : row.changed_by

    return {
      id: row.id,
      application_id: row.application_id,
      previous_stage_id: row.previous_stage_id,
      new_stage_id: row.new_stage_id,
      previous_decision_id: row.previous_decision_id,
      new_decision_id: row.new_decision_id,
      changed_by_user_id: row.changed_by_user_id,
      change_notes: row.change_notes,
      created_at: row.created_at,
      application: app
        ? {
            id: app.id,
            application_type: app.application_type,
            kop_letter_number: app.kop_letter_number,
            apply_date: app.apply_date,
            institution: inst
              ? {
                  id: inst.id,
                  name: inst.name,
                  type: inst.type,
                }
              : null,
          }
        : null,
      changed_by: changedBy
        ? {
            id: changedBy.id,
            full_name: changedBy.full_name,
            email: changedBy.email,
          }
        : null,
    }
  })

  // 3. Compute KPI Metrics
  const uniqueApps = new Set(logs.map((l) => l.application_id))
  const stageChangesCount = logs.filter(
    (l) => l.previous_stage_id && l.previous_stage_id !== l.new_stage_id
  ).length
  const decisionChangesCount = logs.filter(
    (l) => l.new_decision_id && l.new_decision_id !== 'dalam_proses'
  ).length

  const kpi: RiwayatKPI = {
    totalLogs: logs.length,
    stageChanges: stageChangesCount,
    decisionChanges: decisionChangesCount,
    linkedApplications: uniqueApps.size,
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Riwayat Status & Audit Log
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Jejak historis perubahan tahapan proses, keputusan magang, dan catatan PIC Human Capital.
        </p>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Total Riwayat
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{kpi.totalLogs}</span>
            <span className="text-xs text-gray-400">aktivitas</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Tercatat di sistem</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Perubahan Tahap
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{kpi.stageChanges}</span>
            <span className="text-xs text-gray-400">transisi</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Proses seleksi bergulir</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Keputusan Dibuat
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{kpi.decisionChanges}</span>
            <span className="text-xs text-gray-400">keputusan</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Diterima / Ditolak</div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Pengajuan Terkait
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-600">{kpi.linkedApplications}</span>
            <span className="text-xs text-gray-400">berkas</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">Memiliki histori status</div>
        </div>
      </div>

      {/* Main Interactive History Manager */}
      <HistoryManager
        initialLogs={logs}
        stageMap={stageMap}
        decisionMap={decisionMap}
        queryParam={query}
        stageParam={filterStage}
        decisionParam={filterDecision}
        typeParam={filterType}
      />
    </div>
  )
}
