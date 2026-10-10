import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApplicationForm } from '@/components/pengajuan/application-form'
import type {
  ApplicationItem,
  Institution,
  Major,
  Position,
  UserSummary,
  Stage,
  Decision,
} from '../../types'

export default async function EditPengajuanPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Ambil data pengajuan existing beserta rincian
  const { data: rawApp, error } = await supabase
    .from('applications')
    .select(
      `
      id,
      application_type,
      institution_id,
      apply_date,
      pic_hc_id,
      stage_id,
      decision_id,
      kop_letter_number,
      confirmation_deadline,
      confirmation_date,
      proposed_start_date,
      proposed_end_date,
      approved_start_date,
      approved_end_date,
      notes,
      created_at,
      updated_at,
      details:application_details (
        id,
        major_id,
        requested_position_id,
        requested_quota,
        approved_quota,
        notes
      )
    `
    )
    .eq('id', id)
    .single()

  if (error || !rawApp) {
    notFound()
  }

  const app = rawApp as unknown as ApplicationItem

  // Ambil seluruh data master pendukung untuk formulir
  const [
    { data: instData },
    { data: majorData },
    { data: posData },
    { data: userData },
    { data: stageData },
    { data: decData },
  ] = await Promise.all([
    supabase.from('institutions').select('id, name, type').order('name'),
    supabase.from('majors').select('id, name, code, is_active').order('name'),
    supabase.from('positions').select('id, name, is_active').order('name'),
    supabase.from('users').select('id, full_name, email, role').order('full_name'),
    supabase.from('application_stages').select('id, name').order('sequence_order'),
    supabase.from('application_decisions').select('id, name'),
  ])

  const institutions: Institution[] = instData || []
  const majors: Major[] = majorData || []
  const positions: Position[] = posData || []
  const users: UserSummary[] = userData || []
  const stages: Stage[] = stageData || []
  const decisions: Decision[] = decData || []

  return (
    <div className="space-y-6">
      {/* Header Edit */}
      <div className="flex items-center gap-3">
        <Link
          href={`/pengajuan/${app.id}`}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Kembali ke detail pengajuan"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Pengajuan Magang</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Perbarui informasi dokumen, keputusan, dan rincian alokasi kuota.
          </p>
        </div>
      </div>

      <ApplicationForm
        initialData={app}
        institutions={institutions}
        majors={majors}
        positions={positions}
        users={users}
        stages={stages}
        decisions={decisions}
        isEdit={true}
      />
    </div>
  )
}
