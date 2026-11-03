// ============================================================
// CLIPBLAST: PARTY HUNTER — Sound Effects
// ============================================================

const SFX = {
  _cache: {},
  _loops: {},
  _activeAudio: new Set(),
  _entityAudio: new Map(),
  _giftBoxAudio: new Map(),
  _decodedAudio: new Map(),
  _audioContext: null,
  _muted: false,

  load(key, src) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    this._cache[key] = audio;
  },

  setMuted(muted) {
    this._muted = Boolean(muted);
    if (!this._muted) return;

    for (const audio of this._activeAudio) {
      audio.pause();
      audio.currentTime = 0;
    }
    this._activeAudio.clear();

    for (const key of Object.keys(this._loops)) {
      const audio = this._cache[key];
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
      }
      delete this._loops[key];
    }

    for (const entry of this._entityAudio.values()) {
      entry.audio.pause();
      entry.audio.currentTime = 0;
    }

    for (const entry of this._giftBoxAudio.values()) {
      if (entry.source) {
        const source = entry.source;
        entry.source = null;
        source.stop();
        entry.gain?.disconnect();
        entry.gain = null;
      }
      entry.direction = null;
    }
  },

  play(key, volumeOverride, onStarted) {
    if (this._muted) return;
    const src = this._cache[key];
    if (!src) return;
    try {
      const clone = src.cloneNode();
      clone.volume = volumeOverride !== undefined ? volumeOverride : 0.6;
      if (key === 'partyExplosion') clone.playbackRate = 0.96 + Math.random() * 0.08;
      this._activeAudio.add(clone);
      clone.addEventListener('ended', () => this._activeAudio.delete(clone), { once: true });
      const playback = clone.play();
      const reportPauseFailure = error => {
        this._activeAudio.delete(clone);
        if (key === 'pause') console.warn('Unable to play pause sound.', error);
      };
      if (onStarted) playback.then(onStarted).catch(reportPauseFailure);
      else playback.catch(reportPauseFailure);
    } catch (error) {
      if (key === 'pause') console.warn('Unable to play pause sound.', error);
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
    if (entry) {
      entry.audio.pause();
      entry.audio.currentTime = 0;
      this._entityAudio.delete(soundId);
    }
    if (key === 'giftBoxWindUp') {
      const giftBoxEntry = this._giftBoxAudio.get(entityId);
      if (giftBoxEntry) {
        const source = giftBoxEntry.source;
        giftBoxEntry.source = null;
        source?.stop();
        giftBoxEntry.gain?.disconnect();
        this._giftBoxAudio.delete(entityId);
      }
    }
  },

  _getAudioContext() {
    if (this._audioContext) return this._audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio is unavailable; Gift Box wind-up sound cannot play in reverse.');
      return null;
    }
    this._audioContext = new AudioContextClass();
    return this._audioContext;
  },

  _getDecodedAudio(key, context) {
    if (this._decodedAudio.has(key)) return this._decodedAudio.get(key);
    const audio = this._cache[key];
    if (!audio) return Promise.resolve(null);
    const decoded = fetch(audio.src)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.arrayBuffer();
      })
      .then(data => context.decodeAudioData(data))
      .catch(error => {
        console.warn(`Unable to decode ${key} audio for reverse playback.`, error);
        return null;
      });
    this._decodedAudio.set(key, decoded);
    return decoded;
  },

  _startGiftBoxAudio(entry, buffer, direction, position) {
    if (entry.source) {
      const previousSource = entry.source;
      entry.source = null;
      previousSource.stop();
    }
    const context = this._audioContext;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const reverse = direction === 'reverse';
    const playbackBuffer = reverse ? entry.reversedBuffer : buffer;
    const offset = reverse ? buffer.duration - position : position;
    if (offset >= playbackBuffer.duration) {
      entry.direction = direction;
      entry.sourcePosition = position;
      return;
    }
    source.buffer = playbackBuffer;
    gain.gain.value = 0.7;
    source.connect(gain);
    gain.connect(context.destination);
    entry.source = source;
    entry.gain = gain;
    entry.direction = direction;
    entry.sourcePosition = position;
    entry.sourceStartedAt = context.currentTime;
    if (direction === 'forward') entry.hasPlayed = true;
    source.onended = () => {
      if (entry.source !== source) return;
      entry.source = null;
      entry.gain?.disconnect();
      entry.gain = null;
      if (entry.active && direction === 'forward') {
        this._startGiftBoxAudio(entry, buffer, 'forward', buffer.duration / 2);
      } else if (direction === 'reverse') {
        entry.direction = 'stopped';
        entry.sourcePosition = 0;
      }
    };
    source.start(0, offset);
  },

  _giftBoxAudioPosition(entry, context) {
    if (!entry.source) return entry.direction === 'reverse' ? 0 : entry.sourcePosition;
    const elapsed = context.currentTime - entry.sourceStartedAt;
    return entry.direction === 'reverse'
      ? Math.max(0, entry.sourcePosition - elapsed)
      : Math.min(entry.buffer.duration, entry.sourcePosition + elapsed);
  },

  syncGiftBoxWindUp(entityId, active) {
    let entry = this._giftBoxAudio.get(entityId);
    if (!entry) {
      if (!active) return;
      entry = { active: true, direction: null, source: null, gain: null, buffer: null, reversedBuffer: null };
      this._giftBoxAudio.set(entityId, entry);
    }
    entry.active = active;
    if (this._muted) {
      if (entry.source) {
        const source = entry.source;
        entry.source = null;
        source.stop();
        entry.gain?.disconnect();
        entry.gain = null;
      }
      entry.direction = null;
      return;
    }

    const context = this._getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') context.resume().catch(error => {
      console.warn('Unable to resume Gift Box audio context.', error);
    });
    if (entry.buffer) {
      const direction = active ? 'forward' : 'reverse';
      if (direction !== entry.direction) {
        const position = direction === 'forward'
          ? entry.buffer.duration / 2
          : this._giftBoxAudioPosition(entry, context);
        this._startGiftBoxAudio(entry, entry.buffer, direction, position);
      }
      return;
    }
    this._getDecodedAudio('giftBoxWindUp', context).then(buffer => {
      if (!buffer || this._giftBoxAudio.get(entityId) !== entry || entry.buffer) return;
      entry.buffer = buffer;
      entry.reversedBuffer = context.createBuffer(
        buffer.numberOfChannels,
        buffer.length,
        buffer.sampleRate
      );
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        entry.reversedBuffer.getChannelData(channel).set(
          buffer.getChannelData(channel).slice().reverse()
        );
      }
      const direction = entry.active ? 'forward' : 'reverse';
      if (direction === 'reverse' && !entry.hasPlayed) return;
      const position = direction === 'forward' ? buffer.duration / 2 : buffer.duration / 2;
      this._startGiftBoxAudio(entry, buffer, direction, position);
    });
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
      if (key === 'partyExplosion') clone.playbackRate = 0.96 + Math.random() * 0.08;
      this._activeAudio.add(clone);
      clone.addEventListener('ended', () => this._activeAudio.delete(clone), { once: true });
      clone.play().catch(() => this._activeAudio.delete(clone));
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
SFX.load('partyHatRecover',  'sounds/soundeffects/enemies/PartyHat/PartyHatRecover.mp3');
SFX.load('partyHatDie',      'sounds/soundeffects/enemies/PartyHat/PartyHatDie.mp3');
SFX.load('partyHatDrop',     'sounds/soundeffects/enemies/PartyHat/PartyHatDrop.mp3');
SFX.load('partyHatRide',     'sounds/soundeffects/enemies/PartyHat/PartyHatRide.mp3');
SFX.load('partyHatRide2',    'sounds/soundeffects/enemies/PartyHat/PartyHatRide2.mp3');
SFX.load('partyHatSpawn',    'sounds/soundeffects/enemies/PartyHat/PartyHatSpawn.mp3');

SFX.load('pause',            'sounds/soundeffects/UI/PauseSound.mp3');
SFX.load('EmailNotification','sounds/soundeffects/UI/Email/EmailNotification.mp3');
SFX.load('EmailAccept',      'sounds/soundeffects/UI/Email/EmailAccept.mp3');
SFX.load('EmailReject',      'sounds/soundeffects/UI/Email/EmailReject.mp3');
SFX.load('EmailOpen',        'sounds/soundeffects/UI/Email/EmailOpen.mp3');
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
