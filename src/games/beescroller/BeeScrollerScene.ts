import Phaser from 'phaser'
import { Colors } from '../../shared/assets/ColorPalette'
import { confettiBurst } from '../../shared/assets/ParticlePresets'
import { SoundManager } from '../../shared/audio/SoundManager'
import { MusicManager } from '../../shared/audio/MusicManager'
import { Button } from '../../shared/ui/Button'
import { BeeCharacter } from './BeeCharacter'
import { BeeCatcherCharacter } from './BeeCatcherCharacter'
import {
  createInitialState, updateState, getGap, isObstacle, isTrap,
  type BeeScrollerState, type WorldObject, type WorldObjectType,
  CATCH_THRESHOLD, CATCHER_NORMAL_SPEED, MAX_GAP, TREE_WORLD_XS,
} from './BeeScrollerLogic'
import { BEESCROLLER_THEME_COUNT } from '../../resources/index'

// Screen layout constants
const BEE_SCREEN_X  = 500   // bee's fixed screen X (centre-ish, room for catcher on left)
const BEE_SCREEN_Y  = 360   // bee flies at this Y
const CATCHER_SCREEN_Y = 604 // catcher runs on ground
const GROUND_Y      = 628   // top of ground strip
const WORLD_LENGTH  = 4400  // level total px
const OBJ_HEIGHTS: Record<WorldObjectType, number> = {
  // Ground-anchored (bottom of sprite at GROUND_Y=628)
  'obstacle-flower':   628,  // 90×200 — tall flower
  'obstacle-mushroom': 628,  // 80×110 — mushroom cluster
  // Tree-body (center at top-half of tree; snake height=140, bottom=248+70=318)
  'obstacle-snake':    318,  // 160×140 — snake in top half of tree
  'obstacle-thorns':   628,  // 130×60 — low thorny bush
  'obstacle-lantern':  628,  // 45×160 — floor lamp, lumberjack height
  'honey':             628,  // 70×100 — honey bucket on ground
  'trap-rock':         628,  // 90×55  — rock on ground
  'trap-board':        628,  // 130×85 — board on ground
  // Tree-hanging (bottom of sprite at given Y, hangs down from tree canopy)
  'obstacle-web':      420,  // 100×100 — spider web from tree
  'trap-vine':         490,  // 40×130  — vine from tree
  'hive':              490,  // 90×160  — beehive from tree
}

interface WorldSprite {
  obj: WorldObject
  image: Phaser.GameObjects.Image
  glow?: Phaser.GameObjects.Graphics
  label?: Phaser.GameObjects.Text
}

export class BeeScrollerScene extends Phaser.Scene {
  private state!: BeeScrollerState
  private bee!: BeeCharacter
  private catcher!: BeeCatcherCharacter

  private worldSprites: WorldSprite[] = []
  private clouds: { img: Phaser.GameObjects.TileSprite; speed: number }[] = []
  private groundTile!: Phaser.GameObjects.TileSprite
  private treeSprites: { img: Phaser.GameObjects.Image; worldX: number }[] = []
  private bgDeco: Phaser.GameObjects.Image[] = []

  private eagles: { img: Phaser.GameObjects.Image; x: number; y: number; hit: boolean }[] = []
  private eagleSpawnTimer  = 0
  private eagleNextSpawn   = 4000   // ms until first eagle
  private readonly EAGLE_RADIUS = 55
  private readonly EAGLE_W = 165
  private readonly EAGLE_H = 135
  private level = 1
  private theme = 1
  private primedTraps  = new Map<string, Phaser.Tweens.Tween>()  // id → pulse tween
  private flingedTraps = new Set<string>()                        // ids already flung

  // UI
  private gapBar!: Phaser.GameObjects.Graphics
  private gapBarFill!: Phaser.GameObjects.Graphics
  private statusText!: Phaser.GameObjects.Text
  private hulkTimer!: Phaser.GameObjects.Text
  private distText!: Phaser.GameObjects.Text

  private prevHulk = false
  private gameEnded = false
  private catcherSwinging = false
  private lastObstacleHit = new Set<string>()
  private lastTrapHit = ''
  private levelSeed = 0
  private pendingTrapHit = ''   // trap id about to be triggered (proximity check)
  private prevHulkTimer  = 0    // for countdown beep detection

  // Bee vertical movement
  private beeCurrentY = 360
  private beeTargetY  = 360
  private readonly BEE_MIN_Y    = 140
  private readonly BEE_MAX_Y    = 560
  private readonly BEE_V_SPEED  = 280   // px/s vertical
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private keyW!: Phaser.Input.Keyboard.Key
  private keyS!: Phaser.Input.Keyboard.Key
  private beeVelY = 0                   // for tilt visual
  private obstacleWarningG!: Phaser.GameObjects.Graphics
  private controlHintG!: Phaser.GameObjects.Graphics

  constructor() { super({ key: 'BeeScrollerScene' }) }

  // ──────────────────────────────────────────────────────────────────────────
  create(): void {
    const { width, height } = this.scale
    this.gameEnded = false
    this.prevHulk = false
    this.catcherSwinging = false
    this.lastObstacleHit = new Set<string>()
    this.lastTrapHit = ''
    this.eagles.forEach(e => e.img.destroy())
    this.eagles = []
    this.eagleSpawnTimer = 0
    this.eagleNextSpawn  = 4000
    this.primedTraps.clear()
    this.flingedTraps.clear()

    this.beeCurrentY = 325
    this.beeTargetY  = 325
    this.beeVelY     = 0
    this.pendingTrapHit = ''
    this.prevHulkTimer  = 0
    const data = this.sys.settings.data as { level?: number } | undefined
    this.level = data?.level ?? 1
    this.theme = ((this.level - 1) % BEESCROLLER_THEME_COUNT) + 1
    this.levelSeed = Math.floor(Math.random() * 99999)
    this.state = createInitialState(this.levelSeed, this.level)

    this.setupBackground()
    this.setupWorldObjects()
    this.setupCharacters()
    this.setupUI()
    this.setupInput()

    this.cameras.main.fadeIn(400)
    this.time.delayedCall(500, () => MusicManager.playNormal())

    // Stop music when scene shuts down
    this.events.once('shutdown', () => MusicManager.stop())
  }

  // ── Background ─────────────────────────────────────────────────────────────
  private setupBackground(): void {
    const { width, height } = this.scale

    // Bright blue sky — top to bottom gradient
    const sky = this.add.graphics()
    sky.fillGradientStyle(0x2288EE, 0x2288EE, 0x88CCFF, 0x88CCFF, 1)
    sky.fillRect(0, 0, width, GROUND_Y)

    // Clouds (parallax tileSprites)
    const cloudY  = [65, 120, 50, 100]
    const cloudSp = [0.22, 0.32, 0.18, 0.28]
    for (let i = 0; i < 4; i++) {
      const ts = this.add.tileSprite(0, cloudY[i], width * 3, 80, this.tk('bs-cloud'))
        .setOrigin(0, 0).setAlpha(0.88)
      this.clouds.push({ img: ts, speed: cloudSp[i] })
    }

    // Rolling lime-green hills
    const hills = this.add.graphics()
    hills.fillStyle(0x66CC44)
    for (let x = -80; x < width + 300; x += 220) {
      hills.fillEllipse(x, GROUND_Y + 10, 340, 160)
    }
    // Darker second row for depth
    hills.fillStyle(0x55AA33, 0.7)
    for (let x = 30; x < width + 300; x += 260) {
      hills.fillEllipse(x, GROUND_Y + 20, 300, 120)
    }

    // Trees at fixed world positions — same parallax layer as beehive/lamp/web/vine
    this.treeSprites = []
    for (const wx of TREE_WORLD_XS) {
      const img = this.add.image(this.worldToScreen(wx), GROUND_Y + 40, this.tk('bs-tree'))
        .setOrigin(0.5, 1).setAlpha(0.95).setDepth(2).setDisplaySize(320, 560)
      this.treeSprites.push({ img, worldX: wx })
    }

    // Wrapping bg deco (fence + sunflower) at slower parallax
    this.bgDeco = []
    const decoSpacing = 180
    const decoCount = Math.ceil(width / decoSpacing) + 4
    for (let i = 0; i < decoCount; i++) {
      const x = i * decoSpacing
      const img = i % 2 === 0
        ? this.add.image(x, GROUND_Y, this.tk('bs-sunflower-deco')).setOrigin(0.5, 1).setAlpha(0.8).setDepth(1).setScale(0.9 + (i % 3) * 0.1)
        : this.add.image(x, GROUND_Y, 'bs-fence').setOrigin(0.5, 1).setAlpha(0.9).setDepth(1)
      this.bgDeco.push(img)
    }

    // Bright green grass strip
    const grass = this.add.graphics()
    grass.fillStyle(0x44BB22)
    grass.fillRect(0, GROUND_Y - 14, width, 22)
    // Grass blades
    grass.fillStyle(0x55DD33)
    for (let x = 8; x < width; x += 18) {
      grass.fillTriangle(x, GROUND_Y - 14, x + 7, GROUND_Y - 14, x + 3, GROUND_Y - 30)
      grass.fillTriangle(x + 9, GROUND_Y - 14, x + 15, GROUND_Y - 14, x + 12, GROUND_Y - 25)
    }

    // Ground tile (dirt path)
    this.groundTile = this.add.tileSprite(0, GROUND_Y, width * 2, 140, this.tk('bs-ground'))
      .setOrigin(0, 0)

    // Dirt path edge line
    const pathEdge = this.add.graphics()
    pathEdge.lineStyle(3, 0xA07030, 0.7)
    pathEdge.lineBetween(0, GROUND_Y, width, GROUND_Y)
  }

  // ── World Objects ──────────────────────────────────────────────────────────
  private setupWorldObjects(): void {
    for (const obj of this.state.worldObjects) {
      if (obj.type === 'hive') {
        const img = this.add.image(0, OBJ_HEIGHTS[obj.type], 'bs-hive')
          .setOrigin(0.5, 1).setDepth(3)
        // Animate hive glow
        this.tweens.add({ targets: [img], alpha: 0.85, yoyo: true, repeat: -1, duration: 800 })
        this.worldSprites.push({ obj: this.state.worldObjects.find(o => o.id === obj.id)!, image: img })
        continue
      }

      const key = this.getTextureKey(obj.type)
      const img = this.add.image(0, OBJ_HEIGHTS[obj.type], key)
        .setOrigin(0.5, 1).setDepth(3)

      // Explicit display sizes / orientations
      if (obj.type === 'obstacle-snake') img.setDisplaySize(160, 140)
      if (obj.type === 'trap-board') img.setAngle(90)  // stand upright like a fence plank

      // Glow only for traps and honey (interactive) — obstacles have no glow/hints
      let glow: Phaser.GameObjects.Graphics | undefined
      let label: Phaser.GameObjects.Text | undefined

      if (obj.type === 'honey' || isTrap(obj.type)) {
        glow = this.add.graphics().setDepth(2)

        // Label only for honey (traps are distinguished by glow color alone)
        if (obj.type === 'honey') {
          label = this.add.text(0, OBJ_HEIGHTS[obj.type] - this.getObjHeight(obj.type) - 14,
            '👆 TAP!', {
              fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
              fontSize: '16px', color: '#FFEE00',
              stroke: '#000000', strokeThickness: 3,
            }).setOrigin(0.5, 1).setDepth(5)
        }

        // Pulse animation
        this.tweens.add({ targets: img, scaleY: 1.06, yoyo: true, repeat: -1, duration: 500 })

        // Make interactive
        img.setInteractive({ useHandCursor: true })
        img.on('pointerdown', () => this.handleObjectTap(obj.id))
      }

      this.worldSprites.push({
        obj: this.state.worldObjects.find(o => o.id === obj.id)!,
        image: img, glow, label,
      })
    }
  }

  // Returns a themed texture key (t = theme number)
  private tk(base: string): string {
    return `${base}-t${this.theme}`
  }

  private getTextureKey(type: WorldObjectType): string {
    const map: Record<WorldObjectType, string> = {
      'obstacle-flower':   this.tk('bs-flower'),
      'obstacle-web':      'bs-web',
      'obstacle-snake':    'bs-snake',
      'obstacle-mushroom': this.tk('bs-mushroom'),
      'obstacle-thorns':   this.tk('bs-thorns'),
      'obstacle-lantern':  'bs-lantern',
      'honey':             'bs-honey',
      'trap-rock':         'bs-rock',
      'trap-board':        'bs-board',
      'trap-vine':         this.tk('bs-vine'),
      'hive':              'bs-hive',
    }
    return map[type]
  }

  private getObjHeight(type: WorldObjectType): number {
    // Half the display height — used for glow center and label offset
    const heights: Partial<Record<WorldObjectType, number>> = {
      'obstacle-flower': 100, 'obstacle-web': 50, 'obstacle-snake': 70,
      'obstacle-mushroom': 55, 'obstacle-thorns': 30, 'obstacle-lantern': 80,
      'honey': 50, 'trap-rock': 28, 'trap-board': 43, 'trap-vine': 65,
    }
    return heights[type] ?? 80
  }

  // ── Characters ─────────────────────────────────────────────────────────────
  private setupCharacters(): void {
    this.catcher = new BeeCatcherCharacter(this, -200, CATCHER_SCREEN_Y)
    this.bee = new BeeCharacter(this, BEE_SCREEN_X, this.beeCurrentY)
    this.bee.setDepth(6)
    this.catcher.setDepth(5)

    // Warning zone indicator (drawn per-frame)
    this.obstacleWarningG = this.add.graphics().setDepth(4)
    // Control hints drawn beside bee
    this.controlHintG = this.add.graphics().setDepth(7)
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  private setupInput(): void {
    // Keyboard
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W)
    this.keyS = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S)

    // Touch / mouse: drag or tap anywhere (except interactive objects)
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.gameEnded) return
      if (ptr.isDown) {
        this.beeTargetY = Phaser.Math.Clamp(ptr.y, this.BEE_MIN_Y, this.BEE_MAX_Y)
      }
    })
    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer) => {
      if (this.gameEnded) return
      this.beeTargetY = Phaser.Math.Clamp(ptr.y, this.BEE_MIN_Y, this.BEE_MAX_Y)
    })
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  private setupUI(): void {
    const { width } = this.scale

    // Gap danger bar (top)
    const barBg = this.add.graphics().setDepth(20)
    barBg.fillStyle(0x000000, 0.4)
    barBg.fillRoundedRect(width / 2 - 200, 12, 400, 22, 11)

    this.gapBar = this.add.graphics().setDepth(21)
    this.gapBarFill = this.add.graphics().setDepth(21)

    this.add.text(width / 2 - 196, 14, '🐝', { fontSize: '14px' }).setDepth(22)
    this.add.text(width / 2 + 174, 14, '🪓', { fontSize: '14px' }).setDepth(22)

    // Status text
    this.statusText = this.add.text(width / 2, 46, '', {
      fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
      fontSize: '22px', color: '#FFFFFF',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(22)

    // Hulk timer
    this.hulkTimer = this.add.text(width - 20, 14, '', {
      fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
      fontSize: '18px', color: '#44FF44',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(1, 0).setDepth(22)

    // Distance to hive
    this.distText = this.add.text(20, 14, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px', color: '#FFFFFF',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0, 0).setDepth(22)

    // Instructions
    this.add.text(width / 2, 760, '↑↓ / W·S / Drag = Fly  |  Tap honey = Hulk 💪  |  Tap traps = Slow catcher 🪤', {
      fontFamily: 'Arial, sans-serif', fontSize: '13px', color: '#FFFFFF99',
    }).setOrigin(0.5, 1).setDepth(22)

    // Back button
    const back = new Button(this, {
      x: 60, y: 36, width: 100, height: 40,
      label: '← Hub', fillColor: 0x334466, fontSize: 16, radius: 12,
    })
    back.on('pointerup', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameHubScene'))
    })
  }

  // ── Object tap handler ─────────────────────────────────────────────────────
  private handleObjectTap(objId: string): void {
    const sprite = this.worldSprites.find(s => s.obj.id === objId)
    if (!sprite) return
    const obj = this.state.worldObjects.find(o => o.id === objId)
    if (!obj || obj.activated) return
    // Honey must be ahead of the bee; traps can be activated even after bee passes them
    if (obj.type === 'honey' && obj.passedByBee) return

    if (obj.type === 'honey' && !this.state.isHulk) {
      // Activate hulk
      this.state.worldObjects = this.state.worldObjects.map(o =>
        o.id === objId ? { ...o, activated: true } : o)
      SoundManager.win()
      this.flashObject(sprite.image)
      this.statusText.setText('🍯 HONEY POWER! Hulk Bee incoming! 💪')
      this.time.delayedCall(1500, () => this.statusText.setText(''))

    } else if (isTrap(obj.type) && this.state.isHulk) {
      // ── Phase 1: Prime the trap ──────────────────────────────────────────
      this.state.worldObjects = this.state.worldObjects.map(o =>
        o.id === objId ? { ...o, activated: true } : o)
      SoundManager.tokenPlace()
      this.bee.setTrapSet()

      // Destroy normal glow; replace with primed pulse on the sprite itself
      if (sprite.glow) { sprite.glow.destroy(); sprite.glow = undefined }
      if (sprite.label) sprite.label.setVisible(false)
      sprite.image.setTint(0xFFEE00)
      const pulseTween = this.tweens.add({
        targets: sprite.image, alpha: 0.35, yoyo: true, repeat: -1, duration: 180,
      })
      this.primedTraps.set(objId, pulseTween)

      this.statusText.setText('⚡ Trap primed! Bee will fling it!')
      this.time.delayedCall(1500, () => this.statusText.setText(''))
    }
  }

  // ── Phase 2: fling when bee reaches primed trap ────────────────────────────
  private checkTrapFlings(): void {
    for (const ws of this.worldSprites) {
      if (!isTrap(ws.obj.type) || this.flingedTraps.has(ws.obj.id)) continue
      const current = this.state.worldObjects.find(o => o.id === ws.obj.id)
      if (!current?.activated || !current.passedByBee) continue

      this.flingedTraps.add(ws.obj.id)

      // Stop primed pulse
      const pt = this.primedTraps.get(ws.obj.id)
      if (pt) { pt.stop(); this.primedTraps.delete(ws.obj.id) }
      ws.image.setVisible(false).clearTint().setAlpha(1)

      this.flingTrap(current, ws.image.x)
    }
  }

  private flingTrap(obj: WorldObject, startScreenX: number): void {
    const landY        = CATCHER_SCREEN_Y + 10
    const targetWorldX = this.state.catcherWorldX + 80
    const endSx        = this.worldToScreen(this.state.catcherWorldX) + 50

    if (obj.type === 'trap-rock') {
      const throwImg = this.add.image(startScreenX, GROUND_Y, 'bs-rock')
        .setDisplaySize(50, 35).setDepth(6)
      const peakY = landY - 200

      this.tweens.add({ targets: throwImg, x: endSx, duration: 600, ease: 'Linear' })
      this.tweens.add({ targets: throwImg, angle: 720, duration: 600, ease: 'Linear' })
      this.tweens.add({
        targets: throwImg, y: peakY, duration: 300, ease: 'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: throwImg, y: landY, duration: 300, ease: 'Bounce.easeIn',
            onComplete: () => {
              throwImg.destroy()
              this.state.worldObjects = this.state.worldObjects.map(o =>
                o.id === obj.id ? { ...o, worldX: targetWorldX } : o)
            },
          })
        },
      })
      this.statusText.setText('🪨 Rock flung at the catcher!')

    } else if (obj.type === 'trap-board') {
      const catcherY = CATCHER_SCREEN_Y - 80
      const peakY    = catcherY - 180
      const throwImg = this.add.image(startScreenX, GROUND_Y, 'bs-board')
        .setOrigin(0.5, 0.5).setDepth(6).setAngle(90)

      this.tweens.add({ targets: throwImg, x: endSx, duration: 500, ease: 'Linear' })
      this.tweens.add({ targets: throwImg, angle: 90 + 720, duration: 500, ease: 'Linear' })
      this.tweens.add({
        targets: throwImg, y: peakY, duration: 250, ease: 'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({
            targets: throwImg, y: catcherY, duration: 250, ease: 'Bounce.easeIn',
            onComplete: () => {
              throwImg.destroy()
              this.state.worldObjects = this.state.worldObjects.map(o =>
                o.id === obj.id ? { ...o, worldX: targetWorldX } : o)
            },
          })
        },
      })
      this.statusText.setText('🪵 Plank flung at the catcher!')

    } else {
      // Vine: just vanishes (already hidden above)
      this.state.worldObjects = this.state.worldObjects.map(o =>
        o.id === obj.id ? { ...o, worldX: targetWorldX } : o)
      this.statusText.setText('🪤 Vine trap triggered!')
    }

    this.time.delayedCall(1500, () => this.statusText.setText(''))
  }

  private flashObject(img: Phaser.GameObjects.Image, color = 0xFFFFFF): void {
    img.setTint(color)
    this.tweens.add({ targets: img, scaleX: 1.3, scaleY: 1.3, duration: 150, yoyo: true })
    this.time.delayedCall(400, () => img.clearTint())
  }

  // ── Update ─────────────────────────────────────────────────────────────────
  update(time: number, delta: number): void {
    if (this.gameEnded) return

    // ── Bee vertical movement ───────────────────────────────────────────────
    const dt = delta / 1000

    // Keyboard adjusts target Y continuously
    if (this.cursors.up.isDown   || this.keyW.isDown)
      this.beeTargetY = Math.max(this.BEE_MIN_Y, this.beeTargetY - this.BEE_V_SPEED * dt)
    if (this.cursors.down.isDown || this.keyS.isDown)
      this.beeTargetY = Math.min(this.BEE_MAX_Y, this.beeTargetY + this.BEE_V_SPEED * dt)

    // Smooth current Y toward target
    const prevY = this.beeCurrentY
    const diff = this.beeTargetY - this.beeCurrentY
    const step = this.BEE_V_SPEED * 1.4 * dt
    this.beeCurrentY = Math.abs(diff) < step
      ? this.beeTargetY
      : this.beeCurrentY + Math.sign(diff) * step

    this.beeVelY = (this.beeCurrentY - prevY) / dt  // px/s, for tilt

    // Push beeY into state so logic can use it for Y-collision
    this.state.beeY = this.beeCurrentY

    this.state = updateState(this.state, delta)

    if (this.state.phase === 'caught') { this.handleCatch(); return }
    if (this.state.phase === 'won')    { this.handleWin();   return }

    if (this.state.hulkRepelEvent) {
      this.catcher.setHurt()
      this.statusText.setText('💪 Hulk Bee repels the catcher!')
      this.time.delayedCall(2000, () => this.statusText.setText(''))
    }

    this.updateCharacterPositions()
    this.updateWorldSprites()
    this.updateEagles(delta)
    this.checkTrapFlings()
    this.updateObstacleWarnings()
    this.updateAnimations()
    this.updateUI()

    this.bee.update(time, this.beeVelY)
  }

  private worldToScreen(worldX: number): number {
    return worldX - this.state.beeWorldX + BEE_SCREEN_X
  }

  private updateCharacterPositions(): void {
    // Bee: fixed screen X, player-controlled Y
    this.bee.x = BEE_SCREEN_X
    this.bee.y = this.beeCurrentY

    // Catcher position: world-to-screen; logic already caps gap so catcher is always on screen
    const catcherScreenX = this.worldToScreen(this.state.catcherWorldX)
    this.catcher.x = Math.max(BEE_SCREEN_X - MAX_GAP, catcherScreenX)

    // Catcher run speed visual feedback — runs faster when gap is closing
    const gap = getGap(this.state)
    this.catcher.setRunSpeed(gap < 220)

    // Swing net when very close (within net reach)
    if (gap < CATCH_THRESHOLD + 40 && !this.catcherSwinging) {
      this.catcherSwinging = true
      this.catcher.startSwing()
    } else if (gap >= CATCH_THRESHOLD + 80 && this.catcherSwinging) {
      this.catcherSwinging = false
      this.catcher.stopSwing()
    }
  }

  private updateWorldSprites(): void {
    for (const ws of this.worldSprites) {
      const sx = this.worldToScreen(ws.obj.worldX)
      ws.image.x = sx
      if (ws.label) ws.label.x = sx
      if (ws.glow) {
        ws.glow.clear()
        if (!ws.obj.activated && !ws.obj.passedByBee) {
          const t = Date.now() * 0.003
          const pulse = 0.35 + Math.sin(t * 2.2) * 0.28
          if (ws.obj.type === 'honey') {
            // Golden glow for honey
            ws.glow.fillStyle(0xFFDD00, pulse)
            ws.glow.fillCircle(sx, ws.image.y - this.getObjHeight(ws.obj.type) / 2, 46)
          } else {
            // Traps: bright green glow — distinct from obstacles
            ws.glow.fillStyle(0x00FF88, pulse * 0.9)
            ws.glow.fillCircle(sx, ws.image.y - this.getObjHeight(ws.obj.type) / 2, 44)
            // Second ring for extra visibility
            ws.glow.lineStyle(3, 0x00FF88, pulse * 0.6)
            ws.glow.strokeCircle(sx, ws.image.y - this.getObjHeight(ws.obj.type) / 2, 52)
          }
        }
      }

      // Hide if far off screen
      const visible = sx > -200 && sx < this.scale.width + 200
      ws.image.setVisible(visible)
      if (ws.label) ws.label.setVisible(visible && !ws.obj.activated && !ws.obj.passedByBee)
      if (ws.glow)  ws.glow.setVisible(visible)
    }

    // Scroll parallax
    this.groundTile.tilePositionX = this.state.beeWorldX
    this.clouds.forEach(c => { c.img.tilePositionX += c.speed })

    // Trees track world positions exactly (same layer as world objects)
    for (const { img, worldX } of this.treeSprites) {
      const sx = this.worldToScreen(worldX)
      img.x = sx
      img.setVisible(sx > -400 && sx < this.scale.width + 400)
    }

    // Wrapping bg deco scrolls at 0.65x (slow parallax)
    const W = this.scale.width + 200
    this.bgDeco.forEach((d, i) => {
      const raw = 40 + i * 180 - this.state.beeWorldX * 0.65
      d.x = (raw % W + W) % W - 100
    })
  }

  private updateObstacleWarnings(): void {
    this.obstacleWarningG.clear()
    this.controlHintG.clear()
  }

  private updateEagles(delta: number): void {
    const dt = delta / 1000
    const speed = this.state.beeSpeed * 2  // 2x world scroll speed

    for (const eagle of this.eagles) {
      eagle.x -= speed * dt
      eagle.img.x = eagle.x

      if (!eagle.hit) {
        const dx = eagle.x - BEE_SCREEN_X
        const dy = eagle.y - this.beeCurrentY
        if (Math.sqrt(dx * dx + dy * dy) < this.EAGLE_RADIUS + 22) {
          eagle.hit = true
          this.bee.setHurt()
          this.statusText.setText('🦅 Eagle strike!')
          this.time.delayedCall(2000, () => this.statusText.setText(''))
        }
      }
    }

    // Remove eagles that flew off screen left
    this.eagles = this.eagles.filter(e => {
      if (e.x < -200) { e.img.destroy(); return false }
      return true
    })

    // Spawn timer
    this.eagleSpawnTimer += delta
    if (this.eagleSpawnTimer >= this.eagleNextSpawn && this.state.phase === 'playing') {
      this.eagleSpawnTimer = 0
      this.eagleNextSpawn = 8000 + Math.random() * 6000  // every 8–14 s
      const y = 60 + Math.random() * 140  // near clouds (y=60–200)
      const startX = this.scale.width + 100
      const img = this.add.image(startX, y, 'bs-eagle')
        .setDisplaySize(this.EAGLE_W, this.EAGLE_H).setDepth(4)
      this.eagles.push({ img, x: startX, y, hit: false })
    }
  }

  private updateAnimations(): void {
    // Bee just got hurt by obstacle
    const hitObstacle = this.state.worldObjects.find(
      o => isObstacle(o.type) && o.hitBee && !this.lastObstacleHit.has(o.id)
    )
    if (hitObstacle) {
      this.lastObstacleHit.add(hitObstacle.id)
      this.bee.setHurt()
      this.statusText.setText('🌸 Bee hit the obstacle! Catcher is gaining!')
      this.time.delayedCall(2000, () => this.statusText.setText(''))
    }

    // Show "dodged!" feedback
    const justDodged = this.state.worldObjects.find(
      o => isObstacle(o.type) && o.dodged && !o.hitBee && o.passedByBee && !this.lastObstacleHit.has(o.id)
    )
    if (justDodged) {
      this.lastObstacleHit.add(justDodged.id)
      this.statusText.setText('✨ Nice dodge! Gap stays wide!')
      this.time.delayedCall(1500, () => this.statusText.setText(''))
    }

    // Hulk transformation
    if (this.state.isHulk && !this.prevHulk) {
      this.prevHulk = true
      this.bee.setHulk()
      this.statusText.setText('💪 HULK BEE! Set those traps! You have 10 seconds!')
      MusicManager.playHulk()
    }

    // Hulk reverting
    if (!this.state.isHulk && this.prevHulk) {
      this.prevHulk = false
      this.bee.revertNormal()
      this.statusText.setText('⚠️ Hulk mode ended! Race for the hive!')
      this.time.delayedCall(2500, () => this.statusText.setText(''))
      MusicManager.revertNormal()
    }

    // Countdown beeps when hulk is about to expire
    if (this.state.isHulk) {
      MusicManager.tickCountdown(this.state.hulkTimer, this.prevHulkTimer)
      this.prevHulkTimer = this.state.hulkTimer
    }

    // Catcher approaching an activated trap — trigger hurt the moment they overlap
    for (const o of this.state.worldObjects) {
      if (!isTrap(o.type) || !o.activated || o.id === this.lastTrapHit) continue
      const trapScreenX  = this.worldToScreen(o.worldX)
      const catchScreenX = this.catcher.x
      if (catchScreenX + 30 >= trapScreenX && catchScreenX < trapScreenX + 80) {
        this.lastTrapHit = o.id
        this.catcher.setHurt()
        this.statusText.setText('😵 Catcher hit the trap! Bee flies ahead!')
        this.time.delayedCall(2000, () => this.statusText.setText(''))
      }
    }
  }

  private updateUI(): void {
    const gap = getGap(this.state)
    const maxGap = MAX_GAP

    // Gap danger bar
    this.gapBarFill.clear()
    const fillRatio = Math.min(gap / maxGap, 1)
    const barX = this.scale.width / 2 - 196
    const barW = 392 * fillRatio
    const barColor = fillRatio > 0.6 ? 0x44CC44 : fillRatio > 0.3 ? 0xFFCC00 : 0xFF4444
    this.gapBarFill.fillStyle(barColor)
    this.gapBarFill.fillRoundedRect(barX, 13, barW, 20, 10)

    // Danger pulse when very close
    if (fillRatio < 0.2) {
      this.gapBarFill.fillStyle(0xFF0000, 0.3)
      this.gapBarFill.fillRoundedRect(barX, 13, 392, 20, 10)
    }

    // Hulk countdown
    if (this.state.isHulk && this.state.hulkTimer > 0) {
      const secs = Math.ceil(this.state.hulkTimer / 1000)
      this.hulkTimer.setText(`💪 ${secs}s`)
      this.hulkTimer.setColor(secs <= 3 ? '#FF4444' : '#44FF44')
    } else {
      this.hulkTimer.setText('')
    }

    // Distance to hive
    const hiveObj = this.state.worldObjects.find(o => o.type === 'hive')
    if (hiveObj && !hiveObj.passedByBee) {
      const dist = Math.max(0, Math.round(hiveObj.worldX - this.state.beeWorldX))
      this.distText.setText(`🏠 ${dist}m to hive`)
    }
  }

  // ── End states ─────────────────────────────────────────────────────────────
  private handleCatch(): void {
    if (this.gameEnded) return
    this.gameEnded = true
    MusicManager.stop()

    this.bee.setCaught()
    this.catcher.setCatch(BEE_SCREEN_X, BEE_SCREEN_Y)
    SoundManager.draw()
    this.cameras.main.shake(500, 0.015)

    // Net closes over bee position
    this.time.delayedCall(600, () => {
      this.showEndBanner('🪣 Caught! The bee catcher wins! 😭', Colors.xRed, false)
    })
  }

  private handleWin(): void {
    if (this.gameEnded) return
    this.gameEnded = true
    MusicManager.stop()

    SoundManager.win()
    this.cameras.main.flash(500, 255, 220, 0)

    // Big confetti
    for (let i = 0; i < 6; i++) {
      this.time.delayedCall(i * 120, () => {
        confettiBurst(this, Phaser.Math.Between(200, 800), 300)
      })
    }
    this.showEndBanner('🎉 The Bee Made It Home! YOU WIN! 🍯', Colors.gold, true)
  }

  private showEndBanner(message: string, color: number, isWin: boolean): void {
    const { width, height } = this.scale
    const panel = this.add.graphics().setDepth(30)
    panel.fillStyle(0x000000, 0.75)
    panel.fillRect(0, 0, width, height)

    const banner = this.add.container(width / 2, height / 2 - 40).setDepth(31)
    const bg = this.add.graphics()
    bg.fillStyle(0x0A0A1A, 0.96)
    bg.fillRoundedRect(-320, -70, 640, 140, 28)
    bg.lineStyle(4, color, 0.9)
    bg.strokeRoundedRect(-320, -70, 640, 140, 28)

    const txt = this.add.text(0, 0, message, {
      fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
      fontSize: '30px', color: '#FFFFFF',
      stroke: '#00000066', strokeThickness: 3,
      wordWrap: { width: 580 }, align: 'center',
    }).setOrigin(0.5)

    banner.add([bg, txt])
    banner.setScale(0)
    this.tweens.add({ targets: banner, scaleX: 1, scaleY: 1, duration: 400, ease: 'Back.easeOut' })

    this.time.delayedCall(800, () => {
      if (isWin) {
        new Button(this, {
          x: width / 2 - 210, y: height / 2 + 80,
          width: 180, height: 52, label: '▶ Next Level',
          fillColor: Colors.gold, fontSize: 21, depth: 32,
        })
          .on('pointerup', () => this.scene.start('BeeScrollerScene', { level: this.level + 1 }))
      }

      new Button(this, {
        x: isWin ? width / 2 : width / 2 - 140, y: height / 2 + 80,
        width: 200, height: 52, label: '↺ Play Again',
        fillColor: Colors.green, fontSize: 21, depth: 32,
      })
        .on('pointerup', () => this.scene.restart())

      new Button(this, {
        x: isWin ? width / 2 + 210 : width / 2 + 140, y: height / 2 + 80,
        width: 200, height: 52, label: '🏠 Menu',
        fillColor: Colors.navyLight, fontSize: 21, depth: 32,
      })
        .on('pointerup', () => {
          this.cameras.main.fadeOut(300, 0, 0, 0)
          this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameHubScene'))
        })
    })
  }
}
