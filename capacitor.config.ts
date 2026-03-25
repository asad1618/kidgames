import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.kidgames.platform',
  appName: 'KidGames',
  webDir: 'dist',
  ios: {
    contentInset: 'never',
    backgroundColor: '#0F0E17',
    limitsNavigationsToAppBoundDomains: true,
  },
  android: {
    backgroundColor: '#0F0E17',
  },
}

export default config
