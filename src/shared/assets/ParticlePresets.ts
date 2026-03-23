import Phaser from 'phaser'
import { Colors } from './ColorPalette'

/** Short burst of colored confetti from a point */
export function confettiBurst(scene: Phaser.Scene, x: number, y: number): void {
  Colors.confetti.forEach((color) => {
    const emitter = scene.add.particles(x, y, 'particle-dot', {
      speed: { min: 200, max: 500 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      lifespan: { min: 800, max: 1400 },
      quantity: 6,
      tint: color,
      gravityY: 300,
      emitting: false,
    })
    emitter.explode(6)
    scene.time.delayedCall(1600, () => emitter.destroy())
  })
}

/** Small star sparkle on token placement */
export function starBurst(scene: Phaser.Scene, x: number, y: number, tint: number): void {
  const emitter = scene.add.particles(x, y, 'particle-dot', {
    speed: { min: 80, max: 180 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.5, end: 0 },
    lifespan: 500,
    quantity: 8,
    tint,
    gravityY: 100,
    emitting: false,
  })
  emitter.explode(8)
  scene.time.delayedCall(600, () => emitter.destroy())
}

/** Ambient floating sparkles in background (looping) */
export function ambientSparkles(
  scene: Phaser.Scene,
  width: number,
  height: number
): Phaser.GameObjects.Particles.ParticleEmitter {
  return scene.add.particles(0, 0, 'particle-dot', {
    x: { min: 0, max: width },
    y: { min: 0, max: height },
    speed: { min: 10, max: 40 },
    angle: { min: 250, max: 290 },
    scale: { start: 0.3, end: 0 },
    alpha: { start: 0.6, end: 0 },
    lifespan: { min: 2000, max: 4000 },
    frequency: 200,
    tint: [0xFFFFFF, Colors.gold, Colors.oBlue, Colors.purple],
  })
}

/** Bakes the shared particle dot texture used by all emitters */
export function bakeParticleDot(scene: Phaser.Scene): void {
  if (scene.textures.exists('particle-dot')) return
  const g = scene.add.graphics()
  g.fillStyle(0xFFFFFF, 1)
  g.fillCircle(8, 8, 8)
  const rt = scene.add.renderTexture(0, 0, 16, 16)
  rt.draw(g, 0, 0)
  rt.saveTexture('particle-dot')
  g.destroy()
  rt.destroy()
}
