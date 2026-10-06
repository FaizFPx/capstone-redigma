import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PesertaView } from '@/components/peserta/peserta-view'
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

  // Ambil referensi status magang, posisi, dan institusi
  const [
    { data: statusesData },
    { data: positionsData },
    { data: institutionsData },
    { data: rawParticipants, error },
  ] = await Promise.all([
    supabase
      .from('internship_statuses')
      .select('id, name, is_active_intern')
      .order('id'),
    supabase.from('positions').select('id, name').order('name'),
    supabase.from('institutions').select('id, name, type').order('name'),
    supabase
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
      .order('created_at', { ascending: false }),
  ])

  const statuses: InternshipStatus[] = statusesData || []
  const participants: ParticipantItem[] =
    (rawParticipants as unknown as ParticipantItem[]) || []

  return (
    <div className="space-y-6">
      {/* Toast Notifikasi Sukses Hapus */}
      {params.success === 'deleted' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
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
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Tambah Peserta
        </Link>
      </div>

      {/* Error alert jika query gagal */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal memuat data peserta: {error.message}
        </div>
      )}

      {/* Tampilan Interaktif Peserta */}
      <PesertaView
        initialParticipants={participants}
        statuses={statuses}
        initialQuery={query}
        initialInstitution={filterInstitution}
        initialPosition={filterPosition}
        initialStatus={filterStatus}
      />
    </div>
  )
}
