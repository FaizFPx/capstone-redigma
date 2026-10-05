export interface InstitutionItem {
  id: string
  name: string
  type: string
  address: string | null
  contact_email: string | null
  contact_phone: string | null
  created_at: string
  updated_at: string
  applications_count?: number
}

export interface InstitutionActionResponse {
  success?: boolean
  error?: string
  data?: InstitutionItem
}
