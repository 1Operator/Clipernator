// ============================================================
// CLIPBLAST: PARTY HUNTER — Sound Effects
// ============================================================

const SFX = {
  _cache: {},
  _loops: {},
  _entityAudio: new Map(),
  _muted: false,

  load(key, src) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    this._cache[key] = audio;
  },

  play(key, volumeOverride, onStarted) {
    if (this._muted) return;
    if (key === 'pause') {
      this.playPauseFallback();
      return;
    }
    const src = this._cache[key];
    if (!src) return;
    try {
      const clone = src.cloneNode();
      clone.volume = volumeOverride !== undefined ? volumeOverride : 0.6;
      const playback = clone.play();
      if (onStarted) playback.then(onStarted).catch(() => {});
      else playback.catch(() => {});
    } catch(e) {}
  },

  playPauseFallback() {
    if (this._muted) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(740, now);
      oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.13);
      oscillator.addEventListener('ended', () => context.close());
    } catch (error) {
      console.warn('Unable to play pause sound fallback.', error);
    }
  },

  syncEntitySound(key, entityId, active, volumeOverride) {
    const soundId = `${key}:${entityId}`;
    let entry = this._entityAudio.get(soundId);
    if (!active) {
      if (entry && !entry.audio.paused) entry.audio.pause();
      return;
    }
    if (this._muted || (entry && entry.finished)) return;
    if (!entry) {
      const src = this._cache[key];
      if (!src) return;
      const audio = src.cloneNode();
      entry = { audio, finished: false };
      this._entityAudio.set(soundId, entry);
      audio.addEventListener('ended', () => { entry.finished = true; });
    }
    entry.audio.volume = volumeOverride !== undefined ? volumeOverride : 0.6;
    if (entry.audio.paused) entry.audio.play().catch(() => {});
  },

  stopEntitySound(key, entityId) {
    const soundId = `${key}:${entityId}`;
    const entry = this._entityAudio.get(soundId);
    if (!entry) return;
    entry.audio.pause();
    entry.audio.currentTime = 0;
    this._entityAudio.delete(soundId);
  },

  playRandom(keys, volumeOverride) {
    const key = keys[Math.floor(Math.random() * keys.length)];
    this.play(key, volumeOverride);
  },

  setLoop(key, enabled, volumeOverride) {
    const audio = this._cache[key];
    if (!audio) return;
    if (!enabled) {
      if (this._loops[key]) {
        audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
        delete this._loops[key];
      }
      return;
    }
    if (this._muted) return;
    audio.volume = volumeOverride !== undefined ? volumeOverride : 0.6;
    if (this._loops[key]) return;
    audio.loop = true;
    audio.currentTime = 0;
    this._loops[key] = true;
    audio.play().catch(() => {
      audio.loop = false;
      delete this._loops[key];
    });
  },

  // THIS was outside the object before — now it's inside
  playAt(key, sourceX, sourceY, volumeOverride) {
    if (this._muted) return;
    const src = this._cache[key];
    if (!src) return;
    if (typeof gs === 'undefined' || !gs.playerId) { this.play(key, volumeOverride); return; }
    const ppos = ECS.get(gs.playerId, 'pos');
    if (!ppos) { this.play(key, volumeOverride); return; }
    const FALLOFF_START = 180;
    const FALLOFF_END   = 520;
    const dist = Math.hypot(sourceX - ppos.x, sourceY - ppos.y);
    if (dist > FALLOFF_END) return;
    const spatial = dist <= FALLOFF_START ? 1.0
      : 1.0 - ((dist - FALLOFF_START) / (FALLOFF_END - FALLOFF_START));
    const base = volumeOverride !== undefined ? volumeOverride : 0.6;
    try {
      const clone = src.cloneNode();
      clone.volume = Math.max(0, Math.min(1, base * spatial));
      clone.play().catch(() => {});
    } catch(e) {}
  },
};

SFX.load('normalHit1',       'sounds/soundeffects/bullets/NormalBulletHit.mp3');
SFX.load('normalHit2',       'sounds/soundeffects/bullets/NormalBulletHit.mp3');
SFX.load('hit2x',            'sounds/soundeffects/bullets/2xHit.mp3');
SFX.load('hit3x',            'sounds/soundeffects/bullets/3xHit.mp3');
SFX.load('hit4x',            'sounds/soundeffects/bullets/4xHit.mp3');
SFX.load('dudHit',           'sounds/soundeffects/bullets/DudHit.mp3');
SFX.load('tearHit',          'sounds/soundeffects/bullets/TearHit.mp3');
SFX.load('bouncyHit',        'sounds/soundeffects/bullets/BouncyBullet.mp3');
SFX.load('bowlingBallBounce','sounds/soundeffects/bullets/BowlingBallBounce.mp3');
SFX.load('bowlingBallHit',   'sounds/soundeffects/bullets/BowlingBallHit.mp3');

SFX.load('shoot1',           'sounds/soundeffects/player/Shoot1.mp3');
SFX.load('shoot2',           'sounds/soundeffects/player/Shoot2.mp3');
SFX.load('shoot3',           'sounds/soundeffects/player/Shoot3.mp3');
SFX.load('shoot4',           'sounds/soundeffects/player/Shoot4.mp3');
SFX.load('reloadStart1',     'sounds/soundeffects/player/ReloadStart1.mp3');
SFX.load('reloadStart2',     'sounds/soundeffects/player/ReloadStart2.mp3');
SFX.load('reloadStart3',     'sounds/soundeffects/player/ReloadStart3.mp3');
SFX.load('reloadFinish',     'sounds/soundeffects/player/ReloadFinish.mp3');
SFX.load('playerDamage',     'sounds/soundeffects/player/PlayerDamage.mp3');
SFX.load('clippySpeak',      'sounds/soundeffects/player/ClippySpeak.mp3');
SFX.load('clippyDamage',     'sounds/soundeffects/player/ClippyDamage.mp3');
SFX.load('clippyDeath',      'sounds/soundeffects/player/ClippyDeath.mp3');
SFX.load('notAllowed',       'sounds/soundeffects/player/NotAllowed.mp3');

SFX.load('utensilSpawn',     'sounds/soundeffects/enemies/Utensil/UtensilSpawn.mp3');
SFX.load('forkGrab',         'sounds/soundeffects/enemies/Utensil/Fork/ForkGrab.mp3');
SFX.load('forkGrab2',        'sounds/soundeffects/enemies/Utensil/Fork/ForkGrab2.mp3');
SFX.load('forkHit',          'sounds/soundeffects/enemies/Utensil/Fork/ForkHit.mp3');
SFX.load('forkAttack',       'sounds/soundeffects/enemies/Utensil/Fork/ForkAttack.mp3');
SFX.load('knifeAttack',      'sounds/soundeffects/enemies/Utensil/Knife/KnifeAttack.mp3');
SFX.load('utensilDeath',     'sounds/soundeffects/enemies/Utensil/UtensilDeath.mp3');
SFX.load('spoonDamage',      'sounds/soundeffects/enemies/Utensil/Spoon/SpoonDamage.mp3');
SFX.load('giftBoxWindUp',    'sounds/soundeffects/enemies/GiftBox/GiftBoxWindUp.mp3');
SFX.load('balloonSpawn',     'sounds/soundeffects/enemies/WaterBalloon/BalloonSpawn.mp3');

SFX.load('frostingLaunch',   'sounds/soundeffects/enemies/CakeBoss/FrostingLaunch.mp3');
SFX.load('frostingHit',      'sounds/soundeffects/enemies/CakeBoss/FrostingHit.mp3');
SFX.load('partyHatAttack',   'sounds/soundeffects/enemies/PartyHat/PartyHatAttack.mp3');
SFX.load('partyHatDie',      'sounds/soundeffects/enemies/PartyHat/PartyHatDie.mp3');
SFX.load('partyHatDrop',     'sounds/soundeffects/enemies/PartyHat/PartyHatDrop.mp3');
SFX.load('partyHatRide',     'sounds/soundeffects/enemies/PartyHat/PartyHatRide.mp3');
SFX.load('partyHatRide2',    'sounds/soundeffects/enemies/PartyHat/PartyHatRide2.mp3');
SFX.load('partyHatSpawn',    'sounds/soundeffects/enemies/PartyHat/PartyHatSpawn.mp3');

SFX.load('pause',            'sounds/soundeffects/misc/PauseSound.mp3');
SFX.load('partyExplosion',   'sounds/soundeffects/misc/Explosions/PartyExplosion.mp3');
SFX.load('waveComplete',     'sounds/soundeffects/misc/Waves/WaveComplete.mp3');
SFX.load('waveOverload',     'sounds/soundeffects/misc/Waves/WaveOverload.mp3');
SFX.load('omini',            'sounds/soundeffects/misc/OMINI.mp3');
SFX.load('candleLight',      'sounds/soundeffects/misc/CandleLight.mp3');
SFX.load('birthdayParty',    'sounds/soundeffects/items/BirthdayParty/BirthdayParty.mp3');
SFX.load('itemConfirm',      'sounds/soundeffects/items/ItemConfirm.mp3');
SFX.load('itemReveal',       'sounds/soundeffects/items/ItemReveal.mp3');

SFX.load('chippyClick',      'sounds/soundeffects/objects/Chippy/ChippyClick.mp3');
SFX.load('chippyFinish',     'sounds/soundeffects/objects/Chippy/ChippyFinish.mp3');
SFX.load('chippyUse',        'sounds/soundeffects/objects/Chippy/ChippyUse.mp3');
SFX.load('chipPickup',       'sounds/soundeffects/objects/Chips/ChipPickup.mp3');
SFX.load('goldenChipPickup', 'sounds/soundeffects/objects/Chips/GoldenChipPickup.mp3');
SFX.load('goldenChipTarget', 'sounds/soundeffects/objects/Chips/GoldenChipTarget.mp3');
SFX.load('relicAcquire',     'sounds/soundeffects/player/RelicAquire.mp3');
