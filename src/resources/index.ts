import bee1Url from './bee1.png?url'
import bee2Url from './bee2.png?url'
import hulk1Url from './hulk1.png?url'
import hulk2Url from './hulk2.png?url'
import lumberjack1Url from './lumberjack1.png?url'
import lumberjack2Url from './lumberjack2.png?url'
import lumberjack3Url from './lumberjack3.png?url'
import fenceUrl from './fense.png?url'
import webUrl from './web.png?url'
import snakeUrl from './snake.png?url'
import eagleUrl from './eagle.png?url'
import lanternUrl from './lantern.png?url'
import honeyUrl from './honey.png?url'
import rockUrl from './rock.png?url'
import boardUrl from './board.png?url'
import beehiveUrl from './beehive.png?url'
import branchUrl from './branch.png?url'

// Theme 1
import cloudT1Url from './themes/1/cloud.png?url'
import flowerT1Url from './themes/1/flower.png?url'
import groundT1Url from './themes/1/ground.png?url'
import mushroomT1Url from './themes/1/mushroom.png?url'
import sunflowerDecoT1Url from './themes/1/subflower.png?url'
import thornsT1Url from './themes/1/thorns.png?url'
import treeT1Url from './themes/1/tree.png?url'
import vineT1Url from './themes/1/vine.png?url'

// Theme 2
import cloudT2Url from './themes/2/cloud.png?url'
import flowerT2Url from './themes/2/flower.png?url'
import groundT2Url from './themes/2/ground.png?url'
import mushroomT2Url from './themes/2/mushroom.png?url'
import sunflowerDecoT2Url from './themes/2/subflower.png?url'
import thornsT2Url from './themes/2/thorns.png?url'
import treeT2Url from './themes/2/tree.png?url'
import vineT2Url from './themes/2/vine.png?url'

export const BEESCROLLER_THEME_COUNT = 2

export const BeeScrollerImages = {
  bee1: bee1Url,
  bee2: bee2Url,
  hulk1: hulk1Url,
  hulk2: hulk2Url,
  lumberjack1: lumberjack1Url,
  lumberjack2: lumberjack2Url,
  lumberjack3: lumberjack3Url,
  fence: fenceUrl,
  web: webUrl,
  snake: snakeUrl,
  eagle: eagleUrl,
  lantern: lanternUrl,
  honey: honeyUrl,
  rock: rockUrl,
  board: boardUrl,
  beehive: beehiveUrl,
  branch: branchUrl,
}

export interface ThemeImages {
  cloud: string
  flower: string
  ground: string
  mushroom: string
  sunflowerDeco: string
  thorns: string
  tree: string
  vine: string
}

export const BeeScrollerThemes: Record<number, ThemeImages> = {
  1: { cloud: cloudT1Url, flower: flowerT1Url, ground: groundT1Url, mushroom: mushroomT1Url, sunflowerDeco: sunflowerDecoT1Url, thorns: thornsT1Url, tree: treeT1Url, vine: vineT1Url },
  2: { cloud: cloudT2Url, flower: flowerT2Url, ground: groundT2Url, mushroom: mushroomT2Url, sunflowerDeco: sunflowerDecoT2Url, thorns: thornsT2Url, tree: treeT2Url, vine: vineT2Url },
}
