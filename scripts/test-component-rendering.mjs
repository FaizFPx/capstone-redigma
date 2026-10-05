import React from 'react'
import { renderToString } from 'react-dom/server'
import { DateInput } from '../components/ui/date-input.tsx'
import { parseDateInput, formatDate, formatDateForInput, isValidDateRange } from '../lib/utils/date.ts'

console.log('=== COMPONENT SSR RENDERING TEST ===')

// Test 1: DateInput with pre-filled ISO date
const html1 = renderToString(
  React.createElement(DateInput, {
    name: 'apply_date',
    defaultValue: '2026-07-15',
    required: true,
  })
)

console.log('Checking SSR output for defaultValue="2026-07-15"...')
if (!html1.includes('value="15/07/2026"')) {
  console.error('FAIL: Visible input does not contain 15/07/2026. HTML:', html1)
  process.exit(1)
}
if (!html1.includes('type="hidden" name="apply_date" value="2026-07-15"')) {
  console.error('FAIL: Hidden input does not contain name="apply_date" value="2026-07-15". HTML:', html1)
  process.exit(1)
}
if (!html1.includes('placeholder="DD/MM/YYYY"')) {
  console.error('FAIL: Input does not contain placeholder="DD/MM/YYYY". HTML:', html1)
  process.exit(1)
}
console.log('PASS: DateInput rendered 15/07/2026 in visible input and 2026-07-15 in hidden input.')

// Test 2: DateInput with confirmation deadline
const html2 = renderToString(
  React.createElement(DateInput, {
    name: 'confirmation_deadline',
    defaultValue: '2026-08-21',
  })
)

if (!html2.includes('value="21/08/2026"')) {
  console.error('FAIL: Visible input does not contain 21/08/2026. HTML:', html2)
  process.exit(1)
}
if (!html2.includes('type="hidden" name="confirmation_deadline" value="2026-08-21"')) {
  console.error('FAIL: Hidden input does not contain name="confirmation_deadline" value="2026-08-21". HTML:', html2)
  process.exit(1)
}
console.log('PASS: DateInput rendered 21/08/2026 in visible input and 2026-08-21 in hidden input.')

// Test 3: Simulation of user entering DD/MM/YYYY in form submission
console.log('\n=== SIMULATION: FORM DATA SUBMISSION FLOW ===')
function simulateDateInputFormEntry(name, userInput) {
  const parsedIso = parseDateInput(userInput)
  // In the real component, parsedIso is placed in the hidden input
  const formData = new Map()
  formData.set(name, parsedIso || '')
  return formData
}

// Case A: User enters 15/07/2026
const formA = simulateDateInputFormEntry('apply_date', '15/07/2026')
const submittedApplyDate = formA.get('apply_date')
console.log(`User input: '15/07/2026' -> FormData value submitted: '${submittedApplyDate}'`)
if (submittedApplyDate !== '2026-07-15') {
  console.error('FAIL: Submitted value should be 2026-07-15')
  process.exit(1)
}

// Server receives 2026-07-15 and stores to DB.
// Later, DB returns '2026-07-15'
const dbValue = '2026-07-15'
const displayedBack = formatDate(dbValue)
console.log(`Database stored: '${dbValue}' -> Displayed back to user: '${displayedBack}'`)
if (displayedBack !== '15/07/2026') {
  console.error('FAIL: Displayed value should be 15/07/2026')
  process.exit(1)
}
console.log('PASS: Full round-trip for 15/07/2026 verified!')

// Case B: User enters Participant dates: 01/09/2026 to 30/09/2026
console.log('\n=== TEST PARTICIPANT DATE FLOW ===')
const partStart = simulateDateInputFormEntry('actual_start_date', '01/09/2026').get('actual_start_date')
const partEnd = simulateDateInputFormEntry('actual_end_date', '30/09/2026').get('actual_end_date')
console.log(`Participant dates submitted: start='${partStart}', end='${partEnd}'`)

const isRangeValid = isValidDateRange(partStart, partEnd)
console.log(`Date range validation (actual_end >= actual_start): ${isRangeValid}`)
if (!isRangeValid) {
  console.error('FAIL: Date range should be valid!')
  process.exit(1)
}

// When loaded back from DB
const displayStart = formatDate(partStart)
const displayEnd = formatDate(partEnd)
console.log(`Displayed back: '${displayStart}' to '${displayEnd}'`)
if (displayStart !== '01/09/2026' || displayEnd !== '30/09/2026') {
  console.error('FAIL: Participant dates not displayed properly!')
  process.exit(1)
}
console.log('PASS: Participant date flow verified successfully!')

// Case C: Invalid participant date range (30/09/2026 to 01/09/2026)
const isInvalidRangeBlocked = !isValidDateRange('2026-09-30', '2026-09-01')
console.log(`Invalid date range blocked: ${isInvalidRangeBlocked}`)
if (!isInvalidRangeBlocked) {
  console.error('FAIL: Inverted date range should be rejected!')
  process.exit(1)
}
console.log('PASS: Inverted date range correctly rejected!')

console.log('\nALL SIMULATION TESTS COMPLETED SUCCESSFULLY!')
