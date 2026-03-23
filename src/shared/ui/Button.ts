import Phaser from 'phaser'
import { Colors } from '../assets/ColorPalette'
import { SoundManager } from '../audio/SoundManager'

export interface ButtonConfig {
  x: number
  y: number
  width: number
  height: number
  label: string
  fillColor?: number
  textColor?: number
  fontSize?: number
  radius?: number
  depth?: number
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics
  private label: Phaser.GameObjects.Text
  private cfg: Required<ButtonConfig>

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    super(scene, config.x, config.y)

    this.cfg = {
      fillColor:  config.fillColor  ?? Colors.orange,
      textColor:  config.textColor  ?? Colors.white,
      fontSize:   config.fontSize   ?? 28,
      radius:     config.radius     ?? 20,
      depth:      config.depth      ?? 10,
      ...config,
    }

    const { width, height, fillColor, textColor, fontSize, radius, label, depth } = this.cfg

    this.bg = scene.add.graphics()
    this.drawBg(fillColor)

    this.label = scene.add.text(0, 0, label, {
      fontFamily: '"Arial Rounded MT Bold", "Arial", sans-serif',
      fontSize: `${fontSize}px`,
      color: Phaser.Display.Color.IntegerToColor(textColor).rgba,
      stroke: '#00000033',
      strokeThickness: 2,
    }).setOrigin(0.5, 0.5)

    this.add([this.bg, this.label])
    this.setSize(width, height)
    this.setDepth(depth)
    this.setInteractive({ useHandCursor: true })

    this.on('pointerover', this.onOver, this)
    this.on('pointerout', this.onOut, this)
    this.on('pointerdown', this.onDown, this)
    this.on('pointerup', this.onUp, this)

    scene.add.existing(this)
  }

  private drawBg(color: number, scale = 1): void {
    const { width, height, radius } = this.cfg
    this.bg.clear()
    // Shadow
    this.bg.fillStyle(Colors.shadow, 0.25)
    this.bg.fillRoundedRect(-width / 2 + 3, -height / 2 + 5, width, height, radius)
    // Main fill
    this.bg.fillStyle(color, 1)
    this.bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius)
    // Shine
    this.bg.fillStyle(Colors.white, 0.15)
    this.bg.fillRoundedRect(-width / 2 + 4, -height / 2 + 4, width - 8, height / 2 - 4, { tl: radius, tr: radius, bl: 0, br: 0 })
  }

  private onOver(): void {
    this.scene.tweens.add({ targets: this, scaleX: 1.05, scaleY: 1.05, duration: 80 })
    this.drawBg(Phaser.Display.Color.IntegerToColor(this.cfg.fillColor).brighten(15).color)
  }

  private onOut(): void {
    this.scene.tweens.add({ targets: this, scaleX: 1, scaleY: 1, duration: 80 })
    this.drawBg(this.cfg.fillColor)
  }

  private onDown(): void {
    this.scene.tweens.add({ targets: this, scaleX: 0.95, scaleY: 0.95, duration: 60 })
    SoundManager.buttonTap()
  }

  private onUp(): void {
    this.scene.tweens.add({ targets: this, scaleX: 1.05, scaleY: 1.05, duration: 60 })
  }
}
