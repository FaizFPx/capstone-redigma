import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/date'
import type {
  MonitoringKPI,
  UrgentApplicationItem,
  MonitoringParticipantItem,
  MonitoringApplicationItem,
} from './types'

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string
    q?: string
    type?: string
    stage?: string
    decision?: string
    status?: string
    institution?: string
    major?: string
    position?: string
    remaining?: string
  }>
}) {
  const params = await searchParams
  const activeTab = params.tab || 'all'
  const query = (params.q || '').trim()
  const filterType = (params.type || 'ALL').trim()
  const filterStage = (params.stage || 'ALL').trim()
  const filterDecision = (params.decision || 'ALL').trim()
  const filterStatus = (params.status || 'ALL').trim()
  const filterInstitution = (params.institution || 'ALL').trim()
  const filterMajor = (params.major || 'ALL').trim()
  const filterPosition = (params.position || 'ALL').trim()
  const filterRemaining = (params.remaining || 'ALL').trim()

  const supabase = await createClient()

  // 1. Fetch applications
  let appDbQuery = supabase
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

  if (filterType !== 'ALL') {
    appDbQuery = appDbQuery.eq('application_type', filterType)
  }
  if (filterStage !== 'ALL') {
    appDbQuery = appDbQuery.eq('stage_id', filterStage)
  }
  if (filterDecision !== 'ALL') {
    appDbQuery = appDbQuery.eq('decision_id', filterDecision)
  }

  // 2. Fetch participants
  let partDbQuery = supabase
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
      major:majors!major_id ( id, name ),
      position_hc:positions!positioning_by_hc_id ( id, name ),
      position_req:positions!positioning_by_request_id ( id, name ),
      status:internship_statuses!status_id ( id, name, is_active_intern )
    `
    )
    .order('created_at', { ascending: false })

  if (filterStatus !== 'ALL') {
    partDbQuery = partDbQuery.eq('status_id', filterStatus)
  }

  const [
    { data: rawApps },
    { data: rawParticipants },
    { data: institutionsData },
    { data: majorsData },
    { data: positionsData },
  ] = await Promise.all([
    appDbQuery,
    partDbQuery,
    supabase.from('institutions').select('id, name').order('name'),
    supabase.from('majors').select('id, name').order('name'),
    supabase.from('positions').select('id, name').order('name'),
  ])

  const allApps: any[] = rawApps || []
  const allParts: any[] = rawParticipants || []
  const filterInstitutions: Array<{ id: string; name: string }> = institutionsData || []
  const filterMajors: Array<{ id: string; name: string }> = majorsData || []
  const filterPositions: Array<{ id: string; name: string }> = positionsData || []

  // 3. Compute KPI
  const kpi: MonitoringKPI = {
    totalApplications: allApps.length,
    newApplications: allApps.filter((a) => a.stage_id === 'belum_ditanggapi').length,
    inProcessApplications: allApps.filter((a) => a.decision_id === 'dalam_proses').length,
    approvedApplications: allApps.filter((a) => a.decision_id === 'diterima').length,
    rejectedApplications: allApps.filter((a) => a.decision_id === 'ditolak').length,

    totalParticipants: allParts.length,
    notStartedParticipants: allParts.filter((p) => p.status_id === 'belum_mulai').length,
    activeParticipants: allParts.filter((p) => p.status_id === 'sedang_magang').length,
    completedParticipants: allParts.filter((p) => p.status_id === 'sudah_selesai').length,
    withdrawnParticipants: allParts.filter((p) => p.status_id === 'mengundurkan_diri').length,
  }

  // 4. Calculate Urgent Applications
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const urgentApplications: UrgentApplicationItem[] = allApps
    .filter((app) => app.decision_id === 'dalam_proses' || app.stage_id === 'belum_ditanggapi')
    .map((app) => {
      let urgencyType: UrgentApplicationItem['urgencyType'] = 'IN_PROCESS'
      let urgencyLabel = 'Dalam Proses'
      let daysDiff: number | null = null

      if (app.confirmation_deadline) {
        const parts = app.confirmation_deadline.split('T')[0].split('-')
        if (parts.length >= 3) {
          const dYear = parseInt(parts[0], 10)
          const dMonth = parseInt(parts[1], 10) - 1
          const dDay = parseInt(parts[2], 10)
          const deadlineDate = new Date(dYear, dMonth, dDay, 0, 0, 0, 0)
          const now = new Date()
          const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
          daysDiff = Math.round((deadlineDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))

          if (daysDiff < 0) {
            urgencyType = 'OVERDUE'
            urgencyLabel = `Batas Waktu Terlewat (${Math.abs(daysDiff)} hari lalu)`
          } else if (daysDiff <= 7) {
            urgencyType = 'UPCOMING_DEADLINE'
            urgencyLabel = daysDiff === 0 ? 'Batas Waktu Hari Ini' : `Sisa ${daysDiff} Hari Lagi`
          }
        }
      }

      if (urgencyType === 'IN_PROCESS' && app.stage_id === 'belum_ditanggapi') {
        urgencyType = 'UNHANDLED'
        urgencyLabel = 'Belum Ditanggapi HC'
      }

      return {
        id: app.id,
        application_type: app.application_type,
        apply_date: app.apply_date,
        confirmation_deadline: app.confirmation_deadline,
        kop_letter_number: app.kop_letter_number,
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
        UPCOMING_DEADLINE: 2,
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

  // 5. Client text search filter for lists
  const filteredUrgent = urgentApplications.filter((u) => {
    if (!query) return true
    const qLower = query.toLowerCase()
    const inst = u.institution?.name?.toLowerCase() || ''
    const kop = u.kop_letter_number?.toLowerCase() || ''
    return inst.includes(qLower) || kop.includes(qLower)
  })

  // Sisa masa magang calculation helper (timezone-safe)
  const calculateRemainingDays = (endDateStr?: string | null): number | null => {
    if (!endDateStr) return null
    const parts = endDateStr.split('T')[0].split('-')
    if (parts.length < 3) return null
    const endYear = parseInt(parts[0], 10)
    const endMonth = parseInt(parts[1], 10) - 1
    const endDay = parseInt(parts[2], 10)

    const endDate = new Date(endYear, endMonth, endDay, 0, 0, 0, 0)
    const now = new Date()
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

    const diffMs = endDate.getTime() - todayDate.getTime()
    return Math.round(diffMs / (1000 * 60 * 60 * 24))
  }

  const filteredApplications: MonitoringApplicationItem[] = allApps
    .map((app) => {
      const details = app.details || []
      const reqQuota = details.reduce(
        (sum: number, d: any) => sum + (d.requested_quota || 0),
        0
      )
      const appQuota = details.reduce(
        (sum: number, d: any) => sum + (d.approved_quota || 0),
        0
      )
      return {
        id: app.id,
        application_type: app.application_type,
        apply_date: app.apply_date,
        stage_id: app.stage_id,
        decision_id: app.decision_id,
        kop_letter_number: app.kop_letter_number,
        confirmation_deadline: app.confirmation_deadline,
        proposed_start_date: app.proposed_start_date,
        proposed_end_date: app.proposed_end_date,
        approved_start_date: app.approved_start_date,
        approved_end_date: app.approved_end_date,
        created_at: app.created_at,
        institution: app.institution,
        stage: app.stage,
        decision: app.decision,
        total_requested_quota: reqQuota,
        total_approved_quota: appQuota,
      }
    })
    .filter((a) => {
      if (filterInstitution !== 'ALL' && a.institution?.id !== filterInstitution) {
        return false
      }
      if (!query) return true
      const qLower = query.toLowerCase()
      const inst = a.institution?.name?.toLowerCase() || ''
      const kop = a.kop_letter_number?.toLowerCase() || ''
      return inst.includes(qLower) || kop.includes(qLower)
    })

  const filteredParticipants: MonitoringParticipantItem[] = allParts
    .map((p) => {
      const remainingDays =
        p.status_id === 'sedang_magang'
          ? calculateRemainingDays(p.actual_end_date)
          : null
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        actual_start_date: p.actual_start_date,
        actual_end_date: p.actual_end_date,
        status_id: p.status_id,
        notes: p.notes,
        remaining_days: remainingDays,
        application: p.application,
        major: p.major,
        position: p.position_hc || p.position_req,
        status: p.status,
      }
    })
    .filter((p) => {
      // Filter Institusi
      if (
        filterInstitution !== 'ALL' &&
        p.application?.institution?.id !== filterInstitution
      ) {
        return false
      }

      // Filter Jurusan
      if (filterMajor !== 'ALL' && p.major?.id !== filterMajor) {
        return false
      }

      // Filter Posisi
      if (filterPosition !== 'ALL' && p.position?.id !== filterPosition) {
        return false
      }

      // Filter Sisa Masa Magang
      if (filterRemaining !== 'ALL') {
        if (p.status_id !== 'sedang_magang') {
          return false
        }
        const days = p.remaining_days
        if (filterRemaining === 'OVERDUE' && (days === null || days >= 0)) {
          return false
        }
        if (filterRemaining === 'TODAY' && days !== 0) {
          return false
        }
        if (
          filterRemaining === 'SEGERA' &&
          (days === null || days < 0 || days > 14)
        ) {
          return false
        }
        if (filterRemaining === 'ACTIVE' && (days === null || days <= 14)) {
          return false
        }
        if (filterRemaining === 'UNSCHEDULED' && days !== null) {
          return false
        }
      }

      if (!query) return true
      const qLower = query.toLowerCase()
      const nameMatch = p.name.toLowerCase().includes(qLower)
      const emailMatch = p.email ? p.email.toLowerCase().includes(qLower) : false
      const instMatch = p.application?.institution?.name
        ? p.application.institution.name.toLowerCase().includes(qLower)
        : false
      const majorMatch = p.major?.name
        ? p.major.name.toLowerCase().includes(qLower)
        : false
      const posMatch = p.position?.name
        ? p.position.name.toLowerCase().includes(qLower)
        : false

      return nameMatch || emailMatch || instMatch || majorMatch || posMatch
    })

  const getDecisionBadge = (id: string, name?: string) => {
    const label =
      name ||
      (id === 'diterima'
        ? 'Diterima'
        : id === 'ditolak'
        ? 'Ditolak'
        : 'Dalam Proses')
    if (id === 'diterima') {
      return (
        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 border border-green-200">
          {label}
        </span>
      )
    }
    if (id === 'ditolak') {
      return (
        <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
          {label}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
        {label}
      </span>
    )
  }

  const getStageBadge = (id: string, name?: string) => {
    const label =
      name || (id === 'sudah_ditanggapi' ? 'Sudah Ditanggapi' : 'Belum Ditanggapi')
    if (id === 'sudah_ditanggapi') {
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-200">
          {label}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 border border-gray-200">
        {label}
      </span>
    )
  }

  const getStatusBadge = (statusId: string, statusName?: string) => {
    const label =
      statusName ||
      (statusId === 'sedang_magang'
        ? 'Sedang Magang'
        : statusId === 'sudah_selesai'
        ? 'Sudah Selesai'
        : statusId === 'mengundurkan_diri'
        ? 'Mengundurkan Diri'
        : 'Belum Mulai')

    switch (statusId) {
      case 'sedang_magang':
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {label}
          </span>
        )
      case 'sudah_selesai':
        return (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            {label}
          </span>
        )
      case 'mengundurkan_diri':
        return (
          <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
            {label}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700 border border-gray-200">
            {label}
          </span>
        )
    }
  }

  const getRemainingDaysBadge = (
    days: number | null | undefined,
    statusId?: string
  ) => {
    if (statusId === 'belum_mulai') {
      return (
        <span className="text-gray-400 font-medium text-xs">-</span>
      )
    }
    if (statusId === 'sudah_selesai') {
      return (
        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
          Magang Selesai
        </span>
      )
    }
    if (statusId === 'mengundurkan_diri') {
      return (
        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 border border-gray-200">
          Mengundurkan Diri
        </span>
      )
    }
    if (days === null || days === undefined) {
      return (
        <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs text-gray-400 border border-gray-200">
          Belum Dijadwalkan
        </span>
      )
    }

    if (days < 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Lewat {Math.abs(days)} hari
        </span>
      )
    }
    if (days === 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300 animate-pulse">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Selesai Hari Ini
        </span>
      )
    }
    if (days <= 7) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Sisa {days} hari (Segera Selesai)
        </span>
      )
    }
    if (days <= 14) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50/70 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-100">
          Sisa {days} hari
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Sisa {days} hari
      </span>
    )
  }

  const getUrgencyBadge = (type: UrgentApplicationItem['urgencyType'], label: string) => {
    switch (type) {
      case 'OVERDUE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 border border-red-200">
            <svg className="h-3.5 w-3.5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {label}
          </span>
        )
      case 'UPCOMING_DEADLINE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
            <svg className="h-3.5 w-3.5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {label}
          </span>
        )
      case 'UNHANDLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
            <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {label}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 border border-gray-200">
            {label}
          </span>
        )
    }
  }

  const isFilterActive =
    query !== '' ||
    filterType !== 'ALL' ||
    filterStage !== 'ALL' ||
    filterDecision !== 'ALL' ||
    filterStatus !== 'ALL' ||
    filterInstitution !== 'ALL' ||
    filterMajor !== 'ALL' ||
    filterPosition !== 'ALL' ||
    filterRemaining !== 'ALL'

  return (
    <div className="space-y-8 pb-12">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Monitoring Magang
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Pusat pemantauan & analisis mendalam pengajuan, tenggat waktu, dan keaktifan peserta magang REDIGMA.
        </p>
      </div>

      {/* P1-5 Contextual Guidance Banner: Memperjelas Peran Monitoring */}
      <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/70 via-indigo-50/30 to-white p-4 sm:p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-600 p-2 text-white shrink-0 mt-0.5">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-950">
              Pusat Pemantauan & Analisis Magang (Monitoring)
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed">
              Fokus halaman ini adalah pelacakan berkas yang memerlukan tindak lanjut seleksi (batas waktu/deadline) dan pemantauan sisa masa magang riil peserta aktif. Gunakan filter terpadu di bawah untuk menelusuri data spesifik per institusi, jurusan, posisi, atau sisa durasi pelaksanaan.
            </p>
          </div>
        </div>
      </div>

      {/* 1. KPI Summary Cards Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {/* KPI Pengajuan Baru */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Pengajuan Baru
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              {kpi.newApplications}
            </span>
            <span className="text-xs text-gray-400">belum ditanggapi</span>
          </div>
          <div className="mt-2 text-xs text-blue-600 font-medium">
            Perlu ditindaklanjuti
          </div>
        </div>

        {/* KPI Dalam Proses */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Dalam Proses
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">
              {kpi.inProcessApplications}
            </span>
            <span className="text-xs text-gray-400">pengajuan</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Sedang ditinjau
          </div>
        </div>

        {/* KPI Diterima */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Pengajuan Diterima
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-green-600">
              {kpi.approvedApplications}
            </span>
            <span className="text-xs text-gray-400">resmi</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Total disetujui
          </div>
        </div>

        {/* KPI Peserta Belum Mulai */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Peserta Belum Mulai
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-800">
              {kpi.notStartedParticipants}
            </span>
            <span className="text-xs text-gray-400">peserta</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Menunggu periode
          </div>
        </div>

        {/* KPI Peserta Aktif */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Peserta Aktif
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">
              {kpi.activeParticipants}
            </span>
            <span className="text-xs text-gray-400">sedang magang</span>
          </div>
          <div className="mt-2 text-xs text-emerald-600 font-medium">
            Di lingkungan kerja
          </div>
        </div>

        {/* KPI Peserta Selesai */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
          <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Peserta Selesai
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">
              {kpi.completedParticipants}
            </span>
            <span className="text-xs text-gray-400">alumni</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Program tuntas
          </div>
        </div>
      </div>

      {/* Filter & Search Bar Terpadu (P1-4: Actionable Filter) */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs space-y-4">
        <form method="GET" className="space-y-3">
          <input type="hidden" name="tab" value={activeTab} />

          {/* Baris 1: Pencarian teks & Pengajuan filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {/* Search box */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Pencarian Cepat
              </label>
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Cari institusi, nomor KOP, nama peserta, jurusan..."
                autoComplete="off"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>

            {/* Filter Jenis Pengajuan */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Jenis Pengajuan
              </label>
              <select
                name="type"
                defaultValue={filterType}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ALL">Semua Jenis Pengajuan</option>
                <option value="PKL">PKL</option>
                <option value="MAGANG_MANDIRI">Magang Mandiri</option>
              </select>
            </div>

            {/* Filter Tahap */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Tahap Pengajuan
              </label>
              <select
                name="stage"
                defaultValue={filterStage}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ALL">Semua Tahap</option>
                <option value="belum_ditanggapi">Belum Ditanggapi</option>
                <option value="sudah_ditanggapi">Sudah Ditanggapi</option>
              </select>
            </div>

            {/* Filter Keputusan */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Keputusan Pengajuan
              </label>
              <select
                name="decision"
                defaultValue={filterDecision}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ALL">Semua Keputusan</option>
                <option value="dalam_proses">Dalam Proses</option>
                <option value="diterima">Diterima</option>
                <option value="ditolak">Ditolak</option>
              </select>
            </div>
          </div>

          {/* Baris 2: Filter Peserta & Sisa Waktu */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 pt-2 border-t border-gray-100">
            {/* Filter Institusi */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Institusi Asal
              </label>
              <select
                name="institution"
                defaultValue={filterInstitution}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ALL">Semua Institusi</option>
                {filterInstitutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Jurusan */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Jurusan / Program Studi
              </label>
              <select
                name="major"
                defaultValue={filterMajor}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ALL">Semua Jurusan</option>
                {filterMajors.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Posisi */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Penempatan Posisi (HC)
              </label>
              <select
                name="position"
                defaultValue={filterPosition}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ALL">Semua Posisi</option>
                {filterPositions.map((pos) => (
                  <option key={pos.id} value={pos.id}>
                    {pos.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Sisa Masa Magang */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Sisa Masa Magang
              </label>
              <select
                name="remaining"
                defaultValue={filterRemaining}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="ALL">Semua Sisa Waktu</option>
                <option value="SEGERA">Segera Selesai (≤ 14 Hari)</option>
                <option value="TODAY">Selesai Hari Ini (0 Hari)</option>
                <option value="OVERDUE">Masa Magang Lewat Batas (&lt; 0 Hari)</option>
                <option value="ACTIVE">Masih Berlangsung (&gt; 14 Hari)</option>
                <option value="UNSCHEDULED">Belum Dijadwalkan</option>
              </select>
            </div>

            {/* Filter Status Peserta & Submit Button */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-1">
                Status Peserta
              </label>
              <div className="flex gap-2">
                <select
                  name="status"
                  defaultValue={filterStatus}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="ALL">Status Peserta</option>
                  <option value="belum_mulai">Belum Mulai</option>
                  <option value="sedang_magang">Sedang Magang</option>
                  <option value="sudah_selesai">Sudah Selesai</option>
                  <option value="mengundurkan_diri">Mengundurkan Diri</option>
                </select>

                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shrink-0"
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </form>

        {isFilterActive && (
          <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-xs">
            <span className="text-gray-500 font-medium">Filter pencarian aktif.</span>
            <Link
              href={`/monitoring?tab=${activeTab}`}
              className="font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Reset Semua Filter
            </Link>
          </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <Link
            href={`/monitoring?tab=all${query ? `&q=${query}` : ''}`}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <span>Semua Ringkasan</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {kpi.totalApplications + kpi.totalParticipants}
            </span>
          </Link>

          <Link
            href={`/monitoring?tab=urgent${query ? `&q=${query}` : ''}`}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'urgent'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <span>Perlu Perhatian</span>
            {urgentApplications.length > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                {urgentApplications.length}
              </span>
            )}
          </Link>

          <Link
            href={`/monitoring?tab=peserta${query ? `&q=${query}` : ''}`}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'peserta'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <span>Peserta Magang</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {kpi.totalParticipants}
            </span>
          </Link>

          <Link
            href={`/monitoring?tab=pengajuan${query ? `&q=${query}` : ''}`}
            className={`flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
              activeTab === 'pengajuan'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <span>Daftar Pengajuan</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {kpi.totalApplications}
            </span>
          </Link>
        </nav>
      </div>

      {/* TAB CONTENT: 1. ALL / RINGKASAN */}
      {(activeTab === 'all' || activeTab === 'urgent') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <span>Pengajuan yang Memerlukan Perhatian & Tindak Lanjut</span>
                {filteredUrgent.length > 0 && (
                  <span className="rounded-full bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 text-xs font-bold">
                    {filteredUrgent.length} Butuh Tindakan
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Pengajuan yang masih dalam proses, belum ditanggapi, atau memiliki batas waktu konfirmasi dekat/terlewat.
              </p>
            </div>
            {activeTab === 'all' && urgentApplications.length > 3 && (
              <Link
                href="/monitoring?tab=urgent"
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Lihat Semua ({urgentApplications.length}) &rarr;
              </Link>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
            {filteredUrgent.length === 0 ? (
              <div className="p-8 text-center">
                <svg
                  className="mx-auto h-10 w-10 text-emerald-400 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-700">
                  Tidak ada pengajuan yang membutuhkan tindakan mendesak.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Seluruh berkas pengajuan telah ditindaklanjuti atau selesai diproses.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                  <thead className="bg-gray-50/75 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Status Urgensi</th>
                      <th className="px-4 py-3">Institusi & KOP</th>
                      <th className="px-4 py-3">Jenis</th>
                      <th className="px-4 py-3">Tgl Pengajuan</th>
                      <th className="px-4 py-3">Batas Konfirmasi</th>
                      <th className="px-4 py-3">Tahap</th>
                      <th className="px-4 py-3 text-right">Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredUrgent
                      .slice(0, activeTab === 'all' ? 5 : undefined)
                      .map((u) => (
                        <tr
                          key={u.id}
                          className="hover:bg-blue-50/40 transition-colors group"
                        >
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {getUrgencyBadge(u.urgencyType, u.urgencyLabel)}
                          </td>
                          <td className="px-4 py-3.5">
                            <Link href={`/pengajuan/${u.id}`} className="block">
                              <div className="font-medium text-gray-900 line-clamp-1 group-hover:text-blue-600">
                                {u.institution?.name || '-'}
                              </div>
                              {u.kop_letter_number && (
                                <div className="text-xs text-gray-400">
                                  KOP: {u.kop_letter_number}
                                </div>
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/pengajuan/${u.id}`} className="block">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                                  u.application_type === 'PKL'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-teal-50 text-teal-700 border border-teal-200'
                                }`}
                              >
                                {u.application_type}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">
                            <Link href={`/pengajuan/${u.id}`} className="block">
                              {formatDate(u.apply_date)}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/pengajuan/${u.id}`} className="block">
                              {u.confirmation_deadline ? (
                                <span className="font-medium text-gray-900">
                                  {formatDate(u.confirmation_deadline)}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs italic">
                                  Tidak ditentukan
                                </span>
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/pengajuan/${u.id}`} className="block">
                              {getStageBadge(u.stage_id, u.stage?.name)}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-right">
                            <Link
                              href={`/pengajuan/${u.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                            >
                              <span>Tindak Lanjut</span>
                              <span>&rarr;</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB CONTENT: 2. MONITORING PESERTA (P1-4: Sisa Masa Magang & Filter Terpadu) */}
      {(activeTab === 'all' || activeTab === 'peserta') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Monitoring Status & Sisa Masa Magang Peserta
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Pemantauan sisa waktu pelaksanaan, keaktifan harian, dan posisi penempatan kerja peserta REDIGMA.
              </p>
            </div>
            {activeTab === 'all' && allParts.length > 5 && (
              <Link
                href="/monitoring?tab=peserta"
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Lihat Semua ({allParts.length}) &rarr;
              </Link>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
            {filteredParticipants.length === 0 ? (
              <div className="p-8 text-center">
                <svg
                  className="mx-auto h-10 w-10 text-gray-300 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-600">
                  Tidak ada data peserta magang yang sesuai filter.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Sesuaikan parameter pencarian atau reset filter untuk menampilkan peserta.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                  <thead className="bg-gray-50/75 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Nama Peserta</th>
                      <th className="px-4 py-3">Institusi</th>
                      <th className="px-4 py-3">Jurusan</th>
                      <th className="px-4 py-3">Penempatan Posisi (HC)</th>
                      <th className="px-4 py-3">Periode Magang</th>
                      <th className="px-4 py-3">Sisa Masa Magang</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredParticipants
                      .slice(0, activeTab === 'all' ? 5 : undefined)
                      .map((p) => (
                        <tr
                          key={p.id}
                          className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                        >
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/peserta/${p.id}`} className="block">
                              <div className="font-semibold text-gray-900 group-hover:text-blue-600">
                                {p.name}
                              </div>
                              {p.email && (
                                <div className="text-xs text-gray-400">
                                  {p.email}
                                </div>
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5">
                            <Link href={`/peserta/${p.id}`} className="block">
                              <div className="text-gray-900 line-clamp-1 font-medium">
                                {p.application?.institution?.name || '-'}
                              </div>
                              <div className="text-xs text-gray-400">
                                {p.application?.application_type || '-'}
                              </div>
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-gray-700">
                            <Link href={`/peserta/${p.id}`} className="block">
                              {p.major?.name || '-'}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-gray-700">
                            <Link href={`/peserta/${p.id}`} className="block">
                              {p.position?.name || '-'}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/peserta/${p.id}`} className="block">
                              {p.actual_start_date && p.actual_end_date ? (
                                <div className="text-xs text-gray-700">
                                  <span>{formatDate(p.actual_start_date)}</span>
                                  <span className="text-gray-400 mx-1">s/d</span>
                                  <span>{formatDate(p.actual_end_date)}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">Belum dijadwalkan</span>
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/peserta/${p.id}`} className="block">
                              {getRemainingDaysBadge(p.remaining_days, p.status_id)}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/peserta/${p.id}`} className="block">
                              {getStatusBadge(p.status_id, p.status?.name)}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-right">
                            <Link
                              href={`/peserta/${p.id}`}
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                            >
                              Lihat &rarr;
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB CONTENT: 3. DAFTAR PENGAJUAN */}
      {(activeTab === 'all' || activeTab === 'pengajuan') && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Daftar & Status Pengajuan Magang
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Monitoring status alur penerimaan berkas, kuota disetujui, dan akses tindak lanjut seleksi.
              </p>
            </div>
            {activeTab === 'all' && allApps.length > 5 && (
              <Link
                href="/monitoring?tab=pengajuan"
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Lihat Semua ({allApps.length}) &rarr;
              </Link>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-xs overflow-hidden">
            {filteredApplications.length === 0 ? (
              <div className="p-8 text-center">
                <svg
                  className="mx-auto h-10 w-10 text-gray-300 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-600">
                  Tidak ada data pengajuan yang sesuai filter.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Seluruh data pengajuan magang yang masuk akan terdata di sini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                  <thead className="bg-gray-50/75 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Institusi & KOP</th>
                      <th className="px-4 py-3">Jenis</th>
                      <th className="px-4 py-3">Tgl Pengajuan</th>
                      <th className="px-4 py-3">Batas Konfirmasi</th>
                      <th className="px-4 py-3">Kuota (Ajuan / Acc)</th>
                      <th className="px-4 py-3">Tahap</th>
                      <th className="px-4 py-3">Keputusan</th>
                      <th className="px-4 py-3 text-right">Tindak Lanjut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {filteredApplications
                      .slice(0, activeTab === 'all' ? 5 : undefined)
                      .map((app) => (
                        <tr
                          key={app.id}
                          className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                        >
                          <td className="px-4 py-3.5">
                            <Link href={`/pengajuan/${app.id}`} className="block">
                              <div className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-1">
                                {app.institution?.name || '-'}
                              </div>
                              {app.kop_letter_number && (
                                <div className="text-xs text-gray-400">
                                  KOP: {app.kop_letter_number}
                                </div>
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/pengajuan/${app.id}`} className="block">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${
                                  app.application_type === 'PKL'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-teal-50 text-teal-700 border border-teal-200'
                                }`}
                              >
                                {app.application_type}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-gray-600">
                            <Link href={`/pengajuan/${app.id}`} className="block">
                              {formatDate(app.apply_date)}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/pengajuan/${app.id}`} className="block">
                              {app.confirmation_deadline ? (
                                <span className="font-medium text-gray-800">
                                  {formatDate(app.confirmation_deadline)}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs italic">
                                  -
                                </span>
                              )}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-gray-700">
                            <Link href={`/pengajuan/${app.id}`} className="block">
                              <span className="font-medium text-gray-900">
                                {app.total_requested_quota}
                              </span>
                              <span className="text-gray-400 mx-1">/</span>
                              <span className="font-medium text-green-600">
                                {app.total_approved_quota}
                              </span>
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/pengajuan/${app.id}`} className="block">
                              {getStageBadge(app.stage_id, app.stage?.name)}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <Link href={`/pengajuan/${app.id}`} className="block">
                              {getDecisionBadge(app.decision_id, app.decision?.name)}
                            </Link>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-right">
                            <Link
                              href={`/pengajuan/${app.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                            >
                              <span>Detail</span>
                              <span>&rarr;</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
