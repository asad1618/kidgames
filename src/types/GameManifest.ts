export interface GameManifest {
  key: string
  title: string
  description: string
  sceneKey: string
  hubColor: number
  accentColor: number
  emoji: string
  logoKey?: string   // optional texture key — replaces emoji with a sprite on the hub card
}
