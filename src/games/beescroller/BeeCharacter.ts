import Phaser from 'phaser'

function drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, pts: number, outer: number, inner: number): void {
  const points: { x: number; y: number }[] = []
  for (let i = 0; i < pts * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (i / (pts * 2)) * Math.PI * 2 - Math.PI / 2
    points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
  }
  g.fillPoints(points, true)
}

export type BeeAnimState = 'fly' | 'hurt' | 'transform-hulk' | 'hulk' | 'revert' | 'caught' | 'trap-set'

export class BeeCharacter extends Phaser.GameObjects.Container {
  private bodyG!: Phaser.GameObjects.Graphics
  private wingLCont!: Phaser.GameObjects.Container
  private wingRCont!: Phaser.GameObjects.Container
  private fxG!: Phaser.GameObjects.Graphics
  private innerBody!: Phaser.GameObjects.Container

  private animState: BeeAnimState = 'fly'
  private _isHulk = false
  private hurtFlash = false
  private hurtTimer = 0
  private fxAngle = 0

  private flyTweens: Phaser.Tweens.Tween[] = []

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)
    this.build()
    scene.add.existing(this)
    this.startFlyTweens()
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  private build(): void {
    this.innerBody = this.scene.add.container(0, 0)

    // Wings — bigger, more visible
    this.wingLCont = this.scene.add.container(-18, -28)
    const wL = this.scene.add.graphics()
    wL.fillStyle(0xDDF5FF, 0.78)
    wL.fillEllipse(0, -18, 42, 24)
    wL.lineStyle(1.5, 0x88CCFF, 0.6)
    wL.strokeEllipse(0, -18, 42, 24)
    this.wingLCont.add(wL)

    this.wingRCont = this.scene.add.container(18, -28)
    const wR = this.scene.add.graphics()
    wR.fillStyle(0xDDF5FF, 0.78)
    wR.fillEllipse(0, -18, 42, 24)
    wR.lineStyle(1.5, 0x88CCFF, 0.6)
    wR.strokeEllipse(0, -18, 42, 24)
    this.wingRCont.add(wR)

    this.bodyG = this.scene.add.graphics()
    this.fxG = this.scene.add.graphics()

    this.innerBody.add([this.wingLCont, this.wingRCont, this.bodyG, this.fxG])
    this.add(this.innerBody)

    this.drawBody()
  }

  // ── Drawing ───────────────────────────────────────────────────────────────
  private drawBody(): void {
    const g = this.bodyG
    g.clear()

    const sc = this._isHulk ? 1.22 : 1
    const bodyColor = this._isHulk ? 0x44DD55 : (this.hurtFlash ? 0xFF5555 : 0xFFDD00)
    const darkColor = this._isHulk ? 0x116611 : 0x1A1A00

    // Stinger (pointed tail)
    g.fillStyle(this._isHulk ? 0x229933 : 0xFFAA00)
    g.fillTriangle(-38 * sc, 0, -24 * sc, -9 * sc, -24 * sc, 9 * sc)

    // Big round body
    g.fillStyle(bodyColor)
    g.fillEllipse(0, 0, 62 * sc, 50 * sc)

    // Bold black stripes
    g.fillStyle(darkColor, 0.88)
    g.fillRect(-13 * sc, -25 * sc, 11 * sc, 50 * sc)
    g.fillRect(4 * sc, -25 * sc, 11 * sc, 50 * sc)

    // Head (bigger, round)
    g.fillStyle(bodyColor)
    g.fillCircle(40 * sc, -2, 22 * sc)

    // Antennae
    g.lineStyle(3, darkColor)
    g.lineBetween(30 * sc, -20 * sc, 16 * sc, -38 * sc)
    g.lineBetween(44 * sc, -20 * sc, 58 * sc, -38 * sc)
    g.fillStyle(darkColor)
    g.fillCircle(16 * sc, -38 * sc, 5)
    g.fillCircle(58 * sc, -38 * sc, 5)

    // Big cartoon eyes — white + dark pupil + shine
    g.fillStyle(0xFFFFFF)
    g.fillCircle(40 * sc, -10, 11 * sc)
    g.fillStyle(darkColor)
    g.fillCircle(42 * sc, -10, 7 * sc)
    g.fillStyle(0xFFFFFF)
    g.fillCircle(45 * sc, -13, 3)

    if (this._isHulk) {
      // Angry eyebrow
      g.lineStyle(3.5, darkColor)
      g.lineBetween(31 * sc, -22, 50 * sc, -17)
      // Frown
      g.lineStyle(2.5, darkColor)
      g.beginPath()
      g.arc(40 * sc, 10, 8, Math.PI, 2 * Math.PI)
      g.strokePath()
      // Fist
      g.fillStyle(0x44DD55)
      g.fillCircle(-30 * sc, 14, 10 * sc)
      g.fillStyle(0x229933)
      g.fillRect(-36 * sc, 8 * sc, 14 * sc, 10 * sc)
    } else {
      // Happy smile
      g.lineStyle(2.5, 0x332200)
      g.beginPath()
      g.arc(40 * sc, 4, 8, 0, Math.PI)
      g.strokePath()
    }
  }

  private drawFxStars(angle: number): void {
    const g = this.fxG
    g.clear()
    if (this.animState !== 'hurt') return
    g.fillStyle(0xFFDD00, 0.9)
    for (let i = 0; i < 5; i++) {
      const a = angle + (i / 5) * Math.PI * 2
      drawStar(g, Math.cos(a) * 38, -10 + Math.sin(a) * 28, 5, 7, 3)
    }
  }

  // ── Animations ────────────────────────────────────────────────────────────
  private startFlyTweens(): void {
    const t1 = this.scene.tweens.add({
      targets: this.wingLCont, angle: { from: -40, to: 14 },
      yoyo: true, repeat: -1, duration: 160, ease: 'Sine.easeInOut',
    })
    const t2 = this.scene.tweens.add({
      targets: this.wingRCont, angle: { from: 40, to: -14 },
      yoyo: true, repeat: -1, duration: 160, ease: 'Sine.easeInOut',
    })
    const t3 = this.scene.tweens.add({
      targets: this.innerBody, y: -10, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut',
    })
    this.flyTweens = [t1, t2, t3]
  }

  private stopFlyTweens(): void {
    this.flyTweens.forEach(t => t.stop())
    this.flyTweens = []
  }

  // ── Public state changers ─────────────────────────────────────────────────
  setHurt(): void {
    if (this.animState === 'hurt') return
    this.animState = 'hurt'
    this.hurtFlash = true
    this.hurtTimer = 0
    this.drawBody()

    this.flyTweens[0]?.updateTo('duration', 75, true)
    this.flyTweens[1]?.updateTo('duration', 75, true)

    this.scene.cameras.main.shake(300, 0.009)

    this.scene.time.delayedCall(2800, () => {
      if (this.animState === 'hurt') {
        this.animState = this._isHulk ? 'hulk' : 'fly'
        this.hurtFlash = false
        this.flyTweens[0]?.updateTo('duration', 160, true)
        this.flyTweens[1]?.updateTo('duration', 160, true)
        this.fxG.clear()
        this.drawBody()
      }
    })
  }

  setHulk(): void {
    this._isHulk = true
    this.animState = 'transform-hulk'

    this.scene.tweens.add({
      targets: this.innerBody, scaleX: 1.3, scaleY: 1.3,
      duration: 250, yoyo: true, ease: 'Back.easeOut',
      onComplete: () => {
        this.animState = 'hulk'
        this.drawBody()
        this.scene.cameras.main.flash(400, 0, 220, 0)
        this.flyTweens[0]?.updateTo('duration', 120, true)
        this.flyTweens[1]?.updateTo('duration', 120, true)
      },
    })
  }

  revertNormal(): void {
    this._isHulk = false
    this.animState = 'revert'

    this.scene.cameras.main.flash(300, 255, 200, 0)
    this.scene.tweens.add({
      targets: this.innerBody, scaleX: 0.8, scaleY: 0.8,
      duration: 200, yoyo: true, ease: 'Bounce.easeOut',
      onComplete: () => {
        this.animState = 'fly'
        this.drawBody()
        this.flyTweens[0]?.updateTo('duration', 160, true)
        this.flyTweens[1]?.updateTo('duration', 160, true)
      },
    })
  }

  setCaught(): void {
    this.animState = 'caught'
    this.stopFlyTweens()

    this.scene.tweens.add({ targets: this.wingLCont, angle: 70, duration: 300 })
    this.scene.tweens.add({ targets: this.wingRCont, angle: -70, duration: 300 })

    this.hurtFlash = false
    this._isHulk = false
    this.drawBody()

    this.scene.tweens.add({
      targets: this.innerBody, x: -5, yoyo: true, repeat: 8, duration: 80,
    })

    this.scene.time.delayedCall(350, () => {
      this.fxG.clear()
      this.fxG.fillStyle(0x66AAFF, 0.9)
      this.fxG.fillEllipse(44, 4, 7, 12)
      this.fxG.fillEllipse(52, 6, 6, 9)
    })
  }

  setTrapSet(): void {
    if (this.animState !== 'hulk') return
    this.scene.tweens.add({
      targets: this.innerBody, y: 14, duration: 180, yoyo: true,
    })
    this.fxG.clear()
    this.fxG.fillStyle(0x44FF44, 0.8)
    drawStar(this.fxG, -44, -22, 5, 9, 4)
    this.scene.time.delayedCall(500, () => this.fxG.clear())
  }

  update(time: number, velY = 0): void {
    if (this.animState === 'hurt') {
      this.hurtTimer += 16
      this.hurtFlash = Math.floor(this.hurtTimer / 120) % 2 === 0
      this.drawBody()
      this.fxAngle += 0.08
      this.drawFxStars(this.fxAngle)
    }

    if (this.animState !== 'caught') {
      const targetAngle = Phaser.Math.Clamp(velY / 14, -22, 22)
      this.innerBody.angle = Phaser.Math.Linear(this.innerBody.angle, targetAngle, 0.18)
    }
  }

  get isHulk(): boolean { return this._isHulk }
}
