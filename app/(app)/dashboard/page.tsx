import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/date'
import { ActiveInternsTable } from '@/components/dashboard/active-interns-table'
import { QuickStartGuide } from '@/components/dashboard/quick-start-guide'
import type {
  DashboardKPI,
  DashboardAttentionItem,
  RecentApplicationItem,
  RecentParticipantItem,
  ActiveInternItem,
} from './types'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Fetch applications with relations
  const appDbQuery = supabase
    .from('applications')
    .select(
      `
      id,
      application_type,
      apply_date,
      stage_id,
      decision_id,
      kop_letter_number,
      confirmation_deadline,
      confirmation_date,
      proposed_start_date,
      proposed_end_date,
      approved_start_date,
      approved_end_date,
      created_at,
      institution:institutions!institution_id ( id, name, type ),
      stage:application_stages!stage_id ( id, name ),
      decision:application_decisions!decision_id ( id, name ),
      details:application_details (
        id,
        requested_quota,
        approved_quota
      )
    `
    )
    .order('created_at', { ascending: false })

  // 2. Fetch participants with relations
  const partDbQuery = supabase
    .from('participants')
    .select(
      `
      id,
      application_id,
      name,
      email,
      phone,
      actual_start_date,
      actual_end_date,
      status_id,
      notes,
      created_at,
      application:applications!application_id (
        id,
        application_type,
        kop_letter_number,
        institution:institutions!institution_id ( id, name, type )
      ),
      application_detail:application_details!application_detail_id (
        id,
        major:majors!major_id ( id, name, code )
      ),
      major:majors!major_id ( id, name, code ),
      position_hc:positions!positioning_by_hc_id ( id, name ),
      position_req:positions!positioning_by_request_id ( id, name ),
      status:internship_statuses!status_id ( id, name, is_active_intern )
    `
    )
    .order('created_at', { ascending: false })

  const [{ data: rawApps, error: appsError }, { data: rawParticipants, error: partsError }] =
    await Promise.all([appDbQuery, partDbQuery])

  if (appsError) {
    console.error('Error fetching applications for dashboard:', appsError)
  }
  if (partsError) {
    console.error('Error fetching participants for dashboard:', partsError)
  }

  const allApps: any[] = rawApps || []
  const allParts: any[] = rawParticipants || []

  // 3. Compute KPI (Single source of truth matching /monitoring exactly)
  const kpi: DashboardKPI = {
    totalApplications: allApps.length,
    newApplications: allApps.filter((a) => a.stage_id === 'belum_ditanggapi').length,
    inProcessApplications: allApps.filter((a) => a.decision_id === 'dalam_proses').length,
    approvedApplications: allApps.filter((a) => a.decision_id === 'diterima').length,

    totalParticipants: allParts.length,
    notStartedParticipants: allParts.filter((p) => p.status_id === 'belum_mulai').length,
    activeParticipants: allParts.filter((p) => p.status_id === 'sedang_magang').length,
    completedParticipants: allParts.filter((p) => p.status_id === 'sudah_selesai').length,
  }

  // 4. Calculate Attention Items (Perlu Perhatian)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const attentionItems: DashboardAttentionItem[] = allApps
    .filter((app) => app.decision_id === 'dalam_proses' || app.stage_id === 'belum_ditanggapi')
    .map((app) => {
      let urgencyType: DashboardAttentionItem['urgencyType'] = 'IN_PROCESS'
      let urgencyLabel = 'Dalam Proses Seleksi'
      let daysDiff: number | null = null

      if (app.confirmation_deadline) {
        const deadline = new Date(app.confirmation_deadline)
        deadline.setHours(0, 0, 0, 0)
        const diffTime = deadline.getTime() - today.getTime()
        daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (daysDiff < 0) {
          urgencyType = 'OVERDUE'
          urgencyLabel = `Batas Waktu Terlewat (${Math.abs(daysDiff)} hari lalu)`
        } else if (daysDiff <= 7) {
          urgencyType = 'UPCOMING'
          urgencyLabel = daysDiff === 0 ? 'Batas Waktu Hari Ini' : `Sisa ${daysDiff} Hari Lagi`
        }
      }

      if (urgencyType === 'IN_PROCESS' && app.stage_id === 'belum_ditanggapi') {
        urgencyType = 'UNHANDLED'
        urgencyLabel = 'Belum Ditanggapi HC'
      }

      return {
        id: app.id,
        application_type: app.application_type,
        kop_letter_number: app.kop_letter_number,
        apply_date: app.apply_date,
        confirmation_deadline: app.confirmation_deadline,
        stage_id: app.stage_id,
        decision_id: app.decision_id,
        institution: app.institution,
        stage: app.stage,
        decision: app.decision,
        urgencyType,
        urgencyLabel,
        daysDifference: daysDiff,
      }
    })
    .sort((a, b) => {
      const priorityOrder = {
        OVERDUE: 1,
        UPCOMING: 2,
        UNHANDLED: 3,
        IN_PROCESS: 4,
      }
      const pA = priorityOrder[a.urgencyType]
      const pB = priorityOrder[b.urgencyType]
      if (pA !== pB) return pA - pB

      if (a.daysDifference !== null && b.daysDifference !== null) {
        return a.daysDifference - b.daysDifference
      }
      return new Date(a.apply_date).getTime() - new Date(b.apply_date).getTime()
    })

  // 5. Recent Applications (Top 5)
  const recentApplications: RecentApplicationItem[] = allApps.slice(0, 5).map((app) => {
    const details = app.details || []
    const totalQuota = details.reduce(
      (sum: number, d: any) => sum + (d.requested_quota || 0),
      0
    )
    return {
      id: app.id,
      application_type: app.application_type,
      apply_date: app.apply_date,
      kop_letter_number: app.kop_letter_number,
      stage_id: app.stage_id,
      decision_id: app.decision_id,
      created_at: app.created_at,
      institution: app.institution,
      stage: app.stage,
      decision: app.decision,
      totalQuota,
    }
  })

  // 6. Recent Participants (Top 5)
  const recentParticipants: RecentParticipantItem[] = allParts.slice(0, 5).map((part) => {
    return {
      id: part.id,
      name: part.name,
      email: part.email,
      actual_start_date: part.actual_start_date,
      status_id: part.status_id,
      created_at: part.created_at,
      status: part.status,
      institutionName: part.application?.institution?.name || null,
      positionName: part.position_hc?.name || part.position_req?.name || null,
    }
  })

  // 7. Active Interns (Sedang Magang) - prioritized by nearest actual_end_date
  const activeInterns: ActiveInternItem[] = allParts
    .filter((p) => p.status_id === 'sedang_magang')
    .sort((a, b) => {
      if (!a.actual_end_date && !b.actual_end_date) {
        return (a.name || '').localeCompare(b.name || '')
      }
      if (!a.actual_end_date) return 1
      if (!b.actual_end_date) return -1
      const diff =
        new Date(a.actual_end_date).getTime() -
        new Date(b.actual_end_date).getTime()
      if (diff !== 0) return diff
      return (a.name || '').localeCompare(b.name || '')
    })
    .map((part) => {
      const rawMajor = part.major || part.application_detail?.major
      const majorObj = Array.isArray(rawMajor) ? rawMajor[0] : rawMajor
      const majorName = majorObj?.code || majorObj?.name || null

      return {
        id: part.id,
        name: part.name,
        institutionName: part.application?.institution?.name || null,
        majorName,
        positionName: part.position_hc?.name || null,
        actual_end_date: part.actual_end_date || null,
      }
    })

  return (
    <div className="space-y-8 pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Dashboard Utama
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Pusat kendali, pemantauan tenggat waktu, dan aktivitas operasional magang REDIGMA.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-medium text-gray-600 shadow-xs">
          <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {today.toLocaleDateString('id-ID', { weekday: 'long' })}, {formatDate(today)}
        </div>
      </div>

      {/* Alur Pengelolaan Magang (Quick Start Guide) */}
      <QuickStartGuide totalApplications={kpi.totalApplications} />

      {/* KPI Section A: Pengajuan Magang */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Ringkasan Pengajuan Magang
          </h2>
          <Link
            href="/pengajuan"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Lihat Daftar Pengajuan &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Total Pengajuan
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-gray-900">
                {kpi.totalApplications}
              </span>
              <span className="text-xs text-gray-400">berkas</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">Seluruh berkas masuk</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Pengajuan Baru
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-amber-600">
                {kpi.newApplications}
              </span>
              <span className="text-xs text-gray-400">berkas</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">Belum ditanggapi HC</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Dalam Proses
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-blue-600">
                {kpi.inProcessApplications}
              </span>
              <span className="text-xs text-gray-400">berkas</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">Tahap seleksi / wawancara</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Pengajuan Diterima
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-emerald-600">
                {kpi.approvedApplications}
              </span>
              <span className="text-xs text-gray-400">berkas</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">Disetujui untuk magang</div>
          </div>
        </div>
      </div>

      {/* KPI Section B: Peserta Magang */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Ringkasan Peserta Magang
          </h2>
          <Link
            href="/peserta"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Lihat Daftar Peserta &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Total Peserta
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-gray-900">
                {kpi.totalParticipants}
              </span>
              <span className="text-xs text-gray-400">siswa/mhs</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">Terdaftar di database</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Belum Mulai
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-gray-600">
                {kpi.notStartedParticipants}
              </span>
              <span className="text-xs text-gray-400">orang</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">Menunggu jadwal masuk</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Sedang Magang
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-blue-600">
                {kpi.activeParticipants}
              </span>
              <span className="text-xs text-gray-400">aktif</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">Sedang menjalani magang</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
            <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Selesai Magang
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-purple-600">
                {kpi.completedParticipants}
              </span>
              <span className="text-xs text-gray-400">alumni</span>
            </div>
            <div className="mt-1 text-xs text-gray-500">Telah menyelesaikan masa magang</div>
          </div>
        </div>
      </div>

      {/* SECTION: Perlu Perhatian (Deadline & Follow-up Attention) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Perlu Perhatian</h2>
              <p className="text-xs text-gray-500">
                Pengajuan yang melewati tenggat waktu konfirmasi, mendekati deadline, atau belum ditanggapi.
              </p>
            </div>
          </div>
          {attentionItems.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
              {attentionItems.length} berkas butuh tindakan
            </span>
          )}
        </div>

        <div className="mt-4">
          {attentionItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">Kondisi Aman</h3>
              <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
                Semua pengajuan magang terkendali. Tidak ada tenggat waktu konfirmasi yang terlewat atau pengajuan yang terbengkalai.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
              {attentionItems.slice(0, 5).map((item) => {
                let badgeClass = 'bg-blue-50 text-blue-700 border-blue-200'
                if (item.urgencyType === 'OVERDUE') {
                  badgeClass = 'bg-red-50 text-red-700 border-red-200'
                } else if (item.urgencyType === 'UPCOMING') {
                  badgeClass = 'bg-amber-50 text-amber-800 border-amber-200'
                } else if (item.urgencyType === 'UNHANDLED') {
                  badgeClass = 'bg-purple-50 text-purple-700 border-purple-200'
                }

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-gray-50/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900 text-sm">
                          {item.institution?.name || 'Institusi Tanpa Nama'}
                        </span>
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                          {item.application_type}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
                        >
                          {item.urgencyLabel}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        {item.kop_letter_number && (
                          <span>Surat: {item.kop_letter_number}</span>
                        )}
                        <span>
                          Apply: {formatDate(item.apply_date)}
                        </span>
                        {item.confirmation_deadline && (
                          <span className="font-medium text-gray-700">
                            Batas Konfirmasi: {formatDate(item.confirmation_deadline)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/pengajuan/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 transition-colors"
                      >
                        Tindak Lanjut
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Peserta yang Sedang Magang */}
      <ActiveInternsTable items={activeInterns} total={kpi.activeParticipants} />

      {/* Main Grid: Recent Applications & Recent Participants */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left: Recent Applications */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">Pengajuan Terbaru</h2>
              <p className="text-xs text-gray-500">Daftar permohonan magang yang baru diterima</p>
            </div>
            <Link
              href="/pengajuan"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="mt-4">
            {recentApplications.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Belum ada pengajuan magang terdaftar.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentApplications.map((app) => (
                  <div
                    key={app.id}
                    className="group flex items-center justify-between py-3.5 transition-colors"
                  >
                    <div className="space-y-1">
                      <Link
                        href={`/pengajuan/${app.id}`}
                        className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors"
                      >
                        {app.institution?.name || 'Institusi Tanpa Nama'}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
                          {app.application_type}
                        </span>
                        <span>•</span>
                        <span>
                          {formatDate(app.apply_date)}
                        </span>
                        {app.totalQuota > 0 && (
                          <>
                            <span>•</span>
                            <span className="font-medium text-gray-700">
                              {app.totalQuota} kuota
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {app.stage?.name || app.stage_id}
                      </span>
                      <Link
                        href={`/pengajuan/${app.id}`}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                        title="Lihat Detail Pengajuan"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Participants */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">Peserta Terbaru</h2>
              <p className="text-xs text-gray-500">Data siswa dan mahasiswa magang terkini</p>
            </div>
            <Link
              href="/peserta"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Lihat Semua &rarr;
            </Link>
          </div>

          <div className="mt-4">
            {recentParticipants.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Belum ada peserta magang terdaftar.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentParticipants.map((part) => {
                  let statusBadge = 'bg-gray-100 text-gray-700'
                  if (part.status_id === 'sedang_magang') {
                    statusBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  } else if (part.status_id === 'sudah_selesai') {
                    statusBadge = 'bg-purple-50 text-purple-700 border border-purple-200'
                  } else if (part.status_id === 'belum_mulai') {
                    statusBadge = 'bg-amber-50 text-amber-700 border border-amber-200'
                  }

                  return (
                    <div
                      key={part.id}
                      className="group flex items-center justify-between py-3.5 transition-colors"
                    >
                      <div className="space-y-1">
                        <Link
                          href={`/peserta/${part.id}`}
                          className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors"
                        >
                          {part.name}
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{part.institutionName || 'Tanpa Institusi'}</span>
                          {part.positionName && (
                            <>
                              <span>•</span>
                              <span className="font-medium text-blue-600">
                                {part.positionName}
                              </span>
                            </>
                          )}
                          {part.actual_start_date && (
                            <>
                              <span>•</span>
                              <span>
                                Mulai: {formatDate(part.actual_start_date)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge}`}
                        >
                          {part.status?.name || part.status_id}
                        </span>
                        <Link
                          href={`/peserta/${part.id}`}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600 transition-colors"
                          title="Lihat Detail Peserta"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION: Quick Actions */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-gray-900">Aksi Cepat & Navigasi Modul</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Akses cepat ke alur pendaftaran, pemantauan, dan manajemen master data.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Link
            href="/pengajuan/baru"
            className="group flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-blue-600 hover:bg-blue-50/50 hover:shadow-xs"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5L19 7.5V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="mt-2.5 text-xs font-semibold text-gray-900 group-hover:text-blue-600">
              Tambah Pengajuan
            </span>
          </Link>

          <Link
            href="/peserta/baru"
            className="group flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-emerald-600 hover:bg-emerald-50/50 hover:shadow-xs"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <span className="mt-2.5 text-xs font-semibold text-gray-900 group-hover:text-emerald-600">
              Tambah Peserta
            </span>
          </Link>

          <Link
            href="/monitoring"
            className="group flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-purple-600 hover:bg-purple-50/50 hover:shadow-xs"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 transition-colors group-hover:bg-purple-600 group-hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="mt-2.5 text-xs font-semibold text-gray-900 group-hover:text-purple-600">
              Monitoring
            </span>
          </Link>

          <Link
            href="/master/institusi"
            className="group flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-blue-600 hover:bg-blue-50/50 hover:shadow-xs"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="mt-2.5 text-xs font-semibold text-gray-900 group-hover:text-blue-600">
              Master Institusi
            </span>
          </Link>

          <Link
            href="/master/jurusan"
            className="group flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-amber-600 hover:bg-amber-50/50 hover:shadow-xs"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="mt-2.5 text-xs font-semibold text-gray-900 group-hover:text-amber-600">
              Master Jurusan
            </span>
          </Link>

          <Link
            href="/master/posisi"
            className="group flex flex-col items-center justify-center rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-teal-600 hover:bg-teal-50/50 hover:shadow-xs"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-600 group-hover:text-white">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2H4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="mt-2.5 text-xs font-semibold text-gray-900 group-hover:text-teal-600">
              Master Posisi
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
