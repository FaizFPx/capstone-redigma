/**
 * REDIGMA Magang - Date Utility
 * Standardized Date Formatting and Parsing for Indonesia (DD/MM/YYYY).
 * 
 * Rules:
 * - User Display / Input: DD/MM/YYYY (e.g., 15/07/2026)
 * - Database / Internal: YYYY-MM-DD (e.g., 2026-07-15)
 */

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return days[month - 1]
}

/**
 * Parses user input in DD/MM/YYYY or DD-MM-YYYY format to internal YYYY-MM-DD format.
 * Returns null if the date is invalid (e.g. 32/01/2026, 31/02/2026, or non-leap 29/02/2026).
 */
export function parseDateInput(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // If already in YYYY-MM-DD format
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/)
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10)
    const month = parseInt(ymdMatch[2], 10)
    const day = parseInt(ymdMatch[3], 10)
    if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12) {
      if (day >= 1 && day <= getDaysInMonth(year, month)) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      }
    }
    return null
  }

  // Standard Indonesian DD/MM/YYYY or DD-MM-YYYY format
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (!dmyMatch) return null

  const day = parseInt(dmyMatch[1], 10)
  const month = parseInt(dmyMatch[2], 10)
  const year = parseInt(dmyMatch[3], 10)

  if (year < 1900 || year > 2100) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > getDaysInMonth(year, month)) return null

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Formats YYYY-MM-DD string, ISO timestamp, or Date object to DD/MM/YYYY.
 * If input is null, undefined, or empty, returns fallback (default: '-').
 * Direct string parsing avoids timezone offsets for DATE-only columns.
 */
export function formatDate(
  dateInput: string | Date | null | undefined,
  fallback = '-'
): string {
  if (!dateInput) return fallback

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim()
    if (!trimmed) return fallback

    // If string starts with YYYY-MM-DD
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
      const [, y, m, d] = match
      return `${d}/${m}/${y}`
    }

    // If string is already DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (dmyMatch) {
      return trimmed
    }
  }

  // Fallback for Date objects or ISO strings
  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return fallback
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return fallback
  }
}

/**
 * Formats ISO timestamp or Date object to DD/MM/YYYY, HH:mm.
 */
export function formatDateTime(
  dateInput: string | Date | null | undefined,
  fallback = '-'
): string {
  if (!dateInput) return fallback

  try {
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return fallback
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${day}/${month}/${year}, ${hours}:${minutes}`
  } catch {
    return fallback
  }
}

/**
 * Formats internal YYYY-MM-DD value to DD/MM/YYYY for pre-filling input fields.
 * If empty or null, returns empty string.
 */
export function formatDateForInput(dateInput: string | null | undefined): string {
  if (!dateInput) return ''
  return formatDate(dateInput, '')
}

/**
 * Validates that endDate >= startDate.
 * Accepts either DD/MM/YYYY or YYYY-MM-DD strings.
 */
export function isValidDateRange(
  startDateStr: string | null | undefined,
  endDateStr: string | null | undefined
): boolean {
  if (!startDateStr || !endDateStr) return true

  const startYmd = parseDateInput(startDateStr)
  const endYmd = parseDateInput(endDateStr)

  if (!startYmd || !endYmd) return false

  return endYmd >= startYmd
}

export type RemainingUrgency =
  | 'NORMAL'
  | 'WARNING_LOW'
  | 'WARNING_HIGH'
  | 'TODAY'
  | 'OVERDUE'
  | 'NONE'

/**
 * Calculates remaining days from today until target date.
 * Uses UTC date values to prevent local timezone / DST offset issues.
 * Returns:
 * - positive integer: days remaining in future
 * - 0: target date is today
 * - negative integer: days overdue
 * - null: invalid or empty date
 */
export function calculateRemainingDays(
  dateInput: string | Date | null | undefined,
  referenceDate?: Date
): number | null {
  if (!dateInput) return null

  let year: number
  let month: number // 1-12
  let day: number

  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim()
    if (!trimmed) return null

    // Check YYYY-MM-DD
    const ymdMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
    if (ymdMatch) {
      year = parseInt(ymdMatch[1], 10)
      month = parseInt(ymdMatch[2], 10)
      day = parseInt(ymdMatch[3], 10)
    } else {
      // Check DD/MM/YYYY or DD-MM-YYYY
      const dmyMatch = trimmed.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/)
      if (dmyMatch) {
        day = parseInt(dmyMatch[1], 10)
        month = parseInt(dmyMatch[2], 10)
        year = parseInt(dmyMatch[3], 10)
      } else {
        const parsed = new Date(trimmed)
        if (isNaN(parsed.getTime())) return null
        year = parsed.getFullYear()
        month = parsed.getMonth() + 1
        day = parsed.getDate()
      }
    }
  } else if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) return null
    year = dateInput.getFullYear()
    month = dateInput.getMonth() + 1
    day = dateInput.getDate()
  } else {
    return null
  }

  const now = referenceDate || new Date()
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const targetUtc = Date.UTC(year, month - 1, day)

  const diffMs = targetUtc - todayUtc
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Formats remaining days and assigns urgency level:
 * - > 30 hari: normal ("X hari lagi")
 * - 8–30 hari: peringatan ringan ("X hari lagi")
 * - 1–7 hari: peringatan tinggi ("X hari lagi")
 * - 0 hari: berakhir hari ini ("Hari ini")
 * - < 0 hari: sudah berakhir ("Lewat X hari")
 * - null: "-"
 */
export function getRemainingDaysInfo(days: number | null): {
  text: string
  urgency: RemainingUrgency
} {
  if (days === null) {
    return { text: '-', urgency: 'NONE' }
  }

  if (days > 30) {
    return { text: `${days} hari lagi`, urgency: 'NORMAL' }
  }
  if (days >= 8) {
    return { text: `${days} hari lagi`, urgency: 'WARNING_LOW' }
  }
  if (days >= 1) {
    return { text: `${days} hari lagi`, urgency: 'WARNING_HIGH' }
  }
  if (days === 0) {
    return { text: 'Hari ini', urgency: 'TODAY' }
  }
  return { text: `Lewat ${Math.abs(days)} hari`, urgency: 'OVERDUE' }
}

/**
 * Evaluates whether remaining days matches a given filter option:
 * - ALL: Semua
 * - LE_7: <= 7 hari (>= 0 && <= 7)
 * - LE_14: <= 14 hari (>= 0 && <= 14)
 * - LE_30: <= 30 hari (>= 0 && <= 30)
 * - GT_30: > 30 hari (> 30)
 * - OVERDUE: Sudah berakhir (< 0)
 * Note: null days are excluded from all numeric/overdue filters.
 */
export function matchesRemainingDaysFilter(
  remainingDays: number | null,
  filterValue: string
): boolean {
  if (!filterValue || filterValue === 'ALL') return true
  if (remainingDays === null) return false

  switch (filterValue) {
    case 'LE_7':
      return remainingDays >= 0 && remainingDays <= 7
    case 'LE_14':
      return remainingDays >= 0 && remainingDays <= 14
    case 'LE_30':
      return remainingDays >= 0 && remainingDays <= 30
    case 'GT_30':
      return remainingDays > 30
    case 'OVERDUE':
      return remainingDays < 0
    default:
      return true
  }
}

