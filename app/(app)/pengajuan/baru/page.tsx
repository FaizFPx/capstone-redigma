import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ApplicationForm } from '@/components/pengajuan/application-form'
import type {
  Institution,
  Major,
  Position,
  UserSummary,
  Stage,
  Decision,
} from '../types'

export default async function TambahPengajuanPage() {
  const supabase = await createClient()

  // Ambil seluruh data master pendukung untuk formulir
  const [
    { data: instData },
    { data: majorData },
    { data: posData },
    { data: userData },
    { data: stageData },
    { data: decData },
  ] = await Promise.all([
    supabase.from('institutions').select('id, name, type, is_active').order('name'),
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
      {/* Header Form */}
      <div className="flex items-center gap-3">
        <Link
          href="/pengajuan"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          title="Kembali ke daftar pengajuan"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tambah Pengajuan Magang</h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Catat permohonan magang baru dari sekolah (PKL) atau pendaftaran mandiri.
          </p>
        </div>
      </div>

      <ApplicationForm
        institutions={institutions}
        majors={majors}
        positions={positions}
        users={users}
        stages={stages}
        decisions={decisions}
        isEdit={false}
      />
    </div>
  )
}
