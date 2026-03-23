# KidGames Platform

A multi-game platform for kids, running in the browser and as an iPad app.

## Tech Stack

| Layer | Technology |
|---|---|
| Game Engine | Phaser 3.90.0 |
| Language | TypeScript 5 |
| Build Tool | Vite 8 |
| iPad App | Capacitor 8 (WKWebView) |
| Art | Procedural (Phaser Graphics → RenderTexture) |
| Audio | Web Audio API oscillators |

**No external images. No audio files. 100% code-generated assets.**

## Games

- **Tic Tac Toe** — animated X vs O with confetti win effects

## Project Structure

```
src/
├── main.ts                  # Entry point
├── config/GameConfig.ts     # Phaser game config + scene list
├── scenes/
│   ├── BootScene.ts         # Scale setup
│   ├── PreloadScene.ts      # Bakes all procedural textures
│   └── GameHubScene.ts      # Game selection screen
├── games/
│   └── tictactoe/
│       ├── TicTacToeLogic.ts   # Pure game logic (no Phaser)
│       └── TicTacToeScene.ts   # Phaser scene
└── shared/
    ├── assets/
    │   ├── ColorPalette.ts      # Kid-friendly colors
    │   ├── TextureFactory.ts    # Graphics → RenderTexture helper
    │   └── ParticlePresets.ts   # Confetti, star bursts, ambient sparkles
    ├── audio/SoundManager.ts    # Procedural Web Audio tones
    ├── ui/Button.ts             # Animated button component
    └── registry/GameRegistry.ts # Central game list
```

## Development

```bash
npm install
npm run dev          # http://localhost:5173
```

## Adding a New Game

1. Create `src/games/mygame/` folder with:
   - `MyGameScene.ts` — extends `Phaser.Scene` with key `'MyGameScene'`
   - `MyGameLogic.ts` — pure state functions, no Phaser imports
2. Register it in `src/shared/registry/GameRegistry.ts`
3. Add the scene class to `src/config/GameConfig.ts` scene array
4. Bake any textures in `PreloadScene.ts`

## iPad App Setup (macOS + Xcode required)

```bash
# Initialize Capacitor (first time only)
npx cap init KidGames com.kidgames.platform --web-dir dist

# Add iOS platform (first time only)
npx cap add ios

# Build web app + sync to native
npm run cap:sync

# Open in Xcode
npm run cap:open:ios
```

### Xcode Settings for iPad

In `ios/App/App/Info.plist` add:
```xml
<key>UIRequiresFullScreen</key><true/>
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

## Production Build

```bash
npm run build        # outputs to dist/
```
