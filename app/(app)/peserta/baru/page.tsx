import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ParticipantForm } from '@/components/peserta/participant-form'
import type { InternshipStatus, ApplicationOption } from '../types'
import type { Major, Position } from '../../pengajuan/types'

export default async function TambahPesertaPage() {
  const supabase = await createClient()

  // Ambil data referensi pendukung untuk form
  const [
    { data: appsData },
    { data: appDetailsData },
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
        major:majors!major_id ( id, name ),
        position:positions!requested_position_id ( id, name )
      `
      ),
    supabase.from('majors').select('id, name, code').order('name'),
    supabase.from('positions').select('id, name').order('name'),
    supabase
      .from('internship_statuses')
      .select('id, name, is_active_intern')
      .order('id'),
  ])

  const applications: ApplicationOption[] = (appsData as unknown as ApplicationOption[]) || []
  const applicationDetails = (appDetailsData as any[]) || []
  const majors: Major[] = majorsData || []
  const positions: Position[] = positionsData || []
  const statuses: InternshipStatus[] = statusesData || []

  return (
    <div className="space-y-6">
      {/* Header Halaman Tambah */}
      <div className="flex items-center gap-3">
        <Link
          href="/peserta"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Kembali ke daftar peserta"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tambah Peserta Magang</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Catat data individu siswa / mahasiswa magang yang terhubung dengan berkas pengajuan.
          </p>
        </div>
      </div>

      <ParticipantForm
        applications={applications}
        applicationDetails={applicationDetails}
        majors={majors}
        positions={positions}
        statuses={statuses}
        isEdit={false}
      />
    </div>
  )
}
