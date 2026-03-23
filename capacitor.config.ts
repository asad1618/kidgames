import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kidgames.platform',
  appName: 'KidGames',
  webDir: 'dist',
  server: {
    // For local dev: point to your Vite dev server IP
    // Uncomment and set your machine's IP when testing on device:
    // url: 'http://192.168.x.x:5173',
    // cleartext: true,
  },
  ios: {
    contentInset: 'never',
    backgroundColor: '#0F0E17',
    limitsNavigationsToAppBoundDomains: true,
  },
}

export default config
