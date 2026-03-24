import Phaser from 'phaser'
import { Colors } from '../shared/assets/ColorPalette'
import { GAME_REGISTRY } from '../shared/registry/GameRegistry'
import { SoundManager } from '../shared/audio/SoundManager'
import { ambientSparkles } from '../shared/assets/ParticlePresets'

export class GameHubScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameHubScene' })
  }

  create(): void {
    const { width, height } = this.scale

    // Background
    this.add.image(width / 2, height / 2, 'hub-bg')

    // Ambient sparkles
    const sparkles = ambientSparkles(this, width, height)
    sparkles.setDepth(0)

    // Title
    const title = this.add.text(width / 2, 70, '🎮 KidGames', {
      fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
      fontSize: '48px',
      color: '#FFFFFF',
      stroke: '#00000066',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(2)

    this.tweens.add({
      targets: title,
      y: 74, scaleX: 1.03, scaleY: 1.03,
      yoyo: true, repeat: -1,
      duration: 1200, ease: 'Sine.easeInOut',
    })

    const subtitle = this.add.text(width / 2, 128, 'Choose your game!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#FFFFFF99',
    }).setOrigin(0.5).setDepth(2)

    // Game cards
    const cardW = 260, cardH = 300
    const totalCards = GAME_REGISTRY.length
    const spacing = 320
    const startX = width / 2 - ((totalCards - 1) * spacing) / 2

    GAME_REGISTRY.forEach((game, i) => {
      const cx = startX + i * spacing
      const cy = height / 2 + 20
      this.createGameCard(cx, cy, cardW, cardH, game.title, game.description, game.emoji, game.hubColor, game.sceneKey, game.logoKey)
    })

    // Version footer
    this.add.text(width / 2, height - 20, 'v1.0 · Made with Phaser 3', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      color: '#FFFFFF33',
    }).setOrigin(0.5).setDepth(2)
  }

  private createGameCard(
    x: number, y: number,
    w: number, h: number,
    title: string,
    description: string,
    emoji: string,
    color: number,
    sceneKey: string,
    logoKey?: string
  ): void {
    const container = this.add.container(x, y).setDepth(2)

    // Card background
    const card = this.add.image(0, 0, 'hub-card').setDisplaySize(w, h)

    // Color accent bar
    const accentBar = this.add.graphics()
    accentBar.fillStyle(color, 1)
    accentBar.fillRoundedRect(-w / 2, -h / 2, w, 8, { tl: 24, tr: 24, bl: 0, br: 0 })

    // Icon: image if logoKey provided, otherwise emoji
    const icon = logoKey
      ? this.add.image(0, -60, logoKey).setDisplaySize(90, 90).setOrigin(0.5)
      : this.add.text(0, -60, emoji, { fontSize: '72px' }).setOrigin(0.5)

    // Game title
    const titleText = this.add.text(0, 50, title, {
      fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
      fontSize: '26px',
      color: '#FFFFFF',
      stroke: '#00000044',
      strokeThickness: 2,
    }).setOrigin(0.5)

    // Description
    const descText = this.add.text(0, 88, description, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#FFFFFFAA',
      wordWrap: { width: w - 30 },
      align: 'center',
    }).setOrigin(0.5)

    // Play button
    const playBtnBg = this.add.graphics()
    playBtnBg.fillStyle(color, 1)
    playBtnBg.fillRoundedRect(-70, 118, 140, 46, 23)
    playBtnBg.lineStyle(2, Colors.white, 0.3)
    playBtnBg.strokeRoundedRect(-70, 118, 140, 46, 23)

    const playText = this.add.text(0, 141, '▶  Play', {
      fontFamily: '"Arial Rounded MT Bold", Arial, sans-serif',
      fontSize: '22px',
      color: '#FFFFFF',
    }).setOrigin(0.5)

    container.add([card, accentBar, icon, titleText, descText, playBtnBg, playText])
    container.setSize(w, h)
    container.setInteractive({ useHandCursor: true })

    // Hover & click
    container.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: 120 })
    })
    container.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 })
    })
    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container, scaleX: 0.97, scaleY: 0.97, duration: 80,
        onComplete: () => {
          SoundManager.gameStart()
          this.cameras.main.fadeOut(300, 0, 0, 0)
          this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start(sceneKey)
          })
        },
      })
    })

    // Entrance animation
    container.setScale(0)
    this.tweens.add({
      targets: container,
      scaleX: 1, scaleY: 1,
      delay: 200,
      duration: 500,
      ease: 'Back.easeOut',
    })

    // Gentle float
    this.tweens.add({
      targets: container,
      y: y - 8,
      yoyo: true, repeat: -1,
      duration: 2000 + Math.random() * 600,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 500,
    })
  }
}
