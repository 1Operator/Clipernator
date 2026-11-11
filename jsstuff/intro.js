// ============================================================
// CLIPBLAST: PARTY HUNTER — Intro Sequence
// ============================================================

const INTRO = (() => {

  let draftTransitionLines = [];
let draftTransitionDone = false;
  
  const SND = {
    startup1:   'sounds/soundeffects/opening/startup1.mp3',
    startup2:   'sounds/soundeffects/opening/startup2.ogg',
    startup3:   'sounds/soundeffects/opening/startup3.mp3',
    click:      'sounds/soundeffects/opening/click.mp3',
    switch:     'sounds/soundeffects/opening/switch.mp3',
    confirm:    'sounds/soundeffects/opening/confirm.mp3',
    bluescreen: 'sounds/soundeffects/opening/bluescreen.mp3',
    fixing: 'sounds/soundeffects/opening/fixing.mp3',

    typing1: 'sounds/soundeffects/opening/typing1.mp3',
typing2: 'sounds/soundeffects/opening/typing2.mp3',
typing3: 'sounds/soundeffects/opening/typing3.mp3',

    
  };

  const SPR = {
// In SPR object, replace clippy entries with:
clippyNotice1:   'sprites/clippy/Clippysurprisedleft.png',
clippyNotice2:   'sprites/clippy/Clippyworriedright1.png',
clippyNormal1:   'sprites/clippy/Clippyforward.png',
clippyNormal2:   'sprites/clippy/Clippyupleft.png',
clippyNormal3:   'sprites/clippy/Clippyworriedright2.png',
clippyWatching1: 'sprites/clippy/Clippyupright.png',
clippyWatching2: 'sprites/clippy/Clippyupleft.png',
clippyStressed1: 'sprites/clippy/Clippysweatingleft.png',
clippyStressed2: 'sprites/clippy/Clippyfocused.png',
clippyJump1:     'sprites/clippy/Clippyupright.png',
clippyJump2:     'sprites/clippy/Clippycrouchingleft.png',
     clippyEngineer1: 'sprites/clippy/engineer/Clippy_engineer1.png',
  clippyEngineer2: 'sprites/clippy/engineer/Clippy_engineer2.png',
  clippyEngineer3: 'sprites/clippy/engineer/Clippy_engineer3.png',
  clippyEngineer4: 'sprites/clippy/engineer/Clippy_engineer4.png',
    clippyNormal:   'sprites/Clippy.png',
    folder:         'sprites/ui/folder.png',
    appGeneric:   'sprites/ui/app_generic.png',
    notes:          'sprites/ui/Notepad.png',
    antipie:        'sprites/ui/ANTIPIE.png',
    computer:     'sprites/ui/computer.png',
    calculator:   'sprites/ui/calculator.png',
    trash:          'sprites/ui/Trash.png',
    dataLocked:     'sprites/ui/data_locked1.png',
    wonderWeb:      'sprites/ui/WonderWeb.png',
    drawalogo:      'sprites/ui/drawalogo.png',
  };

 const CLIPPY_FRAME_COUNTS = {
  notice:          2,
  engineer:        4,
  jump:            2,
  normal:          3,
  watching:        2,
  bluescreen_idle: 2,
};
  const imgs = {};
  function loadImg(key, src) {
    imgs[key] = new Image();
    imgs[key].src = src;
  }
  Object.entries(SPR).forEach(([k, v]) => loadImg(k, v));

  // Replace the existing audioCache/playSound setup at the top of the INTRO IIFE with this:

const audioCache = {};
let audioCtx = null;
let startup2Source = null; // Web Audio source node for seamless looping

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

// Preload startup2 as a decoded buffer for seamless looping
let startup2Buffer = null;
fetch('sounds/soundeffects/opening/startup2.ogg')
  .then(r => r.arrayBuffer())
  .then(ab => getAudioCtx().decodeAudioData(ab))
  .then(buf => { startup2Buffer = buf; })
  .catch(() => {});

function playStartup2Loop() {
  if (!startup2Buffer) return;
  stopStartup2Loop();
  const ctx = getAudioCtx();
  
  startup2Source = ctx.createBufferSource();
  startup2Source.buffer = startup2Buffer;

  startup2Source.loop = true;
  startup2Source.loopStart = 0.2; // skip ~200ms attack click
startup2Source.loopEnd = startup2Buffer.duration;
  startup2Source.connect(ctx.destination);
  startup2Source.start(0);
}

function stopStartup2Loop() {
  if (startup2Source) {
    try { startup2Source.stop(); } catch(e) {}
    startup2Source = null;
  }
  // Also stop HTMLAudio fallback if it was used
  if (audioCache['startup2']) {
    audioCache['startup2'].pause();
    audioCache['startup2'].currentTime = 0;
  }
}

function playSound(key, loop = false) {
  if (key === 'startup2') { playStartup2Loop(); return; }
  try {
    if (!audioCache[key]) {
      audioCache[key] = new Audio(SND[key]);
      audioCache[key].loop = loop;
    }
    audioCache[key].currentTime = 0;
    audioCache[key].play().catch(() => {});
  } catch(e) {}
}

function stopSound(key) {
  if (key === 'startup2') { stopStartup2Loop(); return; }
  if (audioCache[key]) { audioCache[key].pause(); audioCache[key].currentTime = 0; }
}
  function stopAllMusic() {
    ['startup1', 'startup2', 'startup3'].forEach(k => stopSound(k));
  }

  let stage = 'BIOS';
  let onDone = null;
  let _introDone = false; // guard against double-firing onDone
  let container = null;
  let overlayEl = null;
  let bootInputEl = null;
  let keyHandler = null;
  let skippyMode = false;
  let tippyMode = false;

  // ── BIOS state ──
  let biosPhase = 'typing';
  let difficultySelected = 0;

  // Memory test animation
  let memTestValue = 0;
  const memTestTarget = 65536;
  let memTestDone = false;
  let memTestStarted = false;
  let memTestLineVisible = false;

  // IDE detection animation
  let ideLines = [];
  let ideLineIdx = 0;
  let ideAnimTimer = 0;
  let ideAnimStarted = false;

  // Blinking cursor
  let biosCursor = true;
  let biosCursorTimer = 0;

  // Rendered line buckets
  let biosPreLines = [];
  let biosPostMemLines = [];
  let biosPostIdeLines = [];
  let postMemStarted = false;
  let postIdeStarted = false;

  // ── FIX: IDE detect lines now come AFTER PCI listing (reordered) ──
  const BIOS_LINES_PRE = [
    { text: 'Drawa Modular BIOS v4.51PG, An Energy Star Ally', color: '#aaaaaa', delay: 0 },
    { text: 'Copyright (C) 1984-97, Drawa Software, Inc.', color: '#aaaaaa', delay: 0 },
    { text: '', color: '#aaaaaa', delay: 600 },
    { text: '', color: '#aaaaaa', delay: 600 },
    { text: 'PENTIUM-S CPU at 666MHz', color: '#00ff66', delay: 500 },
  ];

  const BIOS_LINES_POST_MEM = [
    { text: '', color: '#aaaaaa', delay: 600 },
    { text: 'Drawa Plug and Play BIOS Extension  v1.0A', color: '#aaaaaa', delay: 400 },
    { text: 'Copyright (C) 1997, Drawa Software, Inc.', color: '#aaaaaa', delay: 0 },
    { text: '', color: '#aaaaaa', delay: 300 },
    // PCI listing comes FIRST now
    { text: 'PCI Device Listing...', color: '#aaaaaa', delay: 500 },
    { text: 'Bus No.  Device No.  Func No.  Vendor/Device Class  IRQ', color: '#555555', delay: 0 },
    { text: '  0         0          0       8086/7100  Host/PCI            --', color: '#555555', delay: 400 },
    { text: '  0         7          0       8086/7110  ISA                 --', color: '#555555', delay: 400 },
    { text: '  0         7          1       8086/7111  IDE                  9', color: '#555555', delay: 400 },
    { text: '  0         7          2       8086/7112  USB                 11', color: '#555555', delay: 400 },
    { text: '', color: '#aaaaaa', delay: 300 },
  ];

  // IDE detection now happens AFTER PCI listing
  const IDE_DETECT_LINES = [
    { text: '    Detecting IDE Primary Master   ... PCemHD', color: '#aaaaaa' },
    { text: '    Detecting IDE Primary Slave    ... PCemCD', color: '#aaaaaa' },
    { text: '    Detecting IDE Secondary Master ... None',   color: '#aaaaaa' },
    { text: '    Detecting IDE Secondary Slave  ... None',   color: '#aaaaaa' },
    { text: '', color: '#aaaaaa' },
  ];

  // Post-IDE lines: warnings + difficulty
  const BIOS_LINES_POST_IDE = [
    { text: 'WARNING: Unusual processes detected in memory.', color: '#ff4444', delay: 800 },
    { text: '         party.exe flagged: quarantine failed.', color: '#ff4444', delay: 0 },
    { text: '', color: '#aaaaaa', delay: 500 },
    // ── FIX: renamed to "PROCESSOR CALIBRATION", horizontal layout handled in draw ──
    { text: '>>> PROCESSOR CALIBRATION <<<', color: '#ffffff', delay: 600, isDifficultyPrompt: true },
  ];

  // Item draft
  let draftItems = [];
  let draftSelected = 0;
  let draftChosenItems = [];
  let draftPhase = 'choosing';
  let draftCount = 0;

  // Desktop load
  let desktopLoadLines = [];
  const DESKTOP_LOAD_LINES = [
    { text: 'Microsoft Windows 98', color: '#ffffff', delay: 0 },
    { text: 'Copyright Microsoft Corporation 1981-1998', color: '#aaaaaa', delay: 0 },
    { text: '', delay: 200 },
    { text: 'Loading system components...', color: '#00ff66', delay: 300 },
    { text: '  [OK] KERNEL32.DLL', color: '#00ff66', delay: 180 },
    { text: '  [OK] USER32.DLL', color: '#00ff66', delay: 120 },
    { text: '  [OK] GDI32.DLL', color: '#00ff66', delay: 120 },
    { text: '  [!!] PARTY.EXE  ............. flagged', color: '#ff4444', delay: 400 },
    { text: '  [OK] SHELL32.DLL', color: '#00ff66', delay: 200 },
    { text: '', delay: 150 },
    { text: 'Starting Windows...', color: '#ffffff', delay: 500 },
  ];

  // Desktop
  let desktopPhase = 'idle';
  let desktopErrorMsg = '';
  let desktopErrorVisible = false;
  let desktopErrorApp = '';
  let desktopLoadingData = false;
  let desktopLoadDots = 0;
  let desktopLoadDotsTimer = 0;
  let desktopClickedData = false;
  let persistentDesktopRedraw = null;
  const persistentDesktop = document.getElementById('persistent-desktop');
  const desktopIcons = document.getElementById('desktop-icons');
  const desktopLoadingElement = document.getElementById('desktop-loading');
  const desktopErrorLayer = document.getElementById('desktop-error-layer');
  let antipieAppSpawned = false;

  const DESKTOP_APPS = [
    { id: 'mycomputer',  label: 'My Computer',  sprite: 'computer',    x: 24,  y: 30  },
    { id: 'calculator',  label: 'Calculator',   sprite: 'calculator',  x: 110, y: 170 },
    { id: 'recycle',     label: 'Trash',        sprite: 'trash',       x: 24,  y: 100 },
    { id: 'docs',        label: 'My Documents', sprite: 'folder',      x: 24,  y: 170 },
    { id: 'notepad',     label: 'Notepad',      sprite: 'notes',       x: 24,  y: 240 },
    { id: 'internet',    label: 'WonderWeb',    sprite: 'wonderWeb',   x: 24,  y: 310 },
    { id: 'data',        label: 'Data.md',      sprite: 'dataLocked',  x: 24,  y: 400 },
    { id: 'folder1',     label: 'Projects',     sprite: 'folder',      x: 110, y: 30  },
    { id: 'folder2',     label: 'Downloads',    sprite: 'folder',      x: 110, y: 100 },
  ];

  function spawnAntipieApp() {
    if (antipieAppSpawned) return;
    antipieAppSpawned = true;
    DESKTOP_APPS.push({ id: 'antipie', label: 'ANTIPIE', sprite: 'antipie', x: 196, y: 30 });
    if (persistentDesktopRedraw) persistentDesktopRedraw();
    deliverSystemEmail(
      'ANTIPIE program detected',
      'System scan complete.\n\nThe ANTIPIE program has been detected and added to the desktop. Its behavior may be unexpected. Do not remove system protections.'
    );
  }

  const ERROR_MESSAGES = {
    mycomputer:  'This operation has been blocked\nby an unknown process.\n\nError code: 0xC0000034',
    recycle:     'Access denied.\nThe Recycle Bin cannot be\naccessed at this time.',
    docs:        'My Documents is currently\nunavailable. A background process\nis restricting file access.',
    notepad:     'NOTEPAD.EXE failed to launch.\nA conflicting application\nis running in memory.',
    internet:    'Cannot connect. Winsock\ninitialization failed.\n\nError: 10061 - Connection refused.',
    folder1:     'This folder is empty.',
    folder2:     'This folder is empty.',
    calculator:  'CALC.EXE cannot start because\nMSVCRT.DLL is missing or corrupt.',
  };

  // Bluescreen / Clippy
  let bluescreenTimer = 0;
  let clippyVisible = false;
  let clippyAnim = 'notice';
  let clippyAnimFrame = 0;
  let clippyAnimTimer = 0;
  let clippyDialogText = '';
  let clippyDialogOptions = [];
  let clippyDialogCallback = null;
  let clippyDialogSelected = 0;
  let clippyDialogVisible = false;
  let clippySlideY = 300;

  // Terminal
  let termLines = [];
  let termCursor = true;
  let termCursorTimer = 0;
  let termDone = false;

  const TERM_SEQUENCE = [
    { type: 'output', text: 'Microsoft Windows [Version 10.0.19570.1000]', color: '#00ff66', delay: 0 },
    { type: 'output', text: '(c) 2020 Microsoft Corporation. All rights reserved.', color: '#00ff66', delay: 0 },
    { type: 'prompt', text: '', delay: 400 },
    { type: 'input',  text: 'tasklist | findstr /i "blocking"', delay: 80 },
    { type: 'output', text: '', delay: 200 },
    { type: 'output', text: 'Image Name          PID   Session   Mem Usage', color: '#00ff66', delay: 0 },
    { type: 'output', text: '=================== ===== ========= ==========', color: '#555555', delay: 0 },
    { type: 'output', text: 'party.exe           4096  Console   ???K', color: '#ff4444', delay: 0 },
    { type: 'output', text: '', delay: 300 },
    { type: 'prompt', text: '', delay: 200 },
    { type: 'input',  text: 'query party.exe --verbose', delay: 80 },
    { type: 'output', text: '', delay: 200 },
    { type: 'output', text: '[party.exe] Status: ACTIVE. Blocking 14 processes', color: '#ffdd00', delay: 0 },
    { type: 'output', text: '[party.exe] Origin: UNKNOWN. First seen 00:00:00', color: '#ffdd00', delay: 0 },
    { type: 'output', text: '[party.exe] Threat level: ███████ CRITICAL', color: '#ff4444', delay: 0 },
    { type: 'output', text: '', delay: 500 },
    { type: 'clippy_ask', text: 'party.exe is preventing you from\nopening files. Would you like\nme to open it?', delay: 0 },
  ];

  // Game window
  let gameWindowPhase = 'opening';
  let gameWindowTimer = 0;
  let introEnemyX = 0, introEnemyY = 0, introEnemyVx = 0.6, introEnemyVy = 0.4;
  let introEnemyPos = null;
  let introPlayerPos = null;
  let gameWrapper = null;
  let clippyJumpProgress = -1;
  let gameWindowOpacity = 0;
  let persistentDesktopInstalled = false;

  // ── Overlay setup ──
  function buildOverlay() {
    overlayEl = document.createElement('div');
    overlayEl.id = 'intro-overlay';
    overlayEl.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      z-index: 9999; background: #000; overflow: hidden;
      font-family: 'Fixedsys', 'Courier New', monospace;
    `;
    document.body.appendChild(overlayEl);
    const c = document.createElement('canvas');
    c.id = 'intro-canvas';
    c.style.cssText = 'display:block; width:100%; height:100%; image-rendering: pixelated; image-rendering: crisp-edges;';
    c.width = 960; c.height = 600;
    overlayEl.appendChild(c);
    container = c;

    const crtEffects = document.createElement('div');
    crtEffects.className = 'intro-crt-effects';
    crtEffects.setAttribute('aria-hidden', 'true');
    overlayEl.appendChild(crtEffects);

    bootInputEl = document.createElement('input');
    bootInputEl.type = 'text';
    bootInputEl.maxLength = 32;
    bootInputEl.autocomplete = 'off';
    bootInputEl.autocapitalize = 'off';
    bootInputEl.spellcheck = false;
    bootInputEl.setAttribute('aria-label', 'Start program response or secret code');
    bootInputEl.style.cssText = `
      position: absolute; left: 20.8%; top: 15%; width: 20%; height: 30px;
      padding: 2px 6px; border: 1px solid #00ff66; border-radius: 0;
      outline: none; background: #000; color: #00ff66;
      font: 13px "Fixedsys", "Courier New", monospace;
      z-index: 3;
    `;
    bootInputEl.style.display = 'none';
    overlayEl.appendChild(bootInputEl);
  }

  function getCtx() { return container ? container.getContext('2d') : null; }

const _allKeyHandlers = [];
function attachKeys(handler) {
    detachKeys(); // remove all previous
    keyHandler = handler;
    _allKeyHandlers.push(handler);
    window.addEventListener('keydown', keyHandler);
}
function detachKeys() {
    for (const h of _allKeyHandlers) {
        window.removeEventListener('keydown', h);
    }
    _allKeyHandlers.length = 0;
    keyHandler = null;
}

  let desktopClickHandler = null;
  function attachDesktopClicks() {
    desktopClickHandler = (e) => {
      const target = e.target instanceof Element ? e.target : null;
      if (!target) return;
      if (target.closest('.desktop-error-close, .desktop-error-ok')) {
        desktopErrorVisible = false;
        playSound('click');
        renderPersistentDesktop();
        return;
      }
      if (desktopErrorVisible) return;
      const appElement = target.closest('.desktop-icon');
      if (!appElement) return;
      handleDesktopAppClick(appElement.dataset.appId);
    };
    persistentDesktop.addEventListener('click', desktopClickHandler);
    desktopErrorLayer.addEventListener('click', desktopClickHandler);
  }
  function detachDesktopClicks() {
    if (desktopClickHandler) {
      persistentDesktop.removeEventListener('click', desktopClickHandler);
      desktopErrorLayer.removeEventListener('click', desktopClickHandler);
      desktopClickHandler = null;
    }
  }

  // ================================================================
  // STAGE: BIOS
  // ================================================================
  function startBIOS() {
    stage = 'BIOS';
    biosPhase = 'bootPrompt';
    biosPreLines = []; biosPostMemLines = []; biosPostIdeLines = [];
    memTestValue = 0; memTestDone = false; memTestStarted = false; memTestLineVisible = false;
    postMemStarted = false; postIdeStarted = false;
    ideLineIdx = 0; ideAnimTimer = 0; ideAnimStarted = false; ideLines = [];
    biosCursor = true; biosCursorTimer = 0;
    skippyMode = false;
    bootInputEl.value = '';
    bootInputEl.style.display = 'block';
    bootInputEl.focus();

   // Try to autoplay startup1; queue for first interaction if browser blocks it
(function() {
  const a = new Audio('sounds/soundeffects/opening/startup1.mp3');
  const tryPlay = () => a.play().catch(() => {});
  const p = a.play();
  if (p && typeof p.catch === 'function') {
    p.catch(() => {
      const unlock = () => { tryPlay(); document.removeEventListener('keydown', unlock, true); document.removeEventListener('click', unlock, true); document.removeEventListener('touchstart', unlock, true); };
      document.addEventListener('keydown', unlock, { once: true, capture: true });
      document.addEventListener('click', unlock, { once: true, capture: true });
      document.addEventListener('touchstart', unlock, { once: true, capture: true });
    });
  }
})();
   function waitAndPlayStartup2() {
    if (startup2Buffer) {
        playStartup2Loop();
    } else {
        setTimeout(waitAndPlayStartup2, 100);
    }
}
setTimeout(() => {
    if (stage === 'BIOS' || stage === 'ITEM_DRAFT' || stage === 'DESKTOP_LOAD') {
        waitAndPlayStartup2();
    }
}, 2000);

    function continueBIOSAfterPrompt() {
      biosPhase = 'typing';
      bootInputEl.style.display = 'none';
      let acc = 0;
      BIOS_LINES_PRE.forEach((line, i) => {
        acc += (line.delay || 0);
        setTimeout(() => {
          if (stage !== 'BIOS') return;
          biosPreLines.push({ ...line });
          if (i === BIOS_LINES_PRE.length - 1) {
            setTimeout(() => {
              if (stage === 'BIOS') { memTestLineVisible = true; memTestStarted = true; }
            }, 300);
          }
        }, acc + i * 110);
      });
    }

    attachKeys((e) => {
      if (stage !== 'BIOS') return;
      if (biosPhase === 'bootPrompt') {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const response = bootInputEl.value.trim().toLowerCase();
        if (response === 'y') {
          continueBIOSAfterPrompt();
        } else if (response === 'skippy' || response === 'tippy') {
          tippyMode = response === 'tippy';
          skippyMode = true;
          difficultySelected = 1;
          biosPhase = 'difficulty';
          bootInputEl.style.display = 'none';
          biosPostIdeLines = [{ ...BIOS_LINES_POST_IDE[BIOS_LINES_POST_IDE.length - 1] }];
        } else {
          window.location.reload();
        }
        return;
      }
      if (biosPhase === 'difficulty') {
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          playSound('switch');
          setTimeout(() => { difficultySelected = (difficultySelected + 2) % 3; }, 30);
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          playSound('switch');
          setTimeout(() => { difficultySelected = (difficultySelected + 1) % 3; }, 30);
        } else if (e.key === 'Enter') {
          playSound('confirm');
          applyDifficulty(difficultySelected);
          biosPhase = 'done';
          draftCount = difficultySelected === 0 ? 0 : difficultySelected === 1 ? 1 : 2;
          if (skippyMode) {
            draftChosenItems = chooseRandomDraftItems(draftCount);
            finishIntro();
          } else {
            setTimeout(() => startItemDraft(), 600);
          }
        }
      }
    });

    requestAnimationFrame(biosLoop);
  }

  function biosLoop() {
    if (stage !== 'BIOS') return;

    biosCursorTimer++;
    if (biosCursorTimer >= 30) { biosCursorTimer = 0; biosCursor = !biosCursor; }

    if (memTestStarted && !memTestDone) {
      memTestValue = Math.min(memTestValue + Math.ceil(memTestTarget / 50), memTestTarget);
      if (memTestValue >= memTestTarget) {
        memTestValue = memTestTarget;
        memTestDone = true;
        if (!postMemStarted) {
          postMemStarted = true;
          let acc2 = 200;
          BIOS_LINES_POST_MEM.forEach((line, i) => {
            acc2 += (line.delay || 0);
            setTimeout(() => {
              if (stage !== 'BIOS') return;
              biosPostMemLines.push({ ...line });
              if (i === BIOS_LINES_POST_MEM.length - 1) {
                setTimeout(() => { if (stage === 'BIOS') ideAnimStarted = true; }, 400);
              }
            }, acc2 + i * 110);
          });
        }
      }
    }

    if (ideAnimStarted && ideLineIdx < IDE_DETECT_LINES.length) {
      ideAnimTimer++;
      if (ideAnimTimer >= 13) {
        ideAnimTimer = 0;
        ideLines.push({ ...IDE_DETECT_LINES[ideLineIdx] });
        ideLineIdx++;
        if (ideLineIdx >= IDE_DETECT_LINES.length && !postIdeStarted) {
          postIdeStarted = true;
          let acc3 = 300;
          BIOS_LINES_POST_IDE.forEach((line, i) => {
            acc3 += (line.delay || 0);
            setTimeout(() => {
              if (stage !== 'BIOS') return;
              if (line.isDifficultyPrompt) biosPhase = 'difficulty';
              biosPostIdeLines.push({ ...line });
            }, acc3 + i * 90);
          });
        }
      }
    }

    drawBIOS();
    requestAnimationFrame(biosLoop);
  }

  function drawBIOS() {
    const c = getCtx(); if (!c) return;
    const W = 960, H = 600;
    c.fillStyle = '#000000'; c.fillRect(0, 0, W, H);

    const logo = imgs.drawalogo;
    if (biosPhase !== 'bootPrompt' && logo && logo.complete && logo.naturalWidth > 0) {
      const lw = 180, lh = Math.round(logo.naturalHeight * (lw / logo.naturalWidth));
      c.drawImage(logo, W / 2 - lw / 2, 20, lw, lh);
    }

    c.font = '13px "Fixedsys", "Courier New", monospace';
    const lineH = 18;
    const textX = 200;
    let y = 60;

    for (const line of biosPreLines) {
      c.fillStyle = line.color || '#aaaaaa';
      c.fillText(line.text, textX, y);
      y += lineH;
    }

    if (memTestLineVisible) {
      c.fillStyle = '#00ff66';
      c.fillText(`Memory Test :  ${String(memTestValue).padStart(6, ' ')}K OK`, textX, y);
      y += lineH;
    }

    for (const line of biosPostMemLines) {
      c.fillStyle = line.color || '#aaaaaa';
      c.fillText(line.text, textX, y);
      y += lineH;
    }

    for (const line of ideLines) {
      c.fillStyle = line.color || '#aaaaaa';
      c.fillText(line.text, textX, y);
      y += lineH;
    }

    for (const line of biosPostIdeLines) {
      if (line.isDifficultyPrompt) {
        c.fillStyle = '#ffffff';
        c.fillText(skippyMode ? '>>> SELECT DIFFICULTY <<<' : '>>> PROCESSOR CALIBRATION <<<', textX, y);
        y += lineH + 8;

        const opts = ['Easy', 'Normal', 'Hard'];
        const optW = 100;
        const startOptX = textX;

        opts.forEach((opt, i) => {
          const sel = i === difficultySelected && biosPhase === 'difficulty';
          const ox = startOptX + i * optW;
          if (sel) {
            c.fillStyle = '#ffffff';
            c.fillRect(ox - 2, y - 14, optW - 6, 18);
            c.fillStyle = '#000000';
          } else {
            c.fillStyle = '#888888';
          }
          c.fillText((sel ? '> ' : '  ') + opt, ox, y);
        });
        y += lineH;

        if (biosPhase === 'difficulty') {
          c.fillStyle = '#555555';
          c.fillText('Use arrow keys to select, ENTER to confirm', textX, y + 8);
          y += lineH + 8;
        }
      } else {
        c.fillStyle = line.color || '#aaaaaa';
        c.fillText(line.text, textX, y);
        y += lineH;
      }
    }

    if (biosPhase === 'bootPrompt') {
      c.fillStyle = '#ffffff';
      c.fillText('Start Program?', textX, y);
      y += lineH;
      c.fillText('Y     N', textX, y);
    }

    if (biosPhase === 'typing' && biosCursor) {
      const allLines = [
        ...biosPreLines,
        ...(memTestLineVisible ? [{ text: `Memory Test :  ${String(memTestValue).padStart(6, ' ')}K OK` }] : []),
        ...biosPostMemLines,
        ...ideLines,
        ...biosPostIdeLines.filter(l => !l.isDifficultyPrompt),
      ];
      if (allLines.length > 0) {
        const last = allLines[allLines.length - 1];
        const tw = c.measureText(last.text || '').width;
        const curY = 60 + (allLines.length - 1) * lineH;
        c.fillStyle = '#888888';
        c.fillRect(textX + tw + 2, curY - 12, 8, 14);
      }
    }
  }

  // ================================================================
  // STAGE: ITEM DRAFT
  // ================================================================
  const BASE_ITEM_IDS = ['paperCuts', 'extraClips'];

  function buildDraftPool() {
    const allIds = typeof ALL_ITEM_IDS !== 'undefined'
      ? [...ALL_ITEM_IDS, ...BASE_ITEM_IDS]
      : [...BASE_ITEM_IDS];
    const owned = [
      ...((typeof gs !== 'undefined' && gs && gs.unlockedItems) ? gs.unlockedItems : []),
      ...draftChosenItems,
    ];
    const available = allIds.filter(id =>
      !owned.includes(id) && isCakeItemAvailable(id, gs, draftChosenItems)
    );
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }
    const seen = new Set();
    const chosen = [];
    for (const id of available) {
      if (!seen.has(id)) {
        seen.add(id);
        chosen.push(id);
      }
      if (chosen.length >= 3) break;
    }
    let padIdx = 0;
    while (chosen.length < 3) {
      chosen.push(BASE_ITEM_IDS[padIdx % BASE_ITEM_IDS.length]);
      padIdx++;
    }
    return chosen.map(id => ITEM_DEFS[id]).filter(Boolean);
  }

  function chooseRandomDraftItems(count) {
    const chosenItems = [];
    draftChosenItems = [];
    while (chosenItems.length < count) {
      const candidates = buildDraftPool().filter(item => !draftChosenItems.includes(item.id));
      if (candidates.length === 0) break;
      const item = candidates[Math.floor(Math.random() * candidates.length)];
      chosenItems.push(item.id);
      draftChosenItems.push(item.id);
    }
    return chosenItems;
  }

  function startItemDraft() {
    stage = 'ITEM_DRAFT';
    detachKeys();
    draftSelected = 0;
    draftPhase = 'transition';
    draftChosenItems = [];

    if (draftCount === 0) { setTimeout(() => startDesktopLoad(), 400); return; }

    function runScanlineFlash(onComplete) {
      const c = getCtx();
      const W = 960, H = 600;
      const TOTAL_FRAMES = 10;
      let frame = 0;
      function tick() {
        if (frame >= TOTAL_FRAMES) { onComplete(); return; }
        frame++;
        const progress = frame / TOTAL_FRAMES;
        c.fillStyle = '#000000';
        c.fillRect(0, 0, W, H);
        const BAND_COUNT = 4;
        const BAND_W = 55;
        const TILT = 0.22;
        const sweepX = -BAND_W * 2 + progress * (W + BAND_W * BAND_COUNT * 1.5);
        c.save();
        for (let b = 0; b < BAND_COUNT; b++) {
          const bx = sweepX + b * (BAND_W * 1.6);
          const alpha = Math.max(0, 0.55 - Math.abs(b - BAND_COUNT * 0.4) * 0.055);
          c.globalAlpha = alpha * (1 - Math.abs(progress - 0.5) * 1.6);
          c.save();
          c.translate(bx, H / 2);
          c.rotate(-TILT);
          c.fillStyle = '#cccccc';
          c.fillRect(-BAND_W / 2, -H * 1.2, BAND_W, H * 2.4);
          c.restore();
        }
        c.restore();
        c.globalAlpha = 1;
        if (frame === 13 || frame === 14) {
          c.fillStyle = `rgba(255,255,255,${frame === 13 ? 0.55 : 0.25})`;
          c.fillRect(0, 0, W, H);
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    runScanlineFlash(() => {
      if (stage !== 'ITEM_DRAFT') return;
      draftPhase = 'choosing';
      draftItems = buildDraftPool();
      draftSelected = 0;
      requestAnimationFrame(draftLoop);

      let pickedCount = 0;
      let picking = false;

      function setupDraftKeys() {
        attachKeys((e) => {
          if (stage !== 'ITEM_DRAFT' || draftPhase !== 'choosing') return;
          // Hard guard — ignore if already processing a pick
          if (picking) return;

          const itemCount = draftItems.length;
          if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            playSound('switch');
            draftSelected = (draftSelected + itemCount - 1) % itemCount;
          } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
            playSound('switch');
            draftSelected = (draftSelected + 1) % itemCount;
          } else if (e.key === 'Enter') {
            picking = true;          // set immediately, before any async
            playSound('confirm');
            detachKeys();            // remove listener right away

            const chosen = draftItems[draftSelected];
            if (chosen && chosen.id && !draftChosenItems.includes(chosen.id)) {
              draftChosenItems.push(chosen.id);
            }
            pickedCount++;

            if (pickedCount >= draftCount) {
              draftPhase = 'done';
              setTimeout(() => startDesktopLoad(), 600);
            } else {
              // Build a fresh pool (excludes just-picked item since it's now in unlockedItems)
              draftItems = buildDraftPool();
              draftSelected = 0;
              picking = false;
              setupDraftKeys();      // re-attach for next pick
            }
          }
        });
      }

      setupDraftKeys();
    });
  }

  function draftLoop() {
    if (stage !== 'ITEM_DRAFT') return;
    if (draftPhase !== 'transition') drawDraft();
    requestAnimationFrame(draftLoop);
  }

  function drawDraft() {
    const c = getCtx(); if (!c) return;
    c.fillStyle = '#000000'; c.fillRect(0, 0, 960, 600);
    c.font = '13px "Fixedsys", "Courier New", monospace';

    c.fillStyle = '#00ff66';
    c.fillText('BIOS item cache detected. Select one to load into memory:', 40, 50);
    c.fillStyle = '#ff4444';
    c.fillText('(DESCRIPTION DATA: UNAVAILABLE)', 40, 72);

    const cardW = 200, cardH = 110, startX = 100, cardY = 140, gap = 60;
    draftItems.forEach((item, i) => {
        if (!item) return;
        const x = startX + i * (cardW + gap);
        const sel = i === draftSelected && draftPhase === 'choosing';
        c.fillStyle = sel ? '#003300' : '#111111'; c.fillRect(x, cardY, cardW, cardH);
        c.strokeStyle = sel ? '#00ff66' : '#333333'; c.lineWidth = sel ? 2 : 1; c.strokeRect(x, cardY, cardW, cardH);
        if (sel) { c.fillStyle = '#00ff66'; c.fillText('>', x - 18, cardY + 58); }
        c.fillStyle = sel ? '#00ff66' : '#888888';
        c.font = 'bold 13px "Fixedsys", "Courier New", monospace';
        const label = item.label ? item.label.replace(/\n/g, ' ') : '???';
        const words = label.split(' ');
        let l1 = '', l2 = '';
        words.forEach(w => { if (c.measureText(l1 + w).width < cardW - 20) l1 += (l1 ? ' ' : '') + w; else l2 += (l2 ? ' ' : '') + w; });
        c.fillText(l1, x + 10, cardY + 50);
        if (l2) c.fillText(l2, x + 10, cardY + 68);
        c.font = '11px "Fixedsys", "Courier New", monospace';
        c.fillStyle = '#555555'; c.fillText('[?????]', x + 10, cardY + 88);
    });

    c.font = '11px "Fixedsys", "Courier New", monospace';
    c.fillStyle = '#444444';
    c.fillText('Arrow keys: navigate   |   Enter: select', 320, 310);

    if (draftPhase === 'done') {
        c.fillStyle = '#00ff66'; c.font = '14px "Fixedsys", "Courier New", monospace';
        c.fillText('Loading selected item... OK', 40, 380);
    }
  }

  // ================================================================
  // STAGE: DESKTOP LOAD
  // ================================================================
  function startDesktopLoad() {
    stage = 'DESKTOP_LOAD';
    detachKeys();
    desktopLoadLines = [];
    stopSound('startup1');

    let acc = 800;
    DESKTOP_LOAD_LINES.forEach((line, i) => {
      acc += (line.delay || 0) + 90;
      setTimeout(() => {
        if (stage !== 'DESKTOP_LOAD') return;
        desktopLoadLines.push({ ...line, visible: true });
        if (i === DESKTOP_LOAD_LINES.length - 1) setTimeout(() => transitionToDesktop(), 1200);
      }, acc);
    });

    requestAnimationFrame(desktopLoadLoop);
  }

  function desktopLoadLoop() {
    if (stage !== 'DESKTOP_LOAD') return;
    drawDesktopLoad();
    requestAnimationFrame(desktopLoadLoop);
  }

  function drawDesktopLoad() {
    const c = getCtx(); if (!c) return;
    c.fillStyle = '#000000'; c.fillRect(0, 0, 960, 600);
    c.font = '13px "Fixedsys", "Courier New", monospace';
    let y = 60;
    desktopLoadLines.forEach(line => {
      if (!line.visible) return;
      c.fillStyle = line.color || '#aaaaaa';
      c.fillText(line.text || '', 60, y);
      y += 20;
    });
  }

  // ================================================================
  // STAGE: DESKTOP
  // ================================================================
  function transitionToDesktop() {
    stage = 'DESKTOP';
    desktopPhase = 'idle';
    desktopErrorVisible = false;
    desktopLoadingData = false;
    desktopClickedData = false;
    stopSound('startup2');
    playSound('startup3');
    renderPersistentDesktop();
    deliverSystemEmail(
      'Welcome to your computer',
      'Welcome!\n\nYour desktop is ready. The Email app will deliver system notices, offers, and occasional suspicious messages. Reading a message is always safe; only its buttons trigger actions.'
    );
    persistentDesktop.hidden = false;
    document.body.classList.add('desktop-ready');
    if (overlayEl) overlayEl.style.display = 'none';
    attachDesktopClicks();
    requestAnimationFrame(desktopLoop);
  }

  function desktopLoop() {
    if (stage !== 'DESKTOP') return;
    if (desktopLoadingData) {
      desktopLoadDotsTimer++;
      if (desktopLoadDotsTimer > 20) { desktopLoadDotsTimer = 0; desktopLoadDots = (desktopLoadDots + 1) % 4; }
    }
    renderDesktopLoading();
    requestAnimationFrame(desktopLoop);
  }

  function triggerAntipieBossSequence() {
    if (gs.antipieBossSequence || gs.bossActive) return;

    const wrapper = document.getElementById('wrapper');
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    document.body.classList.add('antipie-takeover');
    wrapper.classList.add('antipie-takeover');
    wrapper.style.left = `${Math.round(rect.left)}px`;
    wrapper.style.top = `${Math.round(rect.top)}px`;
    wrapper.style.width = `${Math.round(rect.width)}px`;
    wrapper.style.height = `${Math.round(rect.height)}px`;

    const startWidth = rect.width;
    const startHeight = rect.height;
    const enemyIds = [...ECS.query('enemy')];
    for (let i = enemyIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [enemyIds[i], enemyIds[j]] = [enemyIds[j], enemyIds[i]];
    }
    gs.antipieBossSequence = {
      startedAt: performance.now(),
      startLeft: rect.left,
      startTop: rect.top,
      startWidth,
      startHeight,
      shakeDuration: 5000,
      expandDuration: 2600,
      enemyIds,
      killedCount: 0,
    };
    gs.antipieDarkness = 0;
    resizeGameViewport();
  }

  function handleDesktopAppClick(appId) {
    if (desktopPhase === 'loading_data') return;

    if (desktopErrorVisible) {
      return;
    }

    const app = DESKTOP_APPS.find(desktopApp => desktopApp.id === appId);
    if (!app || (app.id === 'data' && _introDone)) return;
    if (app.id !== 'recycle') playSound('click');
    if (app.id === 'data') {
      handleDataClick();
    } else if (app.id === 'recycle') {
      if (typeof window.openTrashWindow === 'function') window.openTrashWindow();
    } else if (app.id === 'internet') {
      if (typeof window.openWonderWeb === 'function') window.openWonderWeb();
    } else if (app.id === 'antipie' && _introDone) {
      triggerAntipieBossSequence();
    } else if (app.sprite === 'folder') {
      desktopErrorVisible = true;
      desktopErrorApp = app.label;
      desktopErrorMsg = ERROR_MESSAGES[app.id] || 'This folder is empty.';
    } else {
      desktopErrorVisible = true;
      desktopErrorApp = app.label.replace('\n', ' ');
      desktopErrorMsg = ERROR_MESSAGES[app.id] || 'This application cannot be opened.';
    }
    renderPersistentDesktop();
  }

  function handleDataClick() {
  if (_introDone || desktopClickedData) return;
  desktopClickedData = true;
  desktopPhase = 'loading_data';
  desktopLoadingData = true;
  desktopLoadDots = 0; desktopLoadDotsTimer = 0;

  setTimeout(() => {
    desktopLoadingData = false;
    document.body.classList.remove('desktop-ready');
    persistentDesktop.hidden = true;
    stage = 'FLICKERING';
    stopSound('startup3');
    if (overlayEl) overlayEl.style.display = 'block';
    playSound('bluescreen');
    startBluescreen();
  }, 2200);
}

function renderPersistentDesktop() {
  desktopIcons.replaceChildren(...DESKTOP_APPS.map(app => {
    const icon = document.createElement('button');
    icon.className = 'desktop-icon';
    icon.type = 'button';
    icon.dataset.appId = app.id;
    icon.style.left = `${app.x / 960 * 100}%`;
    icon.style.top = `${app.y / 600 * 100}%`;
    const image = document.createElement('img');
    image.src = SPR[app.sprite];
    image.alt = '';
    const label = document.createElement('span');
    label.textContent = app.label;
    icon.append(image, label);
    return icon;
  }));
  renderDesktopLoading();
  const title = document.getElementById('desktop-error-title');
  const message = document.getElementById('desktop-error-message');
  title.textContent = `⚠ ${desktopErrorApp}`;
  message.textContent = desktopErrorMsg;
  desktopErrorLayer.hidden = !desktopErrorVisible;
}

function renderDesktopLoading() {
  desktopLoadingElement.hidden = !desktopLoadingData;
  if (desktopLoadingData) {
    desktopLoadingElement.textContent = `Opening${'.'.repeat(desktopLoadDots)} ${['|', '/', '—', '\\'][Math.floor(Date.now() / 200) % 4]}`;
  }
}

  // ================================================================
  // STAGE: BLUESCREEN
  // ================================================================
  function startBluescreen() {
    stage = 'BLUESCREEN';
    detachDesktopClicks();
    persistentDesktop.hidden = true;
    document.body.classList.remove('desktop-ready');
    desktopErrorVisible = false;
    desktopErrorLayer.hidden = true;
    if (overlayEl) overlayEl.style.display = 'block';
    bluescreenTimer = 0; clippyVisible = false; clippySlideY = 300; clippyDialogVisible = false; clippyAnim = 'notice';

    setTimeout(() => {
      clippyVisible = true; clippyAnim = 'notice'; clippyAnimFrame = 0;
      setTimeout(() => showClippyDialog(
        "It looks like you're having\ntechnical difficulties!\nNeed help?",
        ['Yes, please!', 'No thanks'],
        (choice) => {
          clippyAnim = 'bluescreen_idle';
          if (choice === 0) startTerminal();
          else showClippyDialog("Are you sure? Things look\npretty bad...", ['OK fine, help me', 'Bug off'],
            (c2) => { if (c2 === 0) startTerminal(); });
        }
      ), 800);
    }, 3000);

    attachKeys((e) => {
      if (stage !== 'BLUESCREEN') return;
      if (!clippyDialogVisible) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        playSound('switch');
        setTimeout(() => { clippyDialogSelected = (clippyDialogSelected + clippyDialogOptions.length - 1) % clippyDialogOptions.length; }, 30);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        playSound('switch');
        setTimeout(() => { clippyDialogSelected = (clippyDialogSelected + 1) % clippyDialogOptions.length; }, 30);
      } else if (e.key === 'Enter') { playSound('confirm'); const cb = clippyDialogCallback, sel = clippyDialogSelected; clippyDialogVisible = false; if (cb) cb(sel); }
    });

    requestAnimationFrame(bluescreenLoop);
  }

  function showClippyDialog(text, options, callback) {
    clippyDialogText = text; clippyDialogOptions = options; clippyDialogCallback = callback;
    clippyDialogSelected = 0; clippyDialogVisible = true;
  }

  function bluescreenLoop() {
    if (stage !== 'BLUESCREEN') return;
    bluescreenTimer++;
    if (clippyVisible && clippySlideY > 0) clippySlideY = Math.max(0, clippySlideY - 12);

    clippyAnimTimer--;
    if (clippyAnimTimer <= 0) {
      const count = CLIPPY_FRAME_COUNTS[clippyAnim] || 1;
      if (count > 1) {
        let next;
        do { next = Math.floor(Math.random() * count); } while (next === clippyAnimFrame);
        clippyAnimFrame = next;
      }
      clippyAnimTimer = 60 + Math.floor(Math.random() * 120);
    }
    
    drawBluescreen();
    requestAnimationFrame(bluescreenLoop);
  }

  function drawBluescreen() {
    const c = getCtx(); if (!c) return;
    const W = 960, H = 600;
    c.fillStyle = '#0000aa'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffffff'; c.font = '14px "Fixedsys", "Courier New", monospace';
    [
      '*** STOP: 0x0000007B (0xF641F84C,0xC0000034,0x00000000,0x00000000)',
      'INACCESSIBLE_BOOT_DEVICE', '',
      "If this is the first time you've seen this Stop error screen,",
      'restart your computer. If this screen appears again, follow these steps:',
      '', 'Check for viruses on your computer. Remove party.exe if found.',
      'Check your hard drive configuration and restart.', '',
      'Run CHKDSK /F to check for hard drive corruption, and then restart.',
      '', 'Refer to your Getting Started manual for more information on',
      'troubleshooting Stop errors.',
    ].forEach((ln, i) => c.fillText(ln, 40, 60 + i * 22));
    if (clippyVisible) {
      const cx = W - 110, cy = H - 160 + clippySlideY;
      if (clippyDialogVisible) drawClippyDialogBox(c, cx - 310, cy - 80, cx, cy);
      drawClippyAt(c, cx, cy, clippyAnim, clippyAnimFrame);
    }
  }

  // ================================================================
  // STAGE: TERMINAL
  // ================================================================
  function startTerminal() {
    stage = 'TERMINAL';
    detachKeys();
    termLines = []; termDone = false; clippyAnim = 'engineer'; clippySlideY = 0;
    playSound('fixing', true);

    attachKeys((e) => {
      if (stage !== 'TERMINAL') return;
      if (!clippyDialogVisible) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        playSound('switch');
        setTimeout(() => { clippyDialogSelected = (clippyDialogSelected + clippyDialogOptions.length - 1) % clippyDialogOptions.length; }, 30);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        playSound('switch');
        setTimeout(() => { clippyDialogSelected = (clippyDialogSelected + 1) % clippyDialogOptions.length; }, 30);
      } else if (e.key === 'Enter') { playSound('confirm'); const cb = clippyDialogCallback, sel = clippyDialogSelected; clippyDialogVisible = false; if (cb) cb(sel); }
    });

    runTerminalSequence(0);
    requestAnimationFrame(terminalLoop);
  }

  function runTerminalSequence(idx) {
    if (idx >= TERM_SEQUENCE.length) { termDone = true; return; }
    const step = TERM_SEQUENCE[idx];
    if (step.type === 'clippy_ask') {
      setTimeout(() => {
        stopSound('fixing');
        clippyAnim = 'normal';
        clippyAnimFrame = 0;
        showClippyDialog(step.text, ['Yes, open it', 'No'], (choice) => {
          if (choice === 0) { termLines.push({ text: 'C:\\Users\\clippy> open party.exe', color: '#00ff66' }); setTimeout(() => startGameWindow(), 1200); }
          else { termLines.push({ text: 'Operation cancelled.', color: '#ff4444' }); setTimeout(() => runTerminalSequence(idx + 1), 500); }
        });
      }, step.delay || 0);
      return;
    }
    setTimeout(() => {
      if (step.type === 'prompt') termLines.push({ text: 'C:\\Users\\clippy> ', color: '#00ff66' });
      else if (step.type === 'input') { typeTermLine(step.text, '#ffffff', () => setTimeout(() => runTerminalSequence(idx + 1), 200)); return; }
      else if (step.type === 'output') termLines.push({ text: step.text, color: step.color || '#00ff66' });
      setTimeout(() => runTerminalSequence(idx + 1), 80);
    }, step.delay || 0);
  }

  function playTypeSound() {
    const key = 'typing' + (1 + Math.floor(Math.random() * 3));
    try {
      const a = new Audio(SND[key]);
      a.volume = 0.25 + Math.random() * 0.3;
      a.playbackRate = 0.88 + Math.random() * 0.28;
      a.play().catch(() => {});
    } catch(e) {}
  }

  function typeTermLine(text, color, onDone) {
    let i = 0;
    const lineObj = { text: '', color, isTyping: true };
    termLines.push(lineObj);
    function typeChar() {
      if (i >= text.length) { lineObj.isTyping = false; if (onDone) onDone(); return; }
      lineObj.text += text[i++];
      playTypeSound(); 
      setTimeout(typeChar, 45);
    }
    typeChar();
  }

  function terminalLoop() {
    if (stage !== 'TERMINAL') return;
    termCursorTimer++; if (termCursorTimer > 25) { termCursorTimer = 0; termCursor = !termCursor; }
   
    clippyAnimTimer--;
    if (clippyAnimTimer <= 0) {
      const count = CLIPPY_FRAME_COUNTS[clippyAnim] || 1;
      if (count > 1) {
        let next;
        do { next = Math.floor(Math.random() * count); } while (next === clippyAnimFrame);
        clippyAnimFrame = next;
      }
      clippyAnimTimer = 60 + Math.floor(Math.random() * 120);
    }
    
    drawTerminal();
    requestAnimationFrame(terminalLoop);
  }

  function drawTerminal() {
    const c = getCtx(); if (!c) return;
    const W = 960, H = 600;
    c.fillStyle = '#0a0a0a'; c.fillRect(0, 0, W, H);
    c.font = '13px "Fixedsys", "Courier New", monospace';
    const lineH = 18, maxLines = Math.floor((H - 80) / lineH);
    const vis = termLines.slice(-maxLines);
    vis.forEach((ln, i) => {
      c.fillStyle = ln.color || '#00ff66';
      c.fillText(ln.text + (ln.isTyping && termCursor ? '\u2588' : ''), 20, 40 + i * lineH);
    });
    const last = termLines[termLines.length - 1];
    if (last && !last.isTyping && termCursor && !clippyDialogVisible) {
      c.fillStyle = '#00ff66';
      c.fillText('\u2588', 20 + c.measureText(last.text).width, 40 + (Math.min(termLines.length, maxLines) - 1) * lineH);
    }
    const cx = W - 110, cy = H - 160;
    if (clippyDialogVisible) drawClippyDialogBox(c, cx - 310, cy - 80, cx, cy);
    drawClippyAt(c, cx, cy, clippyAnim, clippyAnimFrame);
  }

  // ================================================================
  // STAGE: GAME WINDOW
  // ================================================================
  function startGameWindow() {
    stage = 'GAME_WINDOW';
    gameWindowPhase = 'opening'; gameWindowTimer = 0; gameWindowOpacity = 0;
    clippyAnim = 'watching'; clippyAnimFrame = 0; clippyDialogVisible = false;
    installPersistentDesktop();
    if (overlayEl) overlayEl.style.display = 'none';
    gameWrapper = document.getElementById('wrapper');
    if (gameWrapper) gameWrapper.style.opacity = '0';
    initGameState(false);
    introPlayerPos = ECS.get(gs.playerId, 'pos');
    if (introPlayerPos) { gunX = introPlayerPos.x; gunY = introPlayerPos.y; }
    introEnemyX = worldW * 0.68; introEnemyY = worldH * 0.55;
    introEnemyVx = 0.6; introEnemyVy = 0.4;
    const introEnemyId = ECS.createEntity();
    introEnemyPos = { x: introEnemyX, y: introEnemyY, angle: 0 };
    ECS.add(introEnemyId, 'enemy', { type: 'giftBox' });
    ECS.add(introEnemyId, 'pos', introEnemyPos);
    ECS.add(introEnemyId, 'vel', { vx: 0, vy: 0 });
    ECS.add(introEnemyId, 'hp', { hp: 3, maxHp: 3, hitFlash: 0 });
    ECS.add(introEnemyId, 'ai', {});
    clippyJumpProgress = -1;

    attachKeys((e) => {
      if (stage !== 'GAME_WINDOW') return;
      if (!clippyDialogVisible) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        playSound('switch');
        setTimeout(() => { clippyDialogSelected = (clippyDialogSelected + clippyDialogOptions.length - 1) % clippyDialogOptions.length; }, 30);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        playSound('switch');
        setTimeout(() => { clippyDialogSelected = (clippyDialogSelected + 1) % clippyDialogOptions.length; }, 30);
      } else if (e.key === 'Enter') { playSound('confirm'); const cb = clippyDialogCallback, sel = clippyDialogSelected; clippyDialogVisible = false; if (cb) cb(sel); }
    });

    requestAnimationFrame(gameWindowLoop);
  }

  function gameWindowLoop() {
    if (stage !== 'GAME_WINDOW') return;
    gameWindowTimer++;
    if (gameWindowOpacity < 1) {
      gameWindowOpacity = Math.min(1, gameWindowOpacity + 0.04);
      if (gameWrapper) gameWrapper.style.opacity = String(gameWindowOpacity);
    }
    if (gameWindowPhase === 'enemy_spawn' || gameWindowPhase === 'clippy_ask') {
      introEnemyX += introEnemyVx; introEnemyY += introEnemyVy;
      if (introEnemyX < 40 || introEnemyX > worldW - 40) introEnemyVx *= -1;
      if (introEnemyY < 50 || introEnemyY > worldH - 40) introEnemyVy *= -1;
      introEnemyPos.x = introEnemyX; introEnemyPos.y = introEnemyY;
    }
    if (gameWindowPhase === 'clippy_jump') {
      introEnemyX += (introPlayerPos.x - introEnemyX) * 0.08;
      introEnemyY += (introPlayerPos.y - introEnemyY) * 0.08;
      introEnemyPos.x = introEnemyX; introEnemyPos.y = introEnemyY;
      clippyJumpProgress += 0.04;
      clippyAnimFrame = clippyJumpProgress > 0.8 ? 1 : 0; 
      if (clippyJumpProgress > 1) {
        gameWindowPhase = 'done';
        // Use a guard so finishIntro can only fire once
        setTimeout(() => finishIntro(), 800);
      }
    }

    clippyAnimTimer--;
    if (clippyAnimTimer <= 0) {
      const count = CLIPPY_FRAME_COUNTS[clippyAnim] || 1;
      if (count > 1 && gameWindowPhase !== 'clippy_jump') {
        let next;
        do { next = Math.floor(Math.random() * count); } while (next === clippyAnimFrame);
        clippyAnimFrame = next;
      }
      clippyAnimTimer = 60 + Math.floor(Math.random() * 120);
    }
    
    if (gameWindowPhase === 'opening' && gameWindowTimer === 80) gameWindowPhase = 'enemy_spawn';
    if (gameWindowPhase === 'enemy_spawn' && gameWindowTimer === 160) {
      gameWindowPhase = 'clippy_ask';
      clippyAnim = 'normal'; clippyAnimFrame = 0;
      showClippyDialog(
        "It looks like viruses are\ndefending the data file.\nIt is dangerous to fight\nthem alone. Want my help?",
        ['Yes!', 'I got this'],
        (choice) => {
          if (choice === 0) { clippyAnim = 'jump'; clippyJumpProgress = 0; gameWindowPhase = 'clippy_jump'; }
          else finishIntro();
        }
      );
    }
    drawGameWindow();
    requestAnimationFrame(gameWindowLoop);
  }

  function drawGameWindow() {
    if (!canvas.width || !canvas.height) return;
    draw();
    const c = ctx;
    const dpr = window.devicePixelRatio || 1;
    c.save();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const clippyBaseX = worldW - 90, clippyBaseY = worldH - 90;
    if (gameWindowPhase === 'clippy_jump' && clippyJumpProgress >= 0 && clippyJumpProgress <= 1) {
      const t = clippyJumpProgress;
      const jx = clippyBaseX + (introEnemyX - clippyBaseX) * t;
      const jy = clippyBaseY + (introEnemyY - clippyBaseY) * t - Math.sin(t * Math.PI) * 180;
      drawClippyAt(c, jx, jy, 'jump', clippyAnimFrame);
    } else if (gameWindowPhase !== 'clippy_jump') {
      drawClippyAt(c, clippyBaseX, clippyBaseY, clippyAnim, clippyAnimFrame);
    }
    if (clippyDialogVisible) drawClippyDialogBox(c, clippyBaseX - 330, clippyBaseY - 100, clippyBaseX, clippyBaseY);
    c.restore();
  }

  // ================================================================
  // CLIPPY HELPERS
  // ================================================================
  function drawClippyAt(c, x, y, anim, frame) {
    const W = 180, H = 180;
    let img = null;
    let flipX = false;

    if (anim === 'engineer') {
      img = imgs['clippyEngineer' + (frame + 1)] || imgs.clippyEngineer1;
    } else if (anim === 'notice') {
      img = frame === 0 ? imgs.clippyNotice1 : imgs.clippyNotice2;
    } else if (anim === 'normal') {
      img = [imgs.clippyNormal1, imgs.clippyNormal2, imgs.clippyNormal3][frame % 3];
    } else if (anim === 'watching') {
      img = frame === 0 ? imgs.clippyWatching1 : imgs.clippyWatching2;
      if (frame === 1) flipX = true;
    } else if (anim === 'bluescreen_idle') {
      img = frame === 0 ? imgs.clippyStressed1 : imgs.clippyStressed2;
    } else if (anim === 'jump') {
      img = frame === 0 ? imgs.clippyJump1 : imgs.clippyJump2;
      if (frame === 0) flipX = true;
    } else {
      img = imgs.clippyNormal1;
    }

    if (img && img.complete && img.naturalWidth > 0) {
      c.save();
      c.translate(x, y);
      if (flipX) c.scale(-1, 1);
      c.drawImage(img, -W/2, -H/2, W, H);
      c.restore();
    } else {
      c.save(); c.translate(x, y);
      c.fillStyle = '#ffcc88'; c.beginPath(); c.arc(0, -10, 18, 0, Math.PI*2); c.fill();
      c.fillStyle = '#4488ff'; c.fillRect(-14, 6, 28, 20);
      c.restore();
    }
  }

  function drawClippyDialogBox(c, bx, by, clippyX, clippyY) {
    const bw = 260, lh = 18;
    const lines = clippyDialogText.split('\n');
    const optionH = clippyDialogOptions.length * 26 + 16;
    const bh = lines.length * lh + optionH + 48;
    const r = 10;

    c.save();
    c.shadowColor = 'rgba(0,0,0,0.28)';
    c.shadowBlur = 7;
    c.shadowOffsetX = 2; c.shadowOffsetY = 2;

    c.fillStyle = '#ffffcc';
    c.beginPath();
    c.moveTo(bx + r, by);
    c.lineTo(bx + bw - r, by);
    c.arcTo(bx + bw, by, bx + bw, by + r, r);
    c.lineTo(bx + bw, by + bh - r);
    c.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
    c.lineTo(bx + r, by + bh);
    c.arcTo(bx, by + bh, bx, by + bh - r, r);
    c.lineTo(bx, by + r);
    c.arcTo(bx, by, bx + r, by, r);
    c.closePath();
    c.fill();
    c.restore();

    c.strokeStyle = '#aaaaaa';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(bx + r, by);
    c.lineTo(bx + bw - r, by);
    c.arcTo(bx + bw, by, bx + bw, by + r, r);
    c.lineTo(bx + bw, by + bh - r);
    c.arcTo(bx + bw, by + bh, bx + bw - r, by + bh, r);
    c.lineTo(bx + r, by + bh);
    c.arcTo(bx, by + bh, bx, by + bh - r, r);
    c.lineTo(bx, by + r);
    c.arcTo(bx, by, bx + r, by, r);
    c.closePath();
    c.stroke();

    // Dynamic tail pointing toward Clippy
    const bubbleCenterY = by + bh / 2;
    const clippyIsRight = (clippyX || 0) > bx + bw;
    let tailAttachX, tailA, tailB, tailTipX, tailTipY;
    const clampedY = Math.max(by + 20, Math.min(by + bh - 20, clippyY || bubbleCenterY));

    if (clippyIsRight) {
      tailAttachX = bx + bw - 1;
      tailA = { x: tailAttachX, y: clampedY - 11 };
      tailB = { x: tailAttachX, y: clampedY + 16 };
      tailTipX = (clippyX || 0) - 40;
      tailTipY = clippyY || bubbleCenterY;
    } else {
      tailAttachX = bx + 1;
      tailA = { x: tailAttachX, y: clampedY - 11 };
      tailB = { x: tailAttachX, y: clampedY + 16 };
      tailTipX = (clippyX || 0) + 40;
      tailTipY = clippyY || bubbleCenterY;
    }

    c.fillStyle = '#ffffcc';
    c.beginPath();
    c.moveTo(tailA.x, tailA.y);
    c.lineTo(tailTipX, tailTipY);
    c.lineTo(tailB.x, tailB.y);
    c.closePath();
    c.fill();

    c.strokeStyle = '#aaaaaa';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(tailA.x, tailA.y);
    c.lineTo(tailTipX, tailTipY);
    c.lineTo(tailB.x, tailB.y);
    c.stroke();

    // Cover seam
    c.fillStyle = '#ffffcc';
    if (clippyIsRight) {
      c.fillRect(bx + bw - 2, tailA.y, 4, tailB.y - tailA.y);
    } else {
      c.fillRect(bx - 2, tailA.y, 4, tailB.y - tailA.y);
    }

    c.fillStyle = '#000000';
    c.font = '13px "MS Sans Serif", Arial, sans-serif';
    lines.forEach((ln, i) => c.fillText(ln, bx + 14, by + 22 + i * lh));

    const sepY = by + lines.length * lh + 28;
    c.strokeStyle = '#cccc99';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(bx + 8, sepY); c.lineTo(bx + bw - 8, sepY); c.stroke();

    clippyDialogOptions.forEach((opt, i) => {
      const sel = i === clippyDialogSelected;
      const oy = sepY + 16 + i * 26;
      if (sel) {
        c.fillStyle = '#000080';
        c.fillRect(bx + 6, oy - 15, bw - 12, 20);
        c.fillStyle = '#ffffff';
        c.font = 'bold 13px "MS Sans Serif", Arial, sans-serif';
        c.fillText('\u25ba ' + opt, bx + 12, oy);
      } else {
        c.fillStyle = '#1a5cc8';
        c.beginPath();
        c.arc(bx + 18, oy - 5, 5, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#000000';
        c.font = '13px "MS Sans Serif", Arial, sans-serif';
        c.fillText(opt, bx + 30, oy);
      }
    });

    c.font = '10px "MS Sans Serif", Arial, sans-serif';
    c.fillStyle = '#999977';
    c.fillText('Arrow keys + Enter', bx + 10, by + bh - 7);
  }

  // ================================================================
  // DIFFICULTY
  // ================================================================
  function applyDifficulty(idx) { window._introDifficulty = idx; }

  function applyDifficultyToGs(gsRef) {
    const idx = window._introDifficulty !== undefined ? window._introDifficulty : 1;
    if (idx === 0) {
      gsRef.health = gsRef.maxHealth = 150; gsRef.maxAmmo = CFG.MAX_AMMO + 4; gsRef.ammo = gsRef.maxAmmo;
      gsRef._difficultyLabel = 'EASY'; gsRef._enemySpeedMult = 0.85; gsRef._enemyDmgMult = 0.7;
      gsRef._chipDropChanceMult = 1;
    } else if (idx === 2) {
      gsRef.health = gsRef.maxHealth = 70; gsRef.maxAmmo = Math.max(4, CFG.MAX_AMMO - 2); gsRef.ammo = gsRef.maxAmmo;
      gsRef._difficultyLabel = 'HARD'; gsRef._enemySpeedMult = 1.4; gsRef._enemyDmgMult = 1.5;
      gsRef._chipDropChanceMult = 2;
    } else {
      gsRef._difficultyLabel = 'NORMAL'; gsRef._enemySpeedMult = 1.1; gsRef._enemyDmgMult = 1;
      gsRef._chipDropChanceMult = 1;
    }
    if (tippyMode) {
      gsRef.wave = 10;
      gsRef.waveKills = 0;
      gsRef.waveEnemiesLeft = CFG.WAVE_ENEMIES_BASE + gsRef.wave * CFG.WAVE_ENEMIES_GROWTH;
      gsRef.spawnInterval = Math.max(55, CFG.SPAWN_INTERVAL_BASE - gsRef.wave * CFG.WAVE_SPAWN_SPEEDUP);
      tippyMode = false;
    }
  }

  function applyDraftItemsToGs(gsRef) {
    for (const id of draftChosenItems) {
      const item = ITEM_DEFS[id];
      if (!item || typeof item.effect !== 'function') continue;
      if (!gsRef.unlockedItems.includes(id)) gsRef.unlockedItems.push(id);
      item.effect(gsRef);
    }
    draftChosenItems = [];
  }

  function installPersistentDesktop() {
    if (!persistentDesktopInstalled) {
      persistentDesktopRedraw = renderPersistentDesktop;
      renderPersistentDesktop();
      persistentDesktop.hidden = false;
      document.body.classList.add('desktop-ready');
      persistentDesktopInstalled = true;
    }
    if (_introDone) attachDesktopClicks();
    else detachDesktopClicks();
  }

  // ================================================================
  // FINISH
  // ================================================================
  function finishIntro() {
    // Guard: only fire once even if called from multiple paths
    if (_introDone) return;
    _introDone = true;

    stage = 'DONE';
    detachKeys();
    detachDesktopClicks();
    stopAllMusic();
    installPersistentDesktop();
    if (gameWrapper) gameWrapper.style.opacity = '';
    gameWrapper = null;
    introEnemyPos = null;
    introPlayerPos = null;

    if (skippyMode) {
      if (overlayEl) { overlayEl.parentNode.removeChild(overlayEl); overlayEl = null; }
      container = null;
      bootInputEl = null;
      if (onDone) onDone();
      return;
    }

    let alpha = 0;
    const fadeInterval = setInterval(() => {
      alpha += 0.05;
      if (alpha >= 1) {
        clearInterval(fadeInterval);
        if (overlayEl) { overlayEl.parentNode.removeChild(overlayEl); overlayEl = null; }
        if (onDone) onDone();
      } else {
        const c = getCtx();
        if (c) { c.fillStyle = `rgba(0,0,0,${alpha})`; c.fillRect(0,0,960,600); }
      }
    }, 30);
  }

  function start(callback) {
    onDone = callback;
    _introDone = false;
    skippyMode = false;
    tippyMode = false;
    buildOverlay();
    setTimeout(() => startBIOS(), 200);
  }

  return { start, applyDifficultyToGs, applyDraftItemsToGs, spawnAntipieApp };
})();
