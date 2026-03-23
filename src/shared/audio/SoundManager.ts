/**
 * Procedural sound effects via Web Audio API.
 * No audio files needed — all tones generated in code.
 */

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function playTone(
  frequency: number,
  duration: number,
  type: OscillatorType = 'sine',
  gainPeak = 0.4,
  startDelay = 0
): void {
  try {
    const c = getCtx()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)

    osc.type = type
    osc.frequency.setValueAtTime(frequency, c.currentTime + startDelay)

    gain.gain.setValueAtTime(0, c.currentTime + startDelay)
    gain.gain.linearRampToValueAtTime(gainPeak, c.currentTime + startDelay + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + duration)

    osc.start(c.currentTime + startDelay)
    osc.stop(c.currentTime + startDelay + duration + 0.05)
  } catch (_) {
    // Audio not available — silently skip
  }
}

export const SoundManager = {
  /** Short pop when placing a token */
  tokenPlace(): void {
    playTone(440, 0.08, 'sine', 0.3)
    playTone(880, 0.06, 'sine', 0.15, 0.04)
  },

  /** Win fanfare — ascending C-E-G */
  win(): void {
    playTone(523.25, 0.15, 'square', 0.25, 0)       // C5
    playTone(659.25, 0.15, 'square', 0.25, 0.15)    // E5
    playTone(783.99, 0.30, 'square', 0.25, 0.30)    // G5
  },

  /** Draw — descending two notes */
  draw(): void {
    playTone(440, 0.20, 'triangle', 0.3, 0)
    playTone(329.63, 0.25, 'triangle', 0.25, 0.20)
  },

  /** UI button tap */
  buttonTap(): void {
    playTone(800, 0.03, 'sine', 0.2)
  },

  /** Game start whoosh */
  gameStart(): void {
    try {
      const c = getCtx()
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain)
      gain.connect(c.destination)
      osc.type = 'sine'
      osc.frequency.setValueAtTime(200, c.currentTime)
      osc.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.3)
      gain.gain.setValueAtTime(0.3, c.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.4)
      osc.start(c.currentTime)
      osc.stop(c.currentTime + 0.45)
    } catch (_) {}
  },
}
