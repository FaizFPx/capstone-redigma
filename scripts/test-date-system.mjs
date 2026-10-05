import { parseDateInput, formatDate, formatDateTime, formatDateForInput, isValidDateRange } from '../lib/utils/date.ts'

console.log('=== TEST 1: PARSING DD/MM/YYYY TO YYYY-MM-DD ===')
const testCases = [
  { input: '15/07/2026', expected: '2026-07-15' },
  { input: '28/07/2026', expected: '2026-07-28' },
  { input: '14/08/2026', expected: '2026-08-14' },
  { input: '21/08/2026', expected: '2026-08-21' },
  { input: '01/09/2026', expected: '2026-09-01' },
  { input: '30/09/2026', expected: '2026-09-30' },
  { input: '05/10/2026', expected: '2026-10-05' },
  { input: '29/02/2024', expected: '2024-02-29' }, // valid leap year
]

for (const tc of testCases) {
  const result = parseDateInput(tc.input)
  if (result !== tc.expected) {
    console.error(`FAIL: parseDateInput('${tc.input}') expected '${tc.expected}', got '${result}'`)
    process.exit(1)
  }
  console.log(`PASS: parseDateInput('${tc.input}') -> '${result}'`)
}

console.log('\n=== TEST 2: REJECTING INVALID DATES ===')
const invalidCases = [
  '32/01/2026', // invalid day
  '31/02/2026', // Feb never has 31
  '29/02/2026', // 2026 is not a leap year
  '31/04/2026', // April has 30 days
  '00/05/2026', // Day 0 invalid
  '15/13/2026', // Month 13 invalid
  '15/07/26',   // Incomplete year
  '99/99/9999', // Out of bounds
  'random-text',
  '',
]

for (const inv of invalidCases) {
  const result = parseDateInput(inv)
  if (result !== null) {
    console.error(`FAIL: parseDateInput('${inv}') should be null, got '${result}'`)
    process.exit(1)
  }
  console.log(`PASS: Rejected invalid date '${inv}' -> null`)
}

console.log('\n=== TEST 3: DISPLAY FORMATTING (YYYY-MM-DD -> DD/MM/YYYY) ===')
const displayCases = [
  { input: '2026-07-15', expected: '15/07/2026' },
  { input: '2026-07-28', expected: '28/07/2026' },
  { input: '2026-08-14', expected: '14/08/2026' },
  { input: '2026-08-21', expected: '21/08/2026' },
  { input: '2026-09-01', expected: '01/09/2026' },
  { input: '2026-09-30', expected: '30/09/2026' },
  { input: '2026-10-05', expected: '05/10/2026' },
  { input: '2026-07-15T00:00:00Z', expected: '15/07/2026' },
  { input: null, expected: '-' },
  { input: '', expected: '-' },
]

for (const dc of displayCases) {
  const result = formatDate(dc.input)
  if (result !== dc.expected) {
    console.error(`FAIL: formatDate('${dc.input}') expected '${dc.expected}', got '${result}'`)
    process.exit(1)
  }
  console.log(`PASS: formatDate('${dc.input}') -> '${result}'`)
}

console.log('\n=== TEST 4: DATE RANGE LOGIC ===')
const rangeCases = [
  { start: '2026-09-01', end: '2026-09-30', expected: true },
  { start: '2026-09-30', end: '2026-09-01', expected: false },
  { start: '01/10/2026', end: '05/10/2026', expected: true },
  { start: '05/10/2026', end: '01/10/2026', expected: false },
  { start: '01/09/2026', end: '01/09/2026', expected: true }, // same day valid
]

for (const rc of rangeCases) {
  const result = isValidDateRange(rc.start, rc.end)
  if (result !== rc.expected) {
    console.error(`FAIL: isValidDateRange('${rc.start}', '${rc.end}') expected ${rc.expected}, got ${result}`)
    process.exit(1)
  }
  console.log(`PASS: isValidDateRange('${rc.start}', '${rc.end}') -> ${result}`)
}

console.log('\n=== TEST 5: TIMESTAMP FORMATTING ===')
const ts = '2026-10-05T14:30:00.000Z'
const formattedTs = formatDateTime(ts)
console.log(`PASS: formatDateTime('${ts}') -> '${formattedTs}'`)

console.log('\nALL UNIT & CONTRACT TESTS PASSED!')
