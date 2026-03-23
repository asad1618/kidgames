import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  create(): void {
    // Ensure the scale manager is set up before transitioning
    this.scale.refresh()
    this.scene.start('PreloadScene')
  }
}
