console.log('=== P1 VERIFICATION SCRIPT ===\n')

// 1. Sisa Masa Magang Calculation Test (Timezone-safe)
console.log('--- Test 1: Sisa Masa Magang Logic (Timezone-safe) ---')
function calculateRemainingDays(endDateStr) {
  if (!endDateStr) return null
  const parts = endDateStr.split('T')[0].split('-')
  if (parts.length < 3) return null
  const endYear = parseInt(parts[0], 10)
  const endMonth = parseInt(parts[1], 10) - 1
  const endDay = parseInt(parts[2], 10)

  const endDate = new Date(endYear, endMonth, endDay, 0, 0, 0, 0)
  const now = new Date()
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)

  const diffMs = endDate.getTime() - todayDate.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

const now = new Date()
const formatLocalDate = (d) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Case: 5 days remaining
const fiveDaysLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 5)
const days5 = calculateRemainingDays(formatLocalDate(fiveDaysLater))
console.log(`5 days from now (${formatLocalDate(fiveDaysLater)}): ${days5} days remaining`)
if (days5 !== 5) {
  console.error(`FAIL: days5 should be 5, got ${days5}`)
  process.exit(1)
}

// Case: Today
const days0 = calculateRemainingDays(formatLocalDate(now))
console.log(`Today (${formatLocalDate(now)}): ${days0} days remaining`)
if (days0 !== 0) {
  console.error(`FAIL: days0 should be 0, got ${days0}`)
  process.exit(1)
}

// Case: Overdue (3 days ago)
const threeDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3)
const daysOverdue = calculateRemainingDays(formatLocalDate(threeDaysAgo))
console.log(`3 days ago (${formatLocalDate(threeDaysAgo)}): ${daysOverdue} days (Overdue)`)
if (daysOverdue !== -3) {
  console.error(`FAIL: daysOverdue should be -3, got ${daysOverdue}`)
  process.exit(1)
}

console.log('PASS: Sisa masa magang calculation verified!\n')

// 1b. Remaining Days Display Rule per Participant Status
console.log('--- Test 1b: Remaining Days Display Rule per Status ---')
function shouldDisplayRemainingDays(statusId) {
  return statusId === 'sedang_magang'
}

if (shouldDisplayRemainingDays('belum_mulai')) {
  console.error('FAIL: belum_mulai should NOT display remaining days')
  process.exit(1)
}
console.log('Status: belum_mulai -> display remaining days: false (shows -)')

if (!shouldDisplayRemainingDays('sedang_magang')) {
  console.error('FAIL: sedang_magang SHOULD display remaining days')
  process.exit(1)
}
console.log('Status: sedang_magang -> display remaining days: true')

if (shouldDisplayRemainingDays('sudah_selesai')) {
  console.error('FAIL: sudah_selesai should NOT display remaining days')
  process.exit(1)
}
console.log('Status: sudah_selesai -> display remaining days: false (shows -)')

if (shouldDisplayRemainingDays('mengundurkan_diri')) {
  console.error('FAIL: mengundurkan_diri should NOT display remaining days')
  process.exit(1)
}
console.log('Status: mengundurkan_diri -> display remaining days: false (shows -)')
console.log('PASS: Remaining days status display rules verified!\n')

// 2. Participant Lifecycle Transitions
console.log('--- Test 2: Participant Lifecycle Transition Rules ---')
function getParticipantActionConfig(statusId) {
  if (statusId === 'belum_mulai') {
    return {
      actionLabel: 'Mulai Magang',
      targetStatusId: 'sedang_magang',
      hasAction: true,
    }
  }
  if (statusId === 'sedang_magang') {
    return {
      actionLabel: 'Selesaikan Magang',
      targetStatusId: 'sudah_selesai',
      hasAction: true,
    }
  }
  return {
    hasAction: false,
  }
}

const actionBelumMulai = getParticipantActionConfig('belum_mulai')
console.log('Status: belum_mulai -> action:', actionBelumMulai)
if (!actionBelumMulai.hasAction || actionBelumMulai.actionLabel !== 'Mulai Magang' || actionBelumMulai.targetStatusId !== 'sedang_magang') {
  console.error('FAIL: belum_mulai action config incorrect')
  process.exit(1)
}

const actionSedangMagang = getParticipantActionConfig('sedang_magang')
console.log('Status: sedang_magang -> action:', actionSedangMagang)
if (!actionSedangMagang.hasAction || actionSedangMagang.actionLabel !== 'Selesaikan Magang' || actionSedangMagang.targetStatusId !== 'sudah_selesai') {
  console.error('FAIL: sedang_magang action config incorrect')
  process.exit(1)
}

const actionSelesai = getParticipantActionConfig('sudah_selesai')
console.log('Status: sudah_selesai -> action:', actionSelesai)
if (actionSelesai.hasAction) {
  console.error('FAIL: sudah_selesai should NOT have primary lifecycle transition action')
  process.exit(1)
}

console.log('PASS: Participant lifecycle transitions verified!\n')

// 3. Quick Status Pengajuan Transition Rules
console.log('--- Test 3: Pengajuan Status Transition Feedback ---')
function getDecisionFeedback(decisionId) {
  switch (decisionId) {
    case 'diterima':
      return {
        isEligibleForParticipants: true,
        alertType: 'SUCCESS',
        label: 'Siap dilanjutkan ke pendaftaran peserta',
      }
    case 'ditolak':
      return {
        isEligibleForParticipants: false,
        alertType: 'ERROR',
        label: 'Peserta tidak dapat didaftarkan',
      }
    case 'dalam_proses':
    default:
      return {
        isEligibleForParticipants: false,
        alertType: 'WARNING',
        label: 'Memerlukan tindak lanjut',
      }
  }
}

const fbDiterima = getDecisionFeedback('diterima')
console.log('Decision: diterima ->', fbDiterima)
if (!fbDiterima.isEligibleForParticipants) {
  console.error('FAIL: diterima should be eligible for participants')
  process.exit(1)
}

const fbDitolak = getDecisionFeedback('ditolak')
console.log('Decision: ditolak ->', fbDitolak)
if (fbDitolak.isEligibleForParticipants) {
  console.error('FAIL: ditolak should NOT be eligible for participants')
  process.exit(1)
}

const fbDalamProses = getDecisionFeedback('dalam_proses')
console.log('Decision: dalam_proses ->', fbDalamProses)
if (fbDalamProses.isEligibleForParticipants) {
  console.error('FAIL: dalam_proses should NOT allow direct participant registration without approval')
  process.exit(1)
}

console.log('PASS: Pengajuan decision feedback rules verified!\n')

console.log('ALL P1 VERIFICATION CHECKS PASSED!')
