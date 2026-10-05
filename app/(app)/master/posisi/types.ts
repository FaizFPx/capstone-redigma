export interface PositionItem {
  id: string
  name: string
  is_active: boolean
  created_at: string
  application_details_count?: number
  participants_count?: number
}

export interface PositionActionResponse {
  success?: boolean
  error?: string
  data?: PositionItem
}
