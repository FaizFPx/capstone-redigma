export interface DashboardKPI {
  // Pengajuan
  totalApplications: number
  newApplications: number
  inProcessApplications: number
  approvedApplications: number

  // Peserta
  totalParticipants: number
  notStartedParticipants: number
  activeParticipants: number
  completedParticipants: number
}

export interface DashboardAttentionItem {
  id: string
  application_type: string
  kop_letter_number: string | null
  apply_date: string
  confirmation_deadline: string | null
  stage_id: string
  decision_id: string
  institution?: {
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
  urgencyType: 'OVERDUE' | 'UPCOMING' | 'UNHANDLED' | 'IN_PROCESS'
  urgencyLabel: string
  daysDifference: number | null
}

export interface RecentApplicationItem {
  id: string
  application_type: string
  apply_date: string
  kop_letter_number: string | null
  stage_id: string
  decision_id: string
  created_at: string
  institution?: {
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
  totalQuota: number
}

export interface RecentParticipantItem {
  id: string
  name: string
  email: string | null
  actual_start_date: string | null
  status_id: string
  created_at: string
  status?: {
    id: string
    name: string
  } | null
  institutionName?: string | null
  positionName?: string | null
}

export interface ActiveInternItem {
  id: string
  name: string
  institutionName: string | null
  majorName: string | null
  positionName: string | null
  actual_end_date: string | null
}
