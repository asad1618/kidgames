import Phaser from 'phaser'
import { gameConfig } from './config/GameConfig'

window.addEventListener('load', () => {
  new Phaser.Game(gameConfig)
})
