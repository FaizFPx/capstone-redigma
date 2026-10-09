export type ApplicationType = 'PKL' | 'MAGANG_MANDIRI'

export interface Institution {
  id: string
  name: string
  type: string
  is_active?: boolean
}

export interface Major {
  id: string
  name: string
  code?: string | null
  is_active?: boolean
}

export interface Position {
  id: string
  name: string
  is_active?: boolean
}

export interface UserSummary {
  id: string
  full_name: string
  email: string
  role?: string
}

export interface Stage {
  id: string
  name: string
}

export interface Decision {
  id: string
  name: string
}

export interface ApplicationDetailItem {
  id?: string
  major_id?: string | null
  requested_position_id?: string | null
  requested_quota?: number | null
  approved_quota?: number | null
  notes?: string | null
  // Relational joins
  major?: Major | null
  position?: Position | null
}

export interface ApplicationItem {
  id: string
  application_type: ApplicationType
  institution_id: string
  apply_date: string
  pic_hc_id?: string | null
  stage_id: string
  decision_id: string
  kop_letter_number?: string | null
  confirmation_deadline?: string | null
  confirmation_date?: string | null
  proposed_start_date?: string | null
  proposed_end_date?: string | null
  approved_start_date?: string | null
  approved_end_date?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
  // Joins
  institution?: Institution | null
  pic_user?: UserSummary | null
  stage?: Stage | null
  decision?: Decision | null
  details?: ApplicationDetailItem[]
}
