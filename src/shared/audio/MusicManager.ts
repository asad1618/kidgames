/**
 * Procedural looping music via Web Audio API.
 * Schedules notes ahead of time using the standard "look-ahead" pattern.
 * No audio files — everything is synthesised oscillators.
 */

// ── Note frequencies (C major) ────────────────────────────────────────────────
const N: Record<string, number> = {
  C4:261.63, D4:293.66, E4:329.63, F4:349.23, G4:392.00, A4:440.00, B4:493.88,
  C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:784.00,
}

// ── Sequences ─────────────────────────────────────────────────────────────────
// Each entry: [frequency, beats]  (0 = rest)
// Normal: calm adventure melody, 4/4 at 100 BPM (quarter = 0.6s)
const NORMAL_SEQ: [number, number][] = [
  [N.G4,0.5],[N.A4,0.5],[N.C5,1],[N.A4,0.5],[N.G4,0.5],
  [N.E4,0.75],[0,0.25],[N.F4,0.5],[N.G4,0.5],[N.A4,1],
  [N.G4,0.5],[N.F4,0.5],[N.E4,0.75],[0,0.25],
  [N.D4,0.5],[N.E4,0.5],[N.F4,0.5],[N.G4,0.5],[N.E4,1.5],[0,0.5],
]
const NORMAL_BPM  = 100
const NORMAL_WAVE: OscillatorType = 'sine'
const NORMAL_VOL  = 0.22

// Normal bass pattern (plays every 2 beats)
const NORMAL_BASS: [number, number][] = [
  [N.C4,1],[N.G4,1],[N.A4,1],[N.F4,1],[N.C4,1],[N.G4,1],[N.E4,1],[N.G4,1],
]

// Hulk: fast & aggressive, 155 BPM
const HULK_SEQ: [number, number][] = [
  [N.G4,0.25],[N.G4,0.25],[N.A4,0.5],[N.C5,0.25],[N.B4,0.25],[N.A4,0.5],
  [N.G4,0.25],[N.A4,0.25],[N.C5,0.5],[N.D5,0.25],[N.C5,0.25],
  [N.B4,0.25],[N.A4,0.25],[N.G4,0.5],[N.A4,0.25],[N.G4,0.25],[N.E4,0.5],
  [N.F4,0.25],[N.G4,0.25],[N.A4,0.5],[N.G4,0.25],[N.F4,0.25],[N.E4,0.5],
  [N.D4,0.25],[N.E4,0.25],[N.F4,0.25],[N.G4,0.25],[N.A4,0.5],[0,0.5],
]
const HULK_BPM  = 155
const HULK_WAVE: OscillatorType = 'square'
const HULK_VOL  = 0.14

// Hulk bass (aggressive lower pulse)
const HULK_BASS: [number, number][] = [
  [N.G4/2,0.5],[N.G4/2,0.5],[N.C4,0.5],[N.G4/2,0.5],
  [N.A4/2,0.5],[N.A4/2,0.5],[N.E4/2,0.5],[N.G4/2,0.5],
]

// ── State ─────────────────────────────────────────────────────────────────────
let audioCtx:    AudioContext | null = null
let masterGain:  GainNode | null = null
let mode: 'off' | 'normal' | 'hulk' = 'off'

// Scheduler state
let timerHandle  = 0
let nextNoteTime = 0
let beatIndex    = 0
let bassIndex    = 0
const LOOKAHEAD_MS  = 40     // how often scheduler runs (ms)
const SCHEDULE_SECS = 0.18   // how far ahead to schedule notes (s)

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext()
    masterGain = audioCtx.createGain()
    masterGain.gain.value = 0
    masterGain.connect(audioCtx.destination)
  }
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function scheduleNote(
  freq: number, startTime: number, durSec: number,
  type: OscillatorType, volume: number, detune = 0
): void {
  if (!audioCtx || !masterGain || freq <= 0) return
  const osc  = audioCtx.createOscillator()
  const gain = audioCtx.createGain()
  osc.connect(gain)
  gain.connect(masterGain)
  osc.type = type
  osc.frequency.value = freq
  if (detune) osc.detune.value = detune
  const attack = 0.015, release = Math.min(0.08, durSec * 0.3)
  gain.gain.setValueAtTime(0, startTime)
  gain.gain.linearRampToValueAtTime(volume, startTime + attack)
  gain.gain.setValueAtTime(volume, startTime + durSec - release)
  gain.gain.linearRampToValueAtTime(0, startTime + durSec)
  osc.start(startTime)
  osc.stop(startTime + durSec + 0.01)
}

function scheduler(): void {
  if (!audioCtx) return
  const seq     = mode === 'hulk' ? HULK_SEQ    : NORMAL_SEQ
  const bass    = mode === 'hulk' ? HULK_BASS   : NORMAL_BASS
  const bpm     = mode === 'hulk' ? HULK_BPM    : NORMAL_BPM
  const wave    = mode === 'hulk' ? HULK_WAVE   : NORMAL_WAVE
  const vol     = mode === 'hulk' ? HULK_VOL    : NORMAL_VOL
  const beatSec = 60 / bpm

  while (nextNoteTime < audioCtx.currentTime + SCHEDULE_SECS) {
    const [freq, beats] = seq[beatIndex % seq.length]
    const dur = beats * beatSec

    // Melody note
    scheduleNote(freq, nextNoteTime, dur * 0.88, wave, vol)

    // Bass (every 1 beat)
    const [bfreq, bbeats] = bass[bassIndex % bass.length]
    scheduleNote(bfreq, nextNoteTime, bbeats * beatSec * 0.7,
      mode === 'hulk' ? 'sawtooth' : 'triangle', vol * 0.65)

    // Hulk: add a kick-like thump every other beat
    if (mode === 'hulk' && beatIndex % 2 === 0) {
      scheduleNote(80, nextNoteTime, 0.12, 'sine', 0.4)
    }

    nextNoteTime += dur
    beatIndex++
    if (beatIndex % 2 === 0) bassIndex++
    if (beatIndex >= seq.length) beatIndex = 0
    if (bassIndex >= bass.length) bassIndex = 0
  }
}

function startScheduler(): void {
  stopScheduler()
  const ctx = getCtx()
  nextNoteTime = ctx.currentTime + 0.05
  beatIndex = 0
  bassIndex = 0
  timerHandle = window.setInterval(scheduler, LOOKAHEAD_MS)
}

function stopScheduler(): void {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = 0 }
}

function fadeTo(volume: number, durationSec = 0.4): void {
  if (!masterGain || !audioCtx) return
  masterGain.gain.cancelScheduledValues(audioCtx.currentTime)
  masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime)
  masterGain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + durationSec)
}

// ── Public API ────────────────────────────────────────────────────────────────
export const MusicManager = {
  playNormal(): void {
    if (mode === 'normal') return
    getCtx()
    mode = 'normal'
    startScheduler()
    fadeTo(1, 0.5)
  },

  playHulk(): void {
    if (mode === 'hulk') return
    getCtx()
    // Cross-fade: fade out current, restart scheduler in hulk mode
    fadeTo(0, 0.25)
    setTimeout(() => {
      mode = 'hulk'
      startScheduler()
      fadeTo(1, 0.3)
    }, 280)
  },

  revertNormal(): void {
    if (mode === 'normal') return
    fadeTo(0, 0.3)
    setTimeout(() => {
      mode = 'normal'
      startScheduler()
      fadeTo(1, 0.4)
    }, 350)
  },

  stop(): void {
    fadeTo(0, 0.4)
    setTimeout(() => {
      stopScheduler()
      mode = 'off'
    }, 450)
  },

  /** Call every frame during hulk. Plays a beep at exactly 3, 2, 1 seconds left. */
  tickCountdown(hulkTimerMs: number, prevMs: number): void {
    if (!audioCtx) return
    for (const sec of [3, 2, 1]) {
      const threshold = sec * 1000
      if (prevMs > threshold && hulkTimerMs <= threshold) {
        // Schedule an urgent beep right now
        const freq   = 700 + (3 - sec) * 220   // 700, 920, 1140 Hz
        const vol    = 0.25 + (3 - sec) * 0.1  // escalating volume
        const t      = audioCtx.currentTime + 0.01
        scheduleNote(freq,        t,        0.09, 'square', vol)
        if (sec === 1) {
          // Triple beep on last second
          scheduleNote(freq * 1.5, t + 0.12, 0.07, 'square', vol)
          scheduleNote(freq * 1.5, t + 0.22, 0.07, 'square', vol)
        }
      }
    }
  },
}
