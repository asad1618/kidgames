import type { GameManifest } from '../../types/GameManifest'

export const GAME_REGISTRY: GameManifest[] = [
  {
    key: 'tictactoe',
    title: 'Tic Tac Toe',
    description: 'Classic X vs O battle!',
    sceneKey: 'TicTacToeScene',
    hubColor: 0x6C63FF,
    accentColor: 0xFF6B6B,
    emoji: '⭕',
  },
  {
    key: 'beescroller',
    title: 'Bee Chase!',
    description: 'Help the bee escape the lumberjack!',
    sceneKey: 'BeeScrollerScene',
    hubColor: 0xFFAA00,
    accentColor: 0x4ECDC4,
    emoji: '🐝',
    logoKey: 'bs-bee1',
  },
]
