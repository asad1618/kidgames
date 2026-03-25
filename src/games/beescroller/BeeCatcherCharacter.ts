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

const LUMBERJACK_FRAMES = ['bs-lumberjack1', 'bs-lumberjack2', 'bs-lumberjack3']

export class BeeCatcherCharacter extends Phaser.GameObjects.Container {
  private lumberjackImg!: Phaser.GameObjects.Image
  private innerBody!: Phaser.GameObjects.Container

  private catcherState: CatcherState = 'run'
  private runTweens: Phaser.Tweens.Tween[] = []
  private frameTimer?: Phaser.Time.TimerEvent
  private frameIndex = 0
  private currentFps = 0

  private readonly W = 220
  private readonly H = 300

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y)
    this.build()
    scene.add.existing(this)
    this.startRunTweens()
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  private build(): void {
    this.innerBody = this.scene.add.container(0, 0)
    this.lumberjackImg = this.scene.add.image(0, 0, 'bs-lumberjack1')
      .setDisplaySize(this.W, this.H)
    this.innerBody.add([this.lumberjackImg])
    this.add(this.innerBody)
  }

  // ── Frame animation ────────────────────────────────────────────────────────
  private startFrameAnim(fps: number): void {
    if (fps === this.currentFps && this.frameTimer) return
    this.stopFrameAnim()
    this.currentFps = fps
    this.frameIndex = 0
    this.frameTimer = this.scene.time.addEvent({
      delay: 1000 / fps,
      loop: true,
      callback: () => {
        this.frameIndex = (this.frameIndex + 1) % LUMBERJACK_FRAMES.length
        this.lumberjackImg.setTexture(LUMBERJACK_FRAMES[this.frameIndex])
          .setDisplaySize(this.W, this.H)
      },
    })
  }

  private stopFrameAnim(): void {
    this.frameTimer?.remove(false)
    this.frameTimer = undefined
    this.currentFps = 0
    this.lumberjackImg?.setTexture('bs-lumberjack1').setDisplaySize(this.W, this.H)
  }

  // ── Run tweens ─────────────────────────────────────────────────────────────
  private startRunTweens(): void {
    const t1 = this.scene.tweens.add({
      targets: this.innerBody, y: -4,
      yoyo: true, repeat: -1, duration: 240,
    })
    this.runTweens = [t1]
    this.startFrameAnim(6)
  }

  private stopRunTweens(): void {
    this.runTweens.forEach(t => t.stop())
    this.runTweens = []
    this.stopFrameAnim()
  }

  // ── Public ────────────────────────────────────────────────────────────────
  startSwing(): void {
    if (this.catcherState === 'swing') return
    this.catcherState = 'swing'
  }

  stopSwing(): void {
    this.catcherState = 'run'
  }

  setHurt(): void {
    if (this.catcherState === 'hurt') return
    this.catcherState = 'hurt'

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

    const starsG = this.scene.add.graphics()
    starsG.fillStyle(0xFFDD00, 0.9)
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      drawStar(starsG, this.x + Math.cos(a) * 34, this.y - 90 + Math.sin(a) * 18, 5, 8, 3)
    }
    this.scene.time.delayedCall(1000, () => starsG.destroy())
  }

  setCatch(_beeScreenX: number, _beeScreenY: number): void {
    this.catcherState = 'catch'
    this.stopRunTweens()
  }

  setRunSpeed(fast: boolean): void {
    const fps = fast ? 10 : 6
    const dur = fast ? 155 : 240
    this.startFrameAnim(fps)
    this.runTweens.forEach(t => t.updateTo('duration', dur, true))
  }
}
