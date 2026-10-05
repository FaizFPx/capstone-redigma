export interface InstitutionTypeOption {
  value: string
  label: string
}

export const INSTITUTION_TYPES: readonly InstitutionTypeOption[] = [
  { value: 'SMK', label: 'SMK (Sekolah Menengah Kejuruan)' },
  { value: 'UNIVERSITAS', label: 'Universitas' },
  { value: 'POLITEKNIK', label: 'Politeknik' },
  { value: 'INSTITUT', label: 'Institut' },
  { value: 'SEKOLAH_TINGGI', label: 'Sekolah Tinggi' },
  { value: 'AKADEMI', label: 'Akademi' },
  { value: 'PESANTREN', label: 'Pesantren' },
  { value: 'LAINNYA', label: 'Lainnya' },
] as const
