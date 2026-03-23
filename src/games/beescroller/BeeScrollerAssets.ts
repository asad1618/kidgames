import Phaser from 'phaser'

export function registerBeeScrollerAssets(scene: Phaser.Scene): void {
  bakeGround(scene)
  bakeCloud(scene)
  bakeSunflowerDeco(scene)     // background deco (small)
  bakeSunflowerObstacle(scene) // actual obstacle (tall)
  bakeSpiderWeb(scene)
  bakeBranch(scene)
  bakeHoneyBucket(scene)
  bakeRock(scene)
  bakeWoodenBoard(scene)
  bakeVine(scene)
  bakeBeehive(scene)
  bakeFencePost(scene)
  // New obstacle types
  bakeMushroomCluster(scene)
  bakeThornyBush(scene)
  bakeHangingLantern(scene)
}

function bake(scene: Phaser.Scene, key: string, w: number, h: number, fn: (g: Phaser.GameObjects.Graphics) => void): void {
  if (scene.textures.exists(key)) return
  const g = scene.add.graphics()
  fn(g)
  const rt = scene.add.renderTexture(0, 0, w, h)
  rt.draw(g, 0, 0)
  rt.saveTexture(key)
  g.destroy(); rt.destroy()
}

function bakeGround(scene: Phaser.Scene): void {
  bake(scene, 'bs-ground', 256, 100, g => {
    // Bright dirt path
    g.fillStyle(0xB8935A)
    g.fillRect(0, 0, 256, 100)
    // Lighter top strip
    g.fillStyle(0xC9A46A)
    g.fillRect(0, 0, 256, 8)
    // Pebbles
    g.fillStyle(0xA07840, 0.6)
    ;[15,50,90,130,175,210,245].forEach(px => {
      g.fillCircle(px, 22 + (px % 30), 4 + (px % 4))
      g.fillCircle(px + 18, 55 + (px % 25), 3 + (px % 3))
    })
  })
}

function bakeCloud(scene: Phaser.Scene): void {
  bake(scene, 'bs-cloud', 180, 80, g => {
    g.fillStyle(0xFFFFFF, 0.92)
    g.fillCircle(50, 52, 32)
    g.fillCircle(90, 38, 44)
    g.fillCircle(136, 52, 30)
    g.fillRect(50, 52, 86, 28)
  })
}

function bakeFencePost(scene: Phaser.Scene): void {
  bake(scene, 'bs-fence', 120, 70, g => {
    // Rails
    g.fillStyle(0xA0612A)
    g.fillRoundedRect(0, 16, 120, 10, 3)
    g.fillRoundedRect(0, 42, 120, 10, 3)
    // Post
    g.fillStyle(0x8B5020)
    g.fillRoundedRect(10, 0, 16, 70, 3)
    g.fillRoundedRect(94, 0, 16, 70, 3)
    // Top points
    g.fillTriangle(10, 0, 26, 0, 18, -10)
    g.fillTriangle(94, 0, 110, 0, 102, -10)
  })
}

// Small decorative sunflower (background scenery)
function bakeSunflowerDeco(scene: Phaser.Scene): void {
  bake(scene, 'bs-sunflower-deco', 70, 130, g => {
    // Stem
    g.lineStyle(7, 0x3E8C1C)
    g.lineBetween(35, 130, 35, 55)
    // Leaves
    g.fillStyle(0x4CAF50)
    g.fillEllipse(18, 88, 28, 14)
    g.fillEllipse(52, 76, 28, 14)
    // Petals (8)
    g.fillStyle(0xFFD700)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.fillEllipse(35 + Math.cos(a) * 20, 40 + Math.sin(a) * 20, 16, 26)
    }
    // Center
    g.fillStyle(0x5D3A1A)
    g.fillCircle(35, 40, 14)
    g.fillStyle(0x7B5016)
    g.fillCircle(35, 40, 10)
    // Seeds pattern
    g.fillStyle(0x3D2010, 0.7)
    ;[[-4,-4],[4,-4],[0,0],[-4,4],[4,4]].forEach(([dx,dy]) => g.fillCircle(35+dx, 40+dy, 2))
  })
}

// Tall sunflower obstacle (on bee's flight path)
function bakeSunflowerObstacle(scene: Phaser.Scene): void {
  bake(scene, 'bs-flower', 80, 240, g => {
    // Tall thick stem
    g.lineStyle(10, 0x3E8C1C)
    g.lineBetween(40, 240, 40, 70)
    g.fillStyle(0x3E8C1C)
    g.fillRect(34, 70, 12, 170)
    // Big leaves
    g.fillStyle(0x4CAF50)
    g.fillEllipse(14, 155, 46, 22)
    g.fillEllipse(66, 135, 46, 22)
    g.fillEllipse(10, 110, 38, 18)
    // Outer petals (12, bright yellow)
    g.fillStyle(0xFFD700)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      g.fillEllipse(40 + Math.cos(a) * 28, 52 + Math.sin(a) * 28, 18, 32)
    }
    // Inner petals (lighter)
    g.fillStyle(0xFFC200)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2
      g.fillEllipse(40 + Math.cos(a) * 18, 52 + Math.sin(a) * 18, 12, 22)
    }
    // Dark brown center disk
    g.fillStyle(0x4A2200)
    g.fillCircle(40, 52, 22)
    g.fillStyle(0x6B3500)
    g.fillCircle(40, 52, 16)
    // Seed pattern
    g.fillStyle(0x3A1800, 0.8)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      g.fillCircle(40 + Math.cos(a) * 9, 52 + Math.sin(a) * 9, 3)
    }
    g.fillCircle(40, 52, 3)
    // Warning glow
    g.lineStyle(3, 0xFF6600, 0.4)
    g.strokeCircle(40, 52, 34)
  })
}

function bakeSpiderWeb(scene: Phaser.Scene): void {
  bake(scene, 'bs-web', 120, 120, g => {
    g.lineStyle(2.5, 0xEEEEEE, 0.95)
    const cx = 60, cy = 60
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      g.lineBetween(cx, cy, cx + Math.cos(a) * 56, cy + Math.sin(a) * 56)
    }
    for (let r = 14; r <= 52; r += 14) {
      g.beginPath()
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI * 2
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y)
      }
      g.strokePath()
    }
    // Spider body
    g.fillStyle(0x111111)
    g.fillCircle(cx, cy, 9)
    g.fillCircle(cx - 5, cy - 5, 5)
    g.lineStyle(1.5, 0x111111)
    ;[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]].forEach(([dx,dy]) =>
      g.lineBetween(cx, cy, cx + dx*18, cy + dy*18))
    // Glow
    g.lineStyle(3, 0xAAAAAA, 0.3)
    g.strokeCircle(cx, cy, 58)
  })
}

function bakeBranch(scene: Phaser.Scene): void {
  bake(scene, 'bs-branch', 170, 60, g => {
    g.fillStyle(0x6B4422)
    g.fillRoundedRect(0, 22, 170, 20, 7)
    g.lineStyle(9, 0x6B4422)
    g.lineBetween(30, 22, 12, 2)
    g.lineBetween(85, 22, 70, 4)
    g.lineBetween(140, 22, 124, 2)
    g.fillStyle(0x4CAF50)
    ;[[12,2],[70,4],[124,2]].forEach(([lx,ly]) => {
      g.fillEllipse(lx, ly, 32, 18)
      g.fillEllipse(lx+16, ly-10, 26, 14)
    })
  })
}

function bakeHoneyBucket(scene: Phaser.Scene): void {
  bake(scene, 'bs-honey', 80, 90, g => {
    // Glow
    g.fillStyle(0xFFDD00, 0.3)
    g.fillCircle(40, 50, 50)
    // Handle arc
    g.lineStyle(5, 0xAA8800)
    g.beginPath(); g.arc(40, 25, 24, Math.PI, 0); g.strokePath()
    // Bucket: bright yellow trapezoid
    g.fillStyle(0xF5C400)
    g.fillPoints([{x:8,y:25},{x:72,y:25},{x:66,y:80},{x:14,y:80}], true)
    // Top rim
    g.fillStyle(0xE5A800)
    g.fillPoints([{x:8,y:25},{x:72,y:25},{x:68,y:35},{x:12,y:35}], true)
    // Honey inside
    g.fillStyle(0xFF9900, 0.9)
    g.fillEllipse(40, 40, 46, 16)
    // Honey drips
    g.fillStyle(0xFF8800)
    g.fillRect(28, 40, 14, 26)
    g.fillEllipse(35, 66, 18, 14)
    g.fillRect(44, 40, 10, 18)
    g.fillEllipse(49, 58, 13, 10)
    // Big H label
    g.fillStyle(0xCC7700)
    g.fillRect(26, 46, 5, 18); g.fillRect(39, 46, 5, 18); g.fillRect(26, 54, 18, 5)
  })
}

function bakeRock(scene: Phaser.Scene): void {
  bake(scene, 'bs-rock', 90, 65, g => {
    g.fillStyle(0x888888)
    g.fillEllipse(45, 38, 84, 50)
    g.fillStyle(0xAAAAAA)
    g.fillEllipse(34, 30, 55, 34)
    g.lineStyle(2, 0x555555, 0.7)
    g.strokeEllipse(45, 38, 84, 50)
    g.lineStyle(1.5, 0x666666, 0.5)
    g.lineBetween(34, 22, 50, 42); g.lineBetween(56, 20, 50, 38)
    g.lineStyle(3, 0xFF8800, 0.5)
    g.strokeEllipse(45, 38, 88, 54)
  })
}

function bakeWoodenBoard(scene: Phaser.Scene): void {
  bake(scene, 'bs-board', 150, 44, g => {
    g.fillStyle(0x8B5E2D)
    g.fillRoundedRect(0, 8, 150, 28, 5)
    g.fillStyle(0x7A4E22)
    g.fillRect(0, 8, 150, 5)
    g.lineStyle(1, 0x6B4422, 0.4)
    for (let x = 10; x < 150; x += 20) g.lineBetween(x, 10, x+8, 36)
    g.fillStyle(0xCCCCCC)
    ;[14, 75, 136].forEach(nx => g.fillCircle(nx, 22, 4.5))
    g.lineStyle(2.5, 0xFF8800, 0.5)
    g.strokeRoundedRect(0, 8, 150, 28, 5)
  })
}

function bakeVine(scene: Phaser.Scene): void {
  bake(scene, 'bs-vine', 50, 140, g => {
    g.lineStyle(8, 0x2E7D1E)
    g.beginPath()
    for (let y = 0; y <= 130; y += 4) {
      const x = 25 + Math.sin(y * 0.13) * 12
      if (y === 0) g.moveTo(x, y); else g.lineTo(x, y)
    }
    g.strokePath()
    g.fillStyle(0x4CAF50)
    ;[18, 45, 72, 100].forEach(ly => {
      const lx = 25 + Math.sin(ly * 0.13) * 12
      g.fillEllipse(lx - 16, ly, 22, 12)
      g.fillEllipse(lx + 16, ly + 7, 20, 10)
    })
    g.lineStyle(2.5, 0xFF8800, 0.4)
    g.lineBetween(8, 0, 8, 130)
  })
}

function bakeBeehive(scene: Phaser.Scene): void {
  bake(scene, 'bs-hive', 130, 160, g => {
    g.fillStyle(0xFFD700, 0.25)
    g.fillCircle(65, 90, 80)
    // Rope
    g.lineStyle(5, 0x8B6914)
    g.lineBetween(65, 0, 65, 30)
    // Main hive dome
    g.fillStyle(0xCC8800)
    g.fillEllipse(65, 95, 110, 100)
    g.fillStyle(0xE5A000)
    g.fillEllipse(65, 80, 100, 110)
    // Hex pattern
    g.lineStyle(2, 0xAA7000, 0.7)
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 5; col++) {
        const hx = 18 + col * 22 + (row % 2) * 11
        const hy = 32 + row * 18
        drawHex(g, hx, hy, 9)
      }
    }
    // Entry hole
    g.fillStyle(0x6B3500)
    g.fillEllipse(65, 126, 30, 15)
    // Shine
    g.fillStyle(0xFFFFFF, 0.18)
    g.fillEllipse(48, 55, 30, 20)
    // Stars
    g.fillStyle(0xFFFF00, 0.9)
    ;[[18,22],[110,28],[12,68],[116,72]].forEach(([sx,sy]) => g.fillCircle(sx,sy,5))
  })
}

// Giant mushroom cluster obstacle
function bakeMushroomCluster(scene: Phaser.Scene): void {
  bake(scene, 'bs-mushroom', 100, 140, g => {
    // Stems
    g.fillStyle(0xEEDDBB)
    g.fillRoundedRect(12, 90, 18, 50, 4)
    g.fillRoundedRect(44, 80, 22, 60, 4)
    g.fillRoundedRect(76, 88, 16, 52, 4)
    // Caps — red with white spots
    g.fillStyle(0xEE2222)
    g.fillEllipse(21, 88, 50, 36)
    g.fillEllipse(55, 76, 60, 40)
    g.fillEllipse(84, 86, 44, 32)
    // White spots
    g.fillStyle(0xFFFFFF)
    ;[[14,80],[24,74],[6,84],[48,68],[58,62],[66,76],[78,80],[88,74]].forEach(([px,py]) =>
      g.fillCircle(px, py, 5))
    // Stems highlight
    g.fillStyle(0xFFEECC, 0.5)
    g.fillRoundedRect(16, 92, 7, 44, 3)
    g.fillRoundedRect(49, 82, 8, 54, 3)
  })
}

// Thorny bush obstacle (low on the ground)
function bakeThornyBush(scene: Phaser.Scene): void {
  bake(scene, 'bs-thorns', 110, 90, g => {
    // Main bush body
    g.fillStyle(0x226611)
    g.fillCircle(28, 58, 30)
    g.fillCircle(55, 48, 36)
    g.fillCircle(84, 58, 28)
    g.fillCircle(40, 46, 28)
    g.fillCircle(68, 44, 30)
    // Lighter highlights
    g.fillStyle(0x338822, 0.7)
    g.fillCircle(40, 44, 20)
    g.fillCircle(64, 42, 18)
    // Sharp thorns
    g.fillStyle(0xCCBB44)
    ;[[20,30],[38,22],[56,18],[74,24],[90,32],[10,44],[95,46]].forEach(([tx,ty]) => {
      g.fillTriangle(tx-5, ty+8, tx+5, ty+8, tx, ty-10)
    })
    // Berries
    g.fillStyle(0xFF2200)
    ;[[30,50],[52,42],[70,50],[44,54],[66,48]].forEach(([bx,by]) => g.fillCircle(bx,by,4))
  })
}

// Hanging lantern obstacle (dangles from top)
function bakeHangingLantern(scene: Phaser.Scene): void {
  bake(scene, 'bs-lantern', 70, 160, g => {
    // Rope from top
    g.lineStyle(4, 0x886633)
    g.lineBetween(35, 0, 35, 30)
    // Chain links
    g.lineStyle(3, 0xAA9944)
    for (let y = 30; y < 55; y += 8) g.strokeEllipse(35, y + 4, 8, 6)
    // Lantern body
    g.fillStyle(0xEE8800)
    g.fillRoundedRect(18, 55, 34, 52, 8)
    // Lantern ribs
    g.lineStyle(2, 0xCC6600, 0.8)
    ;[65, 75, 85, 95].forEach(ly => g.lineBetween(18, ly, 52, ly))
    g.lineBetween(35, 55, 35, 107)
    // Glass panels (glow)
    g.fillStyle(0xFFFF44, 0.55)
    g.fillRoundedRect(20, 57, 14, 48, 6)
    g.fillStyle(0xFFDD22, 0.45)
    g.fillRoundedRect(36, 57, 14, 48, 6)
    // Top cap
    g.fillStyle(0xAA6600)
    g.fillRoundedRect(14, 50, 42, 12, 4)
    // Bottom cap + hook
    g.fillStyle(0xAA6600)
    g.fillRoundedRect(14, 103, 42, 12, 4)
    g.fillStyle(0x886600)
    g.fillEllipse(35, 120, 10, 16)
    // Glow aura
    g.fillStyle(0xFFDD00, 0.2)
    g.fillCircle(35, 83, 44)
    // Warning tinge
    g.lineStyle(2.5, 0xFF6600, 0.35)
    g.strokeCircle(35, 83, 46)
  })
}

function drawHex(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  g.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py)
  }
  g.closePath(); g.strokePath()
}
