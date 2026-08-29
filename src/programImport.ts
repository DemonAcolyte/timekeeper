import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const MAX_TIMERS = 5
const LINE_TOLERANCE = 4
const TIME_RANGE = /(\d{1,2}):([0-5]\d)(AM|PM)?[-‐‑‒–—−](\d{1,2}):([0-5]\d)(AM|PM)?/i
const EXPLICIT_DURATION = /(\d{1,3})(?:min|mins|minute|minutes)\b/i

type TextFragment = {
  text: string
  x: number
  y: number
}

type DurationGroup = {
  duration: number
  count: number
  firstIndex: number
}

export type ProgramImportResult = {
  sectionCount: number
  durations: number[]
}

function toMinutes(hoursText: string, minutesText: string, meridiem?: string) {
  let hours = Number(hoursText)
  const minutes = Number(minutesText)

  if (meridiem) {
    if (hours < 1 || hours > 12) return null
    hours %= 12
    if (meridiem.toUpperCase() === 'PM') hours += 12
  } else if (hours > 23) {
    return null
  }

  return hours * 60 + minutes
}

function parseTimeRange(line: string) {
  const match = line.match(TIME_RANGE)
  if (!match) return null

  const sharedMeridiem = match[3] ?? match[6]
  const start = toMinutes(match[1], match[2], match[3] ?? sharedMeridiem)
  const end = toMinutes(match[4], match[5], match[6] ?? sharedMeridiem)
  if (start === null || end === null) return null

  const duration = end >= start ? end - start : end + 24 * 60 - start
  return duration > 0 ? duration : null
}

export function extractFrequentDurations(lines: string[]): ProgramImportResult {
  const groups = new Map<number, DurationGroup>()
  let sectionCount = 0

  lines.forEach((line, index) => {
    // Designed PDFs often store every tracked letter as a separate text item.
    const compactLine = line.replace(/[\s\u00a0]+/g, '')
    const rangeDuration = parseTimeRange(compactLine)
    const explicitMatch = compactLine.match(EXPLICIT_DURATION)
    const explicitDuration = explicitMatch ? Number(explicitMatch[1]) : null

    if (explicitDuration !== null && explicitDuration <= 0) return
    if (rangeDuration !== null && explicitDuration !== null && rangeDuration !== explicitDuration) return

    const minutes = explicitDuration ?? rangeDuration
    if (minutes === null || minutes > 24 * 60) return

    sectionCount += 1
    const duration = minutes * 60
    const existing = groups.get(duration)
    if (existing) existing.count += 1
    else groups.set(duration, { duration, count: 1, firstIndex: index })
  })

  const durations = [...groups.values()]
    .sort((left, right) => right.count - left.count || left.firstIndex - right.firstIndex)
    .slice(0, MAX_TIMERS)
    .map((group) => group.duration)

  return { sectionCount, durations }
}

function fragmentsToLines(fragments: TextFragment[]) {
  const rows: TextFragment[][] = []

  for (const fragment of fragments.sort((left, right) => right.y - left.y || left.x - right.x)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - fragment.y) <= LINE_TOLERANCE)
    if (row) row.push(fragment)
    else rows.push([fragment])
  }

  return rows.map((row) => row
    .sort((left, right) => left.x - right.x)
    .map((fragment) => fragment.text.trim())
    .filter(Boolean)
    .join(' '))
}

export async function importProgramPdf(file: File): Promise<ProgramImportResult> {
  if (file.type && file.type !== 'application/pdf') throw new Error('Choose a PDF file.')

  const { GlobalWorkerOptions, getDocument } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl
  const bytes = new Uint8Array(await file.arrayBuffer())
  const loadingTask = getDocument({ data: bytes })
  const document = await loadingTask.promise
  const lines: string[] = []

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      const fragments: TextFragment[] = []

      for (const item of content.items) {
        if (!('str' in item) || !item.str.trim()) continue
        fragments.push({ text: item.str, x: item.transform[4], y: item.transform[5] })
      }

      lines.push(...fragmentsToLines(fragments))
    }
  } finally {
    await loadingTask.destroy()
  }

  if (!lines.length) throw new Error('No selectable text found. Scanned PDFs are not supported.')

  const result = extractFrequentDurations(lines)
  if (!result.durations.length) {
    throw new Error('No schedule rows with valid times or durations were found.')
  }

  return result
}
