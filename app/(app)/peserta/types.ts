import type { Institution, Major, Position, ApplicationType } from '../pengajuan/types'

export interface InternshipStatus {
  id: string
  name: string
  is_active_intern: boolean
  description?: string | null
}

export interface ParticipantItem {
  id: string
  application_id: string
  application_detail_id?: string | null
  major_id?: string | null
  name: string
  email?: string | null
  phone?: string | null
  positioning_by_request_id?: string | null
  positioning_by_hc_id?: string | null
  actual_start_date?: string | null
  actual_end_date?: string | null
  status_id: string
  notes?: string | null
  created_at: string
  updated_at: string

  // Joins
  application?: {
    id: string
    application_type: ApplicationType
    apply_date: string
    kop_letter_number?: string | null
    institution?: Institution | null
  } | null
  application_detail?: {
    id: string
    requested_quota?: number | null
    approved_quota?: number | null
    major?: Major | null
    position?: Position | null
  } | null
  major?: Major | null
  position_requested?: Position | null
  position_assigned?: Position | null
  status?: InternshipStatus | null
}

export interface ApplicationOption {
  id: string
  application_type: ApplicationType
  apply_date: string
  kop_letter_number?: string | null
  institution?: {
    id: string
    name: string
    type: string
  } | null
}
