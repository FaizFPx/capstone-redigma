import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ParticipantForm } from '@/components/peserta/participant-form'
import type { ParticipantItem, InternshipStatus, ApplicationOption } from '../../types'
import type { Major, Position } from '../../../pengajuan/types'

export default async function EditPesertaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Ambil data peserta existing beserta relasi
  const { data: rawParticipant, error } = await supabase
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
      updated_at
    `
    )
    .eq('id', id)
    .single()

  if (error || !rawParticipant) {
    notFound()
  }

  const participant = rawParticipant as unknown as ParticipantItem

  // Ambil data master pendukung untuk formulir edit
  const [
    { data: appsData },
    { data: appDetailsData },
    { data: participantsCountData },
    { data: majorsData },
    { data: positionsData },
    { data: statusesData },
  ] = await Promise.all([
    supabase
      .from('applications')
      .select(
        `
        id,
        application_type,
        apply_date,
        kop_letter_number,
        institution:institutions!institution_id ( id, name, type )
      `
      )
      .order('created_at', { ascending: false }),
    supabase
      .from('application_details')
      .select(
        `
        id,
        application_id,
        major_id,
        requested_position_id,
        requested_quota,
        approved_quota,
        major:majors!major_id ( id, name, code ),
        position:positions!requested_position_id ( id, name )
      `
      ),
    supabase.from('participants').select('id, application_detail_id'),
    supabase.from('majors').select('id, name, code').order('name'),
    supabase.from('positions').select('id, name').order('name'),
    supabase
      .from('internship_statuses')
      .select('id, name, is_active_intern')
      .order('id'),
  ])

  const applications: ApplicationOption[] = (appsData as unknown as ApplicationOption[]) || []

  // Hitung jumlah peserta yang sudah terdaftar pada setiap application_detail
  const participantCountByDetail = new Map<string, number>()
  for (const p of participantsCountData || []) {
    if (p.application_detail_id) {
      participantCountByDetail.set(
        p.application_detail_id,
        (participantCountByDetail.get(p.application_detail_id) || 0) + 1
      )
    }
  }

  const applicationDetails = (appDetailsData || []).map((det: any) => ({
    ...det,
    current_count: participantCountByDetail.get(det.id) || 0,
  }))
  const majors: Major[] = majorsData || []
  const positions: Position[] = positionsData || []
  const statuses: InternshipStatus[] = statusesData || []

  return (
    <div className="space-y-6">
      {/* Header Halaman Edit */}
      <div className="flex items-center gap-3">
        <Link
          href={`/peserta/${participant.id}`}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Kembali ke detail peserta"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Data Peserta Magang</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Perbarui informasi peserta, berkas pengajuan, penempatan, dan status keaktifan.
          </p>
        </div>
      </div>

      <ParticipantForm
        initialData={participant}
        applications={applications}
        applicationDetails={applicationDetails}
        majors={majors}
        positions={positions}
        statuses={statuses}
        isEdit={true}
      />
    </div>
  )
}
