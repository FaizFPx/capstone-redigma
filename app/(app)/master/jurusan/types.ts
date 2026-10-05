export interface MajorItem {
  id: string
  name: string
  code: string | null
  institution_level: string | null
  is_active: boolean
  created_at: string
  application_details_count?: number
  participants_count?: number
  total_references?: number
}

export interface MajorActionResponse {
  success?: boolean
  error?: string
  data?: MajorItem
}
