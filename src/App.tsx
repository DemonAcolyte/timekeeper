import { Fragment, useEffect, useState } from 'react'

const STORAGE_KEY = 'conference-timer-state'
const MAX_TIMERS = 5

type Timer = {
  id: string
  name: string
  duration: number
  remaining: number
  running: boolean
  endsAt: number | null
}

type Draft = { name: string; hours: string; minutes: string; seconds: string }

type Theme = 'dark' | 'light'

type SavedState = {
  timers: Timer[]
  selectedId: string
  theme?: Theme
}

const defaultTimer: Timer = {
  id: 'timer-1',
  name: 'Opening remarks',
  duration: 15 * 60,
  remaining: 15 * 60,
  running: false,
  endsAt: null,
}

function getRemaining(timer: Timer, now = Date.now()) {
  return timer.running && timer.endsAt ? Math.max(0, Math.ceil((timer.endsAt - now) / 1000)) : timer.remaining
}

function toDraft(timer: Timer): Draft {
  const seconds = getRemaining(timer)
  return {
    name: timer.name,
    hours: String(Math.floor(seconds / 3600)),
    minutes: String(Math.floor((seconds % 3600) / 60)),
    seconds: String(seconds % 60),
  }
}

function formatTime(totalSeconds: number, showHours: boolean) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = [minutes, seconds]
  if (showHours) parts.unshift(hours)
  return parts.map((part) => String(part).padStart(2, '0')).join(':')
}

function loadState(): SavedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return { timers: [defaultTimer], selectedId: defaultTimer.id, theme: 'dark' }

    const parsed = JSON.parse(stored) as SavedState | Timer[]
    const savedTimers = Array.isArray(parsed) ? parsed : parsed.timers
    if (!Array.isArray(savedTimers) || !savedTimers.length) {
      return { timers: [defaultTimer], selectedId: defaultTimer.id, theme: 'dark' }
    }

    const now = Date.now()
    const timers = savedTimers.slice(0, MAX_TIMERS).map((timer) => {
      if (timer.running && getRemaining(timer, now) === 0) {
        return { ...timer, remaining: 0, running: false, endsAt: null }
      }
      return timer
    })
    const savedSelectedId = Array.isArray(parsed) ? timers[0].id : parsed.selectedId
    const selectedId = timers.some((timer) => timer.id === savedSelectedId) ? savedSelectedId : timers[0].id
    const theme = Array.isArray(parsed) || parsed.theme !== 'light' ? 'dark' : 'light'
    return { timers, selectedId, theme }
  } catch {
    return { timers: [defaultTimer], selectedId: defaultTimer.id, theme: 'dark' }
  }
}

function App() {
  const [initialState] = useState(loadState)
  const [timers, setTimers] = useState<Timer[]>(initialState.timers)
  const [selectedId, setSelectedId] = useState(initialState.selectedId)
  const [theme, setTheme] = useState<Theme>(initialState.theme ?? 'dark')
  const [controlsVisible, setControlsVisible] = useState(true)
  const [now, setNow] = useState(Date.now())
  const selected = timers.find((timer) => timer.id === selectedId) ?? timers[0]
  const [draft, setDraft] = useState<Draft>(() => toDraft(selected))
  const remaining = getRemaining(selected, now)
  const displayedTime = formatTime(remaining, remaining >= 3600)
  const timeParts = displayedTime.split(':')

  useEffect(() => {
    if (!timers.some((timer) => timer.id === selectedId)) selectTimer(timers[0])
  }, [selectedId, timers])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ timers, selectedId, theme } satisfies SavedState))
  }, [selectedId, theme, timers])

  useEffect(() => {
    if (!timers.some((timer) => timer.running)) return

    let frame = 0
    const tick = () => {
      const timestamp = Date.now()
      setNow(timestamp)
      setTimers((current) => {
        if (!current.some((timer) => timer.running && getRemaining(timer, timestamp) === 0)) return current
        return current.map((timer) => {
        if (timer.running && getRemaining(timer, timestamp) === 0) {
          return { ...timer, remaining: 0, running: false, endsAt: null }
        }
        return timer
        })
      })
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [timers])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) {
        if (event.target.type === 'number' && event.key.toLowerCase() === 'h') {
          setControlsVisible((visible) => !visible)
        }
        return
      }
      if (event.key === ' ') {
        event.preventDefault()
        toggleTimer()
      }
      if (event.key.toLowerCase() === 'r') resetTimer()
      if (event.key.toLowerCase() === 'h') setControlsVisible((visible) => !visible)
      const number = Number(event.key)
      if (number >= 1 && number <= timers.length) selectTimer(timers[number - 1])
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  function selectTimer(timer: Timer) {
    setSelectedId(timer.id)
    setDraft(toDraft(timer))
    setNow(Date.now())
  }

  function updateSelected(updater: (timer: Timer) => Timer) {
    setTimers((current) => current.map((timer) => timer.id === selected.id ? updater(timer) : timer))
  }

  function toggleTimer() {
    const currentRemaining = getRemaining(selected)
    updateSelected((timer) => timer.running
      ? { ...timer, remaining: currentRemaining, running: false, endsAt: null }
      : currentRemaining > 0 ? { ...timer, remaining: currentRemaining, running: true, endsAt: Date.now() + currentRemaining * 1000 } : timer)
    setNow(Date.now())
  }

  function resetTimer() {
    updateSelected((timer) => ({ ...timer, remaining: timer.duration, running: false, endsAt: null }))
    setDraft(toDraft({ ...selected, remaining: selected.duration, running: false, endsAt: null }))
    setNow(Date.now())
  }

  function applySettings() {
    const hours = Math.max(0, Number.parseInt(draft.hours, 10) || 0)
    const minutes = Math.min(59, Math.max(0, Number.parseInt(draft.minutes, 10) || 0))
    const seconds = Math.min(59, Math.max(0, Number.parseInt(draft.seconds, 10) || 0))
    const duration = hours * 3600 + minutes * 60 + seconds
    updateSelected((timer) => ({ ...timer, name: draft.name.trim() || 'Untitled timer', duration, remaining: duration, running: false, endsAt: null }))
    setDraft({ name: draft.name.trim() || 'Untitled timer', hours: String(hours), minutes: String(minutes), seconds: String(seconds) })
    setNow(Date.now())
  }

  function addTimer() {
    if (timers.length === MAX_TIMERS) return
    const timer: Timer = { id: crypto.randomUUID(), name: `Timer ${timers.length + 1}`, duration: 5 * 60, remaining: 5 * 60, running: false, endsAt: null }
    setTimers((current) => [...current, timer])
    selectTimer(timer)
  }

  function removeTimer(id: string) {
    if (timers.length === 1) return

    const removedIndex = timers.findIndex((timer) => timer.id === id)
    const nextTimers = timers.filter((timer) => timer.id !== id)
    setTimers(nextTimers)

    if (id === selectedId) {
      selectTimer(nextTimers[Math.min(removedIndex, nextTimers.length - 1)])
    }
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  }

  return (
    <main className={`app ${theme === 'light' ? 'light-mode' : ''} ${controlsVisible ? '' : 'controls-hidden'}`}>
      <aside className="timer-sidebar" aria-label="Saved timers">
        <p className="sidebar-title">Timers</p>
        <div className="timer-tabs">
          {timers.map((timer, index) => <div className="timer-item" key={timer.id}>
            <button className={timer.id === selected.id ? 'timer-tab active' : 'timer-tab'} type="button" onClick={() => selectTimer(timer)}><span>{index + 1}</span>{timer.name}</button>
            <button className="remove-timer" type="button" onClick={() => removeTimer(timer.id)} disabled={timers.length === 1} aria-label={`Remove ${timer.name}`} title={timers.length === 1 ? 'At least one timer is required' : `Remove ${timer.name}`}>X</button>
          </div>)}
          {timers.length < MAX_TIMERS && <button className="add-timer" type="button" onClick={addTimer}>+ Add timer</button>}
        </div>
      </aside>

      <div className="main-panel">
        <header className="topbar">
          <p className="eyebrow">Conference clock</p>
          <div className="header-actions">
            <button className="theme-toggle" type="button" onClick={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.5 15.1A9 9 0 0 1 8.9 3.5 9 9 0 1 0 20.5 15.1Z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        <section className="timer-display" aria-live="polite">
          <p className="timer-name">{selected.name}</p>
          <time className={remaining === 0 ? 'time expired' : 'time'} dateTime={`PT${remaining}S`} aria-label={displayedTime}>
            {timeParts.map((part, index) => <Fragment key={`${part}-${index}`}>
              {index > 0 && <span className="time-separator">:</span>}<span>{part}</span>
            </Fragment>)}
          </time>
          <p className={`timer-status ${selected.running ? 'running' : ''}`}>{remaining === 0 ? 'Time complete' : selected.running ? 'Counting down' : 'Ready'}</p>
        </section>

        <section className="controls" aria-label="Timer controls">
          <div className="control-card">
            <label className="name-field">Timer name<input value={draft.name} maxLength={40} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
            <div className="duration-fields">
              {(['hours', 'minutes', 'seconds'] as const).map((field) => <label key={field}>{field}<input type="number" min="0" max={field === 'hours' ? 99 : 59} inputMode="numeric" value={draft[field]} onChange={(event) => setDraft({ ...draft, [field]: event.target.value })} /></label>)}
            </div>
            <button className="apply-button" type="button" onClick={applySettings}>Apply settings</button>
          </div>

          <div className="actions">
            <button className="primary-action" type="button" onClick={toggleTimer} disabled={remaining === 0}>{selected.running ? 'Pause' : 'Start'} <kbd>Space</kbd></button>
            <button className="secondary-action" type="button" onClick={resetTimer}>Reset <kbd>R</kbd></button>
            <button className="secondary-action" type="button" onClick={toggleFullscreen}>Fullscreen</button>
            <button className="secondary-action" type="button" onClick={() => setControlsVisible(false)}>Hide controls <kbd>H</kbd></button>
          </div>
        </section>
      </div>
      {!controlsVisible && <button className="text-button reveal-controls" type="button" onClick={() => setControlsVisible(true)}>Show controls <kbd>H</kbd></button>}
    </main>
  )
}

export default App
