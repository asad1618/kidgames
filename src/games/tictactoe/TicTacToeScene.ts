import Phaser from 'phaser'
import { Colors } from '../../shared/assets/ColorPalette'
import { confettiBurst, starBurst } from '../../shared/assets/ParticlePresets'
import { SoundManager } from '../../shared/audio/SoundManager'
import { Button } from '../../shared/ui/Button'
import {
  createInitialState,
  isValidMove,
  applyMove,
  type TicTacToeState,
} from './TicTacToeLogic'

const CELL = 140       // cell size in logical pixels
const GRID_PAD = 12    // padding inside grid texture
const GRID_SIZE = CELL * 3 + GRID_PAD * 2

export class TicTacToeScene extends Phaser.Scene {
  private state!: TicTacToeState
  private tokenImages: (Phaser.GameObjects.Image | null)[] = []
  private cellZones: Phaser.GameObjects.Zone[] = []
  private cellHighlights: Phaser.GameObjects.Image[] = []
  private turnText!: Phaser.GameObjects.Text
  private turnIcon!: Phaser.GameObjects.Image
  private resultBanner?: Phaser.GameObjects.Container
  private boardX = 0
  private boardY = 0
  private inputLocked = false

  constructor() {
    super({ key: 'TicTacToeScene' })
  }

  create(): void {
    const { width, height } = this.scale
    this.state = createInitialState()
    this.tokenImages = Array(9).fill(null)
    this.inputLocked = false

    // ── Background ────────────────────────────────────────────────
    const bg = this.add.graphics()
    bg.fillGradientStyle(Colors.navyDark, Colors.navyDark, Colors.navyMid, Colors.navyMid, 1)
    bg.fillRect(0, 0, width, height)

    // Decorative blobs
    const deco = this.add.graphics()
    deco.fillStyle(Colors.xRed, 0.05)
    deco.fillCircle(width * 0.1, height * 0.15, 160)
    deco.fillStyle(Colors.oBlue, 0.05)
    deco.fillCircle(width * 0.92, height * 0.85, 180)
    deco.fillStyle(Colors.purple, 0.04)
    deco.fillCircle(width * 0.88, height * 0.1, 120)

    // ── Header ────────────────────────────────────────────────────
    this.add.text(width / 2, 36, 'Tic Tac Toe', {
      fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
      fontSize: '38px',
      color: '#FFFFFF',
      stroke: '#00000066',
      strokeThickness: 3,
    }).setOrigin(0.5)

    // ── Board ─────────────────────────────────────────────────────
    this.boardX = width / 2 - GRID_SIZE / 2
    this.boardY = height / 2 - GRID_SIZE / 2 + 20

    const grid = this.add.image(
      width / 2,
      height / 2 + 20,
      'ttt-grid'
    )

    // Entrance animation
    grid.setScale(0)
    this.tweens.add({
      targets: grid,
      scaleX: 1, scaleY: 1,
      duration: 500, ease: 'Back.easeOut',
    })

    // ── Cell zones + highlights ───────────────────────────────────
    for (let i = 0; i < 9; i++) {
      const col = i % 3
      const row = Math.floor(i / 3)
      const cx = this.boardX + GRID_PAD + col * CELL + CELL / 2
      const cy = this.boardY + GRID_PAD + row * CELL + CELL / 2

      const highlight = this.add.image(cx, cy, 'ttt-cell-hover')
        .setDisplaySize(CELL, CELL)
        .setAlpha(0)
        .setDepth(1)
      this.cellHighlights.push(highlight)

      const zone = this.add.zone(cx, cy, CELL, CELL).setInteractive({ useHandCursor: true })
      this.cellZones.push(zone)

      zone.on('pointerover', () => {
        if (this.state.board[i] !== null || this.inputLocked) return
        this.tweens.add({ targets: highlight, alpha: 1, duration: 100 })
      })
      zone.on('pointerout', () => {
        this.tweens.add({ targets: highlight, alpha: 0, duration: 100 })
      })
      zone.on('pointerdown', () => this.handleCellTap(i, cx, cy))
    }

    // ── Turn indicator ────────────────────────────────────────────
    const turnY = height - 80
    this.turnText = this.add.text(width / 2 + 30, turnY, "'s Turn", {
      fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
      fontSize: '26px',
      color: '#FFFFFF',
    }).setOrigin(0, 0.5).setDepth(5)

    this.turnIcon = this.add.image(width / 2 + 16, turnY, 'ttt-x')
      .setDisplaySize(36, 36)
      .setOrigin(1, 0.5)
      .setDepth(5)

    this.updateTurnIndicator()

    // ── Back button ───────────────────────────────────────────────
    const backBtn = new Button(this, {
      x: 70, y: 36,
      width: 110, height: 46,
      label: '← Hub',
      fillColor: Colors.navyLight,
      fontSize: 18,
      radius: 14,
    })
    backBtn.on('pointerup', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameHubScene')
      })
    })

    // Fade in
    this.cameras.main.fadeIn(400)
  }

  private handleCellTap(index: number, cx: number, cy: number): void {
    if (this.inputLocked) return
    if (!isValidMove(this.state, index)) return

    this.inputLocked = true
    const player = this.state.currentPlayer
    this.state = applyMove(this.state, index)

    // Hide hover highlight
    this.tweens.add({ targets: this.cellHighlights[index], alpha: 0, duration: 80 })

    // Place token with bounce animation
    const tokenKey = player === 'X' ? 'ttt-x' : 'ttt-o'
    const tint = player === 'X' ? Colors.xRed : Colors.oBlue
    const img = this.add.image(cx, cy, tokenKey)
      .setDisplaySize(CELL - 16, CELL - 16)
      .setDepth(2)
      .setScale(0)
    this.tokenImages[index] = img

    SoundManager.tokenPlace()
    starBurst(this, cx, cy, tint)

    this.tweens.add({
      targets: img,
      scaleX: 1, scaleY: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (this.state.winner) {
          this.handleWin(player)
        } else if (this.state.isDraw) {
          this.handleDraw()
        } else {
          this.updateTurnIndicator()
          this.inputLocked = false
        }
      },
    })
  }

  private updateTurnIndicator(): void {
    const player = this.state.currentPlayer
    const tokenKey = player === 'X' ? 'ttt-x' : 'ttt-o'
    this.turnIcon.setTexture(tokenKey)
    this.tweens.add({
      targets: this.turnIcon,
      scaleX: 1.3, scaleY: 1.3,
      yoyo: true, duration: 150,
    })
  }

  private handleWin(winner: 'X' | 'O'): void {
    SoundManager.win()

    // Draw win line
    if (this.state.winningLine) {
      this.drawWinLine(this.state.winningLine)
    }

    // Confetti!
    const { width, height } = this.scale
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 150, () => {
        confettiBurst(this, Phaser.Math.Between(width * 0.2, width * 0.8), height * 0.3)
      })
    }

    // Result banner
    this.time.delayedCall(600, () => {
      const emoji = winner === 'X' ? '❌' : '⭕'
      this.showResultBanner(`${emoji} Player ${winner} Wins! 🎉`, Colors.gold)
    })
  }

  private handleDraw(): void {
    SoundManager.draw()
    this.time.delayedCall(400, () => {
      this.showResultBanner("It's a Draw! 🤝", Colors.gridLine)
    })
  }

  private drawWinLine(line: [number, number, number]): void {
    const positions = line.map((i) => {
      const col = i % 3, row = Math.floor(i / 3)
      return {
        x: this.boardX + GRID_PAD + col * CELL + CELL / 2,
        y: this.boardY + GRID_PAD + row * CELL + CELL / 2,
      }
    })

    const x1 = positions[0].x, y1 = positions[0].y
    const x2 = positions[2].x, y2 = positions[2].y
    const angle = Phaser.Math.Angle.Between(x1, y1, x2, y2)
    const dist = Phaser.Math.Distance.Between(x1, y1, x2, y2)
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2

    const lineImg = this.add.image(mx, my, 'ttt-winline')
      .setDisplaySize(dist + 40, 14)
      .setRotation(angle)
      .setDepth(3)
      .setAlpha(0)

    this.tweens.add({ targets: lineImg, alpha: 1, duration: 300 })

    // Pulse the winning tokens
    line.forEach((i) => {
      const img = this.tokenImages[i]
      if (img) {
        this.tweens.add({
          targets: img, scaleX: 1.15, scaleY: 1.15,
          yoyo: true, repeat: -1, duration: 400,
        })
      }
    })
  }

  private showResultBanner(message: string, color: number): void {
    const { width, height } = this.scale
    const bannerY = height * 0.18

    const container = this.add.container(width / 2, bannerY).setDepth(10)
    this.resultBanner = container

    // Backdrop
    const panel = this.add.graphics()
    panel.fillStyle(Colors.navyDark, 0.95)
    panel.fillRoundedRect(-260, -50, 520, 100, 28)
    panel.lineStyle(3, color, 0.8)
    panel.strokeRoundedRect(-260, -50, 520, 100, 28)

    const text = this.add.text(0, -6, message, {
      fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
      fontSize: '34px',
      color: '#FFFFFF',
      stroke: '#00000066',
      strokeThickness: 3,
    }).setOrigin(0.5)

    container.add([panel, text])
    container.setScale(0)
    this.tweens.add({
      targets: container,
      scaleX: 1, scaleY: 1,
      duration: 400, ease: 'Back.easeOut',
    })

    // Buttons after short delay
    this.time.delayedCall(800, () => this.showPostGameButtons())
  }

  private showPostGameButtons(): void {
    const { width, height } = this.scale

    const playAgain = new Button(this, {
      x: width / 2 - 120, y: height - 64,
      width: 200, height: 54,
      label: '↺  Play Again',
      fillColor: Colors.green,
      fontSize: 22,
    })
    playAgain.on('pointerup', () => this.scene.restart())

    const hubBtn = new Button(this, {
      x: width / 2 + 120, y: height - 64,
      width: 200, height: 54,
      label: '🏠  Menu',
      fillColor: Colors.navyLight,
      fontSize: 22,
    })
    hubBtn.on('pointerup', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameHubScene')
      })
    })
  }
}
