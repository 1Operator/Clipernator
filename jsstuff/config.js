// ============================================================
// CLIPBLAST: PARTY HUNTER — Config   
// ============================================================

const CFG = {
  W: 700, H: 460,
  PLAYER_SPEED: 4,
  SPEED_BOOST_MULT: 1.65,
  DASH_SPEED: 14,
  DASH_FRAMES: 10,
  DASH_WINDUP_FRAMES: 4,
  SFP_EXPLOSION_RADIUS: 160,
  WALL_PAD: 22,
  MAX_AMMO: 8,
  RELOAD_FRAMES: 90,
  PARTY_FREEZE_FRAMES: 180,
  SPEED_BOOST_FRAMES: 300,
  DASH_MAX_CHARGES: 3,
  DASH_COOLDOWN_FRAMES: 240,
  BULLET_COUNT: 5,
  BULLET_SPEED: 14,
  BULLET_LIFE: 22,
  SPAWN_INTERVAL_BASE: 150,
  MAX_HEALTH: 100,
  HEALTH_REGEN: 8,
  SAFE_SPAWN_DIST: 160,
  WAVE_ENEMIES_BASE: 6,
  WAVE_ENEMIES_GROWTH: 3,
  WAVE_SPAWN_SPEEDUP: 13,
  GIFT_BOX_EXPLOSION_RADIUS: 110,

   WAVE_ENEMIES_FLOOR2_BASE: 5,   // floor 2 starts lighter
  WAVE_ENEMIES_FLOOR2_GROWTH: 2, // and scales more gently

  
  BOSS_WAVE: 10,
  BOSS2_WAVE: 26,
  BOSS_BASE_HP: 240,
  BOSS_SPEED: 1.8,

  CLOWN_CAR_SPEED: 4.2,
CLOWN_CAR_EJECT_INTERVAL: 240,
CLOWN_CAR_BOUNCE_MAX: 5,
CLOWN_CAR_TAKEOVER_FRAMES: 240,
MINI_CLOWN_SPEED: 3.8,

  
  MELEE_SWING_FRAMES: 18,
  MELEE_RANGE: 95,
  MELEE_CONE_ANGLE: 1.1,
  MELEE_DAMAGE: 4,
  GLOW_COOLDOWN: 45,
  MELEE_ACTIVE_FRAMES: 8,  // how many frames the hitbox is live
  CHIPPY_SPIN_COLS: 5,
  CHIPPY_SPIN_ROWS: 3,
  CHIPPY_SPIN_FRAME_COUNT: 12,
  CHIPPY_PRODUCE_COLS: 5,
  CHIPPY_PRODUCE_ROWS: 5,
  CHIPPY_PRODUCE_FRAME_COUNT: 25,
  CHIPPY_PRODUCE_FRAME_DURATION: 4,
  CHIPPY_FRAME_SIZE: 256,
  CHIPPY_DRAW_HEIGHT: 96,
  CHIPPY_RISE_FRAMES: 72,
  CHIPPY_SPIN_FRAMES: 300,
  CHIPPY_LANDING_FRAMES: 120,
  CHIPPY_TRANSITION_FRAMES: 24,
  CHIPPY_INTERACT_RANGE: 110,
  CHIP_DROP_CHANCE: 0.1,
  CHIP_MAGNET_RANGE: 130,
  CHIP_PICKUP_RANGE: 24,
  CHIP_MAGNET_ACCEL: 0.22,
  CHIP_MAX_SPEED: 8,
  CHIP_TRAIL_LENGTH: 9,
  GOLDEN_CHIP_WAVE_STREAK: 5,
  OFFSCREEN_ENEMY_DAMAGE_DISTANCE: 500,
  OFFSCREEN_ENEMY_DAMAGE: 3,
  OFFSCREEN_WINDOW_FADE_DISTANCE: 1200,
  OFFSCREEN_WINDOW_MIN_SCALE: 0.7,
  WATER_BALLOON_LEASH_DISTANCE: 360,
  WATER_BALLOON_ORBIT_MIN_RADIUS: 110,
  WATER_BALLOON_ORBIT_MAX_RADIUS: 170,
};

let worldW = CFG.W;
let worldH = CFG.H;
let renderScale = 1.0;

const canvas = document.getElementById('c');
let ctx = canvas.getContext('2d');

function desktopDistanceBeyondViewport(worldX, worldY, rect = canvas.getBoundingClientRect()) {
  if (!rect.width || !rect.height) return 0;
  const screenX = rect.left + worldX * rect.width / worldW;
  const screenY = rect.top + worldY * rect.height / worldH;
  const dx = screenX < 0 ? -screenX : Math.max(0, screenX - window.innerWidth);
  const dy = screenY < 0 ? -screenY : Math.max(0, screenY - window.innerHeight);
  return Math.hypot(dx, dy);
}

const playerImg = new Image();
let playerCanvas = null;
let playerRedCanvas = null;

playerImg.onload = function() {
  const off = document.createElement('canvas');
  off.width  = playerImg.naturalWidth;
  off.height = playerImg.naturalHeight;
  const offCtx = off.getContext('2d');
  offCtx.drawImage(playerImg, 0, 0);
  const imageData = offCtx.getImageData(0, 0, off.width, off.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    if (r < 30 && g < 30 && b < 30) { data[i+3] = 0; }
  }
  offCtx.putImageData(imageData, 0, 0);
  playerCanvas = off;

  const red = document.createElement('canvas');
  red.width = off.width;
  red.height = off.height;
  const redCtx = red.getContext('2d');
  redCtx.drawImage(off, 0, 0);
  redCtx.globalCompositeOperation = 'source-atop';
  redCtx.fillStyle = 'rgba(255, 0, 0, 0.78)';
  redCtx.fillRect(0, 0, red.width, red.height);
  playerRedCanvas = red;
};
playerImg.src = '/Clipernator/sprites/Clippy.png';

const shotgunImg = new Image();
shotgunImg.src = '/Clipernator/sprites/Shotgun.png';

let gunAngle = 0;
let gunRecoil = 0;
let playerMoveAngle = 0;
let gunX = 0;
let gunY = 0;
let playerBobTimer = 0;

const normalBulletImg = new Image();
normalBulletImg.src = '/Clipernator/sprites/bullets/normalbullet.png';

const dudBulletImg = new Image();
dudBulletImg.src = '/Clipernator/sprites/bullets/dudbullet.png'; // pill image

const TearBulletImg = new Image();
TearBulletImg.src = '/Clipernator/sprites/bullets/TearBullet.png'; // water balloon image

const PurpleTearBulletImg = new Image();
PurpleTearBulletImg.src = '/Clipernator/sprites/bullets/PurpleTearBullet.png';

const RedTearBulletImg = new Image();
RedTearBulletImg.src = '/Clipernator/sprites/bullets/RedTearBullet.png';

const arcBallImg = new Image();
arcBulletImg = arcBallImg; // alias
arcBallImg.onload = function() {
  const off = document.createElement('canvas');
  off.width = arcBallImg.naturalWidth; off.height = arcBallImg.naturalHeight;
  const offCtx = off.getContext('2d');
  offCtx.drawImage(arcBallImg, 0, 0);
  const d = offCtx.getImageData(0, 0, off.width, off.height);
  for (let i = 0; i < d.data.length; i += 4) {
    if (d.data[i] < 25 && d.data[i+1] < 25 && d.data[i+2] < 25) d.data[i+3] = 0;
  }
  offCtx.putImageData(d, 0, 0);
  arcBallCanvas = off;
};
arcBallImg.src = '/Clipernator/sprites/bullets/arcball.png'; // sphere image
let arcBallCanvas = null;


const bouncyBulletImg = new Image();
bouncyBulletImg.src = '/Clipernator/sprites/bullets/bouncybullet.png';

const bullet2xImg = new Image();
bullet2xImg.src = '/Clipernator/sprites/bullets/bullet2x.png';

const bullet3xImg = new Image();
bullet3xImg.src = '/Clipernator/sprites/bullets/bullet3x.png';

const bullet4xImg = new Image();
bullet4xImg.src = '/Clipernator/sprites/bullets/bullet4x.png';


const clownNoseImg = new Image();
clownNoseImg.src = '/Clipernator/sprites/items/clownish/clownNose.png'; // adjust path to your sprite
const clownWaveImg = new Image();
clownWaveImg.src = '/Clipernator/sprites/items/clownish/clownWave.png'; // adjust path

const chippySpinSheet = new Image();
chippySpinSheet.src = '/Clipernator/sprites/objects/Chippy/ChippySpin.png';

const chippyProduceSheet = new Image();
chippyProduceSheet.src = '/Clipernator/sprites/objects/Chippy/ChippyProduce.png';

const chipImg = new Image();
chipImg.src = '/Clipernator/sprites/objects/Chips/Chip.png';

const goldenChipImg = new Image();
goldenChipImg.src = '/Clipernator/sprites/objects/Chips/GoldenChip.png';

// At the top of draw.js, add this with the other image loaders (near playerImg/shotgunImg)

const forkSheetImg = new Image();
forkSheetImg.src = '/Clipernator/sprites/enemies/Utensil/Fork/ForkSheet.png';

const forkTipImg = new Image();
forkTipImg.src = '/Clipernator/sprites/enemies/Utensil/Fork/ForkTip.png';

const knifeSheetImg = new Image();
knifeSheetImg.src = '/Clipernator/sprites/enemies/Utensil/Knife/KnifeSheet.png';

const knifeTipImg = new Image();
knifeTipImg.src = '/Clipernator/sprites/enemies/Utensil/Knife/KnifeTip.png';

const spoonSheetImg = new Image();
spoonSheetImg.src = '/Clipernator/sprites/enemies/Utensil/Spoon/SpoonSheet.png';

const spoonTipImg = new Image();
spoonTipImg.src = '/Clipernator/sprites/enemies/Utensil/Spoon/SpoonTip.png';



const partyHatImg = new Image();
partyHatImg.src = '/Clipernator/sprites/enemies/PartyHat/PartyHat.png';


const partyHatIdleSheet = new Image();
partyHatIdleSheet.src = '/Clipernator/sprites/enemies/PartyHat/PartyHatIdleSheet.png';

const partyHatTransitionSheet = new Image();
partyHatTransitionSheet.src = '/Clipernator/sprites/enemies/PartyHat/PartyHatTransitionSheet.png';
 
const partyHatDiveSheet = new Image();
partyHatDiveSheet.src = '/Clipernator/sprites/enemies/PartyHat/PartyHatDiveSheet.png';

const partyHatDiveImg = new Image();
partyHatDiveImg.src = '/Clipernator/sprites/enemies/PartyHat/PartyHatDive.png';

const partyHatRecoverSheet = new Image();
partyHatRecoverSheet.src = '/Clipernator/sprites/enemies/PartyHat/PartyHatRecoverSheet.png';

const waterBalloonIdleSheet = new Image();
waterBalloonIdleSheet.src = '/Clipernator/sprites/enemies/WaterBalloon/WaterBalloonIdleSheet.png';

const waterBalloonTurnSheet = new Image();
waterBalloonTurnSheet.src = '/Clipernator/sprites/enemies/WaterBalloon/WaterBalloonTurnSheet.png';

const waterBalloonShootSheet = new Image();
waterBalloonShootSheet.src = '/Clipernator/sprites/enemies/WaterBalloon/WaterBalloonShootSheet.png';

const waterBalloonIdleSheetRed = new Image();
waterBalloonIdleSheetRed.src = '/Clipernator/sprites/enemies/WaterBalloon/WaterBalloonIdleSheetRed.png';

const waterBalloonTurnSheetRed = new Image();
waterBalloonTurnSheetRed.src = '/Clipernator/sprites/enemies/WaterBalloon/WaterBalloonTurnSheetRed.png';

const waterBalloonShootSheetRed = new Image();
waterBalloonShootSheetRed.src = '/Clipernator/sprites/enemies/WaterBalloon/WaterBalloonShootSheetRed.png';


const maskSheetImg = new Image();
maskSheetImg.src = '/Clipernator/sprites/enemies/Mask/MaskSheet.png';

const redCorImg = new Image();
redCorImg.src = '/Clipernator/sprites/enemies/COR/RedCOR.png';

const blueCorImg = new Image();
blueCorImg.src = '/Clipernator/sprites/enemies/COR/BlueCOR.png';

const antipieLayer1Img = new Image();
antipieLayer1Img.src = '/Clipernator/sprites/enemies/ANTIPIE/Layer1.png';

const antipieLayer2Img = new Image();
antipieLayer2Img.src = '/Clipernator/sprites/enemies/ANTIPIE/Layer2.png';

const antipieLayer3Img = new Image();
antipieLayer3Img.src = '/Clipernator/sprites/enemies/ANTIPIE/Layer3.png';

// Water balloon sprite sheets (mask enemy)
// All sheets: 1024×1024 per frame
const WB_IDLE_COLS   = 3;  WB_IDLE_FW   = 1024; // 3072-wide sheet
const WB_IDLE_FRAMES = 8;
const WB_TURN_COLS   = 2;  WB_TURN_FW   = 1024; // 2048-wide sheet
const WB_TURN_FRAMES = 4;
const WB_SHOOT_COLS  = 3;  WB_SHOOT_FW  = 1024; // 3072-wide sheet
const WB_SHOOT_FRAMES = 8;
const WB_FRAME_H = 1024; // same for all sheets

const giftBoxIdleSheet = new Image();
giftBoxIdleSheet.src = '/Clipernator/sprites/enemies/GiftBox/GiftBoxIdleSheet.png';

const giftBoxWindUpSheet = new Image();
giftBoxWindUpSheet.src = '/Clipernator/sprites/enemies/GiftBox/GiftBoxWindUpSheet.png';

// ================================================================
// KEYBINDS
// ================================================================

const KEYBIND_DEFAULTS = {
  moveLeft:   'a',
  moveRight:  'd',
  moveUp:     'w',
  moveDown:   's',
  reload:     'r',
  dash:       'Shift',
  prizeWheel: 'q',
  pause:      'p',
  glowstick:  'f',
  throwItem:  'e',
};

const KEYBIND_LABELS = {
  moveLeft:   'Move Left',
  moveRight:  'Move Right',
  moveUp:     'Move Up',
  moveDown:   'Move Down',
  reload:     'Reload',
  dash:       'Dash',
  prizeWheel: 'Prize Wheel',
  pause:      'Pause',
  glowstick:  'Glowstick / Melee',
  throwItem:  'Pick Up / Throw',
};

function loadKeybinds() {
  try {
    const saved = localStorage.getItem('clipblast_keybinds');
    if (saved) {
      const parsed = JSON.parse(saved);
      for (const action of Object.keys(KEYBIND_DEFAULTS)) {
        if (parsed[action]) KEYBINDS[action] = parsed[action];
      }
    }
  } catch(e) {}
}

function saveKeybinds() {
  try { localStorage.setItem('clipblast_keybinds', JSON.stringify(KEYBINDS)); }
  catch(e) {}
}

const KEYBINDS = { ...KEYBIND_DEFAULTS };
loadKeybinds();

function formatKey(k) {
  if (k === ' ')       return 'SPACE';
  if (k === 'Shift')   return 'SHIFT';
  if (k === 'Control') return 'CTRL';
  if (k === 'Alt')     return 'ALT';
  return k.toUpperCase();
}

const dpr = window.devicePixelRatio || 1;
canvas.width  = CFG.W * dpr;
canvas.height = CFG.H * dpr;
