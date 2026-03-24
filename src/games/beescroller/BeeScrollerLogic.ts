// ── Constants ─────────────────────────────────────────────────────────────────
export const BEE_NORMAL_SPEED        = 125   // px/s
export const BEE_SLOWED_SPEED        = 38    // px/s during obstacle hit
export const BEE_HULK_SPEED          = 158   // px/s while hulk
export const CATCHER_NORMAL_SPEED    = 150   // px/s (faster than bee — gap closes steadily)
export const CATCHER_SLOWED_SPEED    = 50    // px/s after knockback ends
export const CATCHER_KNOCKBACK_SPEED = -95   // px/s — flies backward on trap hit
export const CATCH_THRESHOLD         = 115   // px gap → trigger catch
export const MAX_GAP                 = 500   // px — catcher starts at left edge of screen
export const SLOWDOWN_DURATION       = 5000  // ms bee is slowed per obstacle
export const CATCHER_KNOCKBACK_DUR   = 900   // ms catcher flies backward
export const CATCHER_SLOW_DUR        = 2800  // ms catcher creeps after knockback
export const HULK_DURATION           = 10000 // ms
export const INITIAL_GAP             = 500   // starting gap px — catcher at left edge (screen x=0)

export type WorldObjectType =
  | 'obstacle-flower' | 'obstacle-web' | 'obstacle-snake'
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
  beeSlowedSpeed: number  // level-dependent: BEE_NORMAL_SPEED * (1 - level*0.05)
  hulkRepelEvent: boolean // fired once when hulk bee repels the catcher
}

// ── World layout ──────────────────────────────────────────────────────────────
type WorldObjectSeed = Omit<WorldObject, 'activated'|'passedByBee'|'passedByCatcher'|'hitBee'|'hitCatcher'|'dodged'>

const OBSTACLE_TYPES: WorldObjectType[] = [
  'obstacle-flower', 'obstacle-web', 'obstacle-snake',
  'obstacle-mushroom', 'obstacle-thorns', 'obstacle-lantern',
]
const TRAP_TYPES: WorldObjectType[] = ['trap-rock', 'trap-rock', 'trap-rock', 'trap-board', 'trap-vine']

// Fixed tree world positions — used by the scene to render trees and to snap
// vine / branch / beehive / web to the correct tree.
export const TREE_WORLD_XS: number[] = Array.from({ length: 13 }, (_, i) => 400 + i * 600)
// → 400, 1000, 1600, 2200, 2800, 3400, 4000, 4600, 5200, 5800, 6400, 7000, 7600

function snapToTree(x: number, offset = 0): number {
  return TREE_WORLD_XS.reduce((best, wx) =>
    Math.abs(wx - x) < Math.abs(best - x) ? wx : best
  ) + offset
}

// Visual center Y for each obstacle — derived from OBJ_HEIGHTS and sprite display height.
// These MUST stay in sync with OBJ_HEIGHTS and sprite sizes in BeeScrollerScene.ts.
export const OBSTACLE_HIT_CENTER_Y: Partial<Record<WorldObjectType, number>> = {
  'obstacle-flower':   528,  // ground (628) - half of 200px height
  'obstacle-web':      370,  // hang Y (420) - half of 100px height
  'obstacle-snake':    248,  // top half of tree (tree top=108, center of top half=248)
  'obstacle-mushroom': 573,  // ground (628) - half of 110px height
  'obstacle-thorns':   598,  // ground (628) - half of 60px height
}

// Hit radius per obstacle — roughly half the narrower visual dimension
export const OBSTACLE_R_MAP: Record<string, number> = {
  'obstacle-flower':   44,   // half of 90px width
  'obstacle-web':      46,   // half of 100px
  'obstacle-snake':    55,   // snake coiled on tree trunk
  'obstacle-mushroom': 38,   // half of 80px width
  'obstacle-thorns':   32,   // half of 60px height (low bush)
  'obstacle-lantern':   0,   // no hitbox
}

// Purely visual — bee flies through without penalty
const PASSTHROUGH_OBSTACLES = new Set<WorldObjectType>(['obstacle-lantern'])

function seededRand(seed: number): () => number {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

export function generateWorldObjects(seed = 42): WorldObjectSeed[] {
  const rand = seededRand(seed)
  const objects: WorldObjectSeed[] = []
  const LEVEL_LENGTH = 7200
  const HONEY_X      = 1500

  // ── Pre-honey: 5–7 obstacles ──────────────────────────────────────────────
  let x = 440
  const preCount = 5 + Math.floor(rand() * 3)
  for (let i = 0; i < preCount; i++) {
    const type = OBSTACLE_TYPES[Math.floor(rand() * OBSTACLE_TYPES.length)]
    const hitCenterY = OBSTACLE_HIT_CENTER_Y[type] ?? 400
    const hitRadius  = OBSTACLE_R_MAP[type] ?? 40
    objects.push({ id: `obs_pre_${i}`, type, worldX: x, hitCenterY, hitRadius })
    x += 200 + Math.floor(rand() * 120)
  }

  // ── Honey bucket 1 ───────────────────────────────────────────────────────
  objects.push({ id: 'honey_1', type: 'honey', worldX: HONEY_X })

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

    const type = OBSTACLE_TYPES[Math.floor(rand() * OBSTACLE_TYPES.length)]
    const hitCenterY = OBSTACLE_HIT_CENTER_Y[type] ?? 400
    const hitRadius  = OBSTACLE_R_MAP[type] ?? 40
    objects.push({ id: `obs_hulk_${i}`, type, worldX: x, hitCenterY, hitRadius })
    x += 190 + Math.floor(rand() * 110)
  }

  // ── Honey bucket 2 (mid-hulk recovery) ───────────────────────────────────
  objects.push({ id: 'honey_2', type: 'honey', worldX: x })
  x += 420

  // ── Post-hulk sprint: obstacles with traps every 3rd ─────────────────────
  const postCount = 5 + Math.floor(rand() * 4)
  for (let i = 0; i < postCount; i++) {
    if (i % 3 === 0) {
      const trapType = TRAP_TYPES[Math.floor(rand() * TRAP_TYPES.length)]
      objects.push({ id: `trap_post_${i}`, type: trapType, worldX: x })
      x += 200 + Math.floor(rand() * 100)
    }

    const type = OBSTACLE_TYPES[Math.floor(rand() * OBSTACLE_TYPES.length)]
    const hitCenterY = OBSTACLE_HIT_CENTER_Y[type] ?? 400
    const hitRadius  = OBSTACLE_R_MAP[type] ?? 40
    objects.push({ id: `obs_post_${i}`, type, worldX: x, hitCenterY, hitRadius })
    x += 180 + Math.floor(rand() * 100)
  }

  // ── Honey bucket 3 (pre-hive boost) ──────────────────────────────────────
  objects.push({ id: 'honey_3', type: 'honey', worldX: x })

  // ── Hive at the end ───────────────────────────────────────────────────────
  objects.push({ id: 'hive', type: 'hive', worldX: Math.max(x + 400, LEVEL_LENGTH) })

  // ── Snap tree-attached objects to nearest tree worldX ─────────────────────
  const TREE_HANGING = new Set(['obstacle-web', 'obstacle-snake', 'trap-vine', 'hive'])
  for (const o of objects) {
    if (!TREE_HANGING.has(o.type)) continue
    o.worldX = snapToTree(o.worldX)
  }

  return objects
}

export const WORLD_OBJECTS = generateWorldObjects()

export function createInitialState(seed?: number, level = 1): BeeScrollerState {
  const objects = seed !== undefined ? generateWorldObjects(seed) : WORLD_OBJECTS
  const beeSlowedSpeed = Math.round(BEE_NORMAL_SPEED * Math.max(0.05, 1 - level * 0.05))
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
    hulkRepelEvent: false,
    beeSlowedSpeed,
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
      ? s.beeSlowedSpeed
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

      if (isObstacle(o.type) && !PASSTHROUGH_OBSTACLES.has(o.type) && !s.isHulk && !o.hitBee) {
        const hitY  = o.hitCenterY ?? 325
        const radius = o.hitRadius ?? 52
        if (Math.abs(s.beeY - hitY) < radius) {
          o.hitBee = true
          s.beeSlowTimer = SLOWDOWN_DURATION
          s.beeSpeed = s.beeSlowedSpeed
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
  s.hulkRepelEvent = false
  const gap = s.beeWorldX - s.catcherWorldX
  if (gap <= CATCH_THRESHOLD && s.phase === 'playing') {
    if (s.isHulk) {
      // Hulk bee repels the catcher — trigger knockback, cannot catch
      if (s.catcherKnockbackTimer === 0) {
        s.hulkRepelEvent = true
        s.catcherKnockbackTimer = CATCHER_KNOCKBACK_DUR
        s.catcherSlowTimer = CATCHER_SLOW_DUR
        s.catcherSpeed = CATCHER_KNOCKBACK_SPEED
      }
      s.catchTimer = 0
    } else {
      s.catchTimer += deltaMs
      if (s.catchTimer > 800) {  // faster catch — 0.8s of contact = caught
        s.phase = 'caught'
      }
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
