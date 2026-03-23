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

export type CatcherState = 'run' | 'hurt' | 'swing' | 'catch'

export class BeeCatcherCharacter extends Phaser.GameObjects.Container {
  private bodyG!: Phaser.GameObjects.Graphics
  private legLCont!: Phaser.GameObjects.Container
  private legRCont!: Phaser.GameObjects.Container
  private armLCont!: Phaser.GameObjects.Container
  private armRCont!: Phaser.GameObjects.Container
  private netG!: Phaser.GameObjects.Graphics
  private innerBody!: Phaser.GameObjects.Container

  private catcherState: CatcherState = 'run'
  private runTweens: Phaser.Tweens.Tween[] = []

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)
    this.build()
    scene.add.existing(this)
    this.startRunTweens()
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  private build(): void {
    this.innerBody = this.scene.add.container(0, 0)

    // ── Legs — thick lumberjack legs ────────────────────────────────────────
    this.legLCont = this.scene.add.container(-12, 24)
    const legL = this.scene.add.graphics()
    // Jeans - bright blue
    legL.fillStyle(0x1A55CC)
    legL.fillRoundedRect(-9, 0, 18, 40, 5)
    // Boot - dark brown
    legL.fillStyle(0x4A2800)
    legL.fillRoundedRect(-10, 32, 22, 16, 5)
    // Boot shine
    legL.fillStyle(0x6B4010, 0.5)
    legL.fillRoundedRect(-7, 33, 10, 5, 2)
    this.legLCont.add(legL)

    this.legRCont = this.scene.add.container(12, 24)
    const legR = this.scene.add.graphics()
    legR.fillStyle(0x1640AA)
    legR.fillRoundedRect(-9, 0, 18, 40, 5)
    legR.fillStyle(0x3A1E00)
    legR.fillRoundedRect(-10, 32, 22, 16, 5)
    legR.fillStyle(0x5A3200, 0.5)
    legR.fillRoundedRect(-7, 33, 10, 5, 2)
    this.legRCont.add(legR)

    // ── Body / torso ────────────────────────────────────────────────────────
    this.bodyG = this.scene.add.graphics()
    this.drawBody()

    // ── Left arm (swings back) ───────────────────────────────────────────────
    this.armLCont = this.scene.add.container(-20, -16)
    const armL = this.scene.add.graphics()
    armL.fillStyle(0xCC2222)
    armL.fillRoundedRect(-7, 0, 14, 30, 5)
    armL.fillStyle(0xEEAA66)
    armL.fillCircle(0, 32, 9)
    // Plaid line on sleeve
    armL.lineStyle(2, 0x880000, 0.5)
    armL.lineBetween(-7, 8, 7, 8)
    armL.lineBetween(-7, 18, 7, 18)
    this.armLCont.add(armL)

    // ── Right arm (holds net) ────────────────────────────────────────────────
    this.armRCont = this.scene.add.container(20, -16)
    const armR = this.scene.add.graphics()
    armR.fillStyle(0xCC2222)
    armR.fillRoundedRect(-7, 0, 14, 32, 5)
    armR.fillStyle(0xEEAA66)
    armR.fillCircle(0, 34, 9)
    // Long net pole
    armR.lineStyle(6, 0xBB8833)
    armR.lineBetween(0, 30, 20, -28)
    armR.lineStyle(4, 0xDDAA55)
    armR.lineBetween(2, 26, 22, -24)

    this.netG = this.scene.add.graphics()
    this.drawNet(false)
    this.armRCont.add([armR, this.netG])

    this.innerBody.add([
      this.legLCont, this.legRCont,
      this.bodyG,
      this.armLCont, this.armRCont,
    ])
    this.add(this.innerBody)
  }

  private drawBody(): void {
    const g = this.bodyG
    g.clear()

    // ── Stocky torso (bright red plaid shirt) ───────────────────────────────
    g.fillStyle(0xDD1111)
    g.fillRoundedRect(-26, -44, 52, 56, 8)

    // Plaid vertical lines
    g.lineStyle(3.5, 0xAA0000, 0.55)
    for (let lx = -18; lx <= 18; lx += 12) g.lineBetween(lx, -44, lx, 12)
    // Plaid horizontal lines
    g.lineStyle(2.5, 0xAA0000, 0.45)
    for (let ly = -32; ly <= 10; ly += 14) g.lineBetween(-26, ly, 26, ly)
    // White crosshatch highlights
    g.lineStyle(1.5, 0xFF6666, 0.25)
    for (let lx = -12; lx <= 12; lx += 12) g.lineBetween(lx + 6, -44, lx + 6, 12)

    // Belt
    g.fillStyle(0x4A2800)
    g.fillRect(-26, 10, 52, 9)
    // Buckle
    g.fillStyle(0xDDAA22)
    g.fillRoundedRect(-8, 11, 16, 7, 2)
    g.lineStyle(1.5, 0xAA8800)
    g.strokeRoundedRect(-8, 11, 16, 7, 2)

    // ── Big round head ───────────────────────────────────────────────────────
    g.fillStyle(0xEEAA66)
    g.fillCircle(0, -64, 30)

    // ── Full orange beard ────────────────────────────────────────────────────
    g.fillStyle(0xDD7722)
    // Main beard shape
    g.fillEllipse(0, -46, 48, 28)
    // Cheek fluffs
    g.fillCircle(-20, -56, 12)
    g.fillCircle(20, -56, 12)
    // Chin extension
    g.fillEllipse(0, -38, 36, 18)

    // ── Eyes (big, expressive) ───────────────────────────────────────────────
    g.fillStyle(0xFFFFFF)
    g.fillCircle(-11, -70, 7)
    g.fillCircle(11, -70, 7)
    g.fillStyle(0x1A1A00)
    g.fillCircle(-10, -70, 4.5)
    g.fillCircle(12, -70, 4.5)
    g.fillStyle(0xFFFFFF)
    g.fillCircle(-8, -72, 2)
    g.fillCircle(14, -72, 2)

    // Angry eyebrows
    g.lineStyle(3.5, 0x6B3A0A)
    g.lineBetween(-18, -78, -6, -75)
    g.lineBetween(6, -75, 18, -78)

    // ── Mustache ─────────────────────────────────────────────────────────────
    g.fillStyle(0xBB5500)
    g.fillEllipse(-8, -58, 16, 9)
    g.fillEllipse(8, -58, 16, 9)

    // ── Lumberjack hat ────────────────────────────────────────────────────────
    // Crown
    g.fillStyle(0x7A5530)
    g.fillRoundedRect(-28, -100, 56, 28, { tl: 10, tr: 10, bl: 2, br: 2 })
    // Brim
    g.fillStyle(0x8B6040)
    g.fillRoundedRect(-32, -76, 64, 8, 3)
    // Hat band
    g.fillStyle(0x2A1A00)
    g.fillRect(-28, -79, 56, 6)
    // Ear flaps
    g.fillStyle(0x9A7050)
    g.fillRoundedRect(-38, -88, 16, 32, 5)
    g.fillRoundedRect(22, -88, 16, 32, 5)
    // Flap fur trim
    g.fillStyle(0xEEDDB0, 0.6)
    g.fillRoundedRect(-38, -74, 16, 8, 3)
    g.fillRoundedRect(22, -74, 16, 8, 3)
  }

  private drawNet(open: boolean): void {
    const g = this.netG
    g.clear()

    // Hoop (bigger, more visible)
    g.lineStyle(4, 0xCCBB88, 0.9)
    if (open) {
      g.strokeCircle(24, -34, 30)
      // Mesh
      g.lineStyle(1.8, 0xDDCC99, 0.7)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        g.lineBetween(24, -34, 24 + Math.cos(a) * 30, -34 + Math.sin(a) * 30)
      }
      for (let r = 10; r <= 28; r += 9) g.strokeCircle(24, -34, r)
    } else {
      g.beginPath()
      g.arc(24, -34, 28, -Math.PI * 0.25, Math.PI * 1.25)
      g.strokePath()
      g.lineStyle(1.8, 0xDDCC99, 0.6)
      for (let i = 0; i < 5; i++) {
        const a = -0.25 + (i / 5) * Math.PI * 1.5
        g.lineBetween(24, -34, 24 + Math.cos(a) * 28, -34 + Math.sin(a) * 28)
      }
    }
  }

  // ── Animations ────────────────────────────────────────────────────────────
  private startRunTweens(): void {
    const t1 = this.scene.tweens.add({
      targets: this.legLCont, angle: { from: -30, to: 30 },
      yoyo: true, repeat: -1, duration: 240, ease: 'Sine.easeInOut',
    })
    const t2 = this.scene.tweens.add({
      targets: this.legRCont, angle: { from: 30, to: -30 },
      yoyo: true, repeat: -1, duration: 240, ease: 'Sine.easeInOut',
    })
    const t3 = this.scene.tweens.add({
      targets: this.armLCont, angle: { from: -24, to: 24 },
      yoyo: true, repeat: -1, duration: 240, ease: 'Sine.easeInOut',
    })
    const t4 = this.scene.tweens.add({
      targets: this.armRCont, angle: { from: 14, to: -14 },
      yoyo: true, repeat: -1, duration: 240, ease: 'Sine.easeInOut',
    })
    const t5 = this.scene.tweens.add({
      targets: this.innerBody, y: -5, yoyo: true, repeat: -1, duration: 240,
    })
    this.runTweens = [t1, t2, t3, t4, t5]
  }

  private stopRunTweens(): void {
    this.runTweens.forEach(t => t.stop())
    this.runTweens = []
  }

  // ── Public ────────────────────────────────────────────────────────────────
  startSwing(): void {
    if (this.catcherState === 'swing') return
    this.catcherState = 'swing'
    this.drawNet(true)

    this.scene.tweens.add({
      targets: this.armRCont, angle: -65, duration: 260, ease: 'Back.easeIn',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.armRCont, angle: 30, duration: 200, ease: 'Back.easeOut',
        })
      },
    })
  }

  stopSwing(): void {
    this.catcherState = 'run'
    this.drawNet(false)
  }

  setHurt(): void {
    if (this.catcherState === 'hurt') return
    this.catcherState = 'hurt'

    // Big stumble — dramatic backward fall
    this.scene.tweens.add({
      targets: this.innerBody, angle: 35, x: -20, duration: 180, ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: this.innerBody, angle: -25, x: 0, duration: 200, ease: 'Sine.easeInOut',
          onComplete: () => {
            this.scene.tweens.add({
              targets: this.innerBody, angle: 0, duration: 150,
              onComplete: () => { this.catcherState = 'run' },
            })
          },
        })
      },
    })
    this.scene.cameras.main.shake(280, 0.007)

    // Stars above head
    const starsG = this.scene.add.graphics()
    starsG.fillStyle(0xFFDD00, 0.9)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      drawStar(starsG, this.x + Math.cos(a) * 34, this.y - 90 + Math.sin(a) * 18, 5, 8, 3)
    }
    this.scene.time.delayedCall(1000, () => starsG.destroy())
  }

  setCatch(beeScreenX: number, beeScreenY: number): void {
    this.catcherState = 'catch'
    this.stopRunTweens()
    this.drawNet(false)

    this.scene.tweens.add({
      targets: this.armRCont, angle: -55, duration: 220, ease: 'Back.easeIn',
    })
    this.legLCont.setAngle(0)
    this.legRCont.setAngle(0)
  }

  setRunSpeed(fast: boolean): void {
    const dur = fast ? 155 : 240
    this.runTweens.slice(0, 5).forEach(t => t.updateTo('duration', dur, true))
  }
}
