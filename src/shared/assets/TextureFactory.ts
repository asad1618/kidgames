import Phaser from 'phaser'

/**
 * Draws a Phaser Graphics object onto a RenderTexture and saves it
 * as a named texture that all scenes can use like a normal image.
 */
export function bakeTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  drawFn: (g: Phaser.GameObjects.Graphics) => void
): void {
  if (scene.textures.exists(key)) return

  const g = scene.add.graphics()
  drawFn(g)

  const rt = scene.add.renderTexture(0, 0, width, height)
  rt.draw(g, 0, 0)
  rt.saveTexture(key)

  g.destroy()
  rt.destroy()
}

/** Draws a rounded rectangle filled with color */
export function roundRect(
  g: Phaser.GameObjects.Graphics,
  x: number, y: number,
  w: number, h: number,
  r: number,
  fillColor: number,
  fillAlpha = 1,
  strokeColor?: number,
  strokeWidth = 0
): void {
  g.clear()
  if (strokeColor !== undefined && strokeWidth > 0) {
    g.lineStyle(strokeWidth, strokeColor, 1)
  }
  g.fillStyle(fillColor, fillAlpha)
  g.fillRoundedRect(x, y, w, h, r)
  if (strokeColor !== undefined && strokeWidth > 0) {
    g.strokeRoundedRect(x, y, w, h, r)
  }
}
