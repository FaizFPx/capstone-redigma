export interface MonitoringKPI {
  // Pengajuan KPI
  totalApplications: number
  newApplications: number // belum_ditanggapi
  inProcessApplications: number // dalam_proses
  approvedApplications: number // diterima
  rejectedApplications: number // ditolak

  // Peserta KPI
  totalParticipants: number
  notStartedParticipants: number // belum_mulai
  activeParticipants: number // sedang_magang
  completedParticipants: number // sudah_selesai
  withdrawnParticipants: number // mengundurkan_diri
}

export interface UrgentApplicationItem {
  id: string
  application_type: string
  apply_date: string
  confirmation_deadline: string | null
  kop_letter_number: string | null
  stage_id: string
  decision_id: string
  institution: {
    id: string
    name: string
    type: string
  } | null
  stage?: {
    id: string
    name: string
  } | null
  decision?: {
    id: string
    name: string
  } | null
  urgencyType: 'OVERDUE' | 'UPCOMING_DEADLINE' | 'UNHANDLED' | 'IN_PROCESS'
  urgencyLabel: string
  daysDifference: number | null
}

export interface MonitoringParticipantItem {
  id: string
  name: string
  email: string | null
  phone: string | null
  actual_start_date: string | null
  actual_end_date: string | null
  status_id: string
  notes: string | null
  application: {
    id: string
    application_type: string
    kop_letter_number: string | null
    institution: {
      id: string
      name: string
      type: string
    } | null
  } | null
  major?: {
    id: string
    name: string
  } | null
  position?: {
    id: string
    name: string
  } | null
  status?: {
    id: string
    name: string
    is_active_intern: boolean
  } | null
}

export interface MonitoringApplicationItem {
  id: string
  application_type: string
  apply_date: string
  stage_id: string
  decision_id: string
  kop_letter_number: string | null
  confirmation_deadline: string | null
  proposed_start_date: string | null
  proposed_end_date: string | null
  approved_start_date: string | null
  approved_end_date: string | null
  created_at: string
  institution: {
    id: string
    name: string
    type: string
  } | null
  stage?: {
    id: string
    name: string
  } | null
  decision?: {
    id: string
    name: string
  } | null
  total_requested_quota: number
  total_approved_quota: number
}
