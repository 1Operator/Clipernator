// ============================================================
// CLIPBLAST: PARTY HUNTER — Systems    
// ============================================================ 

let utensilWindowGroupSequence = 0;

const CLIPPY_PICKUP_TIPS = {
  birthday:        "It looks like everyone stopped moving! Enjoy the party while it lasts.",
  cookie:          "7 times the speed AND reload? I calculated that. It took me 0.3 seconds.",
  doubledCake:     "40% of your bullets are now completely useless. Statistically speaking, I'm helping.",
  tripleCake:      "3x damage! The bad news is 45% of your shots are duds. The good news is I'm not a dud.",
  quadCake:        "Coin flip. I hope you know what you're doing.",
  bouncy:          "Boing! Everything bounces now. Including the consequences of your decisions.",
  dash:            "It looks like you're in a hurry! SHIFT to dash. You'll thank me when there are 12 enemies.",
  shakeFizzlePop:  "Don't. Get. Hit. I have never been hit in my life. I am a paperclip.",
  flawlessBaking:  "It looks like you want more ammo! Simply don't take damage. Simple.",
  cursedCandles:   "You're killing me to get more bullets. Totally fine. I'm fine.",
  mirrorMaze:      "Shoot the diamond thing. It will redirect bullets at enemies... hopefully.",
  popcornBucket:   "Collect popcorn. From corpses. For a frenzy. This is normal.",
  ragingRings:     "It looks like your bullets keep missing! Now they orbit you instead. Problem solved.",
  tightropeBoots:  "200% speed boost. Try not to run into a wall... it hurts.",
  clownish:        "It looks like you grew a nose! It honks. Enemies (and me) find this deeply unsettling.",
  bowlingBall:     "STRIKE! The next shot is a giant bowling ball. It pierces. It bounces. It judges.",
  paperCuts:       "Damaged enemies now bleed 1 HP per second. Every cut counts.",
  extraClips:      "It looks like you needed more HP AND ammo! Full heal included. You're welcome.",
  clownishUpgrade: "Bigger honk. Wider waves. More confusion. I have no further comment.",
  popcornBowl:  "3 kernels instead of 5, and the frenzy lasts longer. Now THAT'S a deal.",
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { 
  
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]; 
  }
  return a;  
}

function spawnParticles(x, y, color, n = 8) {
  const MAX_PARTICLES = 250;
  const available = MAX_PARTICLES - gs.particles.length;
  if (available <= 0) return;
  n = Math.min(n, available);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4;
    gs.particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 28, maxLife: 28, color, size: 3 + Math.random()*4 });
  }
}

function spawnDashConfetti(x, y, angle) {
  const MAX_PARTICLES = 250;
  const available = MAX_PARTICLES - gs.particles.length;
  const colors = ['#ff69b4', '#ffdd00', '#00ff99', '#ff4444', '#aaddff', '#ffffff'];
  const count = Math.min(42, available);
  for (let i = 0; i < count; i++) {
    const a = angle + Math.PI + (Math.random() - 0.5) * 1.8;
    const speed = 3 + Math.random() * 7;
    const life = 38 + Math.floor(Math.random() * 16);
    const size = 3 + Math.random() * 4;
    gs.particles.push({
      x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
      life, maxLife: life, color: colors[i % colors.length], size,
      confetti: true, rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.35,
    });
  }
}

function spawnPartyParticles(x, y) {
  const MAX_PARTICLES = 250;
  const available = MAX_PARTICLES - gs.particles.length;
  if (available <= 0) return;
  const colors = ['#ff69b4','#ffdd00','#00ff66','#ff4444','#88aaff','#ffffff','#ffaa00','#ff88cc'];
  const n = Math.min(60, available);
  for (let i = 0; i < n; i++) {
    const a = Math.random()*Math.PI*2, sp = 2 + Math.random()*9;
    gs.particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp, life: 90, maxLife: 90, color: colors[i%colors.length], size: 4+Math.random()*7 });
  }
}

function angleDiff(a, b) {
  let diff = (a - b + Math.PI) % (Math.PI*2) - Math.PI;
  return Math.abs(diff);
}

function baseBulletDamage() {
  const cakeDamage = gs.hasQuadCake ? 4
    : gs.hasTripleCake ? 3
      : gs.hasDoubleCake ? 2
        : 1;
  return (1 + (gs.chipShopDamageBonus || 0))
    * cakeDamage
    * (gs.chipShopDamageMultiplier || 1);
}

function gunMuzzlePos() {
  const tipDist = 90 * 0.68;
  return { x: gunX + Math.cos(gunAngle)*tipDist, y: gunY + Math.sin(gunAngle)*tipDist };
}

function detonateExplosiveBullet(b, hitX, hitY, playerCredited = true) {
  const EXPLODE_RADIUS = 90;
  const EXPLODE_DMG    = (b.damageMult || 1) * 3;
  spawnPartyParticles(hitX, hitY);
  spawnParticles(hitX, hitY, '#00ff88', 20);
  spawnParticles(hitX, hitY, '#ffffff', 12);
  SFX.playAt('partyExplosion', hitX, hitY, 0.75);
  triggerGiftBoxChainReaction(hitX, hitY, EXPLODE_RADIUS);
  gs.shakeX = 18; gs.shakeY = 18;
  gs.glowExplosionX = hitX; gs.glowExplosionY = hitY; gs.glowExplosionTimer = 10;
  const toKill = [];
  for (const eid of ECS.query('enemy','pos','hp')) {
  const eai = ECS.get(eid,'ai');
  if (eai && eai.criticalMassImmune) continue;
    const epos = ECS.get(eid,'pos'), ehp = ECS.get(eid,'hp');
    if (Math.hypot(epos.x-hitX, epos.y-hitY) < EXPLODE_RADIUS) {
      ehp.hp -= EXPLODE_DMG; ehp.hitFlash = 14;
      spawnParticles(epos.x, epos.y, '#00ff88', 8);
      if (ehp.hp <= 0) toKill.push(eid);
    }
  }
 for (const eid of toKill) {
    if (!ECS.has(eid, 'pos')) continue;
    const epos = ECS.get(eid,'pos');
    const killedType = ECS.get(eid, 'enemy')?.type;  // read BEFORE destroy
    if (epos) spawnParticles(epos.x, epos.y, '#ff2222', 18);
    ECS.destroyEntity(eid);
    gs.waveKills++;
    if (playerCredited) {
      gs.score += Math.round(15 * gs.wave);
      tryDropTicket(epos.x, epos.y);
      gs.health = Math.min(gs.maxHealth, gs.health + CFG.HEALTH_REGEN);
      updateHUD();
    }
    if (killedType === 'cakeBoss' || killedType === 'boss2') handleBossDeath(eid);
  }
  if (toKill.length > 0) checkWave();
  b.life = 0;
}

function triggerSFPHit() {
  if (!gs.hasShakeFizzlePop) return;
  
  if (gs.sfpFull) {
    const ppos = ECS.get(gs.playerId,'pos');
    SFX.playAt('partyExplosion', ppos.x, ppos.y, 0.75);
    triggerGiftBoxChainReaction(ppos.x, ppos.y, CFG.SFP_EXPLOSION_RADIUS);
    const shockDmg = baseBulletDamage()*5;
    for (const id of ECS.query('enemy','pos','hp','vel')) {
      const epos=ECS.get(id,'pos'), ehp=ECS.get(id,'hp'), evel=ECS.get(id,'vel');
      const dx=epos.x-ppos.x, dy=epos.y-ppos.y, dist=Math.hypot(dx,dy);
      if (dist < CFG.SFP_EXPLOSION_RADIUS) {
        ehp.hp -= shockDmg; ehp.hitFlash = 16;
        const nd=dist>1?dist:1;
        evel.vx += (dx/nd)*12; evel.vy += (dy/nd)*12;
        spawnParticles(epos.x, epos.y, '#ff6600', 10);
        if (ehp.hp <= 0) {
          spawnParticles(epos.x, epos.y, '#ff2222', 18);
          ECS.destroyEntity(id);
          gs.score += Math.round(10*gs.wave); gs.waveKills++;
          tryDropTicket(epos.x, epos.y); gs.health=Math.min(gs.maxHealth,gs.health+CFG.HEALTH_REGEN); updateHUD();
        }
      }
    }
    spawnPartyParticles(ppos.x, ppos.y);
    showMsg('SHOCKWAVE RELEASE!!!');
    setTimeout(() => checkWave(), 0);
  }
  gs.sfpMeter = 0; gs.sfpFull = false;
}

function unlockGlowsticks() {
  if (gs.hasGlowsticks) return;
  gs.hasGlowsticks = true;
  gs.unlockedItems.push('glowsticks');
  SFX.play('itemConfirm', 0.65);
  SFX.play('relicAcquire', 0.65);
  showMsg('GLOWSTICKS UNLOCKED! [F] OR RIGHT-CLICK TO SWING & REFLECT — REFLECTED SHOTS EXPLODE!');
  updateHUD();
}

function swingGlowsticks() {
  if (!gs.hasGlowsticks) return;
  if (gs.glowCooldown > 0) {
    SFX.play('notAllowed', 0.65);
    return;
  }

  // Activate the melee window — cooldown only applied on miss
  meleeSwingTimer = CFG.MELEE_SWING_FRAMES;
  gs.meleeActiveTimer = CFG.MELEE_ACTIVE_FRAMES;
  gs.meleeDidReflect = false;
}

function tickMeleeWindow() {
  if (!gs.meleeActiveTimer || gs.meleeActiveTimer <= 0) return;
  gs.meleeActiveTimer--;

  const ppos = ECS.get(gs.playerId, 'pos');
  const meleeDmg = baseBulletDamage() * 3;

  // Box check: bullet must be within MELEE_RANGE AND in front of player (dot > 0.3)
  let didReflect = false;
  for (let i = gs.enemyBullets.length - 1; i >= 0; i--) {
    const eb = gs.enemyBullets[i];
    const dx = eb.x - ppos.x, dy = eb.y - ppos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CFG.MELEE_RANGE) continue;
    // Must be in front half (dot product with gun facing)
    const dot = (dx / dist) * Math.cos(gunAngle) + (dy / dist) * Math.sin(gunAngle);
    if (dot < 0.1) continue;

    // Reflect it
    const isArc = eb.isArcBall;
    if (isArc) {
      const targetX = mouse.x, targetY = mouse.y;
      const GRAVITY = 0.15;
      const horizDist = Math.hypot(targetX - eb.x, targetY - eb.y);
      const HANG_TIME = Math.max(25, Math.min(55, horizDist / 10));
      gs.bullets.push({
        x: eb.x, y: eb.y,
        vx: (targetX - eb.x) / HANG_TIME,
        vy: -HANG_TIME * GRAVITY * 0.5,
        vyHoriz: (targetY - eb.y) / HANG_TIME,
        gravity: GRAVITY,
        angle: Math.atan2(targetY - eb.y, targetX - eb.x),
        life: HANG_TIME + 30, maxLife: HANG_TIME + 30,
        damageMult: baseBulletDamage() * 2,
        isDud: false, isReflected: true, isExplosive: true,
        isArcBall: true, isMirrorArc: true,
        targetX, targetY,
        startX: eb.x, startY: eb.y,
        shadowX: eb.x, shadowY: targetY,
        sizeScale: eb.sizeScale || 1.0,
      });
    } else {
      const reflectAngle = Math.atan2(mouse.y - eb.y, mouse.x - eb.x);
      const reflectSpeed = Math.max(8, Math.hypot(eb.vx, eb.vy) * 2.0);
      gs.bullets.push({
        x: eb.x, y: eb.y,
        vx: Math.cos(reflectAngle) * reflectSpeed,
        vy: Math.sin(reflectAngle) * reflectSpeed,
        angle: reflectAngle,
        life: CFG.BULLET_LIFE + 20, maxLife: CFG.BULLET_LIFE + 20,
        damageMult: baseBulletDamage() * 2,
        isDud: false, isReflected: true, isExplosive: true,
      });
    }
    gs.enemyBullets.splice(i, 1);
    spawnParticles(eb.x, eb.y, '#00ff88', 8);
    didReflect = true;

  } // Reflect bowling balls back as explosive shots
  for (let bi = gs.bullets.length - 1; bi >= 0; bi--) {
    const b = gs.bullets[bi];
    if (!b.isBowlingBall) continue;
    const dx = b.x - ppos.x, dy = b.y - ppos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CFG.MELEE_RANGE) continue;
    const dot = (dx/dist)*Math.cos(gunAngle) + (dy/dist)*Math.sin(gunAngle);
    if (dot < 0.1) continue;
    // Redirect toward cursor as explosive
    const reflectAngle = Math.atan2(mouse.y - b.y, mouse.x - b.x);
    b.vx = Math.cos(reflectAngle) * 14;
    b.vy = Math.sin(reflectAngle) * 14;
    b.angle = reflectAngle;
    b.isExplosive = true;
    b.isReflected = true;
    b.bounces = 0; // reset bounces so it can keep going
    spawnParticles(b.x, b.y, '#00ff88', 12);
    showMsg('BOWLING BALL REDIRECTED!');
    didReflect = true;
  }
    // Reflect orbiting raging ring bullets
if (gs.hasRagingRings && gs.ragingRingBullets) {
  for (let ri = gs.ragingRingBullets.length - 1; ri >= 0; ri--) {
    const rb = gs.ragingRingBullets[ri];
    if (Math.hypot(rb.x - ppos.x, rb.y - ppos.y) > CFG.MELEE_RANGE) continue;
    const reflectAngle = Math.atan2(mouse.y - rb.y, mouse.x - rb.x);
    const reflectSpeed = CFG.BULLET_SPEED * 1.4;
    gs.bullets.push({
      x: rb.x, y: rb.y,
      vx: Math.cos(reflectAngle) * reflectSpeed,
      vy: Math.sin(reflectAngle) * reflectSpeed,
      angle: reflectAngle,
      life: CFG.BULLET_LIFE + 20, maxLife: CFG.BULLET_LIFE + 20,
      damageMult: rb.damageMult,
      isDud: false, isReflected: true, isExplosive: true,
    });
    gs.ragingRingBullets.splice(ri, 1);
    spawnParticles(rb.x, rb.y, '#aaaaff', 8);
    didReflect = true;
  }
}
  // Cannonball redirect (any state, not just CHARGING)
  for (const id of ECS.query('enemy', 'pos', 'hp', 'ai')) {
    const type = ECS.get(id, 'enemy').type;
    if (type !== 'cannonball') continue;
    const epos = ECS.get(id, 'pos'), eai = ECS.get(id, 'ai'), evel = ECS.get(id, 'vel');
    if (Math.hypot(epos.x - ppos.x, epos.y - ppos.y) > CFG.MELEE_RANGE + 10) continue;
    const chargeSpd = Math.max(14, Math.hypot(evel.vx, evel.vy));
    evel.vx = Math.cos(gunAngle) * chargeSpd;
    evel.vy = Math.sin(gunAngle) * chargeSpd;
    eai.chargeTarget = { x: epos.x + Math.cos(gunAngle) * 400, y: epos.y + Math.sin(gunAngle) * 400 };
    eai.chargeState = 'CHARGING';
    eai.reflectedByGlowstick = true;
    spawnParticles(epos.x, epos.y, '#00ff88', 18);
    gs.shakeX = 14; gs.shakeY = 14;
    showMsg('CANNONBALL REDIRECTED!');
    didReflect = true;
  }

  // Melee damage to enemies in front
  for (const id of ECS.query('enemy', 'pos', 'hp')) {
    const eai2 = ECS.get(id, 'ai'), type2 = ECS.get(id, 'enemy').type;
    if (type2 === 'cannonball' && eai2 && eai2.chargeState === 'CHARGING') continue;
    const epos = ECS.get(id, 'pos'), ehp = ECS.get(id, 'hp'), evel = ECS.get(id, 'vel');
    const dx = epos.x - ppos.x, dy = epos.y - ppos.y, dist = Math.hypot(dx, dy);
    if (dist >= CFG.MELEE_RANGE || dist < 5) continue;
    const dot = (dx/dist)*Math.cos(gunAngle) + (dy/dist)*Math.sin(gunAngle);
    if (dot < 0.1) continue;
    ehp.hp -= meleeDmg; ehp.hitFlash = 12;
    if (evel) { evel.vx += (dx / dist) * 7; evel.vy += (dy / dist) * 7; }
    spawnParticles(epos.x, epos.y, '#00ff88', 9);
    if (ehp.hp <= 0) {
        const type2 = ECS.get(id, 'enemy')?.type;
        if (type2 === 'cakeBoss' || type2 === 'boss2') handleBossDeath(id);
        spawnParticles(epos.x, epos.y, '#ff2222', 18);
        ECS.destroyEntity(id);
        gs.score += Math.round(15 * gs.wave); gs.waveKills++;
        tryDropTicket(epos.x, epos.y); gs.health = Math.min(gs.maxHealth, gs.health + CFG.HEALTH_REGEN);
        updateHUD(); checkWave();
      }
  }

  if (didReflect) {
    gs.meleeActiveTimer = 0; // end window immediately on reflect
    gs.glowCooldown = 0;     // no cooldown on success
    gs.explosionFreezeTimer = (gs.explosionFreezeTimer || 0) + 5;
    gs.shakeX = 6; gs.shakeY = 6;
    gs.meleeDidReflect = true;
  }

  // On window expiry with no reflect — apply cooldown
  if (gs.meleeActiveTimer === 0 && !gs.meleeDidReflect) {
    gs.glowCooldown = CFG.GLOW_COOLDOWN;
  }
}

function sysRagingRings() {
  if (!gs.hasRagingRings) return;
  const ppos = ECS.get(gs.playerId, 'pos');
  const ORBIT_RADIUS = 52;
  const ORBIT_SPEED = 0.055;
  const MAX_RINGS = 16;

  // Check if any active player bullets are touching the player — convert to orbit
  if (gs.ragingRingBullets.length < MAX_RINGS) {
    for (let i = gs.bullets.length - 1; i >= 0; i--) {
      if (gs.ragingRingBullets.length >= MAX_RINGS) break;
      const b = gs.bullets[i];
      if (b.life <= 0) continue;
      if (b.isOrbiting) continue;
      if (Math.hypot(b.x - ppos.x, b.y - ppos.y) < 28) {
        // Convert to orbiting bullet
        const angle = Math.atan2(b.y - ppos.y, b.x - ppos.x);
        gs.ragingRingBullets.push({
          angle,
          damageMult: (b.damageMult || 1) * 3,
          isDud: false,
        });
        gs.bullets.splice(i, 1);
        spawnParticles(ppos.x, ppos.y, '#aaaaff', 6);
      }
    }
  }

  // Tick orbiting bullets
  for (const rb of gs.ragingRingBullets) {
    rb.angle += ORBIT_SPEED;
    rb.x = ppos.x + Math.cos(rb.angle) * ORBIT_RADIUS;
    rb.y = ppos.y + Math.sin(rb.angle) * ORBIT_RADIUS;
  }

  // Check orbiting bullet collisions with enemies
  const toRemove = new Set();
  for (let ri = 0; ri < gs.ragingRingBullets.length; ri++) {
    const rb = gs.ragingRingBullets[ri];
    for (const eid of ECS.query('enemy', 'pos', 'hp')) {
      const eai = ECS.get(eid, 'ai');
      if (eai && eai.phased) continue;
      const epos = ECS.get(eid, 'pos'), ehp = ECS.get(eid, 'hp');
      if (Math.hypot(rb.x - epos.x, rb.y - epos.y) < 30) {
        if (rb.isDud) { toRemove.add(ri); break; }
        ehp.hp -= rb.damageMult; ehp.hitFlash = 12;
        spawnParticles(epos.x, epos.y, '#aaaaff', 6);
        toRemove.add(ri);
        if (ehp.hp <= 0) {
          spawnParticles(epos.x, epos.y, '#ff2222', 18);
          ECS.destroyEntity(eid);
          gs.score += Math.round(10 * gs.wave); gs.waveKills++;
          tryDropTicket(epos.x, epos.y); gs.health = Math.min(gs.maxHealth, gs.health + CFG.HEALTH_REGEN);
          updateHUD(); checkWave();
        }
        break;
      }
    }
  }
  gs.ragingRingBullets = gs.ragingRingBullets.filter((_, i) => !toRemove.has(i));
}

// ── Helper: try to fire a Mirror Maze ricochet from a kill position ──
function sysMirrorMaze() {
  if (!gs.hasMirrorMaze) return;
  const ppos = ECS.get(gs.playerId, 'pos');
  const ORBIT_R = 130;
  const REDIRECT_RANGE = 350;
  const SHARD_HIT_R = 14;
  const CHAIN_MAX = 10000; // Why does this exist lol
  const REGEN_FRAMES = 900;

  // ── Tick player shard regen ──
  if (gs.mirrorPlayerShardTimer > 0) {
    gs.mirrorPlayerShardTimer--;
    if (gs.mirrorPlayerShardTimer === 0) {
      gs.mirrorShards.push({ orbiting: true, angle: Math.random() * Math.PI * 2, x: 0, y: 0 });
      showMsg('MIRROR SHARD RESTORED!');
    }
  }

  // ── Update orbiting shard position ──
  for (const s of gs.mirrorShards) {
    if (s.orbiting) {
      s.angle += 0.018;
      s.x = ppos.x + Math.cos(s.angle) * ORBIT_R;
      s.y = ppos.y + Math.sin(s.angle) * ORBIT_R;
    }
  }

  // ── Two-pass: collect all bullet→shard hits this frame ──
  // Map: shardIndex → [bulletIndices]
  const shardHits = new Map(); // shardIdx -> array of bulletIdxs

  for (let bi = 0; bi < gs.bullets.length; bi++) {
    const b = gs.bullets[bi];
    if (b.life <= 0) continue;
    if ((b.chainDepth || 0) >= CHAIN_MAX) continue;

    for (let si = 0; si < gs.mirrorShards.length; si++) {
      const s = gs.mirrorShards[si];
      if (Math.hypot(b.x - s.x, b.y - s.y) > SHARD_HIT_R) continue;

      if (!shardHits.has(si)) shardHits.set(si, []);
      shardHits.get(si).push(bi);
      break; // one shard per bullet per frame is fine
    }
  }

  if (shardHits.size === 0) return;

  const shardsToRemove = new Set();
  const bulletsToKill = new Set();
  const bulletsToAdd = [];

  for (const [si, bulletIdxs] of shardHits) {
    if (shardsToRemove.has(si)) continue;
    const s = gs.mirrorShards[si];

    // Find redirect target (shared for all bullets hitting this shard)
    let targetX = null, targetY = null;

    // Priority 1: nearest other shard
    let nearestShardDist = 999999;
    for (let si2 = 0; si2 < gs.mirrorShards.length; si2++) {
      if (si2 === si || shardsToRemove.has(si2)) continue;
      const s2 = gs.mirrorShards[si2];
      const sd = Math.hypot(s2.x - s.x, s2.y - s.y);
      if (sd < REDIRECT_RANGE && sd < nearestShardDist) {
        nearestShardDist = sd;
        targetX = s2.x;
        targetY = s2.y;
      }
    }

    // Priority 2: nearest enemy
    if (targetX === null) {
      let nearestEnemyDist = 999999;
      for (const eid of ECS.query('enemy', 'pos')) {
        const epos = ECS.get(eid, 'pos');
        const ed = Math.hypot(epos.x - s.x, epos.y - s.y);
        if (ed < REDIRECT_RANGE && ed < nearestEnemyDist) {
          nearestEnemyDist = ed;
          targetX = epos.x;
          targetY = epos.y;
        }
      }
    }

// Only consume shard if we have somewhere to redirect
    if (targetX === null) continue;
    shardsToRemove.add(si);
    if (s.orbiting) gs.mirrorPlayerShardTimer = REGEN_FRAMES;
    spawnParticles(s.x, s.y, '#ccddff', 12);

    // Redirect ALL bullets that hit this shard
    for (const bi of bulletIdxs) {
      const b = gs.bullets[bi];
      bulletsToKill.add(bi);

      if (targetX !== null) {
        const dx = targetX - s.x, dy = targetY - s.y;
        const dist2 = Math.hypot(dx, dy) || 1;
     if (b.isArcBall && targetX !== null) {
  const GRAVITY = 0.15;
  const horizDist = Math.hypot(targetX - s.x, targetY - s.y);
  const HANG_TIME = Math.max(25, Math.min(55, horizDist / 10)); // 2.5x speed = half hang time
  bulletsToAdd.push({
    x: s.x, y: s.y,
    vx: (targetX - s.x) / HANG_TIME,
    vy: -HANG_TIME * GRAVITY * 0.5,
    vyHoriz: (targetY - s.y) / HANG_TIME,
    gravity: GRAVITY,
    angle: Math.atan2(targetY - s.y, targetX - s.x),
    life: HANG_TIME + 30, maxLife: HANG_TIME + 30,
    damageMult: (b.damageMult || 1) * 5.0,
    isDud: false, isExplosive: true,
    isArcBall: true, isMirrorRicochet: true,
    isMirrorArc: true, // flag for red color
    targetX, targetY,
    startX: s.x, startY: s.y,
    shadowX: s.x, shadowY: targetY,
    sizeScale: 1.2,
    chainDepth: (b.chainDepth || 0) + 1,
  });
} // ── Bowling ball hits shard: redirect + spawn second ball toward nearest enemy ──
if (b.isBowlingBall) {
  // Redirect the ball itself toward the target at 2x speed (decays back to base naturally via friction)
  const BOOSTED_SPEED = 14;
  bulletsToAdd.push({
    x: s.x, y: s.y,
    vx: (dx / dist2) * BOOSTED_SPEED,
    vy: (dy / dist2) * BOOSTED_SPEED,
    angle: Math.atan2(dy, dx),
    life: 220, maxLife: 220,
    damageMult: (b.damageMult || 1) * 2,
    isDud: false,
    isBowlingBall: true,
    bounces: 0,
    hitEnemies: new Set(),
    chainDepth: (b.chainDepth || 0) + 1,
    _mirrorBoosted: true,
  });
  // Also spawn a bonus ball toward nearest enemy
  let nearestEnemyX = null, nearestEnemyY = null, nearestDist = 999999;
  for (const eid of ECS.query('enemy', 'pos')) {
    const epos = ECS.get(eid, 'pos');
    const ed = Math.hypot(epos.x - s.x, epos.y - s.y);
    if (ed < nearestDist) { nearestDist = ed; nearestEnemyX = epos.x; nearestEnemyY = epos.y; }
  }
  if (nearestEnemyX !== null && Math.hypot(nearestEnemyX - targetX, nearestEnemyY - targetY) > 40) {
    const bdx = nearestEnemyX - s.x, bdy = nearestEnemyY - s.y, bd = Math.hypot(bdx, bdy) || 1;
    bulletsToAdd.push({
      x: s.x, y: s.y,
      vx: (bdx / bd) * 7, vy: (bdy / bd) * 7,
      angle: Math.atan2(bdy, bdx),
      life: 180, maxLife: 180,
      damageMult: (b.damageMult || 1) * 1.5,
      isDud: false,
      isBowlingBall: true,
      bounces: 0,
      hitEnemies: new Set(),
      chainDepth: (b.chainDepth || 0) + 1,
    });
    showMsg('SPARE!!!');
  } else {
    showMsg('MIRROR STRIKE!!!');
  }
  spawnParticles(s.x, s.y, '#aaaaaa', 12);
} else {
  bulletsToAdd.push({
    x: s.x, y: s.y,
    vx: (dx / dist2) * CFG.BULLET_SPEED * 2.5,
    vy: (dy / dist2) * CFG.BULLET_SPEED * 2.5,
    angle: Math.atan2(dy, dx),
    life: CFG.BULLET_LIFE + 30,
    maxLife: CFG.BULLET_LIFE + 30,
    damageMult: (b.damageMult || 1) * 5.0,
    isDud: false,
    isRedirected: true,
    chainDepth: (b.chainDepth || 0) + 1,
    isMirrorRicochet: true,
  });
}
      }
    }
    spawnParticles(s.x, s.y, '#8899ff', 8);
  }

  // Apply removals
  gs.mirrorShards = gs.mirrorShards.filter((_, i) => !shardsToRemove.has(i));
  for (const bi of bulletsToKill) gs.bullets[bi].life = 0;
  for (const nb of bulletsToAdd) gs.bullets.push(nb);
}

function _spawnMiniClown(x, y, gs) {
  const def = ENEMY_DEFS['miniClown'];
  const baseHp = 1 + Math.floor(gs.wave / 2);
  const id = ECS.createEntity();
  ECS.add(id, 'enemy', { type: 'miniClown' });
  ECS.add(id, 'pos', { x, y, angle: 0 });
  ECS.add(id, 'vel', { vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 });
  ECS.add(id, 'hp', { hp: Math.ceil(baseHp * def.hpMult), maxHp: Math.ceil(baseHp * def.hpMult), hitFlash: 0 });
  ECS.add(id, 'physics', { speed: CFG.MINI_CLOWN_SPEED });
  taskManagerApplySpawnNerf(id, 'miniClown');
  ECS.add(id, 'ai', { shootCooldown: 0, dashHit: false });
  spawnParticles(x, y, '#ff4400', 6);
}

function _clownCarExplode(id, pos, gs, playerDriving) {
  spawnPartyParticles(pos.x, pos.y);
  spawnParticles(pos.x, pos.y, '#ffdd00', 30);
  gs.shakeX = 24; gs.shakeY = 24;

  // Spawn a burst of mini clowns
  const count = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    _spawnMiniClown(pos.x + Math.cos(a) * 30, pos.y + Math.sin(a) * 30, gs);
  }

  // Damage nearby enemies
  const toKill = [];
  for (const eid of ECS.query('enemy', 'pos', 'hp')) {
    if (eid === id) continue;
    const epos = ECS.get(eid, 'pos'), ehp = ECS.get(eid, 'hp');
    if (Math.hypot(epos.x - pos.x, epos.y - pos.y) < 120) {
      ehp.hp -= baseBulletDamage() * 6; ehp.hitFlash = 14;
      if (ehp.hp <= 0) toKill.push({ eid, x: epos.x, y: epos.y });
    }
  }
  for (const { eid, x, y } of toKill) {
    if (!ECS.has(eid, 'pos')) continue;
    spawnParticles(x, y, '#ff2222', 14);
    ECS.destroyEntity(eid);
    gs.waveKills++;
    updateHUD();
  }

  // Damage player if not driving
  if (!playerDriving) {
    const ppos = ECS.get(gs.playerId, 'pos');
    if (ppos && Math.hypot(pos.x - ppos.x, pos.y - ppos.y) < 120 && gs.invincible <= 0) {
      applyPlayerDamage(25, id, null, true);
      gs.flawlessThisWave = false;
      triggerSFPHit(); updateHUD();
      if (gs.health <= 0) { gameOver(); return; }
    }
  }

  if (ECS.has(id, 'pos')) {
    ECS.destroyEntity(id);
    gs.waveKills++;
  }
  showMsg('CLOWN CAR EXPLODES! MINI CLOWNS EVERYWHERE!');
  setTimeout(() => checkWave(), 0);
}

function sysPlayerMovement() {


  if (gs.forkGrabbed) {
    let anyGrabbing = false;
    for (const id of ECS.query('enemy', 'ai')) {
      const ai2 = ECS.get(id, 'ai');
      if (ai2.uForkGrabTimer > 0) { anyGrabbing = true; break; }
    }
    if (!anyGrabbing) { gs.forkGrabbed = false; }
  }
  
  const pId=gs.playerId, pos=ECS.get(pId,'pos'), vel=ECS.get(pId,'vel');
  const dashing=gs.dashTimer>0, slowed=gs.confettiSlowTimer>0;
  gs.dashActiveThisFrame = false;
 let speedMult = 1;
if (gs.speedBoostTimer > 0) speedMult = gs.speedBoostMult || CFG.SPEED_BOOST_MULT;
if (gs.sfpFull) speedMult = Math.max(speedMult, 1.3);
if (gs.hasTightropeBoots) speedMult = Math.max(speedMult, 3.00);
const clipShopSpeed = gs.chipShopSpeedMultiplier || 1;
const baseSpeed = (CFG.PLAYER_SPEED + (gs.chipShopSpeedBonus || 0))
  * (slowed ? 0.45 : 1);
const topSpd = baseSpeed * speedMult * emailMoveMultiplier() * clipShopSpeed;
  if (dashing) {
  const easeInOut = progress => progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  if (gs.dashWindupTimer > 0) {
    const step = CFG.DASH_WINDUP_FRAMES - gs.dashWindupTimer + 1;
    const progress = step / CFG.DASH_WINDUP_FRAMES;
    const previousProgress = (step - 1) / CFG.DASH_WINDUP_FRAMES;
    const backstep = 11 * (easeInOut(progress) - easeInOut(previousProgress));
    vel.vx = -gs.dashVx * backstep;
    vel.vy = -gs.dashVy * backstep;
    gs.dashWindupTimer--;
  } else {
    const launchFrame = gs.dashLaunchFrame + 1;
    const progress = launchFrame / CFG.DASH_FRAMES;
    const previousProgress = (launchFrame - 1) / CFG.DASH_FRAMES;
    const distance = CFG.DASH_SPEED * CFG.DASH_FRAMES * 1.2;
    const stepDistance = distance * (easeInOut(progress) - easeInOut(previousProgress));
    vel.vx = gs.dashVx * stepDistance;
    vel.vy = gs.dashVy * stepDistance;
    gs.dashLaunchFrame = launchFrame;
    gs.dashActiveThisFrame = true;
    if (launchFrame === 1) {
      SFX.play('PartyPopperDash', 0.65);
      const angle = Math.atan2(gs.dashVy, gs.dashVx);
      gs.dashBurst = { x: pos.x, y: pos.y, angle, life: 10, maxLife: 10 };
      spawnDashConfetti(pos.x, pos.y, angle);
    }
  }
  gs.dashTimer--;
} else {
    let ix=0,iy=0;
    if (!gs.forkGrabbed) {
      if (keys[KEYBINDS.moveLeft]||keys['ArrowLeft'])  ix--;
      if (keys[KEYBINDS.moveRight]||keys['ArrowRight']) ix++;
      if (keys[KEYBINDS.moveUp]||keys['ArrowUp'])    iy--;
      if (keys[KEYBINDS.moveDown]||keys['ArrowDown']) iy++;
    }
    if (ix&&iy){ix*=0.707;iy*=0.707;}

    // ── Spoon knockback: bypass friction for a few frames ──
    if (gs.spoonKnockbackTimer > 0) {
      gs.spoonKnockbackTimer--;
      // Don't apply movement input friction — let the knockback carry through
      // but still allow the player to steer slightly
      if (ix||iy) { vel.vx+=ix*0.15*topSpd; vel.vy+=iy*0.15*topSpd; }
      // Minimal drag only
      vel.vx *= 0.96; vel.vy *= 0.96;
    } else {
      if (ix||iy){vel.vx+=ix*0.5*topSpd;vel.vy+=iy*0.5*topSpd;}
      else{vel.vx*=0.76;vel.vy*=0.76;}
      const spd=Math.hypot(vel.vx,vel.vy);
      if (spd>topSpd){vel.vx=vel.vx/spd*topSpd;vel.vy=vel.vy/spd*topSpd;}
    }
  }

  // near the top of sysPlayerMovement, after dashing block:
if (gs.knockingPinsActive) {
  // Skip all friction/cap logic — velocity is set directly by sysTimers each frame
  pos.x += vel.vx; pos.y += vel.vy;
  constrainAntipiePosition(pos, vel, 28);
  notifyEmailPlayerMoved(pos);
  if (gs.bouncyHouse) {
    if (pos.x < CFG.WALL_PAD) vel.vx = Math.abs(vel.vx);
    if (pos.x > worldW - CFG.WALL_PAD) vel.vx = -Math.abs(vel.vx);
    if (pos.y < CFG.WALL_PAD) vel.vy = Math.abs(vel.vy);
    if (pos.y > worldH - CFG.WALL_PAD) vel.vy = -Math.abs(vel.vy);
  }
  gunX = pos.x; gunY = pos.y; // keep gun synced during pin charge
  gunAngle = Math.atan2(vel.vy, vel.vx);
  tickClippyOutsideDamage(pos);
  return;
}
  pos.x+=vel.vx; pos.y+=vel.vy;
  constrainAntipiePosition(pos, vel, 28);
  notifyEmailPlayerMoved(pos);
  if (gs.bouncyHouse) {
    if (pos.x < CFG.WALL_PAD) vel.vx = Math.abs(vel.vx);
    if (pos.x > worldW - CFG.WALL_PAD) vel.vx = -Math.abs(vel.vx);
    if (pos.y < CFG.WALL_PAD) vel.vy = Math.abs(vel.vy);
    if (pos.y > worldH - CFG.WALL_PAD) vel.vy = -Math.abs(vel.vy);
  }
  tickClippyOutsideDamage(pos);
  const moveSpd=Math.hypot(vel.vx,vel.vy);
  if (moveSpd>0.5){playerMoveAngle=Math.atan2(vel.vy,vel.vx);}
  else{let da=gunAngle-playerMoveAngle;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;playerMoveAngle+=da*0.04;}
  if (moveSpd>0.5) playerBobTimer+=moveSpd*0.11; else playerBobTimer*=0.85;
  const MAX_HOLD_DIST=50, mdx=mouse.x-pos.x, mdy=mouse.y-pos.y;
  const mouseDist=Math.hypot(mdx,mdy)||1, holdDist=Math.min(mouseDist,MAX_HOLD_DIST);
  gunX+=(pos.x+(mdx/mouseDist)*holdDist-gunX)*0.18;
  gunY+=(pos.y+(mdy/mouseDist)*holdDist-gunY)*0.18;
  gunAngle=Math.atan2(mouse.y-gunY,mouse.x-gunX);
  let da=Math.atan2(mouse.y-pos.y,mouse.x-pos.x)-gunAngle;
  while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
  gunAngle+=da*0.25;
  if (gs.heldGiftBox!==null){
    if (!ECS.has(gs.heldGiftBox,'pos')){gs.heldGiftBox=null;}
    else{const hbpos=ECS.get(gs.heldGiftBox,'pos'),ppos=ECS.get(gs.playerId,'pos');hbpos.x=ppos.x+Math.cos(gunAngle)*36;hbpos.y=ppos.y+Math.sin(gunAngle)*36;}
  }
}

function tickClippyOutsideDamage(pos) {
  const outside = pos.x < 0 || pos.x > worldW || pos.y < 0 || pos.y > worldH;
  if (!outside) {
    gs.clippyOutsideTimer = 0;
    return;
  }

  gs.clippyOutsideTimer++;
  if (gs.clippyOutsideTimer < 60) return;
  gs.clippyOutsideTimer = 0;
  applyPlayerDamage(3);
  gs.flawlessThisWave = false;
  updateHUD();
  if (gs.health <= 0) gameOver();
}

function sysConfusedEnemyCollision() {
const confusedIds = [...ECS.query('enemy', 'pos', 'hp', 'ai')].filter(id => {
    const ai = ECS.get(id, 'ai');
    return ai && ai.confused;
  });
  if (confusedIds.length < 2) return;

  const toKill = [];
  for (let i = 0; i < confusedIds.length; i++) {
    for (let j = i + 1; j < confusedIds.length; j++) {
      const idA = confusedIds[i], idB = confusedIds[j];
      if (!ECS.has(idA, 'pos') || !ECS.has(idB, 'pos')) continue;
      const posA = ECS.get(idA, 'pos'), posB = ECS.get(idB, 'pos');
      if (Math.hypot(posA.x - posB.x, posA.y - posB.y) < 28) {
        const hpA = ECS.get(idA, 'hp'), hpB = ECS.get(idB, 'hp');
        hpA.hp -= 8; hpA.hitFlash = 10;
        hpB.hp -= 8; hpB.hitFlash = 10;
        spawnParticles((posA.x+posB.x)/2, (posA.y+posB.y)/2, '#4488ff', 8);
        if (hpA.hp <= 0) toKill.push({ id: idA, x: posA.x, y: posA.y });
        if (hpB.hp <= 0) toKill.push({ id: idB, x: posB.x, y: posB.y });
      }
    }
  }
  for (const { id, x, y } of toKill) {
    if (!ECS.has(id, 'pos')) continue;
    spawnParticles(x, y, '#ff2222', 14);
    ECS.destroyEntity(id);
    gs.waveKills++;
    updateHUD();
  }
  if (toKill.length > 0) setTimeout(() => checkWave(), 0);
}
     
function tickCorEnemy(id, type) {
  const pos = ECS.get(id, 'pos');
  const vel = ECS.get(id, 'vel');
  const ai = ECS.get(id, 'ai');
  const target = ECS.get(gs.playerId, 'pos');
  if (!pos || !vel || !ai || !target) return;
  if (gs.frozen) {
    vel.vx = 0;
    vel.vy = 0;
    return;
  }

  ai.corParticles = (ai.corParticles || []).filter((fragment) => {
    fragment.x += fragment.vx;
    fragment.y += fragment.vy;
    fragment.vx *= 0.94;
    fragment.vy *= 0.94;
    fragment.life--;
    return fragment.life > 0;
  });

  if (type === 'corRed') {
    ai.corStateTimer--;
    if (ai.corState === 'warning') {
      ai.corWhiteFlash = ai.corStateTimer <= 18 && Math.floor(ai.corStateTimer / 3) % 2 === 0;
      if (ai.corStateTimer <= 0) {
        const dx = target.x - pos.x, dy = target.y - pos.y;
        const distance = Math.hypot(dx, dy) || 1;
        ai.corDirX = dx / distance;
        ai.corDirY = dy / distance;
        ai.corAngle = Math.atan2(dy, dx);
        ai.corState = 'dash';
        ai.corStateTimer = 29;
        ai.corDashFrame = 0;
        ai.corWhiteFlash = false;
        SFX.playAt('RedCORDash', pos.x, pos.y, 0.65);
      }
    } else if (ai.corState === 'dash') {
      ai.corDashFrame++;
      const speed = ai.corDashFrame <= 18 ? 13 : 13 * Math.max(0, (29 - ai.corDashFrame) / 11);
      vel.vx = ai.corDirX * speed;
      vel.vy = ai.corDirY * speed;
      const movementScale = taskManagerMovementMultiplier(type);
      pos.x += vel.vx * movementScale;
      pos.y += vel.vy * movementScale;
      if (ai.corDashFrame % 2 === 0) {
        ai.corTrail.push({
          x: pos.x,
          y: pos.y,
          life: 16,
          maxLife: 16,
          angle: ai.corAngle,
          scaleX: 1.25,
          scaleY: 0.8,
        });
      }
      if (ai.corDashFrame % 3 === 0) {
        spawnParticles(pos.x, pos.y, Math.random() < 0.5 ? '#ff3355' : '#22ddff', 2);
      }
      if (ai.corStateTimer <= 0) {
        ai.corState = 'stop';
        ai.corStateTimer = 8;
        vel.vx = 0;
        vel.vy = 0;
      }
    } else if (ai.corState === 'stop') {
      vel.vx = 0;
      vel.vy = 0;
      if (ai.corStateTimer <= 0) {
        ai.corState = 'shake';
        ai.corStateTimer = 30;
      }
    } else if (ai.corState === 'shake') {
      vel.vx = 0;
      vel.vy = 0;
      if (ai.corStateTimer <= 0) {
        despawnCor(id, pos, '#ff3355');
        return;
      }
    }

    ai.corTrail = ai.corTrail.filter((fragment) => {
      fragment.life--;
      return fragment.life > 0;
    });
    return;
  }

  if (ai.corState === 'hover') {
    ai.corStateTimer--;
    ai.corHoverTime++;
    const movementScale = taskManagerMovementMultiplier(type);
    pos.x = ai.corOriginX + Math.sin(ai.corHoverTime * 0.07) * 12 * movementScale;
    pos.y = ai.corOriginY + Math.sin(ai.corHoverTime * 0.11) * 8 * movementScale;
    if (ai.corStateTimer <= 0) {
      ai.corState = 'shoot';
      ai.corShotTimer = 1;
    }
  }

  if (ai.corState === 'shoot') {
    ai.corShotTimer--;
    if (ai.corShotTimer <= 0 && ai.corShotsFired < 5) {
      const dx = target.x - pos.x, dy = target.y - pos.y;
      const angle = Math.atan2(dy, dx);
      gs.enemyBullets.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * 4.2,
        vy: Math.sin(angle) * 4.2,
        life: 150,
        maxLife: 150,
        color: '#22ddff',
        isCorClone: true,
      });
      SFX.playAt('BlueCORShoot', pos.x, pos.y, 0.55);
      ai.corShotsFired++;
      ai.corStretchTimer = 10;
      ai.corShotTimer = 26;
      spawnParticles(pos.x, pos.y, '#22ddff', 5);
      if (ai.corShotsFired === 5) {
        ai.corState = 'spin';
        ai.corStateTimer = 42;
      }
    }
  }

  if (ai.corState === 'spin') {
    ai.corStateTimer--;
    ai.corSpinAngle += 0.35;
    if (ai.corStateTimer <= 0) {
      despawnCor(id, pos, '#22ddff');
      return;
    }
  }

  if (ai.corStretchTimer > 0) ai.corStretchTimer--;
  vel.vx = 0;
  vel.vy = 0;
}

function spawnCorSpriteFragments(pos, sprite, count) {
  const width = sprite.naturalWidth || 1200;
  const height = sprite.naturalHeight || 896;
  const fragments = [];
  for (let i = 0; i < count; i++) {
    const sw = 80 + Math.random() * 100;
    const sh = 60 + Math.random() * 80;
    fragments.push({
      sx: Math.random() * Math.max(0, width - sw),
      sy: Math.random() * Math.max(0, height - sh),
      sw,
      sh,
      x: pos.x,
      y: pos.y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      life: 28 + Math.floor(Math.random() * 10),
      maxLife: 38,
      size: 12 + Math.random() * 10,
      angle: Math.random() * Math.PI * 2,
    });
  }
  return fragments;
}

function despawnCor(id, pos, color) {
  if (!ECS.has(id, 'enemy')) return;
  const type = ECS.get(id, 'enemy').type;
  SFX.playAt(type === 'corRed' ? 'RedCORVanish' : 'BlueCORVanish', pos.x, pos.y, 0.65);
  spawnParticles(pos.x, pos.y, color, 12);
  ECS.destroyEntity(id);
  gs.waveKills++;
  setTimeout(() => checkWave(), 0);
}

function sysAI() {
  gs.frozen=gs.partyFreezeTimer>0;

  // ── Clean up juggled flags for any enemy whose juggler has died ──
  for (const id of ECS.query('enemy','ai')) {
    if (!ECS.has(id, 'enemy')) continue;
    const ai2 = ECS.get(id,'ai');
    if (ai2.juggled && ai2.juggledBy !== undefined) {
      if (!ECS.has(ai2.juggledBy, 'pos')) {
        // Juggler is gone — free this enemy
        ai2.juggled = false;
        ai2.juggledBy = null;
        // Restore normal physics so the enemy can move again
        const evel = ECS.get(id,'vel');
        if (evel) { evel.vx = (Math.random()-.5)*2; evel.vy = (Math.random()-.5)*2; }
      }
    }
  }

 

for (const id of [...ECS.query('enemy','pos','vel','ai','physics')]) {

     // Guard: entity may have been destroyed mid-iteration
    if (!ECS.has(id, 'enemy') || !ECS.has(id, 'pos')) continue;

    
    const ai2=ECS.get(id,'ai');
// Thrown enemies need full position updates — skip only the BT tick, not movement
   // Thrown enemies: skip BT entirely, just let velocity carry them
    if (ai2 && ai2.thrownByFork) {
      const hp2 = ECS.get(id,'hp'); if (hp2 && hp2.hitFlash > 0) hp2.hitFlash--;
      const pos2 = ECS.get(id,'pos'), vel2 = ECS.get(id,'vel');
      if (pos2 && vel2) {
        // Decay velocity slightly so it doesn't go forever, but keep most speed
        vel2.vx *= 0.97; vel2.vy *= 0.97;
        const movementScale = taskManagerMovementMultiplier(ECS.get(id, 'enemy')?.type);
        pos2.x += vel2.vx * movementScale;
        pos2.y += vel2.vy * movementScale;
      }
      ai2.forkThrowTimer--;
      if (ai2.forkThrowTimer <= 0) { ai2.thrownByFork = false; }
      continue; // skip BT and normal position update
    }

   if (ai2 && ai2.juggled && !ai2.thrownByFork) {
      const type=enemyType;
      if (type==='waterballoon') {
        const pos2=ECS.get(id,'pos'),pp2=playerPos(gs);
        if (pp2) {
          ai2.shootCooldown=(ai2.shootCooldown||120)-1;
          if (ai2.shootCooldown<=0) {
            ai2.shootCooldown=90;
            const aim=Math.atan2(pp2.y-pos2.y,pp2.x-pos2.x);
            gs.enemyBullets.push({x:pos2.x,y:pos2.y,vx:Math.cos(aim)*0.5,vy:Math.sin(aim)*0.5,life:140,maxLife:140,color:'#44aaff',isTear:true,curveRate:0.0035});
          }
        }
      }
      const hp2=ECS.get(id,'hp'); if (hp2&&hp2.hitFlash>0) hp2.hitFlash--;
      continue;
    }
   const type=ECS.get(id,'enemy').type;
   if (type === 'corRed' || type === 'corBlue') {
     tickCorEnemy(id, type);
     continue;
   }
const bt=ENEMY_BTS[type];
if (bt) {
if (ai2 && ai2.confused) {
        const prevCount = gs.enemyBullets.length;
        // Only tick BT to capture any bullets it would fire (we'll redirect them)
        // but first zero velocity so BT movement doesn't override confused movement
        const velRef = ECS.get(id, 'vel');
        const savedVx = velRef ? velRef.vx : 0;
        const savedVy = velRef ? velRef.vy : 0;
        bt.tick(id, gs);
        // Restore vel — confused movement block below will set it properly
        if (velRef) { velRef.vx = savedVx; velRef.vy = savedVy; }
    if (gs.enemyBullets.length > prevCount) {
      const cpos = ECS.get(id, 'pos');
      let nearestPos = null, nearestDist = 999999;
      for (const oid of ECS.query('enemy', 'pos')) {
        if (oid === id) continue;
        const op = ECS.get(oid, 'pos');
        const od = Math.hypot(op.x - cpos.x, op.y - cpos.y);
        if (od < nearestDist) { nearestDist = od; nearestPos = op; }
      }

      const newBullets = gs.enemyBullets.splice(prevCount);
for (const nb of newBullets) {
  if (!nearestPos) continue;
  if (nb.isArcBall) {
    // Re-aim arc ball toward nearest enemy
    const GRAVITY = nb.gravity || 0.15;
    const horizDist = Math.hypot(nearestPos.x - nb.x, nearestPos.y - nb.y);
    const HANG_TIME = Math.max(40, Math.min(110, horizDist / 5));
    gs.bullets.push({
      x: nb.x, y: nb.y,
      vx: (nearestPos.x - nb.x) / HANG_TIME,
      vy: -HANG_TIME * GRAVITY * 0.5,
      vyHoriz: (nearestPos.y - nb.y) / HANG_TIME,
      gravity: GRAVITY,
      angle: Math.atan2(nearestPos.y - nb.y, nearestPos.x - nb.x),
      life: HANG_TIME + 30, maxLife: HANG_TIME + 30,
      damageMult: 3, isDud: false,
      isArcBall: true, isMirrorArc: false,
      targetX: nearestPos.x, targetY: nearestPos.y,
      startX: nb.x, startY: nb.y,
      shadowX: nb.x, shadowY: nearestPos.y,
      sizeScale: nb.sizeScale || 1.0,
    });
    continue;
  }
  const dx = nearestPos.x - nb.x, dy = nearestPos.y - nb.y;
  const dist = Math.hypot(dx, dy) || 1;
  const spd = Math.hypot(nb.vx, nb.vy) || CFG.BULLET_SPEED * 0.7;
  gs.bullets.push({
    x: nb.x, y: nb.y,
    vx: (dx / dist) * spd, vy: (dy / dist) * spd,
    angle: Math.atan2(dy, dx),
    life: nb.life || CFG.BULLET_LIFE + 10,
    maxLife: nb.maxLife || CFG.BULLET_LIFE + 10,
    damageMult: 3, isDud: false,
  });
}
    }
  } else {
    bt.tick(id, gs);
  }
}
    // Skip position update for player-driven car (sysTimers handles it)
if (type === 'clownCar' && gs.drivingCar === id) continue;
   if (!ECS.has(id,'pos')||!ECS.has(id,'vel')) continue;
    const pos=ECS.get(id,'pos'),vel=ECS.get(id,'vel');
    // Attached clowns update their own position inside BT_MINI_CLOWN — skip the sysAI position update
    if (type === 'miniClown' && ai2 && ai2.clownState === 'ATTACHED') {
      const hp2 = ECS.get(id,'hp'); if (hp2 && hp2.hitFlash > 0) hp2.hitFlash--;
      continue;
    }

if (ai2&&ai2.reflectedByGlowstick&&ECS.has(id,'enemy')&&ECS.get(id,'enemy').type==='cannonball') {
      const hitWall=pos.x<30||pos.x>worldW-30||pos.y<30||pos.y>worldH-30;
      let hitEnemy=false;
      for (const oid of ECS.query('enemy','pos')) {
        if (oid===id) continue;
        if (Math.hypot(ECS.get(oid,'pos').x-pos.x,ECS.get(oid,'pos').y-pos.y)<40){hitEnemy=true;break;}
      }
      if (hitWall||hitEnemy) {
        detonateExplosiveBullet({damageMult:baseBulletDamage()*4,life:1,isExplosive:true},pos.x,pos.y);
        spawnParticles(pos.x,pos.y,'#ff4400',30); gs.shakeX=22;gs.shakeY=22;
        showMsg('CANNONBALL EXPLODES!!!');
        ECS.destroyEntity(id); gs.score+=Math.round(25*gs.wave); gs.waveKills++;
        tryDropTicket(pos.x, pos.y); updateHUD(); checkWave(); continue;
      }
    }

    const movementScale = taskManagerMovementMultiplier(type);
    pos.x += vel.vx * movementScale;
    pos.y += vel.vy * movementScale;
    if (ai2?.antipieBoss) constrainAntipiePosition(pos, vel, 170, true);
    if (gs.bouncyHouse) {
      if (pos.x<18){pos.x=18;vel.vx=Math.abs(vel.vx);spawnParticles(pos.x,pos.y,'#88ffdd',4);}
      if (pos.x>worldW-18){pos.x=worldW-18;vel.vx=-Math.abs(vel.vx);spawnParticles(pos.x,pos.y,'#88ffdd',4);}
      if (pos.y<18){pos.y=18;vel.vy=Math.abs(vel.vy);spawnParticles(pos.x,pos.y,'#88ffdd',4);}
      if (pos.y>worldH-18){pos.y=worldH-18;vel.vy=-Math.abs(vel.vy);spawnParticles(pos.x,pos.y,'#88ffdd',4);}
    } else {
      const pp=ECS.get(gs.playerId,'pos');
      if (pp) pos.angle=Math.atan2(pp.y-pos.y,pp.x-pos.x);
    }
    const hp=ECS.get(id,'hp'); if (hp&&hp.hitFlash>0) hp.hitFlash--;
    const phy2=ECS.get(id,'physics');
    if (ai2&&phy2) {
      // Confused enemies chase and shoot nearest enemy
      if (ai2.confused) {
        ai2.confuseTimer--;
        if (ai2.confuseTimer<=0) { ai2.confused=false; ai2.confuseColor=null; }
        else {
          ai2.confuseColor='#4488ff';
          let nearEnemy=null,nearD=999999;
          for (const oid of ECS.query('enemy','pos')) {
            if (oid===id) continue;
            const od=Math.hypot(ECS.get(oid,'pos').x-pos.x,ECS.get(oid,'pos').y-pos.y);
            if (od<nearD){nearD=od;nearEnemy={pos:ECS.get(oid,'pos'),id:oid};}
          }
          if (nearEnemy) {
  const cdx=nearEnemy.pos.x-pos.x,cdy=nearEnemy.pos.y-pos.y,cd=Math.hypot(cdx,cdy)||1;
  vel.vx=(vel.vx||0)*0.88+(cdx/cd)*phy2.speed*0.22;
  vel.vy=(vel.vy||0)*0.88+(cdy/cd)*phy2.speed*0.22;
  // Contact damage to nearest enemy
  if (cd < 28 && ECS.has(nearEnemy.id, 'hp')) {
    const nehp = ECS.get(nearEnemy.id, 'hp');
    nehp.hp -= 3; nehp.hitFlash = 10;
    spawnParticles(nearEnemy.pos.x, nearEnemy.pos.y, '#4488ff', 5);
    if (nehp.hp <= 0) {
      spawnParticles(nearEnemy.pos.x, nearEnemy.pos.y, '#ff2222', 14);
      ECS.destroyEntity(nearEnemy.id);
      gs.waveKills++;
      setTimeout(() => checkWave(), 0);
    }
  }
} else {
  // No other enemies — wander slowly, ignore player
  if (!ai2._confuseWanderAngle) ai2._confuseWanderAngle = Math.random() * Math.PI * 2;
  if (!ai2._confuseWanderTimer) ai2._confuseWanderTimer = 0;
  ai2._confuseWanderTimer--;
  if (ai2._confuseWanderTimer <= 0) {
    ai2._confuseWanderAngle = Math.random() * Math.PI * 2;
    ai2._confuseWanderTimer = 60 + Math.floor(Math.random() * 60);
  }
  vel.vx = (vel.vx||0)*0.88 + Math.cos(ai2._confuseWanderAngle)*phy2.speed*0.12;
  vel.vy = (vel.vy||0)*0.88 + Math.sin(ai2._confuseWanderAngle)*phy2.speed*0.12;
}
        }
      }
       // ── Clown rider buffs ──
    if (ai2.clownRiders && ai2.clownRiders > 0) {
      const stackCount = ai2.clownRiders;
      // Speed boost: +20% per clown, stacking
      phy2._clownBaseSpeed = phy2._clownBaseSpeed || phy2.speed;
      const targetSpeed = phy2._clownBaseSpeed * (1 + stackCount * 0.20);
      phy2.speed = Math.min(targetSpeed, phy2._clownBaseSpeed * 2.5); // cap at 2.5x
      // Attack cooldown reduction: stored on ai for BTs to read
      ai2.clownCooldownMult = Math.max(0.35, 1.0 - stackCount * 0.18);
    } else {
      // No clowns — restore base speed if it was boosted
      if (phy2._clownBaseSpeed) {
        phy2.speed = phy2._clownBaseSpeed;
        delete phy2._clownBaseSpeed;
      }
      ai2.clownCooldownMult = 1.0;
    }
    // Reset rider count each tick — BT_MINI_CLOWN re-increments it each frame for attached clowns.
    // Only reset if this entity is not a miniClown itself (clowns don't have riders).
    if (ECS.get(id, 'enemy').type !== 'miniClown') ai2.clownRiders = 0;
    }
   
      if (ai2.ringmasterBuffed) {
        ai2.ringmasterBuffTimer=(ai2.ringmasterBuffTimer||0)-1;
        phy2._baseSpeed=phy2._baseSpeed||phy2.speed;
        phy2.speed=phy2._baseSpeed*1.4;
        if (ai2.ringmasterBuffTimer<=0){ai2.ringmasterBuffed=false;phy2.speed=phy2._baseSpeed;}
      } else if (phy2._baseSpeed) { phy2.speed=phy2._baseSpeed; }
    }
  

  // Paper Cuts
  if (gs.hasPaperCuts) {
    gs.paperCutsTimer=(gs.paperCutsTimer||0)+1;
    if (gs.paperCutsTimer>=60) {
      gs.paperCutsTimer=0;
      for (const id of ECS.query('enemy','hp')) {
        const ehp=ECS.get(id,'hp');
        if (ehp.hp<ehp.maxHp) {
          ehp.hp-=1; ehp.hitFlash=4;
          if (ehp.hp<=0) {
            const epos=ECS.get(id,'pos'); if (epos) spawnParticles(epos.x,epos.y,'#ff2222',10);
            ECS.destroyEntity(id); gs.waveKills++;
            gs.score += Math.round(10 * gs.wave);
            if (epos) tryDropTicket(epos.x, epos.y);
            gs.health = Math.min(gs.maxHealth, gs.health + CFG.HEALTH_REGEN);
            updateHUD(); checkWave();
          }
        }
      }
    }
  }
}

function sysBullets() {
  gs.bullets=gs.bullets.filter(b=>{
  
b.x += b.vx; b.y += b.vy; b.life--;
if (b.isArcBall) {
  b.vy += b.gravity;
  b.y  += b.vyHoriz;
  b.shadowX = b.x;
  // Impact: when remaining life drops below the buffer or close to target
  if (b.life < 30 || Math.hypot(b.x - b.targetX, b.y - b.targetY) < 28) {
    if (b.isExplosive) {
      detonateExplosiveBullet(b, b.x, b.y);
    }
    b.life = 0;
    spawnParticles(b.x, b.y, '#00ff88', 20);
    gs.shakeX = 14; gs.shakeY = 14;
    return false; // filtered out below
  }
}    // ── Bowling ball: always bounces, pierces, explodes on expiry ──
if (b.isBowlingBall) {
  let bounced = false;
  if (!b.travelsOffscreen) {
    if (b.x <= 18)         { b.x = 18;          b.vx =  Math.abs(b.vx); bounced = true; }
    if (b.x >= worldW - 18){ b.x = worldW - 18; b.vx = -Math.abs(b.vx); bounced = true; }
    if (b.y <= 18)         { b.y = 18;           b.vy =  Math.abs(b.vy); bounced = true; }
    if (b.y >= worldH - 18){ b.y = worldH - 18;  b.vy = -Math.abs(b.vy); bounced = true; }
  }
  if (bounced) {
    b.bounces = (b.bounces || 0) + 1;
      SFX.playAt('bowlingBallBounce', b.x, b.y, 0.45);

    spawnParticles(b.x, b.y, '#aaaaaa', 6);
    if (b.bounces >= 6) {
      detonateExplosiveBullet(b, b.x, b.y);
      return false;
    }
  }
  if (b.life <= 0) {
    detonateExplosiveBullet(b, b.x, b.y);
    return false;
  }
  return true;

}
    if (gs.bouncyHouse) {
      let bounced=false;
      if (b.x<=4){b.x=4;b.vx=Math.abs(b.vx);b.angle=Math.atan2(b.vy,b.vx);bounced=true;}
      if (b.x>=worldW-4){b.x=worldW-4;b.vx=-Math.abs(b.vx);b.angle=Math.atan2(b.vy,b.vx);bounced=true;}
      if (b.y<=4){b.y=4;b.vy=Math.abs(b.vy);b.angle=Math.atan2(b.vy,b.vx);bounced=true;}
      if (b.y>=worldH-4){b.y=worldH-4;b.vy=-Math.abs(b.vy);b.angle=Math.atan2(b.vy,b.vx);bounced=true;}
      if (bounced) {
        b.bounces=(b.bounces||0)+1;
        SFX.playAt('bouncyHit', b.x, b.y, 0.45);
        spawnParticles(b.x,b.y,'#88ffdd',3);
        if (b.isExplosive){detonateExplosiveBullet(b,b.x,b.y);return false;}
        if (gs.hasMirrorMaze&&b.bounces===1) {
          const perp=Math.atan2(b.vy,b.vx)+Math.PI/2;
          gs.bullets.push({x:b.x,y:b.y,vx:Math.cos(perp)*CFG.BULLET_SPEED,vy:Math.sin(perp)*CFG.BULLET_SPEED,angle:perp,life:CFG.BULLET_LIFE,damageMult:b.damageMult,isDud:b.isDud,bounces:99});
        }
      }
      return b.life>0&&(b.bounces||0)<=8;
    }
    const oob=b.x<-10||b.x>worldW+10||b.y<-10||b.y>worldH+10;
    if (oob && b.isExplosive && !b.travelsOffscreen) {
      detonateExplosiveBullet(b, b.x, b.y);
      return false;
    }
    return b.life > 0 && (b.travelsOffscreen || !oob);
  });
}

function sysBulletEnemyCollision() {
  for (const b of gs.bullets) {
    if (b.life<=0) continue;
    for (const id of ECS.query('enemy','pos','hp')) {
      const eai=ECS.get(id,'ai');
      if (eai&&eai.phased) continue;
      const epos=ECS.get(id,'pos'),ehp=ECS.get(id,'hp');
      const enemyType = ECS.get(id, 'enemy').type;
      const hitRadius = enemyType === 'cakeBoss' ? 88 : 30;
      if (Math.hypot(b.x-epos.x,b.y-epos.y)<hitRadius) {
        if (b.isExplosive){detonateExplosiveBullet(b,b.x,b.y);break;}
        if (b.isDud) {
          SFX.playAt('dudHit', epos.x, epos.y, 0.45);
          b.life=0;spawnParticles(b.x,b.y,'#666666',3);break;
        }

        // ── Bowling ball: pierce, don't kill bullet ──
        if (b.isBowlingBall) {
          if (!b.hitEnemies.has(id)) {
            b.hitEnemies.add(id);
            const dmg = b.damageMult || 1;
            ehp.hp -= dmg; ehp.hitFlash = 14;
            SFX.playAt('bowlingBallHit', epos.x, epos.y, 0.5);

            spawnParticles(epos.x, epos.y, '#aaaaaa', 8);
            spawnParticles(epos.x, epos.y, '#333344', 5);
            if (ehp.hp <= 0) {
              spawnParticles(epos.x, epos.y, '#ff2222', 18);
              if (gs.hasPopcornBucket && Math.random() < 0.22)
                gs.popcornKernels.push({x:epos.x+(Math.random()-.5)*20,y:epos.y+(Math.random()-.5)*20});
              if (gs.hasMirrorMaze) {
                gs.mirrorShards.push({ orbiting: false, x: epos.x, y: epos.y, angle: Math.random()*Math.PI*2 });
                spawnParticles(epos.x, epos.y, '#ccddff', 10);
              }

             const bbType = ECS.get(id, 'enemy')?.type;
if (bbType === 'clownCar') {
  _clownCarExplode(id, epos, gs, false);
  b.life = 0;
  break;
}
              
              ECS.destroyEntity(id);
              gs.score += Math.round(10*gs.wave*(dmg>1?1.6:1)); gs.waveKills++;
              tryDropTicket(epos.x, epos.y); gs.health=Math.min(gs.maxHealth,gs.health+CFG.HEALTH_REGEN);
              updateHUD(); checkWave();
            }
          }
          continue; // don't break — keep checking other enemies
        }

        const dmg=b.damageMult||1;
        ehp.hp-=dmg; ehp.hitFlash=12; b.life=0;
        const hitKey = b.damageMult >= 4 ? 'hit4x' : b.damageMult >= 3 ? 'hit3x' : b.damageMult >= 2 ? 'hit2x' : 'normalHit' + (Math.random()<0.5?'1':'2');
SFX.playAt(hitKey, epos.x, epos.y, 0.45);
        spawnParticles(b.x,b.y,dmg>1?'#ff44ff':'#ff6644',6);

        if (gs.popcornFrenzyTimer > 0) {
  spawnParticles(b.x, b.y, '#ffdd00', 16);
  spawnParticles(b.x, b.y, '#ff8800', 8);
  const frenzyRadius = gs.hasPopcornBowl ? 330 : 165;
  const frenzyDmg    = gs.hasPopcornBowl ? dmg * 2.0 : dmg;
  for (const aoeId of ECS.query('enemy', 'pos', 'hp')) {
    if (aoeId === id) continue;
    const ap = ECS.get(aoeId, 'pos');
    if (Math.hypot(ap.x - b.x, ap.y - b.y) < frenzyRadius) {
      const ah = ECS.get(aoeId, 'hp');
      ah.hp -= frenzyDmg;
      ah.hitFlash = 10;
      spawnParticles(ap.x, ap.y, '#ffcc00', 5);
    }
  }
}

      

        if (ehp.hp<=0) {
          const type=ECS.get(id,'enemy').type;
if (type === 'boss' || type === 'cakeBoss') handleBossDeath(id);
          if (gs.ricochetActive) {
            let nearest=null,nearDist=999999;
            for (const oid of ECS.query('enemy','pos')) {
              if (oid===id) continue;
              const od=Math.hypot(ECS.get(oid,'pos').x-epos.x,ECS.get(oid,'pos').y-epos.y);
              if (od<nearDist){nearDist=od;nearest=ECS.get(oid,'pos');}
            }
            if (nearest) {
              const rd=Math.hypot(nearest.x-epos.x,nearest.y-epos.y)||1;
              gs.bullets.push({x:epos.x,y:epos.y,vx:(nearest.x-epos.x)/rd*CFG.BULLET_SPEED,vy:(nearest.y-epos.y)/rd*CFG.BULLET_SPEED,angle:0,life:CFG.BULLET_LIFE,damageMult:dmg,isDud:false});
              spawnParticles(epos.x,epos.y,'#4499ff',6);
            }
          }

          spawnParticles(epos.x,epos.y,'#ff2222',18);
          if (gs.hasPopcornBucket&&Math.random()<0.22)
            gs.popcornKernels.push({x:epos.x+(Math.random()-.5)*20,y:epos.y+(Math.random()-.5)*20});
          ECS.destroyEntity(id);
          // Death shard from redirected bullet
if (gs.hasMirrorMaze) {
  gs.mirrorShards.push({ orbiting: false, x: epos.x, y: epos.y, angle: Math.random() * Math.PI * 2 });
  spawnParticles(epos.x, epos.y, '#ccddff', 10);
}
          gs.score+=Math.round(10*gs.wave*(dmg>1?1.6:1)); gs.waveKills++;
          tryDropTicket(epos.x, epos.y); gs.health=Math.min(gs.maxHealth,gs.health+CFG.HEALTH_REGEN); updateHUD(); checkWave();
        }
        break;
      }
    }
  }
  gs.bullets=gs.bullets.filter(b=>b.life>0);
}

function sysDashCollision() {
  if (!gs.dashActiveThisFrame){for (const id of ECS.query('enemy','ai')) ECS.get(id,'ai').dashHit=false;return;}
  const ppos=ECS.get(gs.playerId,'pos'),pvel=ECS.get(gs.playerId,'vel');
  const dashSpd=Math.hypot(pvel.vx,pvel.vy),speedScale=Math.max(1,dashSpd/CFG.DASH_SPEED);
  for (const id of ECS.query('enemy','pos','hp','ai')) {
    const epos=ECS.get(id,'pos'),ehp=ECS.get(id,'hp'),ai=ECS.get(id,'ai');
    if (!ai.dashHit&&Math.hypot(ppos.x-epos.x,ppos.y-epos.y)<32) {
      ehp.hp-=baseBulletDamage()*2*speedScale; ehp.hitFlash=14; ai.dashHit=true;
      spawnParticles(epos.x,epos.y,'#ffaa00',10);
      if (ehp.hp<=0){SFX.play('PartyPopperKill',0.7);spawnParticles(epos.x,epos.y,'#ff2222',16);ECS.destroyEntity(id);gs.score+=10*gs.wave;gs.waveKills++;tryDropTicket(epos.x,epos.y);gs.health=Math.min(gs.maxHealth,gs.health+CFG.HEALTH_REGEN);updateHUD();checkWave();}
    }
  }
}

function sysEnemyPlayerCollision() {


   

 
  // Tightrope Boots: intangible while dashing
  if (gs.dashTimer > 0 && gs.hasTightropeBoots) return;
  if (gs.invincible>0||gs.frozen) return;
  const ppos=ECS.get(gs.playerId,'pos'); if (!ppos) return;

 
  for (const id of ECS.query('enemy','pos')) {
    const epos=ECS.get(id,'pos');
    const type = ECS.get(id, 'enemy').type;
    if (type === 'cakeBoss' && ECS.get(id, 'ai')?.antipieBoss) continue;
    const contactRadius = type === 'cakeBoss' ? 82 : 28;
    if (Math.hypot(ppos.x-epos.x,ppos.y-epos.y)<contactRadius) {

     const eaiCheck2 = ECS.get(id, 'ai');
if (eaiCheck2 && eaiCheck2.thrownByFork) {
  eaiCheck2.thrownByFork = false;
  applyPlayerDamage(30, id, null, true); // harder hit than normal contact
  gs.shakeX = 20; gs.shakeY = 20;
  gs.flawlessThisWave = false;
  triggerSFPHit();
  spawnParticles(ppos.x, ppos.y, '#ffcc88', 18);
  updateHUD();
  if (gs.health <= 0) { gameOver(); return; }
  return;
}
const eaiCheck = ECS.get(id,'ai');
if (eaiCheck && eaiCheck.criticalMass && gs.invincible <= 0) {
  if (!eaiCheck.explodeCooldown || eaiCheck.explodeCooldown <= 0) {
    eaiCheck.explodeCooldown = 120;
    detonateExplosiveBullet({damageMult: eaiCheck.rmDmgMult || 3, life:1, isExplosive:true}, epos.x, epos.y, false);
    applyPlayerDamage(20, id, null, true);
    gs.flawlessThisWave = false;
    updateHUD();
    if (gs.health <= 0) { gameOver(); return; }
  }
  return;
}



     
      // Knocking Pins: reduced contact damage (8 instead of 20),
      // and the bowl itself damages the enemy it rams into
      if (gs.knockingPinsActive) {
        applyPlayerDamage(2, id, null, true);
        gs.shakeX=16;gs.shakeY=16; gs.flawlessThisWave=false;
        // Deal damage to the enemy being bowled into
        const ehp=ECS.get(id,'hp');
        if (ehp) {
          ehp.hp-=baseBulletDamage()*120; ehp.hitFlash=14;
          spawnParticles(epos.x,epos.y,'#3333cc',10);
// Knock nearby enemies away from impact
              for (const oid of ECS.query('enemy','pos','vel')) {
                if (oid === id) continue;
                const op = ECS.get(oid,'pos'), ov = ECS.get(oid,'vel');
                const od = Math.hypot(op.x-epos.x, op.y-epos.y);
                if (od < 80) { ov.vx += (op.x-epos.x)/(od||1)*18; ov.vy += (op.y-epos.y)/(od||1)*18; }
              }          if (ehp.hp<=0){
            spawnParticles(epos.x,epos.y,'#ff2222',18);
            ECS.destroyEntity(id);
            gs.score+=Math.round(12*gs.wave); gs.waveKills++;
            tryDropTicket(epos.x, epos.y); gs.health=Math.min(gs.maxHealth,gs.health+CFG.HEALTH_REGEN); updateHUD(); checkWave();
            if (gs.health<=0){gameOver();return;}
            return;
          }
        }
        triggerSFPHit(); spawnParticles(ppos.x,ppos.y,'#3333cc',10); updateHUD();
        if (gs.health<=0){gameOver();return;} return;
      }

let contactMult = 1;
for (const cid of ECS.query('enemy','pos')) {
  const cepos = ECS.get(cid,'pos');
  if (Math.hypot(ppos.x-cepos.x, ppos.y-cepos.y) < 28) {
    const ceai = ECS.get(cid,'ai');
    if (ceai && ceai.rmDmgMult) contactMult = ceai.rmDmgMult;
    break;
  }
}
applyPlayerDamage(Math.round(20 * contactMult), id, null, true);
      gs.shakeX=16;gs.shakeY=16; gs.flawlessThisWave=false;
      triggerSFPHit(); spawnParticles(ppos.x,ppos.y,'#ff3333',14); updateHUD();
      if (gs.health<=0){gameOver();return;} return;
    }
  }
}

function sysEnemyBullets() {
  const ppos = ECS.get(gs.playerId,'pos');
  const bulletsToAdd = []; // deferred — added after filter completes
  
  gs.enemyBullets = gs.enemyBullets.filter(eb => {
    if (eb.sourceId == null) {
      let closestId = null;
      let closestDistance = 70;
      for (const id of ECS.query('enemy', 'pos')) {
        const pos = ECS.get(id, 'pos');
        const distance = Math.hypot(pos.x - eb.x, pos.y - eb.y);
        if (distance < closestDistance) {
          closestId = id;
          closestDistance = distance;
        }
      }
      if (closestId !== null) {
        eb.sourceId = closestId;
        eb.sourceType = ECS.get(closestId, 'enemy')?.type || null;
      }
    }
    if (!gs.frozen) {
      if (eb.curveRate) {
        const speed = Math.hypot(eb.vx, eb.vy);
        const angle = Math.atan2(eb.vy, eb.vx) + eb.curveRate;
        eb.vx = Math.cos(angle) * speed;
        eb.vy = Math.sin(angle) * speed;
      }
      eb.x+=eb.vx;eb.y+=eb.vy;eb.life--;
    }
if (eb.isTear) {
  if (eb.gravX !== undefined) { eb.vx += eb.gravX; eb.vy += eb.gravY; }
  else if (eb.gravity) eb.vy += eb.gravity;
}

// ── Arc ball physics ──
if (eb.isArcBall) {
  eb.vy += eb.gravity;
  eb.y  += eb.vyHoriz; // vertical world-movement toward target
  // Check if ball has reached target Y or gone past it
  const traveled = Math.hypot(eb.x - eb.startX, eb.y - eb.startY + eb.vyHoriz);
  const totalDist = Math.hypot(eb.targetX - eb.startX, eb.targetY - eb.startY);
  if (eb.life < eb.maxLife - eb.hangTime || Math.hypot(eb.x - eb.targetX, eb.y - eb.targetY) < 22) {
    // Impact!
    spawnParticles(eb.x, eb.y, '#ffdd00', 20);
    spawnParticles(eb.x, eb.y, '#ff8800', 12);
    gs.shakeX = 10; gs.shakeY = 10;
    if (eb.isFrosting) SFX.playAt('frostingHit', eb.x, eb.y, 0.5);
   const scale = eb.sizeScale || 1.0;
        const impactR = Math.round(55 * scale);
        const impactShake = Math.round(10 * scale);

        // Cannonball arc: big explosion on landing
        if (eb.isCannonball) {
          detonateExplosiveBullet({ damageMult: (eb.rmDmgMult || 1) * 4, life: 1, isExplosive: true }, eb.x, eb.y, false);
          spawnParticles(eb.x, eb.y, '#ff4400', Math.round(30 * scale));
          gs.shakeX = Math.round(22 * scale); gs.shakeY = Math.round(22 * scale);
          // Release the carried enemy entity at landing
          if (eb.carriedId && ECS.has(eb.carriedId, 'pos')) ECS.destroyEntity(eb.carriedId);
          return false;
        }

        // Arc enemy landing: release the enemy at the landing spot
    // Frosting arc: spawn giftbox on impact if flagged
if (eb.isFrosting && eb.spawnGiftBox) {
  const gid = ECS.createEntity();
  const def = ENEMY_DEFS['giftBox'];
  const baseHp = 1 + Math.floor(gs.wave / 2);
  ECS.add(gid, 'enemy', { type: 'giftBox' });
  ECS.add(gid, 'pos', { x: eb.x, y: eb.y, angle: 0 });
  ECS.add(gid, 'vel', { vx: 0, vy: 0 });
  ECS.add(gid, 'hp', { hp: Math.ceil(baseHp * def.hpMult), maxHp: Math.ceil(baseHp * def.hpMult), hitFlash: 0 });
  ECS.add(gid, 'physics', { speed: 0.8 });
  taskManagerApplySpawnNerf(gid, 'giftBox');
  ECS.add(gid, 'ai', { windupTimer: 0, exploded: false, heldByPlayer: false, thrown: false, dashHit: false });
  spawnParticles(eb.x, eb.y, '#ffaa00', 14);
  showMsg('A GIFT BOX FELL FROM THE FROSTING!');
}
        if (eb.isArcEnemy && eb.carriedId && ECS.has(eb.carriedId, 'pos')) {
          const cpos = ECS.get(eb.carriedId, 'pos');
          cpos.x = eb.x; cpos.y = eb.y;
          const cai = ECS.get(eb.carriedId, 'ai');
          const cvel = ECS.get(eb.carriedId, 'vel');
          if (cai) { cai.juggled = false; cai.juggledBy = null; }
          if (cvel) { cvel.vx = (Math.random() - 0.5) * 3; cvel.vy = (Math.random() - 0.5) * 3; }
          spawnParticles(eb.x, eb.y, '#ff8800', 14);
          return false;
        }

        spawnParticles(eb.x, eb.y, '#ffdd00', Math.round(20 * scale));
        spawnParticles(eb.x, eb.y, '#ff8800', Math.round(12 * scale));
        gs.shakeX = impactShake; gs.shakeY = impactShake;
        if (gs.invincible <= 0 && Math.hypot(eb.x - ppos.x, eb.y - ppos.y) < impactR) {
applyPlayerDamage(Math.round(18 * (eb.rmDmgMult || 1) * scale), eb.sourceId, eb.sourceType, true);
          gs.shakeX = Math.round(16 * scale); gs.shakeY = Math.round(16 * scale);
          gs.flawlessThisWave = false;
          triggerSFPHit(); updateHUD();
          if (gs.health <= 0) { gameOver(); return false; }
        }
        return false;
  }
  // Update shadow position (tracks directly below ball's world XY)
  eb.shadowX = eb.x;
  eb.shadowY = eb.targetY; // shadow stays at ground level at target
}
    if (eb.homing) {
      const dx=ppos.x-eb.x,dy=ppos.y-eb.y,dist=Math.hypot(dx,dy)||1;
      eb.vx+=(dx/dist)*(eb.homingStrength||0.04); eb.vy+=(dy/dist)*(eb.homingStrength||0.04);
      const spd=Math.hypot(eb.vx,eb.vy); if (spd>2){eb.vx=eb.vx/spd*2;eb.vy=eb.vy/spd*2;}
    }

    // Friendly-fire: confused enemy bullets hit other enemies
    if (eb.friendlyFire) {
      for (const eid of ECS.query('enemy','pos','hp')) {
        if (eid===eb.sourceId) continue;
        const epos2=ECS.get(eid,'pos'),ehp2=ECS.get(eid,'hp');
        if (Math.hypot(eb.x-epos2.x,eb.y-epos2.y)<22) {
          ehp2.hp-=2; ehp2.hitFlash=10;
          spawnParticles(epos2.x,epos2.y,'#4488ff',5);
          if (ehp2.hp<=0) {
            spawnParticles(epos2.x,epos2.y,'#ff2222',14); ECS.destroyEntity(eid);
            gs.waveKills++;
            updateHUD(); checkWave();
          }
          return false;
        }
      }
    }

    if (gs.bouncyHouse) {
      let bounced=false;
      if (eb.x<=4){eb.x=4;eb.vx=Math.abs(eb.vx);bounced=true;}
      if (eb.x>=worldW-4){eb.x=worldW-4;eb.vx=-Math.abs(eb.vx);bounced=true;}
      if (eb.y<=4){eb.y=4;eb.vy=Math.abs(eb.vy);bounced=true;}
      if (eb.y>=worldH-4){eb.y=worldH-4;eb.vy=-Math.abs(eb.vy);bounced=true;}
    // FIND the bouncy house bullet push and change it to:
    if (bounced && !eb.friendlyFire) {
      SFX.playAt('bouncyHit', eb.x, eb.y, 0.45);
      eb.bounces = (eb.bounces||0) + 1;
      spawnParticles(eb.x, eb.y, '#88ffdd', 3);
      bulletsToAdd.push({
        x:eb.x, y:eb.y, vx:eb.vx, vy:eb.vy,
        angle:Math.atan2(eb.vy,eb.vx), life:80, maxLife:80,
        damageMult:1, isDud:false, bounces:eb.bounces
      });
      return false;
    }
      if (eb.life<=0||eb.bounces>8) return false;
    } else {
      if (eb.life<=0) return false;
    }

    if (!eb.friendlyFire&&gs.invincible<=0&&Math.hypot(eb.x-ppos.x,eb.y-ppos.y)<20) {
      const bulletDmg = Math.round(15 * (eb.rmDmgMult || 1));
applyPlayerDamage(bulletDmg, eb.sourceId, eb.sourceType, true);
if (eb.isTear) SFX.playAt('tearHit', eb.x, eb.y, 0.5);
      gs.shakeX=10;gs.shakeY=10;
      gs.flawlessThisWave=false; triggerSFPHit();
      spawnParticles(ppos.x,ppos.y,'#ff69b4',10); updateHUD();
      if (gs.health<=0){gameOver();return false;} return false;
    }
    return true;
  });
   for (const b of bulletsToAdd) gs.bullets.push(b);
}

function sysFieldItemPickup() {
  const ppos=ECS.get(gs.playerId,'pos');
  for (let i=gs.fieldItems.length-1;i>=0;i--) {
    const fi=gs.fieldItems[i];
    if (Math.hypot(ppos.x-fi.x,ppos.y-fi.y)<34) {
      const def=ITEM_DEFS[fi.id]; gs.itemCooldowns[fi.id]=Date.now(); gs.fieldItems.splice(i,1);
      SFX.playAt('itemConfirm', ppos.x, ppos.y, 0.65);
      def.effect(gs);
      // Show Clippy pickup tip
      if (CLIPPY_PICKUP_TIPS[fi.id]) {
        gs.clippyPickupMsg = CLIPPY_PICKUP_TIPS[fi.id];
        gs.clippyPickupTimer = 240; // 4 seconds
      }
      const permanent=new Set(['bouncy','dash','doubledCake','tripleCake','quadCake','shakeFizzlePop','flawlessBaking','cursedCandles','glowsticks','paperCuts','extraClips','clownishUpgrade','popcornBowl']);
      if (permanent.has(fi.id) && !gs.unlockedItems.includes(fi.id)) gs.unlockedItems.push(fi.id);
      if (typeof chipShopHandleItemAcquired === 'function') {
        chipShopHandleItemAcquired(fi.id);
      }
      if (!permanent.has(fi.id)) setTimeout(()=>{if(gameRunning)trySpawnFieldItems();},def.spawnCooldown);
    }
  }
}

function sysChipPickup() {
  const ppos = ECS.get(gs.playerId, 'pos');
  for (let i = gs.chipDrops.length - 1; i >= 0; i--) {
    const chip = gs.chipDrops[i];
    const dx = ppos.x - chip.x, dy = ppos.y - chip.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= CFG.CHIP_MAGNET_RANGE && !chip.magnetized) {
      chip.magnetized = true;
    }

    if (chip.magnetized && distance > 0) {
      const acceleration = CFG.CHIP_MAGNET_ACCEL * (1 + (1 - Math.min(distance, CFG.CHIP_MAGNET_RANGE) / CFG.CHIP_MAGNET_RANGE));
      chip.vx = (chip.vx || 0) + dx / distance * acceleration;
      chip.vy = (chip.vy || 0) + dy / distance * acceleration;
      const speed = Math.hypot(chip.vx, chip.vy);
      if (speed > CFG.CHIP_MAX_SPEED) {
        chip.vx = chip.vx / speed * CFG.CHIP_MAX_SPEED;
        chip.vy = chip.vy / speed * CFG.CHIP_MAX_SPEED;
      }
      chip.x += chip.vx;
      chip.y += chip.vy;
      chip.trail = chip.trail || [];
      chip.trail.push({ x: chip.x, y: chip.y });
      if (chip.trail.length > CFG.CHIP_TRAIL_LENGTH) chip.trail.shift();
    }

    if (Math.hypot(ppos.x - chip.x, ppos.y - chip.y) <= CFG.CHIP_PICKUP_RANGE) {
      gs.chipDrops.splice(i, 1);
      if (chip.golden) {
        gs.goldenChips++;
        spawnParticles(chip.x, chip.y, '#ffe45c', 12);
        showMsg('+1 GOLDEN CHIP');
        SFX.playAt('goldenChipPickup', chip.x, chip.y, 0.65);
      } else {
        gs.chips += emailPickupChipAmount();
        spawnParticles(chip.x, chip.y, '#ffcc44', 8);
        showMsg('+1 CHIP');
        SFX.playAt('chipPickup', chip.x, chip.y, 0.55);
      }
      updateHUD();
    }
  }
  SFX.setLoop('goldenChipTarget', gs.chipDrops.some(chip => chip.golden && chip.magnetized), 0.5);
}

function sysPopcorn() {
  if (!gs.hasPopcornBucket||!gs.popcornKernels) return;
  const ppos=ECS.get(gs.playerId,'pos');
  const kernelGoal=gs.hasPopcornBowl?3:5;
  gs.popcornKernels=gs.popcornKernels.filter(k=>{
    if (Math.hypot(k.x-ppos.x,k.y-ppos.y)<22) {
      spawnParticles(k.x,k.y,'#ffdd00',4);
      gs._kernelsCollected=(gs._kernelsCollected||0)+1;
      if (gs._kernelsCollected>=kernelGoal) {
        gs._kernelsCollected=0;
        gs.popcornFrenzyTimer=gs.hasPopcornBowl?360:240;
        showMsg(gs.hasPopcornBowl?'🍿 MEGA FRENZY! MASSIVE EXPLOSION RADIUS!':'🍿 POPCORN FRENZY! BULLETS EXPLODE!');
        spawnPartyParticles(ppos.x,ppos.y);
      }
      return false;
    }
    return true;
  });
}

const LEAKING_DURATION_FRAMES = 3 * 60;
const LEAKING_TICK_FRAMES = 60;

function applyLeakingStatus(entityId, gameState, sourceId = null) {
  if (entityId === gameState.playerId) {
    gameState.leakingTimer = (gameState.leakingTimer || 0) + LEAKING_DURATION_FRAMES;
    gameState.leakingSourceType = sourceId == null ? null : ECS.get(sourceId, 'enemy')?.type || null;
    return;
  }

  const ai = ECS.get(entityId, 'ai');
  if (!ai) return;
  ai.leakingTimer = (ai.leakingTimer || 0) + LEAKING_DURATION_FRAMES;
}

function tickLeakingStatusEffects() {
  if (gs.leakingTimer > 0) {
    gs.leakingTimer--;
    gs.leakingTickTimer = (gs.leakingTickTimer || 0) + 1;
    if (gs.leakingTickTimer >= LEAKING_TICK_FRAMES) {
      gs.leakingTickTimer -= LEAKING_TICK_FRAMES;
      applyPlayerDamage(gs.maxHealth * 0.05, null, gs.leakingSourceType);
      gs.flawlessThisWave = false;
      updateHUD();
      if (gs.health <= 0) {
        gameOver();
        return true;
      }
    }
  } else {
    gs.leakingTickTimer = 0;
  }

  for (const id of ECS.query('enemy', 'pos', 'hp', 'ai')) {
    const ai = ECS.get(id, 'ai');
    if (!(ai.leakingTimer > 0)) {
      ai.leakingTickTimer = 0;
      continue;
    }

    ai.leakingTimer--;
    ai.leakingTickTimer = (ai.leakingTickTimer || 0) + 1;
    if (ai.leakingTickTimer < LEAKING_TICK_FRAMES) continue;

    ai.leakingTickTimer -= LEAKING_TICK_FRAMES;
    const hp = ECS.get(id, 'hp');
    const pos = ECS.get(id, 'pos');
    hp.hp -= hp.maxHp * 0.05;
    hp.hitFlash = 12;
    spawnParticles(pos.x, pos.y, '#999999', 5);
    if (hp.hp > 0) continue;

    const enemyType = ECS.get(id, 'enemy').type;
    if (enemyType === 'boss' || enemyType === 'cakeBoss') handleBossDeath(id);
    spawnParticles(pos.x, pos.y, '#ff2222', 18);
    if (gs.hasPopcornBucket && Math.random() < 0.22) {
      gs.popcornKernels.push({ x: pos.x + (Math.random() - 0.5) * 20, y: pos.y + (Math.random() - 0.5) * 20 });
    }
    if (gs.hasMirrorMaze) {
      gs.mirrorShards.push({ orbiting: false, x: pos.x, y: pos.y, angle: Math.random() * Math.PI * 2 });
      spawnParticles(pos.x, pos.y, '#ccddff', 10);
    }
    ECS.destroyEntity(id);
    gs.waveKills++;
    updateHUD();
    checkWave();
  }
  return false;
}

function sysTimers() {
  if (tickLeakingStatusEffects()) return;

  // ── Always run these regardless of transition state ──
  for (const p of gs.particles){
    p.x+=p.vx;p.y+=p.vy;p.vx*=0.91;p.vy*=0.91;p.life--;
    if (p.confetti) p.rotation += p.spin;
  }
  gs.particles=gs.particles.filter(p=>p.life>0);
  if (gs.dashBurst) {
    gs.dashBurst.life--;
    if (gs.dashBurst.life <= 0) gs.dashBurst = null;
  }
 gs.shakeX*=0.72; gs.shakeY*=0.72;
if (Math.abs(gs.shakeX) < 0.1) gs.shakeX = 0;
if (Math.abs(gs.shakeY) < 0.1) gs.shakeY = 0;
  if (muzzleFlash>0) muzzleFlash--;
  if (gs.glowExplosionTimer>0) gs.glowExplosionTimer--;

  // Stage growth — auto-descend when done, no panel
  if (gs.transitioning && !gs.transitionDone) {
    gs.transitionT = Math.min(1, gs.transitionT + 1/90);
    const t=gs.transitionT, ease=t<0.5?2*t*t:-1+(4-2*t)*t;
    worldW=gs.transitionStartW+(gs.transitionEndW-gs.transitionStartW)*ease;
    worldH=gs.transitionStartH+(gs.transitionEndH-gs.transitionStartH)*ease;
    renderScale=canvas.clientWidth/worldW;
    if (gs.transitionT>=1) {
      worldW=gs.transitionEndW; worldH=gs.transitionEndH;
      renderScale=canvas.clientWidth/worldW;
      gs.transitionDone=true; gs.transitioning=false;
      gs.floor=2;
      unlockGlowsticks(); trySpawnFieldItems();
      showMsg('WELCOME TO THE BIG TOP!');
      const hint=document.getElementById('bottom-hint');
      if (hint) hint.textContent=`WASD:MOVE | MOUSE:AIM | CLICK:SHOOT | ${formatKey(KEYBINDS.reload)}:RELOAD | SHIFT:DASH | ${formatKey(KEYBINDS.prizeWheel)}:PRIZE WHEEL (3 TICKETS)`;
      updateHUD();
    }
  }

  if (gs.antipieBossSequence) {
    const seq = gs.antipieBossSequence;
    const elapsed = Math.min(
      seq.shakeDuration + seq.expandDuration,
      performance.now() - seq.startedAt
    );
    const shakeProgress = Math.min(1, elapsed / seq.shakeDuration);
    const expandProgress = Math.max(0, Math.min(
      1, (elapsed - seq.shakeDuration) / seq.expandDuration
    ));
    const easedExpansion = expandProgress * expandProgress * (3 - 2 * expandProgress);
    const wrapper = document.getElementById('wrapper');

    if (elapsed < seq.shakeDuration && wrapper) {
      wrapper.style.left = `${Math.round(seq.startLeft + (Math.random() * 2 - 1) * 6)}px`;
      wrapper.style.top = `${Math.round(seq.startTop + (Math.random() * 2 - 1) * 5)}px`;
    }
    if (expandProgress > 0 && wrapper) {
      if (seq.expandStartLeft === undefined) {
        const left = Number.parseFloat(wrapper.style.left);
        const top = Number.parseFloat(wrapper.style.top);
        seq.expandStartLeft = Number.isFinite(left) ? left : seq.startLeft;
        seq.expandStartTop = Number.isFinite(top) ? top : seq.startTop;
      }
      const width = seq.startWidth + (seq.endWidth - seq.startWidth) * easedExpansion;
      const height = seq.startHeight + (seq.endHeight - seq.startHeight) * easedExpansion;
      wrapper.style.width = `${width}px`;
      wrapper.style.height = `${height}px`;
      wrapper.style.left = `${seq.expandStartLeft + (seq.endLeft - seq.expandStartLeft) * easedExpansion}px`;
      wrapper.style.top = `${seq.expandStartTop + (seq.endTop - seq.expandStartTop) * easedExpansion}px`;
      resizeGameViewport();
    }
    gs.antipieDarkness = expandProgress;

    const targetKills = elapsed >= seq.shakeDuration
      ? seq.enemyIds.length
      : Math.floor(seq.enemyIds.length * shakeProgress * shakeProgress);
    while (seq.killedCount < targetKills) {
      const enemyId = seq.enemyIds[seq.killedCount++];
      const pos = ECS.get(enemyId, 'pos');
      if (pos) spawnParticles(pos.x, pos.y, '#ff2222', 18);
      ECS.destroyEntity(enemyId);
    }

    if (elapsed >= seq.shakeDuration + seq.expandDuration) {
      gs.antipieDarkness = 1;
      gs.antipieBossSequence = null;
      if (wrapper) {
        wrapper.style.width = `${seq.endWidth}px`;
        wrapper.style.height = `${seq.endHeight}px`;
        wrapper.style.left = `${seq.endLeft}px`;
        wrapper.style.top = `${seq.endTop}px`;
        resizeGameViewport();
      }
      startAntipieBoss(true);
    }
  }

  if (gs.partyFreezeTimer>0) gs.partyFreezeTimer--;
  if (gs.speedBoostTimer>0)  gs.speedBoostTimer--;
  if (gs.confettiSlowTimer>0) gs.confettiSlowTimer--;
  if (gs.invincible>0) gs.invincible--;
  if (gs.glowCooldown>0) gs.glowCooldown--;
  if (gs.spoonKnockbackTimer>0) gs.spoonKnockbackTimer--;

if (gs.explosionFreezeTimer > 0) { gs.explosionFreezeTimer--; }
if (gs.glowExplosionTimer > 0) gs.glowExplosionTimer--;

  if (gs.reloading) {
    const reloadSpeed=gs.speedBoostTimer>0?Math.max(1,Math.round(gs.speedBoostMult||1)):1;
    gs.reloadTimer-=reloadSpeed;
    if (gs.reloadTimer<=0){gs.reloading=false;gs.ammo=emailAmmoCapacity();updateHUD();showMsg('RELOADED!');     SFX.play('reloadFinish', 0.5);
}
  }
  if (gs.ammo===0&&!gs.reloading) startReload();

  if (gs.hasCursedCandles) {
    const candles = gs.cursedCandles || (gs.cursedCandles = []);
    let candleLit = false;
    for (const candle of candles) {
      if (candle.lit) continue;
      candle.lightTimer--;
      if (candle.lightTimer <= 0) {
        candle.lit = true;
        gs.candlesLit++;
        candleLit = true;
        SFX.play('candleLight', 0.65);
      }
    }
    if (candleLit) updateHUD();

    gs.candleSpawnTimer = (gs.candleSpawnTimer || 0) + 1;
    if (candles.length < 5 && gs.candleSpawnTimer >= 60) {
      candles.push({ lit: false, lightTimer: 60 });
      gs.candleSpawnTimer = 0;
    }

    if (gs.candleRelightDelay > 0) gs.candleRelightDelay--;
    else {
      gs.candleHpTimer = (gs.candleHpTimer || 0) + 1;
      if (gs.candleHpTimer >= 60) {
        gs.candleHpTimer = 0;
        applyPlayerDamage(5);
        gs.flawlessThisWave = false;
        if (gs.health <= 0) { gameOver(); return; }
      }
    }
  }

 // Clippy intro sequence
if (gs.clippyIntroLines && !gs.clippyIntroDone) {
  gs.clippyIntroTimer++;
  if (gs.clippyIntroTimer >= 210) { // ~3.5 sec per line
    gs.clippyIntroTimer = 0;
    gs.clippyIntroLine = (gs.clippyIntroLine || 0) + 1;
    if (gs.clippyIntroLine >= gs.clippyIntroLines.length) {
      gs.clippyIntroDone = true;
    }
  }
}

  if (gs.hasShakeFizzlePop&&!gs.sfpFull) {
    gs.sfpMeter=Math.min(gs.sfpMax,gs.sfpMeter+1);
    if (gs.sfpMeter>=gs.sfpMax){gs.sfpFull=true;showMsg('SHAKE FIZZLE POP — FULLY CHARGED!!!');}
  }

  if (gs.hasDash&&gs.dashCharges<gs.dashMaxCharges) {
    gs.dashCooldownTimer++;
    if (gs.dashCooldownTimer>=gs.dashCooldownMax) {
      gs.dashCooldownTimer=0; gs.dashCharges++; SFX.play('PartyPopperRefill', 0.6); updateHUD();
      if (gs.dashCharges===gs.dashMaxCharges) showMsg('DASH FULLY CHARGED!');
    }
  }

  for (const id of ECS.query('enemy','ai')) {
  const eai = ECS.get(id,'ai');
  if (eai.explodeCooldown > 0) eai.explodeCooldown--;
}
  


  if (gs.prizeEffect){gs.prizeEffect.timer--;if(gs.prizeEffect.timer<=0){gs.sugarRushActive=false;gs.ricochetActive=false;gs.prizeEffect=null;}}

  if (gs.cursedSpinTimer>0) {
    gs.cursedSpinTimer--;
    if (gs.cursedSpinTimer===0) {
      for (const eid of ECS.query('enemy','physics')) {
        const ephy=ECS.get(eid,'physics');
        if (ephy._cursedBase){ephy.speed=ephy._cursedBase;delete ephy._cursedBase;}
        const eai=ECS.get(eid,'ai'); if (eai) eai.cursedDmgBoost=false;
      }
    }
  }

  if (gs.knockingPinsActive) {
    gs.knockingPinsTimer--;
    if (gs.knockingPinsTimer<=0){gs.knockingPinsActive=false;showMsg('KNOCKING PINS WORE OFF!');}
    else {
      const ppos=ECS.get(gs.playerId,'pos'),pvel=ECS.get(gs.playerId,'vel');
      let nearest=null,nearDist=999999;
      for (const eid of ECS.query('enemy','pos')) {
        const ep=ECS.get(eid,'pos'),d=Math.hypot(ep.x-ppos.x,ep.y-ppos.y);
        if (d<nearDist){nearDist=d;nearest=ep;}
      }
if (nearest) {
        const dx = nearest.x - ppos.x, dy = nearest.y - ppos.y, dist = Math.hypot(dx, dy) || 1;
        const pinSpeed = 18; // raw pixels/frame — bypasses speed cap in movement system
        pvel.vx = (dx / dist) * pinSpeed;
        pvel.vy = (dy / dist) * pinSpeed;
      }    }
  }

  // Clownish: nose grows, blasts bullets + spawns waves; WAVES confuse enemies on contact
if (gs.popcornFrenzyTimer>0) gs.popcornFrenzyTimer--;



  // Bowling ball regen: every 15 seconds after use, give one back
  if (gs.hasBowlingBall && !gs.bowlingBallReady) {
    gs.bowlingBallRegenTimer = (gs.bowlingBallRegenTimer || 0) + 1;
    if (gs.bowlingBallRegenTimer >= 1200) { // 20 sec at 60fps
      gs.bowlingBallReady = true;
      gs.bowlingBallRegenTimer = 0;
      showMsg('BOWLING BALL READY!');
      spawnParticles(ECS.get(gs.playerId,'pos').x, ECS.get(gs.playerId,'pos').y, '#aaaaaa', 10);
    }
  }

 if (gs.hasClownish) {
    if (gs.clownNoseHonkTimer > 0) gs.clownNoseHonkTimer--;
    if (gs.clownNoseCooldown > 0) { gs.clownNoseCooldown--; }
    else {
    gs.clownNoseTimer++;
    gs.clownNoseSize = gs.clownNoseTimer / gs.clownNoseMax;
  if (gs.clownNoseTimer >= gs.clownNoseMax) {
    // Only blast if there's an enemy within 100px
    const ppos3 = ECS.get(gs.playerId, 'pos');
const nearbyEnemy = [...ECS.query('enemy', 'pos')].some(eid => {
      const ep = ECS.get(eid, 'pos');
      return Math.hypot(ep.x - ppos3.x, ep.y - ppos3.y) < 100;
    });

   if (nearbyEnemy) {
      gs.clownNoseHonkTimer = 14;
      // Defer the reset so the honk squish animation has frames to play
      setTimeout(() => { gs.clownNoseTimer = 0; gs.clownNoseSize = 0; }, 200);

      // Two waves with different speeds — NO stray bullets
  const waveMaxR = gs.hasClownishUpgrade ? 220 : 160;
      gs.clownSoundWaves = [
        { x: ppos3.x, y: ppos3.y, r: 8, maxR: waveMaxR, life: 55, maxLife: 55, speed: 2.4, hitEnemies: new Set() },
        { x: ppos3.x, y: ppos3.y, r: 8, maxR: waveMaxR, life: 44, maxLife: 55, speed: 1.5, hitEnemies: new Set() },
      ];
      gs.clownNoseCooldown = gs.hasClownishUpgrade ? 180 : 300;
      showMsg(gs.hasClownishUpgrade ? 'MEGA CLOWN BLAST! WAVES CONFUSE ENEMIES!' : 'HONK! WAVES CONFUSE NEARBY ENEMIES!');
    } else {
      // No enemy nearby — hold at full, don't reset, keep honk timer ticking
      gs.clownNoseTimer = gs.clownNoseMax; // stay full, don't overflow
    }
  }
}
 }
  // Tick sound wave rings — enemies the wave front passes through get confused
  if (gs.clownSoundWaves && gs.clownSoundWaves.length > 0) {
    const confuseDur = gs.hasClownishUpgrade ? 480 : 300;
    const waveThickness = 18; // px band — enemy must be within this of the wave front
    gs.clownSoundWaves = gs.clownSoundWaves.filter(w => {
      // Expand ring at its own fixed speed rather than easing
      w.r = Math.min(w.maxR, w.r + w.speed);
      w.life--;
      // Check each enemy against this wave's leading edge
      for (const eid of ECS.query('enemy', 'pos', 'ai')) {
        if (w.hitEnemies.has(eid)) continue;
        const epos = ECS.get(eid, 'pos');
        const d = Math.hypot(epos.x - w.x, epos.y - w.y);
        if (d >= w.r - waveThickness && d <= w.r + 4) {
          w.hitEnemies.add(eid);
          const eai = ECS.get(eid, 'ai');
          if (eai) {
            eai.confused = true;
            eai.confuseTimer = confuseDur;
            eai.confuseShootTimer = 0;
            spawnParticles(epos.x, epos.y, '#4488ff', 6);
          }
        }
      }
      return w.life > 0 && w.r < w.maxR;
    });
  }
}

function sysOobCleanup() {
  for (const id of ECS.query('enemy', 'pos', 'ai')) {
    const enemy = ECS.get(id, 'enemy');
    const pos = ECS.get(id, 'pos');
    const ai  = ECS.get(id, 'ai');
    if (enemy.type === 'corRed' || enemy.type === 'corBlue') continue;
    if (enemy.type === 'cakeBoss' && ai.antipieBoss) continue;
    if (ai.windowActive) {
      ai._oobTimer = 0;
      const screenDistance = desktopDistanceBeyondViewport(pos.x, pos.y);
      const hp = ECS.get(id, 'hp');
      if (hp && screenDistance >= CFG.OFFSCREEN_ENEMY_DAMAGE_DISTANCE) {
        ai._desktopOutsideTimer = (ai._desktopOutsideTimer || 0) + 1;
        if (ai._desktopOutsideTimer >= 60) {
          ai._desktopOutsideTimer = 0;
          hp.hp -= CFG.OFFSCREEN_ENEMY_DAMAGE;
          hp.hitFlash = 16;
          spawnParticles(pos.x, pos.y, '#aaaaaa', 6);
          if (hp.hp <= 0) {
            spawnParticles(pos.x, pos.y, '#ff2222', 14);
            ECS.destroyEntity(id);
            gs.waveKills++;
            updateHUD();
            setTimeout(() => checkWave(), 0);
          }
        }
      } else {
        ai._desktopOutsideTimer = 0;
      }
      continue;
    }
    ai._desktopOutsideTimer = 0;
    const oob = pos.x < -60 || pos.x > worldW + 60 || pos.y < -60 || pos.y > worldH + 60;
    if (oob) {
      ai._oobTimer = (ai._oobTimer || 0) + 1;
      if (ai._oobTimer >= 300) { // 5 seconds at 60fps
        ECS.destroyEntity(id);
        gs.waveKills++;
        checkWave();
      }
    } else {
      ai._oobTimer = 0;
    }
  }
}

function sysSpawner() {
  if (gs.antipieBossSequence) return;
  gs.spawnTimer++;
  if (gs.spawnTimer>=gs.spawnInterval){gs.spawnTimer=0;spawnEnemy();}
}

function beginChippyTransition(machine, nextPhase, nextSheet, nextFrame) {
  machine.transitionTarget = { phase: nextPhase, sheet: nextSheet, frame: nextFrame };
  machine.phase = 'transition';
  machine.elapsed = 0;
}

function startChippySpin(machine, startFrame) {
  machine.phase = 'spinning';
  machine.sheet = 'spin';
  machine.elapsed = 0;
  machine.spinStartFrame = startFrame;
  machine.targetFrame = Math.floor(Math.random() * CFG.CHIPPY_SPIN_FRAME_COUNT);
  machine.frame = startFrame;
  machine.spinSoundCueIndex = 0;
}

function sysChippyMachine() {
  const spinSoundProgress = [0, 0.015, 0.035, 0.065, 0.105, 0.16, 0.23, 0.32, 0.43, 0.56, 0.70, 0.83, 0.94];
  for (const id of ECS.query('chippyMachine', 'pos')) {
    const machine = ECS.get(id, 'chippyMachine');
    const pos = ECS.get(id, 'pos');
    if (machine.phase === 'spinning') {
      if (machine.spinSoundCueIndex < spinSoundProgress.length
        && machine.elapsed >= spinSoundProgress[machine.spinSoundCueIndex] * CFG.CHIPPY_SPIN_FRAMES) {
        SFX.playAt('chippyClick', pos.x, pos.y, 0.35);
        machine.spinSoundCueIndex++;
      }
      machine.elapsed++;
      const progress = Math.min(1, machine.elapsed / CFG.CHIPPY_SPIN_FRAMES);
      const spinSteps = CFG.CHIPPY_SPIN_FRAME_COUNT * 12
        + machine.targetFrame - machine.spinStartFrame;
      machine.frame = (
        machine.spinStartFrame
        + Math.floor(spinSteps * (2 * progress - progress * progress))
      ) % CFG.CHIPPY_SPIN_FRAME_COUNT;
      if (machine.elapsed >= CFG.CHIPPY_SPIN_FRAMES) {
        machine.restFrame = machine.targetFrame;
        machine.isInitialSpawn = false;
        SFX.playAt('chippyFinish', pos.x, pos.y, 0.5);
        beginChippyTransition(machine, 'idle', 'spin', machine.restFrame);
      }
    } else if (machine.phase === 'transition') {
      machine.elapsed++;
      if (machine.elapsed >= CFG.CHIPPY_TRANSITION_FRAMES) {
        const target = machine.transitionTarget;
        machine.phase = target.phase;
        machine.sheet = target.sheet;
        machine.frame = target.frame;
        machine.elapsed = 0;
        machine.transitionTarget = null;
        if (target.phase === 'spinning') {
          startChippySpin(machine, target.frame);
        } else if (target.phase === 'produce') {
          machine.sheet = 'produce';
          machine.frame = 0;
        } else if (target.phase === 'idle') {
          machine.restFrame = target.frame;
        }
      }
    } else if (machine.phase === 'produce') {
      const frameIndex = Math.floor(machine.elapsed / CFG.CHIPPY_PRODUCE_FRAME_DURATION);
      if (frameIndex < CFG.CHIPPY_PRODUCE_FRAME_COUNT) {
        machine.frame = frameIndex;
        machine.elapsed++;
      } else {
        machine.phase = 'produceReady';
        machine.frame = CFG.CHIPPY_PRODUCE_FRAME_COUNT - 1;
      }
    }
  }
}

function update() {
  if (Number.isFinite(mouse.screenX) && typeof getScreenShakeOffset === 'function') {
    const shake = getScreenShakeOffset();
    mouse.x = mouse.screenX - shake.x;
    mouse.y = mouse.screenY - shake.y;
  }
  sysPlayerMovement(); sysAI(); sysBullets(); sysBulletEnemyCollision();
  sysDashCollision(); sysEnemyPlayerCollision(); sysConfusedEnemyCollision();  sysEnemyBullets();
  sysFieldItemPickup(); sysChipPickup(); sysPopcorn();  sysRagingRings(); sysMirrorMaze();
  sysOobCleanup(); sysTimers(); sysSpawner(); sysChippyMachine();
  tickMeleeWindow(); 
}

function spawnEnemy(allowBeyondWaveLimit = false) {
  if (gs.antipieBossSequence) return;
  if (gs.bossActive && !allowBeyondWaveLimit) return;
const total = [...ECS.query('enemy')].length;
  if (!allowBeyondWaveLimit && gs.waveKills+total>=gs.waveEnemiesLeft) return;
  let type='utensil';
  const roll=Math.random();
  if (gs.wave >= 15 && roll < 0.18) {
    type = Math.random() < 0.5 ? 'corRed' : 'corBlue';
  } else if (gs.floor === 2) {
    // Wave-gated unlock curve — new enemy type introduced each bracket
    // Cannonball unlocks first (wave 1 of floor 2 = wave 12+)
    // Juggler unlocks wave 14+, Ringmaster wave 17+, Clown Car wave 20+
    // Rarity stays weighted even after all unlock: cannonball most common, clownCar rarest
    const w = gs.wave;
    if (w >= 20) {
      // All four active — cannonball most common, clown car rarest
      if      (roll < 0.38) type = 'cannonball';
      else if (roll < 0.66) type = 'juggler';
      else if (roll < 0.84) type = 'ringmaster';
      else                  type = 'clownCar';
    } else if (w >= 17) {
      // Ringmaster joins — no clown car yet
      if      (roll < 0.42) type = 'cannonball';
      else if (roll < 0.74) type = 'juggler';
      else                  type = 'ringmaster';
    } else if (w >= 14) {
      // Juggler joins cannonball
      if      (roll < 0.55) type = 'cannonball';
      else                  type = 'juggler';
    } else {
      // Only cannonball (waves 12–13)
      type = 'cannonball';
    }
  } else if (gs.wave>=6){
    if(roll<0.30)type='waterballoon';else if(roll<0.52)type='giftBox';else if(roll<0.72)type='partyHat';
  } else if (gs.wave>=5){
    if(roll<0.32)type='waterballoon';else if(roll<0.58)type='partyHat';
  } else if (gs.wave>=4){ if(roll<0.35)type='waterballoon'; }

  const ppos=ECS.get(gs.playerId,'pos');
  let x,y;
  if (type === 'corRed' || type === 'corBlue') {
    const angle = Math.random() * Math.PI * 2;
    const distance = 205 + Math.random() * 65;
    x = Math.max(CFG.WALL_PAD + 55, Math.min(worldW - CFG.WALL_PAD - 55, ppos.x + Math.cos(angle) * distance));
    y = Math.max(CFG.WALL_PAD + 55, Math.min(worldH - CFG.WALL_PAD - 55, ppos.y + Math.sin(angle) * distance));
  } else if (type === 'utensil') {
    const rect = canvas.getBoundingClientRect();
    const screenX = Math.random() * window.innerWidth;
    const screenY = Math.random() * window.innerHeight;
    x = ((screenX - rect.left) / rect.width) * worldW;
    y = ((screenY - rect.top) / rect.height) * worldH;
  } else {
    let attempts = 0;
    do {
      x = CFG.WALL_PAD + Math.random() * (worldW - CFG.WALL_PAD * 2);
      y = CFG.WALL_PAD + Math.random() * (worldH - CFG.WALL_PAD * 2);
      attempts++;
    } while (Math.hypot(x - ppos.x, y - ppos.y) < CFG.SAFE_SPAWN_DIST && attempts < 12);
  }

  const def=ENEMY_DEFS[type],baseHp=1+Math.floor(gs.wave/2),id=ECS.createEntity();
  const subtypes=['fork','knife','spoon'];
  ECS.add(id,'enemy',{type,subtype:type==='utensil'?subtypes[Math.floor(Math.random()*3)]:undefined});
  ECS.add(id,'pos',{x,y,angle:0}); ECS.add(id,'vel',{vx:0,vy:0});

  const isCor = type === 'corRed' || type === 'corBlue';
  if (!isCor) {
    ECS.add(id,'hp',{hp:Math.ceil(baseHp*def.hpMult), maxHp:Math.ceil(baseHp*def.hpMult), hitFlash:0});
  }

  ECS.add(id,'physics',{speed:(1.2+Math.random()*0.6+gs.wave*0.12)*def.speedMult});
  taskManagerApplySpawnNerf(id, type);
  const ai = ECS.add(id,'ai',{
    shootCooldown:120,
    ambushTimer:0,
    diveTimer:0,
    dashHit:false,
    balloonOrient:type==='waterballoon'?Math.floor(Math.random()*4):0,
  });
  if (type === 'corRed') {
    ai.corState = 'warning';
    ai.corStateTimer = 60;
    ai.corTrail = [];
  } else if (type === 'corBlue') {
    ai.corState = 'hover';
    ai.corStateTimer = 42;
    ai.corOriginX = x;
    ai.corOriginY = y;
    ai.corHoverTime = Math.random() * 10;
    ai.corShotsFired = 0;
    ai.corSpinAngle = 0;
    ai.corParticles = spawnCorSpriteFragments({ x, y }, blueCorImg, 12);
  }
  if (type === 'utensil') {
    ai.windowActive = x < 0 || x > worldW || y < 0 || y > worldH;
    if (ai.windowActive) ai.windowGroup = ++utensilWindowGroupSequence;
  }
  spawnParticles(x, y, isCor ? def.color : '#ff4400', isCor ? 14 : 10);
if (type === 'utensil') SFX.playAt('utensilSpawn', x, y, 0.45);
if (type === 'waterballoon') SFX.playAt('balloonSpawn', x, y, 0.5);
if (type === 'partyHat') SFX.playAt('partyHatSpawn', x, y, 0.5);
if (type === 'corRed') SFX.playAt('RedCORAppear', x, y, 0.65);
if (type === 'corBlue') SFX.playAt('BlueCORAppear', x, y, 0.65);
}

function startAntipieBoss(centered = false) {
  if (!gameRunning || gs.floor !== 1 || gs.wave <= CFG.BOSS_WAVE || gs.bossActive) return;

  const mainRect = canvas.getBoundingClientRect();
  const placeRight = window.innerWidth - mainRect.right >= mainRect.left;
  const bounds = antipieVisibleWorldBounds();
  const centerX = (bounds.left + bounds.right) / 2;
  const centerY = (bounds.top + bounds.bottom) / 2;
  const bosses = centered
    ? [
      { x: centerX - (bounds.right - bounds.left) * 0.22, y: centerY, useLayer2ForAll: false, label: 'CURRENT SHEETS' },
      { x: centerX + (bounds.right - bounds.left) * 0.22, y: centerY, useLayer2ForAll: true, label: 'LAYER 2 SCALED' },
    ]
    : [{ x: placeRight ? worldW + 220 : -220, y: worldH / 2, useLayer2ForAll: false, label: '' }];
  let firstBossId = null;
  for (const boss of bosses) {
    const id = ECS.createEntity();
    const bossHp = centered ? 1_000_000_000 : CFG.BOSS_BASE_HP + gs.wave * 12;
    ECS.add(id, 'enemy', { type: 'cakeBoss' });
    ECS.add(id, 'pos', { x: boss.x, y: boss.y, angle: 0 });
    ECS.add(id, 'vel', { vx: 0, vy: 0 });
    ECS.add(id, 'hp', { hp: bossHp, maxHp: bossHp, hitFlash: 0 });
    ECS.add(id, 'physics', { speed: CFG.BOSS_SPEED });
    taskManagerApplySpawnNerf(id, 'cakeBoss');
    ECS.add(id, 'ai', {
      antipieBoss: true,
      antipieComparison: centered,
      antipieUseLayer2ForAll: boss.useLayer2ForAll,
      antipieLabel: boss.label,
      comparisonAnchorX: boss.x,
      comparisonAnchorY: boss.y,
      orbitAngle: Math.random() * Math.PI * 2,
      orbitSpeed: 0.006 + Math.random() * 0.005,
      orbitRadiusX: 0,
      orbitRadiusY: 0,
      orbitRetargetTimer: 0,
      layerSpinFrames: [0, 0, 0],
      layerSpinFrameTicks: [0, 0, 0],
      layerSpinFrameCounts: boss.useLayer2ForAll ? [24, 24, 24] : [36, 24, 44],
      windowActive: false,
    });
    spawnParticles(boss.x, boss.y, '#ff69b4', 20);
    if (firstBossId === null) firstBossId = id;
  }
  gs.bossId = firstBossId;
  gs.bossActive = true;
  gs.spawnTimer = 0;
  gs.antipieDarkness = 1;
  gs.antipieArenaBounds = true;
  showMsg('ANTIPIE HAS ENTERED THE DESKTOP!');
}

function shoot() {
  if (gs.ammo<=0||gs.reloading) return;
  gs.ammo--; muzzleFlash=10; updateHUD(); gunRecoil=1.0;
    SFX.playRandom(['shoot1','shoot2','shoot3','shoot4'], 0.55);

  gs.shakeX=(Math.random()-.5)*13; gs.shakeY=(Math.random()-.5)*13;
  const muzzle=gunMuzzlePos();
  const aimedOutside = mouse.x < 0 || mouse.x > worldW || mouse.y < 0 || mouse.y > worldH;
  const travelsOffscreen = !!gs.clippyWindowActive || aimedOutside;
  const targetDistance = Math.hypot(mouse.x - muzzle.x, mouse.y - muzzle.y);

  // ── Bowling Ball shot ──
  if (gs.bowlingBallReady) {
    gs.bowlingBallReady = false;
    const dmg = baseBulletDamage() * 8; // always full multiplier, never dud
    gs.bullets.push({
      x: muzzle.x, y: muzzle.y,
      vx: Math.cos(gunAngle) * 10.0,
      vy: Math.sin(gunAngle) * 10.0,
      angle: gunAngle,
      life: travelsOffscreen ? Math.max(220, Math.ceil(targetDistance / 10) + 4) : 220,
      maxLife: travelsOffscreen ? Math.max(220, Math.ceil(targetDistance / 10) + 4) : 220,
      damageMult: dmg,
      isDud: false,
      travelsOffscreen,
      isBowlingBall: true,
      bounces: 0,
      hitEnemies: new Set(), // pierce tracking
    });
    gs.shakeX = (Math.random()-.5)*8; gs.shakeY = (Math.random()-.5)*8;
    spawnParticles(muzzle.x, muzzle.y, '#aaaaaa', 10);
    showMsg('STRIKE!!!');
    return;
  }

  let doubleCount=0;
  const totalBullets=CFG.BULLET_COUNT+(gs.hasCursedCandles?gs.candlesLit*2:0);
  for (let i=0;i<totalBullets;i++) {
    const a=gunAngle+(Math.random()-.5)*.32;
    let damageMult = baseBulletDamage();
    let isDud = false;
    if (gs.hasQuadCake)        { if (Math.random() < 0.50) isDud = true; }
    else if (gs.hasTripleCake) { if (Math.random() < 0.45) isDud = true; }
    else if (gs.hasDoubleCake) { if (Math.random() < 0.40) isDud = true; }
    const finalMult = isDud ? 1 : damageMult * (gs.sfpFull ? 1.5 : 1);
    const bulletLife = travelsOffscreen
      ? Math.max(CFG.BULLET_LIFE, Math.ceil(targetDistance / CFG.BULLET_SPEED) + 4)
      : CFG.BULLET_LIFE;
    gs.bullets.push({
      x: muzzle.x, y: muzzle.y,
      vx: Math.cos(a) * CFG.BULLET_SPEED,
      vy: Math.sin(a) * CFG.BULLET_SPEED,
      angle: a, life: bulletLife,
      damageMult: finalMult, isDud,
      travelsOffscreen
    });
  }
  spawnParticles(muzzle.x,muzzle.y,doubleCount>0?'#ff44ff':'#ff8800',doubleCount>0?8:6);
}

function startReload() {
  if (gs.reloading||gs.ammo===emailAmmoCapacity()) return;
  notifyEmailReloaded();
  gs.reloading=true; gs.reloadTimer=CFG.RELOAD_FRAMES; showMsg('RELOADING...');
    SFX.playRandom(['reloadStart1','reloadStart2','reloadStart3'], 0.5);

}

function tryDash() {
  if (!gs.hasDash||gs.dashCharges<=0||gs.dashTimer>0) return;
  gs.dashCharges--; updateHUD();
  const ppos=ECS.get(gs.playerId,'pos'),pvel=ECS.get(gs.playerId,'vel');
  const spd=Math.hypot(pvel.vx,pvel.vy);
  if (spd>0.3){gs.dashVx=pvel.vx/spd;gs.dashVy=pvel.vy/spd;}
  else{gs.dashVx=Math.cos(gunAngle);gs.dashVy=Math.sin(gunAngle);}
  gs.dashWindupTimer=CFG.DASH_WINDUP_FRAMES;
  gs.dashLaunchFrame=0;
  gs.dashActiveThisFrame=false;
  gs.dashBurst=null;
  gs.dashTimer=CFG.DASH_FRAMES+CFG.DASH_WINDUP_FRAMES;
  gs.invincible=Math.max(gs.invincible,gs.dashTimer+4);
}

function checkWave() {
  if (gs.bossActive) return;
  const total = ECS.query('enemy').size;
  if (gs.waveKills + total < gs.waveEnemiesLeft || total > 0) return;
  const completed = gs.wave;
  emailOnWaveCompleted(completed);
  if (completed === CFG.BOSS_WAVE) {
    SFX.play('omini', 0.55, () => {
      setTimeout(() => INTRO.spawnAntipieApp(), 4500);
    });
  } else {
    SFX.play(completed > CFG.BOSS_WAVE ? 'waveOverload' : 'waveComplete', 0.55);
  }
  if (gs.flawlessThisWave) {
    gs.flawlessWaveStreak++;
    if (gs.flawlessWaveStreak >= CFG.GOLDEN_CHIP_WAVE_STREAK) {
      gs.flawlessWaveStreak = 0;
      const x = 80 + Math.random() * (worldW - 160);
      const y = 80 + Math.random() * (worldH - 160);
      gs.chipDrops.push({ x, y, golden: true });
      spawnParticles(x, y, '#ffe45c', 18);
      setTimeout(() => showMsg('GOLDEN CHIP DROPPED — FIND IT!'), 0);
    }
  } else {
    gs.flawlessWaveStreak = 0;
  }

    if (gs.hasFlawlessBaking && gs.flawlessThisWave) {
      gs.maxAmmo += 2;
      if (gs.hasExtraClips) {
        const previousMaxAmmo = gs.maxAmmo;
        gs.maxAmmo = Math.ceil(gs.maxAmmo * 1.25);
        gs.extraClipsAmmoBonus = (gs.extraClipsAmmoBonus || 0) + gs.maxAmmo - previousMaxAmmo;
      }
      gs.ammo = Math.min(gs.ammo + 2, emailAmmoCapacity());
      updateHUD();
      showMsg('FLAWLESS BAKING! +2 MAX AMMO!');
      spawnPartyParticles(CFG.W/2, CFG.H/2);
    }

   if (gs.floor === 2) {
  const f2wave = gs.wave - 11;
  gs.waveEnemiesLeft = CFG.WAVE_ENEMIES_FLOOR2_BASE + Math.max(1, f2wave) * CFG.WAVE_ENEMIES_FLOOR2_GROWTH;
  gs.spawnInterval = Math.max(75, CFG.SPAWN_INTERVAL_BASE - Math.max(1, f2wave) * CFG.WAVE_SPAWN_SPEEDUP);
} else {
  gs.waveEnemiesLeft = CFG.WAVE_ENEMIES_BASE + gs.wave * CFG.WAVE_ENEMIES_GROWTH;
  gs.spawnInterval = Math.max(55, CFG.SPAWN_INTERVAL_BASE - gs.wave * CFG.WAVE_SPAWN_SPEEDUP);
}

    gs.waveKills=0; gs.flawlessThisWave=true;
    if (gs.hasCursedCandles&&gs.candlesLit>0) {
      gs.maxAmmo=Math.max(CFG.MAX_AMMO,gs.maxAmmo-gs.candlesLit*2);
      gs.ammo=Math.min(gs.ammo,emailAmmoCapacity()); gs.candlesLit=0; gs.candleHpTimer=0;
      gs.candleRelightDelay=180; showMsg('CANDLES SNUFFED! THEY WILL RELIGHT...');
    }
    updateHUD();
   
gs.wave++;
const itemChoiceWaveInterval = gs._difficultyLabel === 'EASY' ? 3
  : gs._difficultyLabel === 'HARD' ? 5
    : 4;

if (gs.floor === 2 && gs.wave === CFG.BOSS2_WAVE) {
      // ... boss2 spawn 
      gs.bossActive = true;
      // spawn boss2
      const ppos = ECS.get(gs.playerId, 'pos');
      const x = ppos.x > worldW/2 ? 160 : worldW - 160;
      const y = ppos.y > worldH/2 ? 160 : worldH - 160;
      const id = ECS.createEntity();
      ECS.add(id, 'enemy', { type: 'boss2' });
      ECS.add(id, 'pos', { x, y, angle: 0 });
      ECS.add(id, 'vel', { vx: 0, vy: 0 });
      const b2hp = CFG.BOSS_BASE_HP + gs.wave * 16;
      ECS.add(id, 'hp', { hp: b2hp, maxHp: b2hp, hitFlash: 0 });
      ECS.add(id, 'physics', { speed: CFG.BOSS_SPEED * 1.1 });
      taskManagerApplySpawnNerf(id, 'boss2');
     ECS.add(id, 'ai', {
  bossPhase: 'IDLE', phaseTimer: 100,
  spiralAngle: 0, volleyCount: 0, volleyTimer: 0,
  shootCooldown: 120, ambushTimer: 0, diveTimer: 0, dashHit: false,
  balloonOrient: Math.floor(Math.random() * 4)
});

      
      gs.bossId = id;
      showMsg('THE RINGMASTER BOSS — WAVE ' + gs.wave + '!');
    } else if (completed !== CFG.BOSS_WAVE && completed % itemChoiceWaveInterval === 0) {
      setTimeout(()=>offerItemChoice(),300);
    } else {
      showMsg(`WAVE ${gs.wave} - INCOMING!`); trySpawnFieldItems();
    }
    
  }



function trySpawnFieldItems() {
  const now=Date.now();
  const permanent=new Set(['bouncy','dash','doubledCake','tripleCake','quadCake','shakeFizzlePop','flawlessBaking','cursedCandles','glowsticks','paperCuts','extraClips','clownishUpgrade','popcornBowl']);
  for (const id of gs.unlockedItems) {
    if (gs.fieldItems.some(fi=>fi.id===id)) continue;
    if (id==='bouncy'&&gs.bouncyHouse) continue;
    if (id==='dash'&&gs.hasDash) continue;
    if (id==='doubledCake'&&gs.hasDoubleCake) continue;
    if (id==='tripleCake'&&gs.hasTripleCake) continue;
    if (id==='quadCake'&&gs.hasQuadCake) continue;
    if (id==='shakeFizzlePop'&&gs.hasShakeFizzlePop) continue;
    if (id==='flawlessBaking'&&gs.hasFlawlessBaking) continue;
    if (id==='cursedCandles'&&gs.hasCursedCandles) continue;
    if (id==='glowsticks') continue;
    if (id==='paperCuts'&&gs.hasPaperCuts) continue;
    if (id==='extraClips'&&gs.hasExtraClips) continue;
    if (id==='clownishUpgrade'&&gs.hasClownishUpgrade) continue;
    if (id==='popcornBowl'&&gs.hasPopcornBowl) continue;
    const def=ITEM_DEFS[id],last=gs.itemCooldowns[id]||0;
    if (now-last>=def.spawnCooldown||last===0)
      gs.fieldItems.push({id,x:80+Math.random()*(worldW-160),y:80+Math.random()*(worldH-160),phase:Math.random()*Math.PI*2});
  }
}

const GENERAL_ITEM_IDS=['paperCuts','extraClips'];



function tryDropTicket(x, y) {
  const dropChance = Math.min(1, CFG.CHIP_DROP_CHANCE * (gs._chipDropChanceMult || 1));
  if (Number.isFinite(x) && Number.isFinite(y) && Math.random() < dropChance) {
    gs.chipDrops.push({ x, y });
  }
  if (gs.floor!==2) return;
  if (Math.random()<0.5&&gs.tickets<10){gs.tickets++;updateHUD();}
}

function spinPrizeWheel() {
  if (!gameRunning) return;
  if (gs.floor!==2||gs.tickets<3) {
    SFX.play('notAllowed', 0.65);
    return;
  }
  gs.tickets-=3; updateHUD();
  const roll=Math.random(); let name;
  if(roll<0.18){name="🔴 CURSED SPIN! ENEMIES ENRAGED!";gs.cursedSpinTimer=480;for(const eid of ECS.query('enemy','physics','ai')){const ephy=ECS.get(eid,'physics');ephy._cursedBase=ephy._cursedBase||ephy.speed;ephy.speed=ephy._cursedBase*1.5;ECS.get(eid,'ai').cursedDmgBoost=true;}spawnParticles(ECS.get(gs.playerId,'pos').x,ECS.get(gs.playerId,'pos').y,'#ff0000',20);gs.prizeEffect={name,timer:480};}
  else if(roll<0.36){name="🟡 SUGAR RUSH! 3x SPEED!";gs.sugarRushActive=true;gs.speedBoostTimer=600;gs.speedBoostMult=3;gs.prizeEffect={name,timer:600};}
  else if(roll<0.52){name="🟢 BIG WINNER! FULL HEAL!";gs.health=gs.maxHealth;gs.invincible=300;spawnPartyParticles(ECS.get(gs.playerId,'pos').x,ECS.get(gs.playerId,'pos').y);gs.prizeEffect={name,timer:180};updateHUD();}
  else if(roll<0.68){name="🔵 RICOCHET! CHAIN BULLETS!";gs.ricochetActive=true;gs.prizeEffect={name,timer:600};}
  else if(roll<0.84){name="🟣 SPOTLIGHT! ENEMIES FROZEN!";gs.partyFreezeTimer=180;spawnPartyParticles(ECS.get(gs.playerId,'pos').x,ECS.get(gs.playerId,'pos').y);gs.prizeEffect={name,timer:180};}
  else{name="⚪ DUD. YOU GOT SCAMMED.";gs.prizeEffect={name,timer:180};}
  showMsg(name);
}

function handleBossDeath(id) {
  if (gs.bossId !== id) return;
  gs.bossActive = false;
  gs.bossId = null;
  gs.waveKills = 0;
  gs.waveEnemiesLeft = CFG.WAVE_ENEMIES_BASE + gs.wave * CFG.WAVE_ENEMIES_GROWTH;
  gs.spawnInterval = Math.max(55, CFG.SPAWN_INTERVAL_BASE - gs.wave * CFG.WAVE_SPAWN_SPEEDUP);
  gs.flawlessThisWave = true;
  updateHUD();
  showMsg('BOSS DEFEATED! ARENA EXPANDING...');
  // Delay the transition slightly so death particles finish
  setTimeout(() => {
    gs.transitioning = true;
    gs.transitionT = 0;
    gs.transitionStartW = worldW;
    gs.transitionStartH = worldH;
    gs.transitionEndW = gs.transitionStartW * 1.5;
    gs.transitionEndH = gs.transitionStartH * 1.5;
    gs.transitionDone = false;
  }, 1200);
}
