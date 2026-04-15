const MONTH_NAMES = {
  jan: '01', january: '01', ene: '01', enero: '01',
  feb: '02', february: '02', febrero: '02',
  mar: '03', march: '03', marzo: '03',
  apr: '04', april: '04', abr: '04', abril: '04',
  may: '05', mayo: '05',
  jun: '06', june: '06', junio: '06',
  jul: '07', july: '07', julio: '07',
  aug: '08', august: '08', ago: '08', agosto: '08',
  sep: '09', sept: '09', september: '09', septiembre: '09',
  oct: '10', october: '10', octubre: '10',
  nov: '11', november: '11', noviembre: '11',
  dec: '12', december: '12', dic: '12', diciembre: '12',
}

const EXPIRY_KEYWORDS = [
  'caducidad', 'caduca', 'valido hasta', 'válido hasta', 'valida hasta',
  'válida hasta', 'fecha cad', 'vencimiento', 'expira', 'vigencia',
  'date of expiry', 'expiry date', 'expiry', 'expires', 'expiration',
  'valid until', 'valid to', 'validity',
]

function normalizeYear(raw) {
  if (raw.length === 2) {
    return parseInt(raw, 10) < 50 ? `20${raw}` : `19${raw}`
  }
  return raw
}

function buildIso(day, month, year) {
  const y = normalizeYear(String(year))
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  const date = new Date(`${y}-${m}-${d}`)
  if (
    isNaN(date.getTime()) ||
    date.getFullYear() !== Number(y) ||
    date.getMonth() + 1 !== Number(m) ||
    date.getDate() !== Number(d)
  ) {
    return null
  }
  return `${y}-${m}-${d}`
}

function parseMonthToken(token) {
  const num = parseInt(token, 10)
  if (!isNaN(num)) return String(num).padStart(2, '0')
  const key = token.toLowerCase().replace(/[^a-z]/g, '')
  return MONTH_NAMES[key] || null
}

function collectDatesFromSegment(segment) {
  const results = []

  // DD/MM/YYYY  DD-MM-YYYY  DD.MM.YYYY
  const p1 = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/g
  let m
  while ((m = p1.exec(segment)) !== null) {
    const month = parseMonthToken(m[2])
    if (month) {
      const iso = buildIso(m[1], month, m[3])
      if (iso) results.push({ iso, index: m.index })
    }
  }

  // YYYY-MM-DD  YYYY/MM/DD
  const p2 = /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/g
  while ((m = p2.exec(segment)) !== null) {
    const month = parseMonthToken(m[2])
    if (month) {
      const iso = buildIso(m[3], month, m[1])
      if (iso) results.push({ iso, index: m.index })
    }
  }

  // DD MMM YYYY  (01 JAN 2030)
  const monthAlts =
    'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?' +
    '|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?' +
    '|ene(?:ro)?|feb(?:rero)?|mar(?:zo)?|abr(?:il)?|may(?:o)?|jun(?:io)?' +
    '|jul(?:io)?|ago(?:sto)?|sep(?:tiembre)?|oct(?:ubre)?|nov(?:iembre)?|dic(?:iembre)?'
  const p3 = new RegExp(`\\b(\\d{1,2})\\s+(${monthAlts})[.,]?\\s+(\\d{2,4})\\b`, 'gi')
  while ((m = p3.exec(segment)) !== null) {
    const month = parseMonthToken(m[2])
    if (month) {
      const iso = buildIso(m[1], month, m[3])
      if (iso) results.push({ iso, index: m.index })
    }
  }

  // DD MM YYYY (space-separated digits)
  const p4 = /\b(\d{2})\s+(\d{2})\s+(\d{4})\b/g
  while ((m = p4.exec(segment)) !== null) {
    const month = parseMonthToken(m[2])
    if (month) {
      const iso = buildIso(m[1], month, m[3])
      if (iso) results.push({ iso, index: m.index })
    }
  }

  // Deduplicate
  const seen = new Set()
  return results.filter((r) => {
    if (seen.has(r.iso)) return false
    seen.add(r.iso)
    return true
  })
}

function collectYearRangesFromSegment(segment) {
  const results = []
  const p = /\b((?:19|20)\d{2})\s*[-–—]\s*((?:19|20)\d{2})\b/g
  let m

  while ((m = p.exec(segment)) !== null) {
    const startYear = parseInt(m[1], 10)
    const endYear = parseInt(m[2], 10)
    if (Number.isNaN(startYear) || Number.isNaN(endYear)) continue

    // Use the latest year and normalize to year start when day/month is unknown.
    const latestYear = Math.max(startYear, endYear)
    results.push({ iso: `${latestYear}-01-01`, index: m.index })
  }

  return results
}

export function extractExpiryDate(rawText) {
  if (!rawText) return null

  // Keep line boundaries while normalizing text for OCR noise.
  const lines = rawText
    .split(/[\n\r]+/)
    .map((line) =>
      line
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)

  const text = lines.join(' ')

  // Strategy 1: find lines with expiry keywords and extract nearby dates
  for (let i = 0; i < lines.length; i++) {
    const lineLower = lines[i].toLowerCase()
    const hasKeyword = EXPIRY_KEYWORDS.some((kw) => lineLower.includes(kw))

    if (hasKeyword) {
      const searchArea = lines.slice(i, i + 3).join(' ')
      const dates = collectDatesFromSegment(searchArea)
      if (dates.length > 0) return dates[0].iso

      const yearRanges = collectYearRangesFromSegment(searchArea)
      if (yearRanges.length > 0) return yearRanges[0].iso
    }
  }

  // Strategy 2: collect all dates, prefer plausible expiry range (2020-2045)
  const allDates = collectDatesFromSegment(text)
  const allYearRanges = collectYearRangesFromSegment(text)

  if (allDates.length === 0 && allYearRanges.length === 0) return null

  const year = new Date().getFullYear()
  const plausible = allDates.filter((d) => {
    const y = parseInt(d.iso.split('-')[0], 10)
    return y >= 2020 && y <= year + 15
  })

  const plausibleRanges = allYearRanges.filter((d) => {
    const y = parseInt(d.iso.split('-')[0], 10)
    return y >= 2020 && y <= year + 20
  })

  if (plausibleRanges.length > 0) {
    plausibleRanges.sort((a, b) => new Date(b.iso) - new Date(a.iso))
    return plausibleRanges[0].iso
  }

  if (plausible.length === 0) {
    if (allDates.length > 0) return allDates[0].iso
    return allYearRanges[0].iso
  }

  // Return the latest plausible date (expiry dates tend to be far ahead)
  plausible.sort((a, b) => new Date(b.iso) - new Date(a.iso))
  return plausible[0].iso
}
