// ── Constants ─────────────────────────────────────────────────────────────────
export const BEE_NORMAL_SPEED        = 125   // px/s
export const BEE_SLOWED_SPEED        = 38    // px/s during obstacle hit
export const BEE_HULK_SPEED          = 158   // px/s while hulk
export const CATCHER_NORMAL_SPEED    = 118   // px/s (gap closes 7px/s normally)
export const CATCHER_SLOWED_SPEED    = 50    // px/s after knockback ends
export const CATCHER_KNOCKBACK_SPEED = -95   // px/s — flies backward on trap hit
export const CATCH_THRESHOLD         = 115   // px gap → trigger catch
export const MAX_GAP                 = 420   // px — catcher never goes off screen left
export const SLOWDOWN_DURATION       = 3000  // ms bee is slowed per obstacle
export const CATCHER_KNOCKBACK_DUR   = 900   // ms catcher flies backward
export const CATCHER_SLOW_DUR        = 2800  // ms catcher creeps after knockback
export const HULK_DURATION           = 10000 // ms
export const INITIAL_GAP             = 200   // starting gap px

export type WorldObjectType =
  | 'obstacle-flower' | 'obstacle-web' | 'obstacle-branch'
  | 'obstacle-mushroom' | 'obstacle-thorns' | 'obstacle-lantern'
  | 'honey' | 'trap-rock' | 'trap-board' | 'trap-vine' | 'hive'

export interface WorldObject {
  id: string
  type: WorldObjectType
  worldX: number
  activated: boolean
  passedByBee: boolean
  passedByCatcher: boolean
  hitBee: boolean
  hitCatcher: boolean
  hitCenterY?: number
  hitRadius?: number
  dodged?: boolean
}

export interface BeeScrollerState {
  beeWorldX: number
  catcherWorldX: number
  beeY: number
  beeSpeed: number
  catcherSpeed: number
  isHulk: boolean
  hulkTimer: number
  beeSlowTimer: number
  catcherSlowTimer: number
  catcherKnockbackTimer: number
  phase: 'playing' | 'caught' | 'won'
  worldObjects: WorldObject[]
  catchTimer: number
}

// ── World layout ──────────────────────────────────────────────────────────────
type WorldObjectSeed = Omit<WorldObject, 'activated'|'passedByBee'|'passedByCatcher'|'hitBee'|'hitCatcher'|'dodged'>

const OBSTACLE_TYPES: WorldObjectType[] = [
  'obstacle-flower', 'obstacle-web', 'obstacle-branch',
  'obstacle-mushroom', 'obstacle-thorns', 'obstacle-lantern',
]
const TRAP_TYPES: WorldObjectType[] = ['trap-rock', 'trap-board', 'trap-vine']

// Three vertical bands — player must sweep up and down to dodge
const Y_HIGH = [165, 195, 225, 250]   // top of flight zone
const Y_MID  = [290, 325, 355]        // middle
const Y_LOW  = [390, 425, 460, 490]   // bottom of flight zone

const OBSTACLE_R_MAP: Record<string, number> = {
  'obstacle-flower': 50, 'obstacle-web': 62, 'obstacle-branch': 40,
  'obstacle-mushroom': 55, 'obstacle-thorns': 45, 'obstacle-lantern': 52,
}

function seededRand(seed: number): () => number {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

// Pick a Y that is at least 130px from prevY so player must physically move the bee
function pickObstacleY(rand: () => number, prevY: number): number {
  const bands = [Y_HIGH, Y_MID, Y_LOW]
  const eligible = bands.filter(band => {
    const mid = (band[0] + band[band.length - 1]) / 2
    return Math.abs(mid - prevY) >= 130
  })
  const band = (eligible.length > 0 ? eligible : bands)[Math.floor(rand() * (eligible.length > 0 ? eligible.length : bands.length))]
  return band[Math.floor(rand() * band.length)]
}

export function generateWorldObjects(seed = 42): WorldObjectSeed[] {
  const rand = seededRand(seed)
  const objects: WorldObjectSeed[] = []
  const LEVEL_LENGTH = 7200
  const HONEY_X      = 1800

  // ── Pre-honey: 5–7 obstacles, tight gaps, forced Y zigzag ────────────────
  let x = 440
  let prevY = 325  // start mid so first can go high or low
  const preCount = 5 + Math.floor(rand() * 3)
  for (let i = 0; i < preCount; i++) {
    const type = OBSTACLE_TYPES[Math.floor(rand() * OBSTACLE_TYPES.length)]
    const hitCenterY = pickObstacleY(rand, prevY)
    prevY = hitCenterY
    objects.push({ id: `obs_pre_${i}`, type, worldX: x, hitCenterY, hitRadius: OBSTACLE_R_MAP[type] })
    // Tight gaps — 200–320px so player barely has time to react
    x += 200 + Math.floor(rand() * 120)
  }

  // ── Honey bucket ─────────────────────────────────────────────────────────
  objects.push({ id: 'honey', type: 'honey', worldX: HONEY_X })

  // ── Hulk zone: obstacles always, trap every 4th item ─────────────────────
  x = HONEY_X + 420
  const hulkCount = 8 + Math.floor(rand() * 4)
  for (let i = 0; i < hulkCount; i++) {
    // Sparse trap (every 4th)
    if (i % 4 === 0) {
      const trapType = TRAP_TYPES[Math.floor(rand() * TRAP_TYPES.length)]
      objects.push({ id: `trap_${i}`, type: trapType, worldX: x })
      x += 200 + Math.floor(rand() * 120)
    }

    // Obstacle — always alternates bands aggressively
    const type = OBSTACLE_TYPES[Math.floor(rand() * OBSTACLE_TYPES.length)]
    const hitCenterY = pickObstacleY(rand, prevY)
    prevY = hitCenterY
    objects.push({ id: `obs_hulk_${i}`, type, worldX: x, hitCenterY, hitRadius: OBSTACLE_R_MAP[type] })
    x += 190 + Math.floor(rand() * 110)
  }

  // ── Post-hulk sprint: pure obstacle gauntlet, maximum difficulty ──────────
  const postCount = 5 + Math.floor(rand() * 4)
  for (let i = 0; i < postCount; i++) {
    const type = OBSTACLE_TYPES[Math.floor(rand() * OBSTACLE_TYPES.length)]
    const hitCenterY = pickObstacleY(rand, prevY)
    prevY = hitCenterY
    objects.push({ id: `obs_post_${i}`, type, worldX: x, hitCenterY, hitRadius: OBSTACLE_R_MAP[type] })
    // Even tighter in final stretch — 180–280px
    x += 180 + Math.floor(rand() * 100)
  }

  // ── Hive at the end ───────────────────────────────────────────────────────
  objects.push({ id: 'hive', type: 'hive', worldX: Math.max(x + 400, LEVEL_LENGTH) })

  return objects
}

export const WORLD_OBJECTS = generateWorldObjects()

export function createInitialState(seed?: number): BeeScrollerState {
  const objects = seed !== undefined ? generateWorldObjects(seed) : WORLD_OBJECTS
  return {
    beeWorldX: 0,
    catcherWorldX: -INITIAL_GAP,
    beeY: 325,
    beeSpeed: BEE_NORMAL_SPEED,
    catcherSpeed: CATCHER_NORMAL_SPEED,
    isHulk: false,
    hulkTimer: 0,
    beeSlowTimer: 0,
    catcherSlowTimer: 0,
    catcherKnockbackTimer: 0,
    phase: 'playing',
    catchTimer: 0,
    worldObjects: objects.map(o => ({
      ...o, activated: false, passedByBee: false,
      passedByCatcher: false, hitBee: false, hitCatcher: false, dodged: false,
    })),
  }
}

export function updateState(state: BeeScrollerState, deltaMs: number): BeeScrollerState {
  if (state.phase !== 'playing') return state

  const s = { ...state }
  const dt = deltaMs / 1000

  // ── Timers ────────────────────────────────────────────────────────────────
  if (s.beeSlowTimer > 0) {
    s.beeSlowTimer = Math.max(0, s.beeSlowTimer - deltaMs)
    s.beeSpeed = s.beeSlowTimer > 0
      ? BEE_SLOWED_SPEED
      : (s.isHulk ? BEE_HULK_SPEED : BEE_NORMAL_SPEED)
  }

  // Knockback → slow → normal cascade
  if (s.catcherKnockbackTimer > 0) {
    s.catcherKnockbackTimer = Math.max(0, s.catcherKnockbackTimer - deltaMs)
    s.catcherSpeed = s.catcherKnockbackTimer > 0
      ? CATCHER_KNOCKBACK_SPEED
      : (s.catcherSlowTimer > 0 ? CATCHER_SLOWED_SPEED : CATCHER_NORMAL_SPEED)
  } else if (s.catcherSlowTimer > 0) {
    s.catcherSlowTimer = Math.max(0, s.catcherSlowTimer - deltaMs)
    s.catcherSpeed = s.catcherSlowTimer > 0 ? CATCHER_SLOWED_SPEED : CATCHER_NORMAL_SPEED
  }

  if (s.hulkTimer > 0) {
    s.hulkTimer = Math.max(0, s.hulkTimer - deltaMs)
    if (s.hulkTimer === 0) {
      s.isHulk = false
      if (s.beeSlowTimer === 0) s.beeSpeed = BEE_NORMAL_SPEED
    }
  }

  // ── Movement ──────────────────────────────────────────────────────────────
  s.beeWorldX += s.beeSpeed * dt
  s.catcherWorldX += s.catcherSpeed * dt

  // Enforce max gap — catcher can never go off screen left
  // Gap = beeWorldX - catcherWorldX; screen position = BEE_SCREEN_X - gap
  // MAX_GAP ensures catcher screen X >= BEE_SCREEN_X - MAX_GAP (= ~80px)
  if (s.beeWorldX - s.catcherWorldX > MAX_GAP) {
    s.catcherWorldX = s.beeWorldX - MAX_GAP
    // If knocked beyond the wall, zero the knockback speed so he just stays
    if (s.catcherSpeed < 0) s.catcherSpeed = 0
  }

  // ── Check world objects ───────────────────────────────────────────────────
  s.worldObjects = s.worldObjects.map(obj => {
    const o = { ...obj }

    if (!o.passedByBee && s.beeWorldX > o.worldX) {
      o.passedByBee = true

      if (isObstacle(o.type) && !s.isHulk && !o.hitBee) {
        const hitY  = o.hitCenterY ?? 325
        const radius = o.hitRadius ?? 52
        if (Math.abs(s.beeY - hitY) < radius) {
          o.hitBee = true
          s.beeSlowTimer = SLOWDOWN_DURATION
          s.beeSpeed = BEE_SLOWED_SPEED
        } else {
          o.dodged = true
        }
      }

      if (o.type === 'honey' && o.activated && !s.isHulk) {
        s.isHulk = true
        s.hulkTimer = HULK_DURATION
        s.beeSpeed = BEE_HULK_SPEED
      }

      if (o.type === 'hive') {
        s.phase = 'won'
      }
    }

    if (!o.passedByCatcher && s.catcherWorldX > o.worldX) {
      o.passedByCatcher = true

      if (isTrap(o.type) && o.activated && !o.hitCatcher) {
        o.hitCatcher = true
        s.catcherKnockbackTimer = CATCHER_KNOCKBACK_DUR
        s.catcherSlowTimer = CATCHER_SLOW_DUR
        s.catcherSpeed = CATCHER_KNOCKBACK_SPEED
      }
    }

    return o
  })

  // ── Catch check ───────────────────────────────────────────────────────────
  const gap = s.beeWorldX - s.catcherWorldX
  if (gap <= CATCH_THRESHOLD && s.phase === 'playing') {
    s.catchTimer += deltaMs
    if (s.catchTimer > 800) {  // faster catch — 0.8s of contact = caught
      s.phase = 'caught'
    }
  } else {
    s.catchTimer = 0
  }

  return s
}

export function isObstacle(type: WorldObjectType): boolean {
  return type.startsWith('obstacle')
}
export function isTrap(type: WorldObjectType): boolean {
  return type.startsWith('trap')
}
export function getGap(state: BeeScrollerState): number {
  return state.beeWorldX - state.catcherWorldX
}
