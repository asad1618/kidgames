import Phaser from 'phaser'
import { Colors } from '../shared/assets/ColorPalette'
import { bakeParticleDot } from '../shared/assets/ParticlePresets'
import { bakeTexture } from '../shared/assets/TextureFactory'
import { registerBeeScrollerAssets } from '../games/beescroller/BeeScrollerAssets'

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' })
  }

  create(): void {
    const { width, height } = this.scale

    // ── Background ────────────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(Colors.navyDark, Colors.navyDark, Colors.navyLight, Colors.navyLight, 1)
    bg.fillRect(0, 0, width, height)

    // ── Loading bar ───────────────────────────────────────────────
    const barW = 400, barH = 24, barX = width / 2 - barW / 2, barY = height / 2 + 20

    const barBg = this.add.graphics()
    barBg.fillStyle(0xFFFFFF, 0.1)
    barBg.fillRoundedRect(barX, barY, barW, barH, 12)

    const barFill = this.add.graphics()

    const titleText = this.add.text(width / 2, height / 2 - 60, '🎮 KidGames', {
      fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
      fontSize: '52px',
      color: '#FFFFFF',
      stroke: '#00000066',
      strokeThickness: 4,
    }).setOrigin(0.5)

    const loadText = this.add.text(width / 2, barY + barH + 20, 'Loading...', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '20px',
      color: '#FFFFFF88',
    }).setOrigin(0.5)

    // Animate title
    this.tweens.add({
      targets: titleText,
      scaleX: 1.04, scaleY: 1.04,
      yoyo: true, repeat: -1,
      duration: 900, ease: 'Sine.easeInOut',
    })

    // ── Generate all procedural textures ─────────────────────────
    const tasks: Array<() => void> = [
      () => bakeParticleDot(this),
      () => this.bakeHubBackground(),
      () => this.bakeTicTacToeAssets(),
      () => this.bakeButtonTexture(),
      () => this.bakeHubCard(),
      () => registerBeeScrollerAssets(this),
    ]

    let done = 0
    const total = tasks.length

    const runNext = (): void => {
      if (done >= total) {
        loadText.setText('Ready!')
        this.time.delayedCall(400, () => this.scene.start('GameHubScene'))
        return
      }
      tasks[done]()
      done++
      const progress = done / total
      barFill.clear()
      barFill.fillStyle(Colors.gold, 1)
      barFill.fillRoundedRect(barX, barY, barW * progress, barH, 12)
      this.time.delayedCall(80, runNext)
    }

    this.time.delayedCall(200, runNext)
  }

  private bakeHubBackground(): void {
    const { width, height } = this.scale
    bakeTexture(this, 'hub-bg', width, height, (g) => {
      g.fillGradientStyle(Colors.navyDark, Colors.navyDark, Colors.navyMid, Colors.navyMid, 1)
      g.fillRect(0, 0, width, height)
      // Decorative circles
      g.fillStyle(Colors.purple, 0.06)
      g.fillCircle(width * 0.1, height * 0.2, 180)
      g.fillCircle(width * 0.9, height * 0.8, 220)
      g.fillStyle(Colors.oBlue, 0.05)
      g.fillCircle(width * 0.85, height * 0.15, 150)
    })
  }

  private bakeTicTacToeAssets(): void {
    const cell = 140  // logical cell size

    // Board grid lines
    bakeTexture(this, 'ttt-grid', cell * 3 + 24, cell * 3 + 24, (g) => {
      const s = cell * 3 + 24
      g.lineStyle(10, Colors.gridLine, 0.9)
      g.fillStyle(Colors.white, 0.03)
      g.fillRoundedRect(0, 0, s, s, 24)
      // Vertical lines
      g.lineBetween(cell + 12, 20, cell + 12, s - 20)
      g.lineBetween(cell * 2 + 12, 20, cell * 2 + 12, s - 20)
      // Horizontal lines
      g.lineBetween(20, cell + 12, s - 20, cell + 12)
      g.lineBetween(20, cell * 2 + 12, s - 20, cell * 2 + 12)
    })

    // X token
    bakeTexture(this, 'ttt-x', cell, cell, (g) => {
      const pad = 22, lw = 22, r = 14
      g.lineStyle(lw, Colors.xRedDark, 1)
      g.lineBetween(pad, pad, cell - pad, cell - pad)
      g.lineBetween(cell - pad, pad, pad, cell - pad)
      g.lineStyle(lw - 4, Colors.xRed, 1)
      g.lineBetween(pad, pad, cell - pad, cell - pad)
      g.lineBetween(cell - pad, pad, pad, cell - pad)
      // Glow caps
      g.fillStyle(Colors.xRed, 1)
      ;[
        [pad, pad], [cell - pad, pad], [pad, cell - pad], [cell - pad, cell - pad]
      ].forEach(([cx, cy]) => g.fillCircle(cx, cy, lw / 2 - 2))
    })

    // O token
    bakeTexture(this, 'ttt-o', cell, cell, (g) => {
      const cx = cell / 2, cy = cell / 2, r = cell / 2 - 22, lw = 22
      g.lineStyle(lw, Colors.oBlueDark, 1)
      g.strokeCircle(cx, cy, r)
      g.lineStyle(lw - 4, Colors.oBlue, 1)
      g.strokeCircle(cx, cy, r)
      // Inner shine
      g.fillStyle(Colors.white, 0.12)
      g.fillCircle(cx - r * 0.25, cy - r * 0.3, r * 0.28)
    })

    // Cell hover highlight
    bakeTexture(this, 'ttt-cell-hover', cell, cell, (g) => {
      g.fillStyle(Colors.gold, 0.15)
      g.fillRoundedRect(6, 6, cell - 12, cell - 12, 14)
    })

    // Win line overlay
    bakeTexture(this, 'ttt-winline', cell * 3, 14, (g) => {
      g.fillStyle(Colors.gold, 1)
      g.fillRoundedRect(0, 0, cell * 3, 14, 7)
    })
  }

  private bakeButtonTexture(): void {
    // Generic pill button (used as background for reusable Button component)
    bakeTexture(this, 'btn-bg', 220, 60, (g) => {
      g.fillStyle(Colors.orange, 1)
      g.fillRoundedRect(0, 0, 220, 60, 20)
    })
  }

  private bakeHubCard(): void {
    bakeTexture(this, 'hub-card', 260, 300, (g) => {
      g.fillStyle(Colors.shadow, 0.3)
      g.fillRoundedRect(6, 8, 260, 300, 24)
      g.fillStyle(0xFFFFFF, 0.08)
      g.fillRoundedRect(0, 0, 260, 300, 24)
      g.lineStyle(2, Colors.white, 0.15)
      g.strokeRoundedRect(0, 0, 260, 300, 24)
    })
  }
}
