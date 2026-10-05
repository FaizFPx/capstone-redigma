export interface StatusLogItem {
  id: string
  application_id: string
  previous_stage_id: string | null
  new_stage_id: string | null
  previous_decision_id: string | null
  new_decision_id: string | null
  changed_by_user_id: string | null
  change_notes: string | null
  created_at: string
  application?: {
    id: string
    application_type: string
    kop_letter_number: string | null
    apply_date: string
    institution?: {
      id: string
      name: string
      type: string
    } | null
  } | null
  changed_by?: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

export interface RiwayatKPI {
  totalLogs: number
  stageChanges: number
  decisionChanges: number
  linkedApplications: number
}
