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

const FLY_FRAMES  = ['bs-bee1',  'bs-bee2']
const HULK_FRAMES = ['bs-hulk1', 'bs-hulk2']
const FRAME_FPS   = 8  // frames per second for wing flap

export class BeeCharacter extends Phaser.GameObjects.Container {
  private beeImg!: Phaser.GameObjects.Image
  private fxG!: Phaser.GameObjects.Graphics
  private innerBody!: Phaser.GameObjects.Container

  private animState: BeeAnimState = 'fly'
  private _isHulk = false
  private hurtTimer = 0
  private fxAngle = 0
  private flyTweens: Phaser.Tweens.Tween[] = []

  private frameTimer?: Phaser.Time.TimerEvent
  private frameIndex = 0

  private readonly NORMAL_W = 110
  private readonly NORMAL_H = 90
  private readonly HULK_W   = 134
  private readonly HULK_H   = 110

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)
    this.build()
    scene.add.existing(this)
    this.startFlyTweens()
  }

  private build(): void {
    this.innerBody = this.scene.add.container(0, 0)
    this.beeImg = this.scene.add.image(0, 0, 'bs-bee1')
      .setDisplaySize(this.NORMAL_W, this.NORMAL_H)
    this.fxG = this.scene.add.graphics()
    this.innerBody.add([this.beeImg, this.fxG])
    this.add(this.innerBody)
  }

  // ── Frame animation ────────────────────────────────────────────────────────
  private startFrameAnim(frames: string[]): void {
    this.stopFrameAnim()
    this.frameIndex = 0
    this.frameTimer = this.scene.time.addEvent({
      delay: 1000 / FRAME_FPS,
      loop: true,
      callback: () => {
        this.frameIndex = (this.frameIndex + 1) % frames.length
        this.beeImg.setTexture(frames[this.frameIndex])
      },
    })
  }

  private stopFrameAnim(): void {
    this.frameTimer?.remove(false)
    this.frameTimer = undefined
  }

  // ── Fly tweens ─────────────────────────────────────────────────────────────
  private startFlyTweens(): void {
    const t1 = this.scene.tweens.add({
      targets: this.innerBody, y: -10,
      yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut',
    })
    this.flyTweens = [t1]
    this.startFrameAnim(FLY_FRAMES)
  }

  private stopFlyTweens(): void {
    this.flyTweens.forEach(t => t.stop())
    this.flyTweens = []
    this.stopFrameAnim()
  }

  // ── Public state setters ───────────────────────────────────────────────────
  setHurt(): void {
    if (this.animState === 'hurt') return
    this.animState = 'hurt'
    this.hurtTimer = 0
    this.scene.cameras.main.shake(300, 0.009)
    this.scene.time.delayedCall(5000, () => {
      if (this.animState === 'hurt') {
        this.animState = this._isHulk ? 'hulk' : 'fly'
        this.beeImg.clearTint()
        this.fxG.clear()
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
        this.beeImg.setTexture('bs-hulk1').setDisplaySize(this.HULK_W, this.HULK_H)
        this.startFrameAnim(HULK_FRAMES)
        this.scene.cameras.main.flash(400, 0, 220, 0)
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
        this.beeImg.setTexture('bs-bee1').setDisplaySize(this.NORMAL_W, this.NORMAL_H)
        this.startFrameAnim(FLY_FRAMES)
      },
    })
  }

  setCaught(): void {
    this.animState = 'caught'
    this.stopFlyTweens()
    this._isHulk = false
    this.beeImg.clearTint()
    this.beeImg.setTexture('bs-bee1').setDisplaySize(this.NORMAL_W, this.NORMAL_H)
    this.scene.tweens.add({
      targets: this.innerBody, x: -5, yoyo: true, repeat: 8, duration: 80,
    })
  }

  setTrapSet(): void {
    if (this.animState !== 'hulk') return
    this.scene.tweens.add({ targets: this.innerBody, y: 14, duration: 180, yoyo: true })
    this.fxG.clear()
    this.fxG.fillStyle(0x44FF44, 0.8)
    drawStar(this.fxG, -44, -22, 5, 9, 4)
    this.scene.time.delayedCall(500, () => this.fxG.clear())
  }

  update(_time: number, velY = 0): void {
    if (this.animState === 'hurt') {
      this.hurtTimer += 16
      const flash = Math.floor(this.hurtTimer / 120) % 2 === 0
      this.beeImg.setTint(flash ? 0xFF5555 : 0xFFFFFF)
      this.fxAngle += 0.08
      this.drawFxStars(this.fxAngle)
    }
    if (this.animState !== 'caught') {
      const targetAngle = Phaser.Math.Clamp(velY / 14, -22, 22)
      this.innerBody.angle = Phaser.Math.Linear(this.innerBody.angle, targetAngle, 0.18)
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

  get isHulk(): boolean { return this._isHulk }
}
