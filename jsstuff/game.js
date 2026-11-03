// ============================================================
// CLIPBLAST: PARTY HUNTER  Game Core   
// ECS, game state, input, loop, HUD, pause, game over
// ============================================================
 
let gameRunning = false;
let animId = null;
let msgTimeout = null;
let keys = {};
let mouse = { x: CFG.W / 2, y: CFG.H / 2, screenX: CFG.W / 2, screenY: CFG.H / 2 };
let muzzleFlash = 0;
let meleeSwingTimer = 0;
let isPaused = false;
let lastTime = 0;
let viewportSize = {
  width: canvas.clientWidth || CFG.W,
  height: canvas.clientHeight || CFG.H,
};

function resizeGameViewport() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;

  const scaleX = width / viewportSize.width;
  const scaleY = height / viewportSize.height;
  if (scaleX !== 1 || scaleY !== 1) {
    if (gameRunning) {
      worldW *= scaleX;
      worldH *= scaleY;
      if (gs.transitioning) {
        gs.transitionStartW *= scaleX;
        gs.transitionEndW *= scaleX;
        gs.transitionStartH *= scaleY;
        gs.transitionEndH *= scaleY;
      }
    } else {
      worldW = width;
      worldH = height;
      renderScale = 1;
    }
    viewportSize = { width, height };
  }

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
}

new ResizeObserver(resizeGameViewport).observe(document.getElementById('wrapper'));

// ================================================================
// ECS CORE
// ================================================================
const ECS = {
  _nextId: 0,
  entities: new Set(),
  _comps: {},
  _queryCache: new Map(),

  createEntity() {
    const id = this._nextId++;
    this.entities.add(id);
    return id;
  },

destroyEntity(id) {
  const enemy = this.get(id, 'enemy');
  const pos = this.get(id, 'pos');
  if (enemy?.type === 'utensil' && pos) {
    SFX.playAt('utensilDeath', pos.x, pos.y, 0.65);
  }
  SFX.stopEntitySound('giftBoxWindUp', id);
  if (enemy?.type === 'partyHat' && pos) {
    SFX.playAt('partyHatDie', pos.x, pos.y, 0.5);
  }
  this.entities.delete(id);
  for (const k in this._comps) this._comps[k].delete(id);
  this._queryCache.clear();  // replace the per-set loop
},

add(id, type, data) {
  if (!this._comps[type]) this._comps[type] = new Map();
  this._comps[type].set(id, data);
  this._queryCache.clear();  // simpler and correct
  return data;
},

  get(id, type) {
    return this._comps[type] ? this._comps[type].get(id) : undefined;
  },

  has(id, type) {
    return !!(this._comps[type] && this._comps[type].has(id));
  },

 remove(id, type) {
  if (this._comps[type]) this._comps[type].delete(id);
  this._queryCache.clear();  // was trying to patch individual sets
},

  query(...types) {
    const key = types.join(',');
    if (!this._queryCache.has(key)) {
      // Build this query result fresh and cache it
      const result = new Set();
      for (const id of this.entities) {
        if (types.every(t => this.has(id, t))) result.add(id);
      }
      this._queryCache.set(key, result);
    }
    return this._queryCache.get(key);
  },

  clear() {
    this._nextId = 0;
    this.entities.clear();
    this._comps = {};
    this._queryCache.clear();
  }
};

// ── Helper ──
function playerPos(gs) {
  const ids = ECS.query('player', 'pos');
  if (!ids.size) return null;
  return ECS.get(ids.values().next().value, 'pos');
}

// ================================================================
// GAME STATE
// ================================================================
let gs = {};

function applyPlayerDamage(amount) {
  const scaledDamage = typeof emailIncomingDamage === 'function'
    ? emailIncomingDamage(amount)
    : amount;
  if (typeof notifyEmailPlayerDamaged === 'function') notifyEmailPlayerDamaged();
  gs.health = Math.max(0, gs.health - scaledDamage);
}

function initGameState(applyIntroChoices = true) {
  ECS.clear();
  worldW = canvas.clientWidth || CFG.W;
  worldH = canvas.clientHeight || CFG.H;
  renderScale = 1;
  viewportSize = { width: worldW, height: worldH };

  gs = {
    score: 0, wave: 1,
    chips: 0, goldenChips: 0, chipDrops: [], flawlessWaveStreak: 0,
    health: CFG.MAX_HEALTH, maxHealth: CFG.MAX_HEALTH,
    leakingTimer: 0, leakingTickTimer: 0,
    ammo: CFG.MAX_AMMO, maxAmmo: CFG.MAX_AMMO,
    reloading: false, reloadTimer: 0,
    invincible: 0,
    partyFreezeTimer: 0, speedBoostTimer: 0, confettiSlowTimer: 0,
    bullets: [], enemyBullets: [], particles: [], fieldItems: [],
    shakeX: 0, shakeY: 0,
    spawnTimer: 0, spawnInterval: CFG.SPAWN_INTERVAL_BASE,
    waveEnemiesLeft: CFG.WAVE_ENEMIES_BASE + CFG.WAVE_ENEMIES_GROWTH, waveKills: 0,
    unlockedItems: [], itemCooldowns: {},
    pendingChoice: false,
    clippyOutsideTimer: 0,
    clippyWindowActive: false,
    clippyWindowMergeTimer: 0,
    heldGiftBox: null,
    forkGrabbed: false,

   // Show opening Clippy tip on the player sprite
clippyIntroLines: [
  "It looks like you started a new game!",
  "WASD to move · Mouse to aim · Click to shoot",
  "R to reload · Shift to dash · P to pause",
  "Good luck... you'll need it.",
], 
clippyIntroTimer: 0, clippyIntroLine: 0, clippyIntroDone: false,
clippyPickupMsg: '',
clippyPickupTimer: 0,
    // Item flags
    bouncyHouse: false,
    hasDoubleCake: false, hasTripleCake: false, hasQuadCake: false,
    hasDash: false,
    dashCharges: 0, dashMaxCharges: CFG.DASH_MAX_CHARGES,
    dashCooldownTimer: 0, dashCooldownMax: CFG.DASH_COOLDOWN_FRAMES,
    dashTimer: 0, dashVx: 0, dashVy: 0,
    dashWindupTimer: 0, dashLaunchFrame: 0, dashActiveThisFrame: false, dashBurst: null,
    frozen: false,
    hasGlowsticks: false,
    glowCooldown: 0,
    hasShakeFizzlePop: false,
    sfpMeter: 0, sfpMax: 600, sfpFull: false,
    hasFlawlessBaking: false,
    flawlessThisWave: true,
    hasCursedCandles: false,
    candlesLit: 0, candleHpTimer: 0, candleRelightDelay: 0,
    hasRagingRings: false,
    ragingRingBullets: [],
    hasMirrorMaze: false,
    mirrorShards: [],
    mirrorPlayerShardTimer: 1,
    hasPopcornBucket: false, popcornKernels: [], popcornFrenzyTimer: 0,
    _kernelsCollected: 0,
    hasTightropeBoots: false,
    hasBowlingBall: false,
    bowlingBallReady: false,
    bowlingBallRegenTimer: 0,
    hasClownish: false,
    clownNoseSize: 0, clownNoseTimer: 0, clownNoseMax: 480,
    clownNoseHonkTimer: 0,
    clownConfuseActive: false,
    clownSoundWaves: [],
    speedBoostMult: CFG.SPEED_BOOST_MULT,

    // Boss
    bossId: null, bossActive: false,

    // Floor tracking
    floor: 1,
    transitioning: false,
    transitionT: 0,
    transitionDone: false,
    transitionStartW: CFG.W,
    transitionStartH: CFG.H,
    transitionEndW: 1050,
    transitionEndH: 690,

    // Tickets / prize wheel (Floor 2)
    tickets: 0,
    prizeEffect: null,
    sugarRushActive: false,
    ricochetActive: false,
    cursedSpinTimer: 0,
    drivingCar: null,
    drivingCarTimer: 0,
  };

  const pId = ECS.createEntity();
  ECS.add(pId, 'player', { invincible: 0 });
  ECS.add(pId, 'pos',    { x: worldW / 2, y: worldH / 2, angle: 0 });
  ECS.add(pId, 'vel',    { vx: 0, vy: 0 });
  gs.playerId = pId;

  const chippyId = ECS.createEntity();
  ECS.add(chippyId, 'chippyMachine', {
    phase: 'spinning',
    sheet: 'spin',
    elapsed: 0,
    frame: 0,
    spinStartFrame: 0,
    targetFrame: Math.floor(Math.random() * CFG.CHIPPY_SPIN_FRAME_COUNT),
    isInitialSpawn: true,
  });
  ECS.add(chippyId, 'pos', { x: worldW / 2 - 115, y: worldH / 2 + 20 });

 //Apply difficulty chosen in intro
  if (applyIntroChoices && typeof INTRO !== 'undefined') {
    INTRO.applyDifficultyToGs(gs);
    INTRO.applyDraftItemsToGs(gs);
  }
  resetEmailRunState();
 
}

// ================================================================
// HUD / MESSAGES
// ================================================================
function updateHUD() {
  document.getElementById('health-bar').style.width =
    Math.max(0, (gs.health / gs.maxHealth) * 100) + '%';
  document.getElementById('health-bar').style.background =
    gs.health < gs.maxHealth * 0.3 ? '#cc0000' : '#00aa00';
  document.getElementById('health-num').textContent = Math.max(0, gs.health);
  document.getElementById('ammo-val').textContent = gs.ammo + '/' + emailAmmoCapacity();
  document.getElementById('wave-val').textContent = gs.wave;
  document.getElementById('chips-val').textContent = gs.chips;
  document.getElementById('golden-chips-val').textContent = gs.goldenChips;
}

function showMsg(txt) {
  const el = document.getElementById('msg');
  el.textContent = txt;
  el.style.opacity = '1';
  clearTimeout(msgTimeout);
  msgTimeout = setTimeout(() => { el.style.opacity = '0'; }, 1800);
}

// ================================================================
// PAUSE CLIPPY RENDERING
// ================================================================

// Track pause mouse position for Clippy eye tracking
let _pauseMouseX = 0, _pauseMouseY = 0;

// Clippy sprite images for pause menu eye tracking
const _clippyPauseImgs = {
  forward: null, upleft: null, upright: null,
  worriedleft1: null, worriedleft2: null,
  worriedright1: null, worriedright2: null,
  sweatingleft: null, focusedleft: null,
  crouchingleft: null, crouchingright: null,
};

(function loadClippyPauseSprites() {
  const defs = {
    forward:        'sprites/clippy/Clippyforward.png',
    upleft:         'sprites/clippy/Clippyupleft.png',
    upright:        'sprites/clippy/Clippyupright.png',
    worriedleft1:   'sprites/clippy/Clippyworriedleft1.png',
    worriedleft2:   'sprites/clippy/Clippyworriedleft2.png',
    worriedright1:  'sprites/clippy/Clippyworriedright1.png',
    worriedright2:  'sprites/clippy/Clippyworriedright2.png',
    sweatingleft:   'sprites/clippy/Clippysweatingleft.png',
    focusedleft:    'sprites/clippy/Clippyfocusedleft.png',
    crouchingleft:  'sprites/clippy/Clippycrouchingleft.png',
    crouchingright: 'sprites/clippy/Clippycrouchingright.png',
  };
  for (const [k, src] of Object.entries(defs)) {
    const img = new Image(); img.src = src; _clippyPauseImgs[k] = img;
  }
})();

function _getClippyDirectionSprite(clippyCanvasX, clippyCanvasY, mouseX, mouseY) {
  const dx = mouseX - clippyCanvasX, dy = mouseY - clippyCanvasY;
  const deg = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
  // 0=right 90=down 180=left 270=up
  if (deg >= 337.5 || deg < 22.5)   return _clippyPauseImgs.worriedright2;
  if (deg < 67.5)                    return _clippyPauseImgs.crouchingright;
  if (deg < 112.5)                   return _clippyPauseImgs.forward;
  if (deg < 157.5)                   return _clippyPauseImgs.focusedleft;
  if (deg < 202.5)                   return _clippyPauseImgs.crouchingleft;
  if (deg < 247.5)                   return _clippyPauseImgs.upleft;
  if (deg < 292.5)                   return _clippyPauseImgs.worriedleft1;
  return _clippyPauseImgs.upright;
}

// The Clippy canvas for the pause menu — drawn onto a separate canvas
// positioned absolutely over the pause dialog, next to stats
let _pauseClippyCanvas = null;
let _pauseBubbleElement = null;
let _pauseClippyCtx = null;
let _pauseClippyAnimId = null;

function _createPauseClippyCanvas() {
  if (_pauseClippyCanvas) return;

  _pauseBubbleElement = document.createElement('div');
  _pauseBubbleElement.className = 'pause-clippy-bubble';

  _pauseClippyCanvas = document.createElement('canvas');
  _pauseClippyCanvas.width = 100;
  _pauseClippyCanvas.height = 120;
 _pauseClippyCanvas.style.cssText = `
    position: absolute; right: 160px; top: 10px;
    width: 120px; height: 120px;
    image-rendering: pixelated; pointer-events: none; z-index: 10; background: transparent;
`;
  _pauseClippyCtx = _pauseClippyCanvas.getContext('2d');

  const statsFieldset = document.querySelector('#pause-menu fieldset');
  if (statsFieldset) {
    statsFieldset.style.position = 'relative';
    statsFieldset.style.overflow = 'visible';
    statsFieldset.appendChild(_pauseBubbleElement);
    statsFieldset.appendChild(_pauseClippyCanvas);
  }
}

function _removePauseClippyCanvas() {
  if (_pauseClippyCanvas && _pauseClippyCanvas.parentNode)
    _pauseClippyCanvas.parentNode.removeChild(_pauseClippyCanvas);
  if (_pauseBubbleElement && _pauseBubbleElement.parentNode)
    _pauseBubbleElement.parentNode.removeChild(_pauseBubbleElement);
  _pauseClippyCanvas = null;
  _pauseBubbleElement = null;
  _pauseClippyCtx = null;
  if (_pauseClippyAnimId) { cancelAnimationFrame(_pauseClippyAnimId); _pauseClippyAnimId = null; }
}

function _drawPauseClippy() {
  if (!_pauseClippyCtx || !_pauseClippyCanvas) return;
  const c = _pauseClippyCtx;
  const W = _pauseClippyCanvas.width;
  const H = _pauseClippyCanvas.height;
  c.clearRect(0, 0, W, H);  // transparent — no fillRect with a color

  const rect = _pauseClippyCanvas.getBoundingClientRect();
  const canvasCX = rect.left + rect.width / 2;
  const canvasCY = rect.top + rect.height * 0.35;

  const sprite = _getClippyDirectionSprite(canvasCX, canvasCY, _pauseMouseX, _pauseMouseY);
  const imgToDraw = (sprite && sprite.complete && sprite.naturalWidth > 0) ? sprite : _clippyPauseImgs.forward;

  if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
    c.drawImage(imgToDraw, 0, 0, W, H);
  }

  if (_pauseBubbleElement) {
    const bubbleText = _clippyBubbleText || '';
    if (_pauseBubbleElement.textContent !== bubbleText) {
      _pauseBubbleElement.textContent = bubbleText;
    }
    _pauseBubbleElement.hidden = !bubbleText;
  }
}

function _startPauseClippyLoop() {
  if (_pauseClippyAnimId) cancelAnimationFrame(_pauseClippyAnimId);
  function tick() {
    if (!isPaused) { _pauseClippyAnimId = null; return; }
    _drawPauseClippy();
    _pauseClippyAnimId = requestAnimationFrame(tick);
  }
  tick();
}

// ================================================================
// GAME OVER / PAUSE
// ================================================================
function gameOver() {
  endEmailRun();
  SFX.play('clippyDeath', 0.7);
  gameRunning = false;
  cancelAnimationFrame(animId);
  draw();
  const overlay = document.getElementById('overlay');
  overlay.style.display = 'flex';
  const h1 = overlay.querySelector('h1');
  const sub = overlay.querySelector('.sub');
  const btn = document.getElementById('startBtn');
  if (h1) { h1.innerHTML = 'GAME OVER'; h1.style.color = '#ff3333'; h1.style.textShadow = '0 0 20px #ff3333'; }
  if (sub) sub.textContent = `WAVE ${gs.wave} · PRESS PLAY TO RETRY`;
  if (btn) btn.textContent = 'PLAY AGAIN';
}

function togglePause() {
  if (gs.pendingChoice) return;
  if (!isPaused) SFX.play('pause', 0.75);
  isPaused = !isPaused;
  pauseEmailTimers();
  if (isPaused) {
    gameRunning = false;
    cancelAnimationFrame(animId);
    const pauseMenu = document.getElementById('pause-menu');
    pauseMenu.style.display = 'flex';
    bringFloatingWindowToFront(pauseMenu);
    renderPauseMenu();
    _createPauseClippyCanvas();
    _startPauseClippyLoop();
    clippyIdleTip();
  } else {
    _removePauseClippyCanvas();
    document.getElementById('pause-menu').style.display = 'none';
    updateTaskbarActiveWindow();
    gameRunning = true;
    lastTime = performance.now();
    loop();
  }
}

function renderPauseMenu() {
  const statsEl = document.getElementById('pause-stat-lines');
  const statusEffectsEl = document.getElementById('pause-status-effects');
  statusEffectsEl.replaceChildren();
  if (gs.leakingTimer > 0) {
    const leakingStatus = document.createElement('button');
    leakingStatus.type = 'button';
    leakingStatus.className = 'pause-status-icon';
    leakingStatus.title = `Leaking: ${Math.ceil(gs.leakingTimer / 60)} seconds remaining. Click to ask Clippy.`;
    leakingStatus.setAttribute('aria-label', leakingStatus.title);
    leakingStatus.addEventListener('click', () => clippyExplainStatusEffect('leaking'));

    const leakingIcon = document.createElement('img');
    leakingIcon.src = 'sprites/ui/StatusEffects/Leaking.png';
    leakingIcon.alt = '';
    leakingStatus.appendChild(leakingIcon);
    statusEffectsEl.appendChild(leakingStatus);
  }
  const dmgLabel = gs.hasQuadCake ? '4x (50% dud)' : gs.hasTripleCake ? '3x (45% dud)' :
                   gs.hasDoubleCake ? '2x (40% dud)' : '1x';
  const speedMult = gs.speedBoostTimer > 0 ? (gs.speedBoostMult || CFG.SPEED_BOOST_MULT) :
                    gs.hasTightropeBoots ? 3.00 : 1;
  const speedVal  = speedMult.toFixed(2) + 'x';
  const bulletsPerShot = CFG.BULLET_COUNT + (gs.hasCursedCandles ? gs.candlesLit * 2 : 0);

  let lines = [
    `HP .............. ${Math.max(0,gs.health)} / ${gs.maxHealth}`,
    `Wave ............ ${gs.wave}`,
    `Damage .......... ${dmgLabel}`,
    `Speed ........... ${speedVal}`,
    `Clip Size ....... ${emailAmmoCapacity()}`,
    `Bullets/Shot .... ${bulletsPerShot}`,
  ];
  if (gs.hasCursedCandles)  lines.push(`Candles ......... ${gs.candlesLit}/5 lit`);
  if (gs.hasFlawlessBaking) lines.push(`Flawless Wave ... ${gs.flawlessThisWave ? 'YES [ok]' : 'NO [x]'}`);
  if (gs.hasDash)           lines.push(`Dash Charges .... ${gs.dashCharges}/${gs.dashMaxCharges}`);
  if (gs.hasShakeFizzlePop) lines.push(`SFP Meter ....... ${gs.sfpFull ? 'FULL ⚡' : Math.round((gs.sfpMeter/gs.sfpMax)*100)+'%'}`);

  statsEl.textContent = lines.join('\n');

  // Items Win2k icon squares with tooltip
  const container = document.getElementById('pause-items');
  container.innerHTML = '';

  if (gs.unlockedItems.length === 0) {
    const empty = document.createElement('span');
    empty.style.cssText = 'font-size:10px; color:#666; font-family:"Microsoft Sans Serif","MS Sans Serif",Arial,sans-serif;';
    empty.textContent = '(No items yet)';
    container.appendChild(empty);
  } else {
    gs.unlockedItems.forEach(id => {
      if (id === 'doubledCake' && (gs.hasTripleCake || gs.hasQuadCake)) return;
      if (id === 'tripleCake' && gs.hasQuadCake) return;
      const def = ITEM_DEFS[id];
      if (!def) return;

      const card = document.createElement('div');
      card.className = 'pause-item-card';
if (def.img) {
  const img = document.createElement('img');
  img.src = def.img;
  img.style.cssText = 'width:55px;height:55px;image-rendering:pixelated;';
  card.appendChild(img);
} else {
  card.textContent = def.icon;
}
      const tip = document.createElement('div');
      tip.className = 'tip';
      tip.textContent = def.label.replace(/\n/g,' ');
      card.appendChild(tip);

      card.addEventListener('click', () => clippyExplain(id));

      container.appendChild(card);
    });
  }
}

const CLIPPY_ITEM_TIPS = {
  birthday:        "Surprise! BIRTHDAY PARTY freezes all enemies for 3 seconds.",
  cookie:          "It looks like you're slow! GOLDEN COOKIE gives you 7x speed AND reload speed for 7 seconds.",
  doubledCake:     "It looks like you want more damage! DOUBLE CAKE makes every bullet 2x damage... but 40% are duds.",
  tripleCake:      "TRIPLE CAKE = 3x damage, 45% dud chance. Worth it!",
  quadCake:        "It looks like you're a gambler! QUAD CAKE = 4x damage but half your bullets are duds. High risk!",
  bouncy:          "BOUNCY HOUSE makes bullets, enemies, AND you bounce off walls.",
  dash:            "Need to dodge? PARTY POPPER lets you SHIFT-dash through enemies. 3 charges.",
  shakeFizzlePop:  "SHAKE FIZZLE POP charges a meter. When full, you're buffed, and get hit for a massive shockwave.",
  flawlessBaking:  "It looks like you're arrogant! FLAWLESS BAKING rewards a clean wave with +2 max ammo.",
  cursedCandles:   "It looks like... you love pain! CURSED CANDLES drain 5 HP/sec but each lit candle adds +2 bullets per shot.",
  mirrorMaze:      "Bullets are flying everywhere.. MIRROR MAZE lets you redirect them. Shoot the shard!",
  popcornBucket:   "Collect 5 POPCORN KERNELS from kills for a bullet frenzy.",
  ragingRings:     "It looks like bullets keep missing! RAGING RINGS captures them to orbit you at 3x damage instead.",
  tightropeBoots:  "It looks like you want to go faster! TIGHTROPE BOOTS gives +200% move speed. Zoom.",
  clownish:        "You have a nose! CLOWNISH grows a blue nose over time. It HONKS and confuses nearby enemies.",
  bowlingBall:     "Want to bowl? Next shot fires a giant ball that pierces, bounces, and explodes on expiry.",
  paperCuts:       "PAPER CUTS makes any damaged enemy bleed 1 HP per second.",
  extraClips:      "EXTRA CLIPS gives +15% max HP and ammo, and fully heals you... it stacks!",
  clownishUpgrade: "Placeholder! LOL...",
  popcornbowl:  "It looks like you want bigger frenzies! MEGA POPCORN only needs 3 kernels and lasts 6 seconds.",
};

const CLIPPY_STATUS_TIPS = {
  leaking: "Leaking makes you lose 5% of your health per second. Don't like it? Imagine how I feel!",
};

let _clippyBubbleText = "It looks like you discovered how to PAUSE! Click an item to learn what it does.";

// Legacy canvas kept for compatibility (hidden)
function drawClippyBubble() {
  // No-op — bubble is now drawn on the Clippy canvas directly
}

function clippyExplain(itemId) {
  const tip = CLIPPY_ITEM_TIPS[itemId];
  if (tip) {
    _clippyBubbleText = tip;
    SFX.play('clippySpeak', 0.75);
  }
}

function clippyExplainStatusEffect(statusId) {
  const tip = CLIPPY_STATUS_TIPS[statusId];
  if (tip) {
    _clippyBubbleText = tip;
    SFX.play('clippySpeak', 0.75);
  }
}

// Random idle Clippy tips shown in pause menu
const CLIPPY_IDLE_TIPS = [
  "It looks like you're paused! The enemies are waiting... patiently?",
  "Did you know? Confused enemies deal 3x damage to other enemies!",
  "Need help? Try clicking an item above to learn about it.",
  "It looks like the Ringmaster is nearby! Stay away... he buffs all his friends.",
  "Did you know? Glowstick reflects bullets back as explosives with no cooldown on success!",
  "SHIFT dashes through enemies and damages them.",
  "Did you know? Gift boxes can be grabbed with E and thrown at enemies!",
  "Each candle you blow out makes it more aggressive.",
  "Did you know? Bowling balls pierce ALL enemies and explode when they expire!",
  "It looks like you're doing great! ...probably.",
];

let _clippyIdleIdx = 0;
function clippyIdleTip() {
  _clippyBubbleText = CLIPPY_IDLE_TIPS[_clippyIdleIdx % CLIPPY_IDLE_TIPS.length];
  _clippyIdleIdx++;
  SFX.play('clippySpeak', 0.65);
}

// ================================================================
// KEYBIND SCREEN
// ================================================================
let _listeningAction = null;
let _keybindKeyHandler = null;

function openKeybindScreen() {
  document.getElementById('pause-menu').style.display = 'none';
  updateTaskbarActiveWindow();
  const screen = document.getElementById('keybind-screen');
  screen.style.display = 'flex';
  bringFloatingWindowToFront(screen);
  renderKeybindRows();
}

function closeKeybindScreen() {
  document.getElementById('keybind-screen').style.display = 'none';
  const pauseMenu = document.getElementById('pause-menu');
  pauseMenu.style.display = 'flex';
  bringFloatingWindowToFront(pauseMenu);
  cancelKeybindListen();
}

function renderKeybindRows() {
  const container = document.getElementById('keybind-rows');
  container.innerHTML = '';

  for (const action of Object.keys(KEYBIND_DEFAULTS)) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; gap:12px; font-family:"Microsoft Sans Serif","MS Sans Serif",Arial,sans-serif;';

    const label = document.createElement('span');
    label.style.cssText = 'font-size:11px; color:#000; min-width:150px;';
    label.textContent = KEYBIND_LABELS[action];

    const btn = document.createElement('button');
    btn.id = `kb-btn-${action}`;
    btn.style.cssText = `
      font-family:'Microsoft Sans Serif','MS Sans Serif',Arial,sans-serif;
      font-size:11px; color:#000; background:#d4d0c8;
      border-top:2px solid #fff; border-left:2px solid #fff;
      border-right:2px solid #404040; border-bottom:2px solid #404040;
      padding:2px 10px; cursor:pointer; min-width:80px; text-align:center;
    `;
    btn.textContent = formatKey(KEYBINDS[action]);
    btn.dataset.action = action;
    btn.addEventListener('click', () => startKeybindListen(action));

    row.appendChild(label);
    row.appendChild(btn);
    container.appendChild(row);
  }
}

function startKeybindListen(action) {
  cancelKeybindListen();
  _listeningAction = action;

  const btn = document.getElementById(`kb-btn-${action}`);
  if (btn) {
    btn.style.background = '#000080';
    btn.style.color = '#fff';
    btn.textContent = '...';
  }

  const hint = document.getElementById('keybind-listening-hint');
  hint.style.opacity = '1';

  _keybindKeyHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') { cancelKeybindListen(); return; }

    const newKey = e.key;
    for (const other of Object.keys(KEYBINDS)) {
      if (other !== action && KEYBINDS[other] === newKey) {
        KEYBINDS[other] = KEYBINDS[action];
        const otherBtn = document.getElementById(`kb-btn-${other}`);
        if (otherBtn) otherBtn.textContent = formatKey(KEYBINDS[other]);
      }
    }
    KEYBINDS[action] = newKey;
    saveKeybinds();
    cancelKeybindListen();
    renderKeybindRows();
  };

  document.addEventListener('keydown', _keybindKeyHandler, { capture: true });
}

// UI button click sounds
(function() {
  const _clickAudio = new Audio('sounds/soundeffects/opening/click.mp3');
  function playUIClick() {
    try {
      const a = _clickAudio.cloneNode();
      a.volume = 0.5;
      a.play().catch(() => {});
    } catch(e) {}
  }
  // Attach to all Win2k-style buttons in the HUD and wrapper
  document.addEventListener('click', function(e) {
    const el = e.target;
    // HUD titlebar buttons, w2k-btn class, pause menu buttons, keybind buttons
    if (
      el.closest('#hud-controls') ||
      el.classList.contains('w2k-btn') ||
      el.closest('#pause-menu button') ||
      el.closest('#keybind-screen button') ||
      el.id === 'startBtn' ||
      el.id === 'skip-btn' ||
      el.id === 'floor-btn' ||
      el.id === 'keybind-back-btn' ||
      el.id === 'keybind-reset-btn'
    ) {
      playUIClick();
    }
  }, true); // capture phase so it fires before game click handlers
})();

function cancelKeybindListen() {
  if (_keybindKeyHandler) {
    document.removeEventListener('keydown', _keybindKeyHandler, { capture: true });
    _keybindKeyHandler = null;
  }
  _listeningAction = null;
  const hint = document.getElementById('keybind-listening-hint');
  if (hint) hint.style.opacity = '0';
}

document.getElementById('keybind-back-btn').addEventListener('click', closeKeybindScreen);
document.getElementById('keybind-reset-btn').addEventListener('click', () => {
  for (const k of Object.keys(KEYBIND_DEFAULTS)) KEYBINDS[k] = KEYBIND_DEFAULTS[k];
  saveKeybinds();
  renderKeybindRows();
  cancelKeybindListen();
});

// ================================================================
// GAME LOOP
// ================================================================
function loop(timestamp = performance.now()) {
  if (!gameRunning) return;
  lastTime = timestamp;
  tickEmailSystem(timestamp);
  update();
  draw();
  renderOffscreenWindows();
  animId = requestAnimationFrame(loop);
}

const offscreenWindowElements = new Map();
const chippyWindowElements = new Map();
let clippyWindowElement = null;

function getAimWorldPosition(clientX, clientY, target) {
  let miniCanvas = target instanceof HTMLCanvasElement
    ? target
    : target?.closest?.('.utensil-window-body')?.querySelector('canvas');
  if (!miniCanvas && gs.clippyWindowActive && target !== canvas) {
    miniCanvas = document.querySelector('.clippy-window .utensil-window-body canvas');
  }
  if (miniCanvas && miniCanvas.dataset.cameraScale) {
    const rect = miniCanvas.getBoundingClientRect();
    const scale = Number(miniCanvas.dataset.cameraScale);
    const shake = getScreenShakeOffset();
    return {
      x: Number(miniCanvas.dataset.cameraX) + (clientX - rect.left - rect.width / 2) / scale - shake.x,
      y: Number(miniCanvas.dataset.cameraY) + (clientY - rect.top - rect.height / 2) / scale - shake.y,
    };
  }

  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * worldW,
    y: ((clientY - rect.top) / rect.height) * worldH,
  };
}

function updateAimFromPointer(clientX, clientY, target) {
  if (!gameRunning || isPaused || gs.playerId == null) return null;
  if (target?.closest?.('#email-window, #desktop-taskbar, #email-popup-layer')) return null;
  const playerOutside = gs.clippyWindowActive;
  const canvasRect = canvas.getBoundingClientRect();
  const pointerOnCanvas = clientX >= canvasRect.left && clientX <= canvasRect.right
    && clientY >= canvasRect.top && clientY <= canvasRect.bottom;
  const pointerOnMiniWindow = target?.closest?.('.utensil-window-body')
    || document.elementFromPoint(clientX, clientY)?.closest?.('.utensil-window-body');
  if (!playerOutside && !pointerOnCanvas && !pointerOnMiniWindow) return null;

  const worldPoint = getAimWorldPosition(clientX, clientY, target);
  if (!worldPoint) return null;
  const shake = getScreenShakeOffset();
  mouse.screenX = worldPoint.x + shake.x;
  mouse.screenY = worldPoint.y + shake.y;
  mouse.x = worldPoint.x;
  mouse.y = worldPoint.y;
  return worldPoint;
}

function makeFloatingWindowDraggable(card, moveEntities) {
  const titleBar = card.firstElementChild;
  let drag = null;
  titleBar.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    card.dataset.dragging = 'true';
    titleBar.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  titleBar.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    moveEntities(deltaX, deltaY);
  });
  const finishDrag = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    card.dataset.dragging = 'false';
    drag = null;
  };
  titleBar.addEventListener('pointerup', finishDrag);
  titleBar.addEventListener('pointercancel', finishDrag);
}

let floatingWindowZIndex = 10;
let activeFloatingWindow = null;

function bringFloatingWindowToFront(windowElement) {
  windowElement.style.zIndex = String(++floatingWindowZIndex);
  updateTaskbarActiveWindow();
}

function updateTaskbarActiveWindow() {
  const taskbarTitle = document.getElementById('taskbar-active-title');
  const taskbarButton = document.getElementById('taskbar-active-window');
  if (!taskbarTitle || !taskbarButton) return;

  activeFloatingWindow = [...document.querySelectorAll('#utensil-window-layer .utensil-window, #utensil-window-layer .independent-window')]
    .filter(windowElement => getComputedStyle(windowElement).display !== 'none')
    .reduce((front, windowElement) => {
      if (!front || Number(windowElement.style.zIndex) > Number(front.style.zIndex)) return windowElement;
      return front;
    }, null);

  const title = activeFloatingWindow
    ? activeFloatingWindow.dataset.windowTitle
      || activeFloatingWindow.querySelector('.utensil-window-title')?.textContent.trim()
      || 'Window'
    : 'party.exe';
  taskbarTitle.textContent = title;
  taskbarButton.title = `Active window: ${title}`;
  taskbarButton.classList.add('is-active');
}

function makeIndependentWindowDraggable(windowElement) {
  const titleBar = windowElement.querySelector('.desktop-window-titlebar');
  let drag = null;
  titleBar.addEventListener('pointerdown', event => {
    if (event.button !== 0 || event.target.closest('button')) return;
    const rect = windowElement.getBoundingClientRect();
    windowElement.style.left = `${rect.left}px`;
    windowElement.style.top = `${rect.top}px`;
    windowElement.style.transform = 'none';
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
    titleBar.setPointerCapture(event.pointerId);
    event.preventDefault();
  });
  titleBar.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const maxLeft = Math.max(0, window.innerWidth - windowElement.offsetWidth);
    const maxTop = Math.max(0, window.innerHeight - windowElement.offsetHeight);
    windowElement.style.left = `${Math.max(0, Math.min(maxLeft, drag.left + event.clientX - drag.x))}px`;
    windowElement.style.top = `${Math.max(0, Math.min(maxTop, drag.top + event.clientY - drag.y))}px`;
  });
  const finishDrag = event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag = null;
  };
  titleBar.addEventListener('pointerup', finishDrag);
  titleBar.addEventListener('pointercancel', finishDrag);
}

function registerIndependentWindow(windowElement) {
  windowElement.classList.add('independent-window');
  document.getElementById('utensil-window-layer').appendChild(windowElement);
  makeIndependentWindowDraggable(windowElement);
  bringFloatingWindowToFront(windowElement);
}

function initializeIndependentWindows() {
  const layer = document.getElementById('utensil-window-layer');
  layer.addEventListener('pointerdown', event => {
    if (!(event.target instanceof Element)) return;
    const windowElement = event.target.closest('.utensil-window, .independent-window');
    if (windowElement) bringFloatingWindowToFront(windowElement);
  });
  for (const windowElement of document.querySelectorAll('.independent-window')) {
    registerIndependentWindow(windowElement);
  }
  updateTaskbarActiveWindow();
}

initializeIndependentWindows();

function positionWindowWithEntity(card, worldX, worldY, rect, width, height) {
  if (!card.dataset.worldAnchorX) {
    card.dataset.worldAnchorX = String(worldX);
    card.dataset.worldAnchorY = String(worldY);
    card.dataset.screenAnchorX = String(rect.left + worldX * rect.width / worldW);
    card.dataset.screenAnchorY = String(rect.top + worldY * rect.height / worldH);
    card.dataset.trackScaleX = String(rect.width / worldW);
    card.dataset.trackScaleY = String(rect.height / worldH);
  }
  const centerX = Number(card.dataset.screenAnchorX)
    + (worldX - Number(card.dataset.worldAnchorX)) * Number(card.dataset.trackScaleX);
  const centerY = Number(card.dataset.screenAnchorY)
    + (worldY - Number(card.dataset.worldAnchorY)) * Number(card.dataset.trackScaleY);
  const left = Math.max(8, Math.min(window.innerWidth - width - 8, centerX - width / 2));
  const top = Math.max(8, Math.min(window.innerHeight - height - 8, centerY - height / 2));
  card.dataset.trackedLeft = String(left);
  card.dataset.trackedTop = String(top);
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
}

function renderOffscreenWindows() {
  const layer = document.getElementById('utensil-window-layer');
  const canvasRect = canvas.getBoundingClientRect();
  if (!canvasRect.width || !canvasRect.height || !gameRunning) {
    layer.querySelectorAll('.utensil-window').forEach(windowElement => windowElement.remove());
    offscreenWindowElements.clear();
    chippyWindowElements.clear();
    clippyWindowElement = null;
    updateTaskbarActiveWindow();
    return;
  }

  const enemyIds = [...ECS.query('enemy', 'pos', 'ai')];
  for (const id of enemyIds) {
    const pos = ECS.get(id, 'pos');
    const ai = ECS.get(id, 'ai');
    const outside = pos.x < 0 || pos.x > worldW || pos.y < 0 || pos.y > worldH;
    if (outside && !ai.windowActive) {
      ai.windowActive = true;
      ai.windowGroup = ++utensilWindowGroupSequence;
    } else if (!outside && ai.windowActive) {
      ai.windowActive = false;
      ai.windowMergeTimer = 12;
    } else if (ai.windowMergeTimer > 0) {
      ai.windowMergeTimer--;
    }
  }

  const outsideEnemies = enemyIds.filter(id => {
    const pos = ECS.get(id, 'pos');
    const ai = ECS.get(id, 'ai');
    return ai.windowActive
      && (pos.x < 0 || pos.x > worldW || pos.y < 0 || pos.y > worldH);
  });
  for (let i = 0; i < outsideEnemies.length; i++) {
    const firstId = outsideEnemies[i];
    const firstPos = ECS.get(firstId, 'pos');
    const firstAi = ECS.get(firstId, 'ai');
    for (let j = i + 1; j < outsideEnemies.length; j++) {
      const secondId = outsideEnemies[j];
      const secondPos = ECS.get(secondId, 'pos');
      const secondAi = ECS.get(secondId, 'ai');
      if (ECS.get(firstId, 'enemy').type === 'cakeBoss'
        || ECS.get(secondId, 'enemy').type === 'cakeBoss') continue;
      if (firstAi.windowGroup === secondAi.windowGroup
        || Math.hypot(firstPos.x - secondPos.x, firstPos.y - secondPos.y) >= 110) continue;
      const oldGroup = secondAi.windowGroup;
      for (const id of outsideEnemies) {
        const ai = ECS.get(id, 'ai');
        if (ai.windowGroup === oldGroup) ai.windowGroup = firstAi.windowGroup;
      }
    }
  }

  const groups = new Map();
  for (const id of enemyIds) {
    const enemy = ECS.get(id, 'enemy');
    const pos = ECS.get(id, 'pos');
    const ai = ECS.get(id, 'ai');
    if (!ai.windowGroup) continue;
    if (!ai.windowActive && ai.windowMergeTimer <= 0) continue;

    if (!groups.has(ai.windowGroup)) groups.set(ai.windowGroup, []);
    groups.get(ai.windowGroup).push({ id, enemy, pos, ai });
  }

  for (const [groupId, members] of groups) {
    let card = offscreenWindowElements.get(groupId);
    if (!card) {
      card = document.createElement('div');
      card.className = members.some(member => member.enemy.type === 'cakeBoss')
        ? 'utensil-window antipie-window'
        : 'utensil-window';
      card.innerHTML = '<div class="utensil-window-title"></div><div class="utensil-window-body"><canvas></canvas></div>';
      layer.appendChild(card);
      bringFloatingWindowToFront(card);
      makeFloatingWindowDraggable(card, (deltaX, deltaY) => {
        const scaleX = Number(card.dataset.trackScaleX);
        const scaleY = Number(card.dataset.trackScaleY);
        if (!scaleX || !scaleY) return;
        const worldDeltaX = deltaX / scaleX;
        const worldDeltaY = deltaY / scaleY;
        for (const id of ECS.query('enemy', 'pos', 'ai')) {
          const ai = ECS.get(id, 'ai');
          if (ai.windowGroup !== groupId) continue;
          const pos = ECS.get(id, 'pos');
          pos.x += worldDeltaX;
          pos.y += worldDeltaY;
          if (ai.antipieBoss) {
            ai.bossHomeX += worldDeltaX;
            ai.bossHomeY += worldDeltaY;
          }
          if (ai.uTipX !== undefined) ai.uTipX += worldDeltaX;
          if (ai.uTipY !== undefined) ai.uTipY += worldDeltaY;
        }
      });
      offscreenWindowElements.set(groupId, card);
    }

    const title = members.map(member => {
      const type = member.enemy.type;
      if (type === 'cakeBoss') return 'ANTIPIE — THE CAKE BOSS';
      if (type === 'utensil') return 'Utensil';
      if (type === 'miniClown') return 'Mini Clown';
      return type.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, char => char.toUpperCase());
    }).join(', ');
    const titleElement = card.firstElementChild;
    if (titleElement.textContent !== title) {
      titleElement.textContent = title;
      updateTaskbarActiveWindow();
    }
    titleElement.title = title;

    const preview = card.lastElementChild.firstElementChild;
    const isCakeBossWindow = members.some(member => member.enemy.type === 'cakeBoss');
    const width = isCakeBossWindow ? 440 : Math.min(560, Math.max(220, members.length * 112 + 108));
    const height = isCakeBossWindow ? 340 : 190;
    const dpr = window.devicePixelRatio || 1;
    const bodyHeight = height - 26;
    const bodyWidth = width - 8;
    card.style.width = `${width}px`;
    card.style.height = `${height}px`;
    const previewWidth = Math.round(bodyWidth * dpr);
    const previewHeight = Math.round(bodyHeight * dpr);
    if (preview.width !== previewWidth) preview.width = previewWidth;
    if (preview.height !== previewHeight) preview.height = previewHeight;
    const previewCtx = preview.getContext('2d');
    const minX = Math.min(...members.map(member => member.pos.x));
    const maxX = Math.max(...members.map(member => member.pos.x));
    const minY = Math.min(...members.map(member => member.pos.y));
    const maxY = Math.max(...members.map(member => member.pos.y));
    const cameraX = (minX + maxX) / 2;
    const cameraY = (minY + maxY) / 2;
    const cameraWidth = Math.max(
      isCakeBossWindow ? 500 : 260,
      maxX - minX + 180,
      (maxY - minY + 180) * bodyWidth / bodyHeight
    );
    draw(previewCtx, preview, {
      x: cameraX,
      y: cameraY,
      scale: Math.min(bodyWidth / cameraWidth, bodyHeight / (cameraWidth * bodyHeight / bodyWidth)),
    }, false);
    const previewScale = Math.min(bodyWidth / cameraWidth, bodyHeight / (cameraWidth * bodyHeight / bodyWidth));
    preview.dataset.cameraX = String(cameraX);
    preview.dataset.cameraY = String(cameraY);
    preview.dataset.cameraScale = String(previewScale);
    const outsideMembers = members.filter(member =>
      member.pos.x < 0 || member.pos.x > worldW || member.pos.y < 0 || member.pos.y > worldH
    );
    const anchorMembers = outsideMembers.length ? outsideMembers : members;
    const anchorX = anchorMembers.reduce((sum, member) => sum + member.pos.x, 0) / anchorMembers.length;
    const anchorY = anchorMembers.reduce((sum, member) => sum + member.pos.y, 0) / anchorMembers.length;
    positionWindowWithEntity(card, anchorX, anchorY, canvasRect, width, height);
    const mergeProgress = Math.max(...members.map(member =>
      member.ai.windowActive ? 0 : member.ai.windowMergeTimer / 12
    ));
    card.style.opacity = `${1 - mergeProgress}`;
    card.style.transform = mergeProgress ? `scale(${1 - mergeProgress * 0.35})` : 'scale(1)';

  }

  for (const id of ECS.query('chippyMachine', 'pos')) {
    const machine = ECS.get(id, 'chippyMachine');
    const pos = ECS.get(id, 'pos');
    const outside = pos.x < 0 || pos.x > worldW || pos.y < 0 || pos.y > worldH;
    let card = chippyWindowElements.get(id);
    if (!outside) {
      if (card) {
        card.remove();
        chippyWindowElements.delete(id);
      }
      continue;
    }

    if (!card) {
      card = document.createElement('div');
      card.className = 'utensil-window chippy-window';
      card.innerHTML = '<div class="utensil-window-title">Chippy</div><div class="utensil-window-body"><canvas></canvas></div>';
      layer.appendChild(card);
      bringFloatingWindowToFront(card);
      chippyWindowElements.set(id, card);
    }

    const width = 240;
    const height = 190;
    const bodyWidth = width - 8;
    const bodyHeight = height - 26;
    const preview = card.lastElementChild.firstElementChild;
    const dpr = window.devicePixelRatio || 1;
    card.style.width = `${width}px`;
    card.style.height = `${height}px`;
    const previewWidth = Math.round(bodyWidth * dpr);
    const previewHeight = Math.round(bodyHeight * dpr);
    if (preview.width !== previewWidth) preview.width = previewWidth;
    if (preview.height !== previewHeight) preview.height = previewHeight;
    const previewCtx = preview.getContext('2d');
    const cameraWidth = Math.max(280, 180 * bodyWidth / bodyHeight);
    const scale = Math.min(bodyWidth / cameraWidth, bodyHeight / (cameraWidth * bodyHeight / bodyWidth));
    draw(previewCtx, preview, { x: pos.x, y: pos.y, scale }, false);
    preview.dataset.cameraX = String(pos.x);
    preview.dataset.cameraY = String(pos.y);
    preview.dataset.cameraScale = String(scale);
    positionWindowWithEntity(card, pos.x, pos.y, canvasRect, width, height);

  }

  for (const [groupId, card] of offscreenWindowElements) {
    if (groups.has(groupId)) continue;
    card.remove();
    offscreenWindowElements.delete(groupId);
    updateTaskbarActiveWindow();
  }

  const playerPos = ECS.get(gs.playerId, 'pos');
  const playerOutside = playerPos.x < 0 || playerPos.x > worldW
    || playerPos.y < 0 || playerPos.y > worldH;
  if (playerOutside) {
    gs.clippyWindowActive = true;
    gs.clippyWindowMergeTimer = 12;
  } else if (gs.clippyWindowActive) {
    gs.clippyWindowActive = false;
    gs.clippyWindowMergeTimer = 12;
  } else if (gs.clippyWindowMergeTimer > 0) {
    gs.clippyWindowMergeTimer--;
  }

  if (gs.clippyWindowActive || gs.clippyWindowMergeTimer > 0) {
    if (!clippyWindowElement) {
      clippyWindowElement = document.createElement('div');
      clippyWindowElement.className = 'utensil-window clippy-window';
      clippyWindowElement.innerHTML = '<div class="utensil-window-title">Clippy</div><div class="utensil-window-body"><canvas></canvas></div>';
      layer.appendChild(clippyWindowElement);
      bringFloatingWindowToFront(clippyWindowElement);
    }

    const width = 240;
    const height = 190;
    const bodyWidth = width - 8;
    const bodyHeight = height - 26;
    const preview = clippyWindowElement.lastElementChild.firstElementChild;
    const dpr = window.devicePixelRatio || 1;
    clippyWindowElement.style.width = `${width}px`;
    clippyWindowElement.style.height = `${height}px`;
    preview.width = Math.round(bodyWidth * dpr);
    preview.height = Math.round(bodyHeight * dpr);
    const previewCtx = preview.getContext('2d');
    const cameraWidth = Math.max(280, 180 * bodyWidth / bodyHeight);
    draw(previewCtx, preview, {
      x: playerPos.x,
      y: playerPos.y,
      scale: Math.min(bodyWidth / cameraWidth, bodyHeight / (cameraWidth * bodyHeight / bodyWidth)),
    }, false);
    const previewScale = Math.min(bodyWidth / cameraWidth, bodyHeight / (cameraWidth * bodyHeight / bodyWidth));
    preview.dataset.cameraX = String(playerPos.x);
    preview.dataset.cameraY = String(playerPos.y);
    preview.dataset.cameraScale = String(previewScale);

    positionWindowWithEntity(clippyWindowElement, playerPos.x, playerPos.y, canvasRect, width, height);
    const mergeProgress = gs.clippyWindowActive ? 0 : gs.clippyWindowMergeTimer / 12;
    clippyWindowElement.style.opacity = `${1 - mergeProgress}`;
    clippyWindowElement.style.transform = mergeProgress ? `scale(${1 - mergeProgress * 0.35})` : 'scale(1)';
  } else if (clippyWindowElement) {
    clippyWindowElement.remove();
    clippyWindowElement = null;
    updateTaskbarActiveWindow();
  }
}

function startGame() {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('item-choice').style.display = 'none';
  _doStartGame();
}

   function _doStartGame() {
     gameRunning = true;
     isPaused = false;
     muzzleFlash = 0;
     meleeSwingTimer = 0;
     initGameState();
     updateHUD();
     lastTime = performance.now();
     loop();
   }

function tryPickUpGiftBox() {
  if (gs.heldGiftBox !== null) {
    throwGiftBox();
    return;
  }
  for (const id of ECS.query('enemy', 'pos', 'ai')) {
    const type = ECS.get(id, 'enemy').type;
    if (type !== 'giftBox') continue;
    const epos = ECS.get(id, 'pos');
    const ppos = ECS.get(gs.playerId, 'pos');
    if (Math.hypot(epos.x - ppos.x, epos.y - ppos.y) < 48) {
      gs.heldGiftBox = id;
      ECS.get(id, 'ai').heldByPlayer = true;
      ECS.get(id, 'vel').vx = 0;
      ECS.get(id, 'vel').vy = 0;
      showMsg('GIFT BOX GRABBED! RIGHT-CLICK TO THROW!');
      return;
    }
  }
}

function throwGiftBox() {
  if (gs.heldGiftBox === null) return;
  const id = gs.heldGiftBox;
  if (!ECS.has(id, 'pos')) { gs.heldGiftBox = null; return; }
  const ai  = ECS.get(id, 'ai');
  const vel = ECS.get(id, 'vel');
  ai.heldByPlayer = false;
  ai.thrown = true;
  gs.heldGiftBox = null;
  const epos = ECS.get(id, 'pos');
  const dx = mouse.x - epos.x, dy = mouse.y - epos.y;
  const dist = Math.hypot(dx, dy) || 1;
  vel.vx = (dx / dist) * 9;
  vel.vy = (dy / dist) * 9;
  showMsg('GIFT BOX THROWN!');
}

function handleChippyClick(worldX, worldY) {
  const id = getChippyAtWorldPosition(worldX, worldY);
  if (id === null) return false;
  const pos = ECS.get(id, 'pos');
  const machine = ECS.get(id, 'chippyMachine');

  const playerPos = ECS.get(gs.playerId, 'pos');
  if (Math.hypot(playerPos.x - pos.x, playerPos.y - pos.y) > CFG.CHIPPY_INTERACT_RANGE) {
    SFX.play('notAllowed', 0.65);
    showMsg('MOVE CLOSER TO CHIPPY!');
    return true;
  }

  if (machine.phase === 'idle') {
    if (gs.maxHealth <= 20) {
      SFX.play('notAllowed', 0.65);
      showMsg('CHIPPY NEEDS MORE THAN 20 MAX HP!');
      return true;
    }
    gs.maxHealth -= 20;
    gs.health = Math.min(gs.health, gs.maxHealth);
    beginChippyTransition(machine, 'produce', 'produce', 0);
    SFX.playAt('chippyUse', pos.x, pos.y, 0.55);
    updateHUD();
    showMsg('CHIPPY IS MAKING A GOLDEN CHIP!');
    const reactions = [
      'Ow! Twenty max HP? I hope that chip is worth it.',
      'That was 20 max health. I am choosing not to think about it.',
      'I felt that. Well, technically, I felt the health bar go down.',
      'A golden chip for a piece of your maximum health. Seems fair. Probably.',
    ];
    gs.clippyPickupMsg = reactions[Math.floor(Math.random() * reactions.length)];
    gs.clippyPickupTimer = 240;
    SFX.play('clippySpeak', 0.8);
  } else if (machine.phase === 'produceReady') {
    gs.goldenChips++;
    SFX.playAt('goldenChipPickup', pos.x, pos.y, 0.65);
    updateHUD();
    spawnPartyParticles(pos.x, pos.y);
    beginChippyTransition(machine, 'spinning', 'spin', machine.restFrame);
    showMsg('+1 GOLDEN CHIP');
  } else {
    SFX.play('notAllowed', 0.65);
  }
  return true;
}

function getChippyAtWorldPosition(worldX, worldY) {
  for (const id of ECS.query('chippyMachine', 'pos')) {
    const pos = ECS.get(id, 'pos');
    const machine = ECS.get(id, 'chippyMachine');
    const riseProgress = machine.phase === 'spinning'
      ? Math.min(1, machine.elapsed / CFG.CHIPPY_RISE_FRAMES)
      : 1;
    const spriteY = pos.y - riseProgress * 18;
    const sheet = machine.sheet === 'produce' ? chippyProduceSheet : chippySpinSheet;
    const columns = machine.sheet === 'produce' ? CFG.CHIPPY_PRODUCE_COLS : CFG.CHIPPY_SPIN_COLS;
    const rows = machine.sheet === 'produce' ? CFG.CHIPPY_PRODUCE_ROWS : CFG.CHIPPY_SPIN_ROWS;
    const frameAspect = sheet.naturalWidth > 0 && sheet.naturalHeight > 0
      ? (sheet.naturalWidth / columns) / (sheet.naturalHeight / rows)
      : 1;
    const spriteHeight = CFG.CHIPPY_DRAW_HEIGHT;
    const spriteWidth = spriteHeight * frameAspect;
    if (Math.abs(worldX - pos.x) <= spriteWidth / 2
      && worldY >= spriteY - spriteHeight && worldY <= spriteY) return id;
  }
  return null;
}

// ================================================================
// INPUT
// ================================================================
canvas.addEventListener('contextmenu', e => {
  e.preventDefault();
  if (!gameRunning) return;
  const rect = canvas.getBoundingClientRect();
  const shake = getScreenShakeOffset();
  const worldX = ((e.clientX - rect.left) / rect.width) * worldW - shake.x;
  const worldY = ((e.clientY - rect.top) / rect.height) * worldH - shake.y;
  if (handleChippyClick(worldX, worldY)) return;
  if (gs.hasGlowsticks) { swingGlowsticks(); return; }
  tryPickUpGiftBox();
});

document.addEventListener('keydown', e => {
  if (document.getElementById('keybind-screen').style.display === 'flex') return;
  if (e.target instanceof Element && e.target.closest('#email-window')) return;

  if (e.key === KEYBINDS.pause) {
    togglePause();
    return;
  }

  if (isPaused) {
    if (e.key === 'Escape') {
      _removePauseClippyCanvas();
      document.getElementById('pause-menu').style.display = 'none';
      updateTaskbarActiveWindow();
      isPaused = false;
      pauseEmailTimers();
      gameRunning = false;
      document.getElementById('overlay').style.display = 'flex';
    }
    return;
  }

  keys[e.key] = true;

  if (!gameRunning) return;

  if (e.key === KEYBINDS.reload)     { startReload(); }
  if (e.key === KEYBINDS.prizeWheel) { spinPrizeWheel(); e.preventDefault(); }
  if (e.key === KEYBINDS.dash)       { tryDash(); e.preventDefault(); }
  if (e.key === KEYBINDS.glowstick)  { swingGlowsticks(); e.preventDefault(); }
});

document.addEventListener('keyup', e => { keys[e.key] = false; });

document.addEventListener('click', e => {
  if (!gameRunning || isPaused || gs.playerId == null) return;
  if (!(e.target instanceof Element)) return;
  const isCanvasClick = e.target === canvas;
  const isMiniWindowClick = !!e.target.closest('.utensil-window-body');
  if (!isCanvasClick && !isMiniWindowClick && !gs.clippyWindowActive) return;
  if (e.target.closest('button, input, select, textarea, a, [role="button"], .utensil-window-title, #pause-menu, #overlay, #item-choice, #floor-transition, #keybind-screen, #email-window, #desktop-taskbar, #email-popup-layer, .email-ad-popup')) return;

  const worldPoint = updateAimFromPointer(e.clientX, e.clientY, e.target);
  if (!worldPoint) return;
  if (e.target.closest('.chippy-window') && handleChippyClick(worldPoint.x, worldPoint.y)) return;
  gunAngle = Math.atan2(worldPoint.y - gunY, worldPoint.x - gunX);
  shoot();
});

document.addEventListener('mousemove', e => {
  _pauseMouseX = e.clientX;
  _pauseMouseY = e.clientY;
  updateAimFromPointer(e.clientX, e.clientY, e.target);
});

// ================================================================
// BUTTON LISTENERS
// ================================================================
document.getElementById('startBtn').addEventListener('click', startGame);

document.getElementById('taskbar-start').addEventListener('click', () => {
  const overlay = document.getElementById('overlay');
  if (overlay.style.display !== 'none') document.getElementById('startBtn').click();
});

document.getElementById('taskbar-active-window').addEventListener('click', () => {
  if (activeFloatingWindow?.isConnected) bringFloatingWindowToFront(activeFloatingWindow);
});

const taskbarAudioButton = document.getElementById('taskbar-audio');
taskbarAudioButton.addEventListener('click', () => {
  SFX.setMuted(!SFX._muted);
  const muted = SFX._muted;
  taskbarAudioButton.setAttribute('aria-pressed', String(muted));
  taskbarAudioButton.title = muted ? 'Turn audio on' : 'Mute audio';
  taskbarAudioButton.setAttribute('aria-label', taskbarAudioButton.title);
});

function updateTaskbarClock() {
  const clock = document.getElementById('taskbar-clock');
  clock.textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

updateTaskbarClock();
setInterval(updateTaskbarClock, 1000);

document.getElementById('floor-btn').addEventListener('click', () => {
  document.getElementById('floor-transition').style.display = 'none';
  gs.floor = 2;
  worldW *= 1.5;
  worldH *= 1.5;
  renderScale = canvas.clientWidth / worldW;
  unlockGlowsticks();
  trySpawnFieldItems();
  showMsg('WELCOME TO THE BIG TOP!');
  const hint = document.getElementById('bottom-hint');
  if (hint) hint.textContent = `WASD:MOVE | MOUSE:AIM | CLICK:SHOOT | ${formatKey(KEYBINDS.reload)}:RELOAD | SHIFT:DASH | ${formatKey(KEYBINDS.prizeWheel)}:PRIZE WHEEL (3 TICKETS)`;
  updateHUD();
  gameRunning = true;
  loop();
});

// ================================================================
// ITEM CHOICE (uses Win2k card style from index.html CSS)
// ================================================================
function offerItemChoice() {
  const revealTimers = [];
  const clearRevealTimers = () => {
    for (const timer of revealTimers) clearTimeout(timer);
    revealTimers.length = 0;
  };
  gs.pendingChoice = true; pauseEmailTimers(); gameRunning = false; cancelAnimationFrame(animId); draw();
  const choiceEl = document.getElementById('item-choice');
  const cardsEl  = document.getElementById('item-cards');
  choiceEl.dataset.floor = String(gs.floor);
  cardsEl.innerHTML = '';

  const floorPool = gs.floor === 2 ? FLOOR2_ITEM_IDS : ALL_ITEM_IDS;
  let floorAvailable = floorPool.filter(id =>
    !gs.unlockedItems.includes(id) && isCakeItemAvailable(id, gs)
  );
  const upgradePool = [];
  if (gs.hasClownish && !gs.hasClownishUpgrade)   upgradePool.push('clownishUpgrade');
  if (gs.hasPopcornBucket && !gs.hasPopcornBowl) upgradePool.push('popcornBowl');
  floorAvailable = [...floorAvailable, ...upgradePool];
  const generalAvailable = GENERAL_ITEM_IDS.filter(id => !gs.unlockedItems.includes(id));

  let offered = [], fi = 0, gi = 0;
  const shuffledFloor   = shuffle(floorAvailable);
  const shuffledGeneral = shuffle(generalAvailable);
  const slotCount = gs.floor === 2 ? 4 : 3;

  for (let slot = 0; slot < slotCount; slot++) {
    const useGeneral = generalAvailable.length > 0 && gi < shuffledGeneral.length && Math.random() < 0.20;
    if (useGeneral)                       offered.push(shuffledGeneral[gi++]);
    else if (fi < shuffledFloor.length)   offered.push(shuffledFloor[fi++]);
    else if (gi < shuffledGeneral.length) offered.push(shuffledGeneral[gi++]);
  }
  offered = [...new Set(offered)].slice(0, slotCount);

  const cards = [];
  for (const id of offered) {
    const def     = ITEM_DEFS[id];
    const isOwned = gs.unlockedItems.includes(id);
    const card    = document.createElement('div');
    card.className = `item-card${isOwned ? ' already-owned' : ''}`;

   card.innerHTML = `
  <div class="ic-icon">${
    def.img
      ? `<img src="${def.img}" style="width:100px;height:100px;image-rendering:pixelated;">`
      : def.icon
  }</div>
      <div class="ic-name">${def.label.replace(/\n/g,'<br>')}</div>
      <div class="ic-desc">${def.desc.replace(/\n/g,'<br>')}${isOwned ? '<br><i>(owned)</i>' : ''}</div>
    `;

    cards.push(card);

 if (!isOwned) {
  card.addEventListener('click', () => {
    clearRevealTimers();
    SFX.play('itemConfirm', 0.65);
    gs.unlockedItems.push(id);
    def.effect(gs);
    choiceEl.style.display = 'none';
    gs.pendingChoice = false;
    cancelAnimationFrame(animId);
    gameRunning = true;
    trySpawnFieldItems();
    updateHUD();
    // Clippy pickup tip
    if (typeof CLIPPY_PICKUP_TIPS !== 'undefined' && CLIPPY_PICKUP_TIPS[id]) {
      gs.clippyPickupMsg = CLIPPY_PICKUP_TIPS[id];
      gs.clippyPickupTimer = 300;
      SFX.play('clippySpeak', 0.75);
    }
    loop();
  });
}
    cardsEl.appendChild(card);
  }

  choiceEl.style.display = 'flex';
  if (cards.length > 0) {
    SFX.play('itemReveal', 0.65);
    cards.forEach((card, index) => {
      const delay = index === 0 ? 0 : index === 1 ? 1000 / 1.5 : 2 * 1000 / (1.5 * 1.2);
      const reveal = () => {
        card.getBoundingClientRect();
        card.classList.add('revealed');
        revealTimers.push(setTimeout(() => SFX.play('partyExplosion', 0.45), 1050 * 0.59));
      };
      if (delay === 0) reveal();
      else revealTimers.push(setTimeout(reveal, delay));
    });
  }
  const skipBtn  = document.getElementById('skip-btn');
  const allOwned = offered.length === 0 || offered.every(id => gs.unlockedItems.includes(id));
  skipBtn.style.display = allOwned ? 'block' : 'none';
  skipBtn.onclick = () => {
    clearRevealTimers();
    choiceEl.style.display = 'none';
    gs.pendingChoice = false;
    cancelAnimationFrame(animId); 
    gameRunning = true;
    trySpawnFieldItems();
    updateHUD();
    loop();
  };
}

setInterval(() => {
  if (typeof gs !== 'undefined' && gs && gs.floor === 2 && gameRunning) updateHUD();
}, 300);

// Auto-start intro immediately when the page loads — no Play button needed
window.addEventListener('load', () => {
  if (typeof INTRO !== 'undefined' && !window._introPlayed) {
    window._introPlayed = true;
    document.getElementById('overlay').style.display = 'none';
    INTRO.start(() => {
      _doStartGame();
    });
  }
});
