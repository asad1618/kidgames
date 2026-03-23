import Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene'
import { PreloadScene } from '../scenes/PreloadScene'
import { GameHubScene } from '../scenes/GameHubScene'
import { TicTacToeScene } from '../games/tictactoe/TicTacToeScene'
import { BeeScrollerScene } from '../games/beescroller/BeeScrollerScene'

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  backgroundColor: '#0F0E17',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: document.body,
  },
  scene: [BootScene, PreloadScene, GameHubScene, TicTacToeScene, BeeScrollerScene],
  render: {
    antialias: true,
    pixelArt: false,
  },
}
