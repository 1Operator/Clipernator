// ============================================================
// CLIPBLAST: PARTY HUNTER — Enemy Definitions + Behavior Trees 
// ============================================================

const BOSS_PHASE = {
  IDLE:           'IDLE',
  SLAM_TELEGRAPH: 'SLAM_TELEGRAPH',
  SLAM_STRIKE:    'SLAM_STRIKE',
  SLAM_RECOVER:   'SLAM_RECOVER',
  SPIRAL:         'SPIRAL',
  VOLLEY:         'VOLLEY',
};

// ================================================================
// BEHAVIOR TREES
// ================================================================

const BT_UTENSIL = new BTSelector(
  new BTAction((id, gs) => {
    if (gs.frozen) return BT.RUNNING;
    const pos = ECS.get(id, 'pos');
    const vel = ECS.get(id, 'vel');
    const phy = ECS.get(id, 'physics');
    const ai  = ECS.get(id, 'ai');
    const pp  = playerPos(gs);
    if (!pp || !pos || !vel) return BT.FAILURE;

    const subtype = ECS.get(id, 'enemy').subtype || 'fork';

    // ── Init ──
    if (ai.uState        === undefined) ai.uState        = 'IDLE';
    if (ai.uOrbitAngle   === undefined) ai.uOrbitAngle   = Math.random() * Math.PI * 2;
    if (ai.uOrbitDirection === undefined) ai.uOrbitDirection = Math.random() < 0.5 ? -1 : 1;
    if (ai.uLaunchTimer  === undefined) ai.uLaunchTimer  = 80 + Math.floor(Math.random() * 60);
    if (ai.uActiveIdx    === undefined) ai.uActiveIdx    = -1;
    if (ai.uLaunchDir    === undefined) ai.uLaunchDir    = null;
    if (ai.uTravelTimer  === undefined) ai.uTravelTimer  = 0;
    if (ai.uForkGrabTimer === undefined) ai.uForkGrabTimer = 0;
    if (ai.uTelegraphTimer === undefined) ai.uTelegraphTimer = 0;
    if (ai.uGrabbedId    === undefined) ai.uGrabbedId    = null;  // fork: grabbed entity id
    if (ai.uPullTimer    === undefined) ai.uPullTimer    = 0;     // fork: pull-in frames
    if (ai.uHoldTimer    === undefined) ai.uHoldTimer    = 0;     // fork: windup before throw

    const dx = pp.x - pos.x, dy = pp.y - pos.y, dist = Math.hypot(dx, dy) || 1;

    // ── Body drifts toward player ──
  const UTENSIL_STOP_DIST = 360;
const driftMult = dist > UTENSIL_STOP_DIST ? 0.28 : (dist > 100 ? 0.04 : -0.18);
const orbitMult = dist > UTENSIL_STOP_DIST ? 0.08 : 0.18;
const driftX = dx / dist * driftMult - dy / dist * orbitMult * ai.uOrbitDirection;
const driftY = dy / dist * driftMult + dx / dist * orbitMult * ai.uOrbitDirection;
vel.vx = (vel.vx || 0) * 0.88 + driftX * phy.speed;
vel.vy = (vel.vy || 0) * 0.88 + driftY * phy.speed;
    const spd = Math.hypot(vel.vx, vel.vy);
    if (spd > phy.speed) { vel.vx = vel.vx / spd * phy.speed; vel.vy = vel.vy / spd * phy.speed; }

    // ── Tick down player fork-grab ──
    if (ai.uForkGrabTimer > 0) {
      ai.uForkGrabTimer--;
      const pvel = ECS.get(gs.playerId, 'vel');
      if (pvel) { pvel.vx *= 0.35; pvel.vy *= 0.35; }
      gs.forkGrabbed = true;
      if (ai.uForkGrabTimer <= 0) { gs.forkGrabbed = false; showMsg('FORK RELEASED!'); }
    }

    // ================================================================
    // FORK STATE MACHINE
    // ================================================================
    if (subtype === 'fork') {

      // ── IDLE: orbit, then decide target ──
      if (ai.uState === 'IDLE') {
        ai.uOrbitAngle += 0.045;
        ai.uLaunchTimer--;

        if (ai.uLaunchTimer <= 0 && dist < 400) {
          // Decide target: nearest giftbox within 220px, else player
          let forkTargetId = null;
          let forkTargetPos = null;
          let nearestGift = 999999;

          for (const eid of ECS.query('enemy', 'pos', 'ai')) {
            if (eid === id) continue;
            const etype = ECS.get(eid, 'enemy').type;
            const eai2  = ECS.get(eid, 'ai');
            if (etype !== 'giftBox' && etype !== 'utensil') continue; // only grab giftboxes or other enemies
            if (eai2 && eai2.heldByPlayer) continue; // skip player-held boxes
            const ep = ECS.get(eid, 'pos');
            const d  = Math.hypot(ep.x - pos.x, ep.y - pos.y);
            if (d < 220 && d < nearestGift) { nearestGift = d; forkTargetId = eid; forkTargetPos = ep; }
          }

          // Only prefer giftbox if it's closer than the player
          if (forkTargetId && nearestGift < dist) {
            ai.uForkTargetId = forkTargetId;
            ai.uState = 'FORK_GRAB_TELEGRAPH';
            ai.uTelegraphTimer = 24;
            const fdx = forkTargetPos.x - pos.x, fdy = forkTargetPos.y - pos.y;
            const fd = Math.hypot(fdx, fdy) || 1;
            ai.uLaunchDir = { x: fdx / fd, y: fdy / fd };
            ai.uTipX = pos.x + Math.cos(ai.uOrbitAngle) * 20;
            ai.uTipY = pos.y + Math.sin(ai.uOrbitAngle) * 20;
          } else {
            // Target nearest enemy (not giftbox, not self) within range for grab-and-throw
            let nearestEnemy = null, nearestEnemyDist = 999999, nearestEnemyId = null;
            for (const eid of ECS.query('enemy', 'pos')) {
              if (eid === id) continue;
              const etype = ECS.get(eid, 'enemy').type;
              if (etype === 'miniClown' || etype === 'corRed' || etype === 'corBlue') continue;
              const ep = ECS.get(eid, 'pos');
              const d  = Math.hypot(ep.x - pos.x, ep.y - pos.y);
              if (d < 260 && d < nearestEnemyDist) {
                nearestEnemyDist = d; nearestEnemy = ep; nearestEnemyId = eid;
              }
            }

            if (nearestEnemyId) {
              ai.uForkTargetId = nearestEnemyId;
              ai.uState = 'FORK_GRAB_TELEGRAPH';
              ai.uTelegraphTimer = 24;
              const fdx = nearestEnemy.x - pos.x, fdy = nearestEnemy.y - pos.y;
              const fd = Math.hypot(fdx, fdy) || 1;
              ai.uLaunchDir = { x: fdx / fd, y: fdy / fd };
              ai.uTipX = pos.x + Math.cos(ai.uOrbitAngle) * 20;
              ai.uTipY = pos.y + Math.sin(ai.uOrbitAngle) * 20;
            } else {
              // No grab target — stab player directly (original behaviour)
              ai.uForkTargetId = null;
              ai.uState = 'TELEGRAPH';
              ai.uActiveIdx = 0; // fork is always index 0 conceptually
              ai.uTelegraphTimer = 28;
              ai.uLaunchDir = { x: dx / dist, y: dy / dist };
              ai.uTipX = pos.x + Math.cos(ai.uOrbitAngle) * 20;
              ai.uTipY = pos.y + Math.sin(ai.uOrbitAngle) * 20;
            }
            ai.uLaunchTimer = 100 + Math.floor(Math.random() * 60);
          }
        }
      }

      // ── FORK_GRAB_TELEGRAPH: wobble tines toward target ──
      else if (ai.uState === 'FORK_GRAB_TELEGRAPH') {
        ai.uTelegraphTimer--;
        if (ai.uTelegraphTimer % 5 === 0) spawnParticles(ai.uTipX, ai.uTipY, '#ffcc88', 4);
        const orbitA = ai.uOrbitAngle;
        ai.uTipX = pos.x + Math.cos(orbitA) * 20 + Math.sin(Date.now() / 60) * 4;
        ai.uTipY = pos.y + Math.sin(orbitA) * 20 + Math.sin(Date.now() / 80) * 4;
        if (ai.uTelegraphTimer <= 0) {
          // Validate target still exists
          if (ai.uForkTargetId && ECS.has(ai.uForkTargetId, 'pos')) {
            const tpos = ECS.get(ai.uForkTargetId, 'pos');
            const fdx = tpos.x - pos.x, fdy = tpos.y - pos.y, fd = Math.hypot(fdx, fdy) || 1;
            ai.uLaunchDir = { x: fdx / fd, y: fdy / fd };
            ai.uTipVx = ai.uLaunchDir.x * 10;
            ai.uTipVy = ai.uLaunchDir.y * 10;
          } else {
            // Target gone — abort
            ai.uState = 'IDLE'; ai.uForkTargetId = null; return BT.RUNNING;
          }
          ai.uTravelTimer = 0;
          ai.uState = 'FORK_REACHING';
          SFX.playAt('forkAttack', pos.x, pos.y, 0.5);
          spawnParticles(pos.x, pos.y, '#ffcc88', 8);
        }
      }

      // ── FORK_REACHING: tines fly toward grabbed target ──
      else if (ai.uState === 'FORK_REACHING') {
        ai.uTipX += ai.uTipVx;
        ai.uTipY += ai.uTipVy;
        ai.uTravelTimer++;

        const maxTravel = ai.uTravelTimer > 60;

        // ── Player stab (fallback if no target) ──
        if (!ai.uForkTargetId) {
          const ppos2 = ECS.get(gs.playerId, 'pos');
          if (ppos2 && Math.hypot(ai.uTipX - ppos2.x, ai.uTipY - ppos2.y) < 22 && gs.invincible <= 0) {
            ai.uForkGrabTimer = 75; gs.forkGrabbed = true;
            SFX.playAt('forkHit', ai.uTipX, ai.uTipY, 0.5);
            SFX.playRandom(['forkGrab', 'forkGrab2'], 0.55);
            showMsg('FORK GRABBED YOU! WIGGLE FREE!');
            spawnParticles(ai.uTipX, ai.uTipY, '#ffcc88', 14);
            ai.uState = 'RETURN'; return BT.RUNNING;
          }
        }

        // ── Check hit on intended grab target ──
        if (ai.uForkTargetId && ECS.has(ai.uForkTargetId, 'pos')) {
          const tpos = ECS.get(ai.uForkTargetId, 'pos');
          if (Math.hypot(ai.uTipX - tpos.x, ai.uTipY - tpos.y) < 28) {
            // Grabbed!
            ai.uGrabbedId  = ai.uForkTargetId;
            ai.uForkTargetId = null;
            ai.uPullTimer  = 35;
            ai.uState      = 'FORK_PULLING';
            SFX.playAt('forkHit', tpos.x, tpos.y, 0.45);
            // Freeze the grabbed entity's velocity
            const gvel = ECS.get(ai.uGrabbedId, 'vel');
            if (gvel) { gvel.vx = 0; gvel.vy = 0; }
            spawnParticles(tpos.x, tpos.y, '#ffcc88', 12);
            showMsg('FORK GRABS ENEMY!');
            return BT.RUNNING;
          }
        }

        if (maxTravel) { ai.uState = 'RETURN'; ai.uForkTargetId = null; }
      }

      // ── FORK_PULLING: drag grabbed entity back toward body ──
      else if (ai.uState === 'FORK_PULLING') {
        ai.uPullTimer--;

        if (!ai.uGrabbedId || !ECS.has(ai.uGrabbedId, 'pos')) {
          // Entity died while being pulled
          ai.uGrabbedId = null; ai.uState = 'IDLE'; return BT.RUNNING;
        }

        const gpos = ECS.get(ai.uGrabbedId, 'pos');
        const gvel = ECS.get(ai.uGrabbedId, 'vel');

        // Pull toward body
        const pdx = pos.x - gpos.x, pdy = pos.y - gpos.y;
        const pd  = Math.hypot(pdx, pdy) || 1;
        if (gvel) { gvel.vx = (pdx / pd) * 9; gvel.vy = (pdy / pd) * 9; }

        // Keep tip at grabbed entity
        ai.uTipX = gpos.x; ai.uTipY = gpos.y;

        // Close enough or timer done → enter hold/windup
        if (pd < 30 || ai.uPullTimer <= 0) {
          if (gvel) { gvel.vx = 0; gvel.vy = 0; }
          ai.uHoldTimer = 40;
          ai.uState = 'FORK_HOLDING';
        }
      }

      // ── FORK_HOLDING: windup, then arc-throw toward player ──
     // ── FORK_HOLDING: windup, then arc-throw toward player ──
      else if (ai.uState === 'FORK_HOLDING') {
        ai.uHoldTimer--;

        if (!ai.uGrabbedId || !ECS.has(ai.uGrabbedId, 'pos')) {
          ai.uGrabbedId = null; ai.uState = 'IDLE'; return BT.RUNNING;
        }

        const gpos = ECS.get(ai.uGrabbedId, 'pos');
        const gvel = ECS.get(ai.uGrabbedId, 'vel');

        // Windup: pull grabbed entity back behind the fork body, then sweep forward
        const windupRatio = 1 - (ai.uHoldTimer / 40); // 0→1 as timer counts down
        const aimAngle = Math.atan2(pp.y - pos.y, pp.x - pos.x);

        if (ai.uHoldTimer > 10) {
          // Pull back phase: orbit behind the body opposite to player direction
          const pullAngle = aimAngle + Math.PI + Math.sin(windupRatio * Math.PI) * 0.6;
          const pullDist = 28 + windupRatio * 10;
          gpos.x = pos.x + Math.cos(pullAngle) * pullDist;
          gpos.y = pos.y + Math.sin(pullAngle) * pullDist;
          ai.uTipX = gpos.x;
          ai.uTipY = gpos.y;
          if (gvel) { gvel.vx = 0; gvel.vy = 0; }
          // Warning particles during windup
          if (ai.uHoldTimer % 6 === 0) spawnParticles(pos.x, pos.y, '#ff8800', 5);
        } else {
          // Sweep forward phase: snap the tip out toward player fast
          const sweepRatio = 1 - (ai.uHoldTimer / 10); // 0→1 in final 10 frames
          const sweepDist = 28 + sweepRatio * 44; // tip flies out 44px in front
          gpos.x = pos.x + Math.cos(aimAngle) * sweepDist;
          gpos.y = pos.y + Math.sin(aimAngle) * sweepDist;
          ai.uTipX = gpos.x;
          ai.uTipY = gpos.y;
          if (gvel) { gvel.vx = 0; gvel.vy = 0; }
        }

        if (ai.uHoldTimer <= 0) {
          if (!ai.uGrabbedId || !ECS.has(ai.uGrabbedId, 'pos')) {
            ai.uGrabbedId = null; ai.uState = 'IDLE'; return BT.RUNNING;
          }

          const gai  = ECS.get(ai.uGrabbedId, 'ai');

          // Detach from fork
          if (gai) { gai.juggled = false; gai.juggledBy = null; }

          // Place at the swept-out tip position so it launches from in front
          gpos.x = ai.uTipX;
          gpos.y = ai.uTipY;

          // Launch toward player
          const targetX = pp.x, targetY = pp.y;
          const dx2 = targetX - gpos.x, dy2 = targetY - gpos.y;
          const d2 = Math.hypot(dx2, dy2) || 1;
          const throwSpd = 11 + Math.min(dist / 40, 5);
          if (gvel) {
            gvel.vx = (dx2 / d2) * throwSpd;
            gvel.vy = (dy2 / d2) * throwSpd;
          }

          // Tag it so sysEnemyPlayerCollision deals bonus damage on impact
          if (gai) {
            gai.thrownByFork = true;
            gai.forkThrowTimer = 90;
            // Clear juggled state so sysAI processes movement normally
            gai.juggled = false;
            gai.juggledBy = null;
          }

          spawnParticles(gpos.x, gpos.y, '#ffcc88', 20);
          spawnParticles(gpos.x, gpos.y, '#ff8800', 12);
          showMsg('FORK LAUNCHES AN ENEMY!');

          ai.uGrabbedId = null;
          ai.uState = 'RETURN';
          ai.uLaunchTimer = 120 + Math.floor(Math.random() * 60);
        }
      }

      // ── RETURN: tines snap back ──
      else if (ai.uState === 'RETURN') {
        const rdx = pos.x - ai.uTipX, rdy = pos.y - ai.uTipY;
        const rd  = Math.hypot(rdx, rdy) || 1;
        ai.uTipX += (rdx / rd) * 10;
        ai.uTipY += (rdy / rd) * 10;
        if (rd < 22) { ai.uState = 'IDLE'; ai.uActiveIdx = -1; ai.uForkTargetId = null; spawnParticles(pos.x, pos.y, '#cccccc', 4); }
      }

      // ── Legacy TELEGRAPH/LAUNCH for player-stab fallback ──
      else if (ai.uState === 'TELEGRAPH') {
        ai.uTelegraphTimer--;
        if (ai.uTelegraphTimer % 5 === 0) spawnParticles(ai.uTipX, ai.uTipY, '#ffcc88', 4);
        const orbitA = ai.uOrbitAngle;
        ai.uTipX = pos.x + Math.cos(orbitA) * 20 + Math.sin(Date.now() / 60) * 5;
        ai.uTipY = pos.y + Math.sin(orbitA) * 20 + Math.sin(Date.now() / 80) * 5;
        if (ai.uTelegraphTimer <= 0) {
          const ldx = pp.x - pos.x, ldy = pp.y - pos.y, ldist = Math.hypot(ldx, ldy) || 1;
          ai.uLaunchDir = { x: ldx / ldist, y: ldy / ldist };
          ai.uTipVx = ai.uLaunchDir.x * 9;
          ai.uTipVy = ai.uLaunchDir.y * 9;
          ai.uTravelTimer = 0;
          ai.uState = 'LAUNCH';
          SFX.playAt('forkAttack', pos.x, pos.y, 0.5);
          spawnParticles(pos.x, pos.y, '#ffcc88', 10);
        }
      }

      else if (ai.uState === 'LAUNCH') {
        ai.uTipX += ai.uTipVx;
        ai.uTipY += ai.uTipVy;
        ai.uTravelTimer++;
        const maxTravel = ai.uTravelTimer > 65;
        const ppos2 = ECS.get(gs.playerId, 'pos');
        if (ppos2 && Math.hypot(ai.uTipX - ppos2.x, ai.uTipY - ppos2.y) < 22 && gs.invincible <= 0) {
          ai.uForkGrabTimer = 75; gs.forkGrabbed = true;
          SFX.playAt('forkHit', ai.uTipX, ai.uTipY, 0.5);
          SFX.playRandom(['forkGrab', 'forkGrab2'], 0.55);
          showMsg('FORK GRABBED YOU! WIGGLE FREE!');
          spawnParticles(ai.uTipX, ai.uTipY, '#ffcc88', 14);
          ai.uState = 'RETURN'; return BT.RUNNING;
        }
        if (maxTravel) ai.uState = 'RETURN';
      }

      return BT.RUNNING;
    }

    // ================================================================
    // KNIFE & SPOON (unchanged original logic)
    // ================================================================
    const utensils = ['fork', 'knife', 'spoon'];
    const colors   = { fork: '#ffcc88', knife: '#ccccee', spoon: '#ffddaa' };

    if (ai.uState === 'IDLE') {
      ai.uOrbitAngle += 0.045;
      ai.uLaunchTimer--;
      if (ai.uLaunchTimer <= 0 && dist < 360) {
        // knife/spoon always target player
        ai.uActiveIdx = subtype === 'knife' ? 1 : 2;
        ai.uState     = 'TELEGRAPH';
        ai.uTelegraphTimer = 28;
        ai.uLaunchDir  = { x: dx / dist, y: dy / dist };
        const orbitA   = ai.uOrbitAngle + (ai.uActiveIdx / 3) * Math.PI * 2;
        ai.uTipX = pos.x + Math.cos(orbitA) * 20;
        ai.uTipY = pos.y + Math.sin(orbitA) * 20;
        ai.uLaunchTimer = 100 + Math.floor(Math.random() * 60);
      }
    }
    else if (ai.uState === 'TELEGRAPH') {
      ai.uTelegraphTimer--;
      const warnColor = subtype === 'knife' ? '#ff4444' : '#aaddff';
      if (ai.uTelegraphTimer % 5 === 0) spawnParticles(ai.uTipX, ai.uTipY, warnColor, 4);
      const orbitA = ai.uOrbitAngle + (ai.uActiveIdx / 3) * Math.PI * 2;
      ai.uTipX = pos.x + Math.cos(orbitA) * 20 + Math.sin(Date.now() / 60) * 5;
      ai.uTipY = pos.y + Math.sin(orbitA) * 20 + Math.sin(Date.now() / 80) * 5;
      if (ai.uTelegraphTimer <= 0) {
        const ldx = pp.x - pos.x, ldy = pp.y - pos.y, ldist = Math.hypot(ldx, ldy) || 1;
        ai.uLaunchDir = { x: ldx / ldist, y: ldy / ldist };
        ai.uTipVx = ai.uLaunchDir.x * 9;
        ai.uTipVy = ai.uLaunchDir.y * 9;
        ai.uTravelTimer = 0;
        ai.uHitTargets = new Set();
        ai.uState = 'LAUNCH';
        if (subtype === 'knife') SFX.playAt('knifeAttack', pos.x, pos.y, 0.65);
        spawnParticles(pos.x, pos.y, warnColor, 10);
      }
    }
    else if (ai.uState === 'LAUNCH' || ai.uState === 'RETURN') {
      const returning = ai.uState === 'RETURN';
      if (returning) {
        const rdx = pos.x - ai.uTipX, rdy = pos.y - ai.uTipY;
        const rd = Math.hypot(rdx, rdy) || 1;
        ai.uTipX += (rdx / rd) * 10;
        ai.uTipY += (rdy / rd) * 10;
      } else {
        ai.uTipX += ai.uTipVx;
        ai.uTipY += ai.uTipVy;
        ai.uTravelTimer++;
      }
      const maxTravel = !returning && ai.uTravelTimer > 65;
      if (!ai.uHitTargets) ai.uHitTargets = new Set();

      const ppos2 = ECS.get(gs.playerId, 'pos');
      const playerHit = ppos2 && !ai.uHitTargets.has(gs.playerId)
        && Math.hypot(ai.uTipX - ppos2.x, ai.uTipY - ppos2.y) < 22;

      if (playerHit && gs.invincible <= 0) {
        ai.uHitTargets.add(gs.playerId);
        if (subtype === 'knife') {
          gs.invincible = CFG.INVINCIBLE_FRAMES;
          SFX.playAt('clippyDamage', ppos2.x, ppos2.y, 0.55);
          gs.shakeX = 16; gs.shakeY = 16; gs.flawlessThisWave = false;
          applyLeakingStatus(gs.playerId, gs); triggerSFPHit(); updateHUD();
          showMsg('KNIFE SLASH! YOU\'RE BLEEDING!');
          spawnParticles(ppos2.x, ppos2.y, '#ff2244', 16);
          if (gs.health <= 0) { gameOver(); return BT.FAILURE; }
        } else if (subtype === 'spoon') {
          applyPlayerDamage(14); gs.invincible = CFG.INVINCIBLE_FRAMES;
          SFX.playAt('spoonDamage', ppos2.x, ppos2.y, 0.55);
          SFX.playAt('clippyDamage', ppos2.x, ppos2.y, 0.45);
          gs.shakeX = 22; gs.shakeY = 22; gs.flawlessThisWave = false;
          triggerSFPHit(); updateHUD();
          const pvel = ECS.get(gs.playerId, 'vel');
          if (pvel) {
            const kd = Math.hypot(ppos2.x - ai.uTipX, ppos2.y - ai.uTipY) || 1;
            pvel.vx = ((ppos2.x - ai.uTipX) / kd) * 22;
            pvel.vy = ((ppos2.y - ai.uTipY) / kd) * 22;
            gs.spoonKnockbackTimer = 18;
          }
          for (const eid of ECS.query('enemy', 'pos', 'vel')) {
            if (eid === id) continue;
            const ep = ECS.get(eid, 'pos'), ev = ECS.get(eid, 'vel');
            const kd = Math.hypot(ep.x - ai.uTipX, ep.y - ai.uTipY);
            if (kd < 110) { ev.vx += ((ep.x - ai.uTipX) / (kd||1)) * 12; ev.vy += ((ep.y - ai.uTipY) / (kd||1)) * 12; }
          }
          spawnParticles(ai.uTipX, ai.uTipY, '#aaddff', 20);
          showMsg('SPOON LAUNCHED! KNOCKED AWAY!');
          if (gs.health <= 0) { gameOver(); return BT.FAILURE; }
        }
        ai.uState = 'RETURN'; return BT.RUNNING;
      }

      // Enemy hits (knife/spoon damage other enemies)
      if (!playerHit) {
        let killedEnemy = null;
        for (const eid of ECS.query('enemy', 'pos', 'hp', 'vel')) {
          if (eid === id || ai.uHitTargets.has(eid)) continue;
          if (!ECS.has(eid, 'pos')) continue;
          const epos = ECS.get(eid, 'pos'), ehp = ECS.get(eid, 'hp'), evel = ECS.get(eid, 'vel');
          if (Math.hypot(ai.uTipX - epos.x, ai.uTipY - epos.y) < 24) {
            ai.uHitTargets.add(eid);
            if (subtype === 'knife') {
              ehp.hp -= 15; ehp.hitFlash = 12; spawnParticles(epos.x, epos.y, '#ff2244', 8);
              if (ehp.hp <= 0) killedEnemy = { eid, x: epos.x, y: epos.y };
              else applyLeakingStatus(eid, gs);
            } else if (subtype === 'spoon') {
              ehp.hp -= 8; ehp.hitFlash = 10;
              const kd = Math.hypot(epos.x - ai.uTipX, epos.y - ai.uTipY) || 1;
              evel.vx += ((epos.x - ai.uTipX) / kd) * 14; evel.vy += ((epos.y - ai.uTipY) / kd) * 14;
              spawnParticles(epos.x, epos.y, '#aaddff', 8);
              if (ehp.hp <= 0) killedEnemy = { eid, x: epos.x, y: epos.y };
            }
            break;
          }
        }
        if (killedEnemy) {
          const { eid, x, y } = killedEnemy;
          if (ECS.has(eid, 'pos')) {
            spawnParticles(x, y, '#ff2222', 14); ECS.destroyEntity(eid);
            gs.waveKills++;
            setTimeout(() => checkWave(), 0);
          }
        }
        if (killedEnemy) { ai.uState = 'RETURN'; return BT.RUNNING; }
      }

      if (maxTravel) ai.uState = 'RETURN';
      if (returning && Math.hypot(pos.x - ai.uTipX, pos.y - ai.uTipY) < 22) {
        ai.uState = 'IDLE';
        ai.uActiveIdx = -1;
        ai.uHitTargets = null;
        spawnParticles(pos.x, pos.y, '#cccccc', 4);
      }
    }

    return BT.RUNNING;
  })
);

const BT_WATERBALLOON = new BTSelector(
  new BTAction((id, gs) => {
    if (gs.frozen) return BT.RUNNING;

   
    
    const pos = ECS.get(id,'pos'), vel = ECS.get(id,'vel'), phy = ECS.get(id,'physics');
    const ai = ECS.get(id,'ai'), pp = playerPos(gs);

     // ── Apply hat-rider buffs ──
const hatrider = ai.hatrider && ECS.has(ai.hatrider, 'pos');
if (!hatrider && ai.hatrider) ai.hatrider = null; // rider died, clear flag

    ai.rmDmgMult = (ai.hatrider && ECS.has(ai.hatrider, 'pos')) ? 2 : 1;
    
    if (!pp || !pos || !vel) return BT.FAILURE;

    // ── Init ──
    if (ai.wbState        === undefined) ai.wbState        = 'ROAM';
    if (ai.wbShootCount   === undefined) ai.wbShootCount   = 0;
    if (ai.wbShootTimer   === undefined) ai.wbShootTimer   = 180 + Math.random()*120;
    if (ai.wbAnimFrame    === undefined) ai.wbAnimFrame    = 0;
    if (ai.wbAnimTick     === undefined) ai.wbAnimTick     = 0;
    if (ai.wbTurnFrame    === undefined) ai.wbTurnFrame    = 0;
    if (ai.wbTurnTick     === undefined) ai.wbTurnTick     = 0;
    if (ai.wbShootFrame   === undefined) ai.wbShootFrame   = 0;
    if (ai.wbShootTick    === undefined) ai.wbShootTick    = 0;
    if (ai.wbFiredShots   === undefined) ai.wbFiredShots   = 0;
    if (ai.orientAngle    === undefined) ai.orientAngle    = 0;

    const dx = pp.x - pos.x, dy = pp.y - pos.y, dist = Math.hypot(dx,dy)||1;

    // Always track orientation toward player smoothly
const targetAngle = Math.atan2(dy, dx);    let ad = targetAngle - ai.orientAngle;
    while (ad >  Math.PI) ad -= Math.PI*2;
    while (ad < -Math.PI) ad += Math.PI*2;
    ai.orientAngle += ad * 0.04;
    ai.balloonOrient = ai.orientAngle;

    // ── State machine ──
if (ai.wbState === 'ROAM') {
      // Random drift — pick a wander direction and change it periodically
      if (ai._wanderAngle === undefined) ai._wanderAngle = Math.random() * Math.PI * 2;
      if (ai._wanderTimer === undefined) ai._wanderTimer = 0;
      ai._wanderTimer--;
      if (ai._wanderTimer <= 0) {
        ai._wanderAngle = Math.random() * Math.PI * 2;
        ai._wanderTimer = 40 + Math.floor(Math.random() * 50);
      }
      vel.vx = (vel.vx||0)*0.92 + Math.cos(ai._wanderAngle)*phy.speed*0.10;
      vel.vy = (vel.vy||0)*0.92 + Math.sin(ai._wanderAngle)*phy.speed*0.10;
      const spd = Math.hypot(vel.vx, vel.vy);
      if (spd > phy.speed) { vel.vx=vel.vx/spd*phy.speed; vel.vy=vel.vy/spd*phy.speed; }

      // Advance idle anim
      ai.wbAnimTick++;
      if (ai.wbAnimTick >= 8) { ai.wbAnimTick = 0; ai.wbAnimFrame = (ai.wbAnimFrame+1) % 8; }

      // Shoot countdown
const hasHatRider = ai.hatrider && ECS.has(ai.hatrider, 'pos');
// Hat-buffed balloon shoots faster (2x) not 4x — 4x was too aggressive with random drift
const hatMult = hasHatRider ? 0.65 : 1;
ai.wbShootTimer -= hatMult / (ai.clownCooldownMult || 1);
      if (ai.wbShootTimer <= 0) {
        // Stop and begin turn
        vel.vx *= 0.1; vel.vy *= 0.1;
        ai.wbState = 'TURNING';
        ai.wbTurnFrame = 0;
        ai.wbTurnTick = 0;
        ai.wbFiredShots = 0;
        ai.wbShootFrame = 0;
        ai.wbShootTick = 0;
      }

    } else if (ai.wbState === 'TURNING') {
      vel.vx *= 0.85; vel.vy *= 0.85;
      // Fast orient snap to player during turn
      ai.orientAngle += ad * 0.15;
      ai.balloonOrient = ai.orientAngle;

      ai.wbTurnTick++;
      if (ai.wbTurnTick >= 6) {
        ai.wbTurnTick = 0;
        ai.wbTurnFrame++;
        if (ai.wbTurnFrame >= 4) {
          ai.wbTurnFrame = 3; // hold last turn frame
          ai.wbState = 'SHOOTING';
          ai.wbShootFrame = 0;
          ai.wbShootTick = 0;
        }
      }

    } else if (ai.wbState === 'SHOOTING') {
      vel.vx *= 0.88; vel.vy *= 0.88;

      ai.wbShootTick++;
      const SHOOT_SPD = 5; // ticks per frame
      if (ai.wbShootTick >= SHOOT_SPD) {
        ai.wbShootTick = 0;
        ai.wbShootFrame++;
        if (ai.wbShootFrame >= 8) ai.wbShootFrame = 7; // clamp at last

        // Fire on frame 5 (0-indexed, ~6th frame — nozzle fully extended)
      if (ai.wbShootFrame === 5 && ai.wbFiredShots < 3) {
          ai.wbFiredShots++;
          const aim = Math.atan2(dy, dx);
        
        const hasHatNow = !!(ai.hatrider && ECS.has(ai.hatrider, 'pos'));
          SFX.playAt(
            hasHatNow ? 'redBalloonShoot' : 'balloonShoot',
            pos.x,
            pos.y,
            0.55
          );
          if (hasHatNow) {
            // Hat-buffed: fire 4 homing red tears in a spread
            const spreads = [-0.35, -0.12, 0.12, 0.35];
            for (const sa of spreads) {
              const a = aim + sa;
              gs.enemyBullets.push({
                x: pos.x + Math.cos(aim) * 26,
                y: pos.y + Math.sin(aim) * 26,
                vx: Math.cos(a) * 5.4,
                vy: Math.sin(a) * 5.4,
                life: 160, maxLife: 160,
                color: '#ff2244',
                isTear: true,
                isRedTear: true,
                homing: true,
                homingStrength: 0.07,
                rmDmgMult: 4,
              });
            }
            spawnParticles(pos.x, pos.y, '#ff2244', 10);
          } else {
            gs.enemyBullets.push({
              x: pos.x + Math.cos(aim) * 26,
              y: pos.y + Math.sin(aim) * 26,
              vx: Math.cos(aim) * 3.8,
              vy: Math.sin(aim) * 3.8,
              life: 160, maxLife: 160,
              color: '#44aaff',
              isTear: true,
              homing: false,
              homingStrength: 0,
              rmDmgMult: 1,
              curveRate: 0.0035,
            });
            spawnParticles(pos.x, pos.y, '#44aaff', 5);
          }

          if (ai.wbFiredShots < 3) {
            // Reset shoot anim for next shot
            ai.wbShootFrame = 0;
            ai.wbShootTick = 0;
          }
        }

        // After 3 shots, reverse turn back to roam
        if (ai.wbFiredShots >= 3 && ai.wbShootFrame >= 7) {
          ai.wbState = 'UNTURN';
          ai.wbTurnFrame = 3;
          ai.wbTurnTick = 0;
        }
      }

    } else if (ai.wbState === 'UNTURN') {
      vel.vx *= 0.88; vel.vy *= 0.88;
      ai.wbTurnTick++;
      if (ai.wbTurnTick >= 6) {
        ai.wbTurnTick = 0;
        ai.wbTurnFrame--;
        if (ai.wbTurnFrame < 0) {
          ai.wbTurnFrame = 0;
         ai.wbState = 'ROAM';
          ai.wbAnimFrame = 0;
          ai.wbShootTimer = (ai.hatrider && ECS.has(ai.hatrider, 'pos')) ? 80 + Math.random()*60 : 180 + Math.random()*120;
        }
      }
    }

    return BT.RUNNING;
  })
);


// ── Floor 2: Juggler ──
const BT_JUGGLER = new BTSelector(
  new BTAction((id, gs) => {
    if (gs.frozen) return BT.RUNNING;
    const pos = ECS.get(id,'pos'), vel = ECS.get(id,'vel'), phy = ECS.get(id,'physics');
    const ai = ECS.get(id,'ai'), pp = playerPos(gs);
    if (!pp || !pos || !vel) return BT.FAILURE;

    // ── Init ──
    if (ai.juggleBalls   === undefined) ai.juggleBalls   = 4;
    if (ai.juggleMax     === undefined) ai.juggleMax     = 8;
    if (!ai.juggleSlots)               ai.juggleSlots   = [];
    if (ai.regenTimer    === undefined) ai.regenTimer    = 0;
    if (ai.throwCooldown === undefined) ai.throwCooldown = 90;
    if (ai.sphereAngle   === undefined) ai.sphereAngle   = 0;
    if (ai.windupTimer   === undefined) ai.windupTimer   = 0;
    if (ai.windupSlot    === undefined) ai.windupSlot    = -1;

   // ── Count current balls (no auto-fill here — regen is timer-gated below) ──
    const currentBalls = ai.juggleSlots.filter(s => s.type === 'ball').length;
    // Initial fill only on first spawn (regenTimer === 0 and no slots yet)
    if (ai.juggleSlots.length === 0 && ai.regenTimer === 0) {
      for (let b = 0; b < ai.juggleBalls; b++) {
        ai.juggleSlots.push({ type: 'ball', phase: (b / ai.juggleBalls) * Math.PI * 2 });
      }
    }

    const dx = pp.x - pos.x, dy = pp.y - pos.y, dist = Math.hypot(dx, dy) || 1;

    // ── Movement: orbit ringmaster if nearby, else keep distance from player ──
    let nearestRM = null, nearestRMDist = 999999;
    for (const eid of ECS.query('enemy', 'pos')) {
      if (eid === id) continue;
      const etype = ECS.get(eid, 'enemy').type;
      if (etype !== 'ringmaster') continue;
      const epos = ECS.get(eid, 'pos');
      const d = Math.hypot(epos.x - pos.x, epos.y - pos.y);
      if (d < 300 && d < nearestRMDist) { nearestRMDist = d; nearestRM = epos; }
    }

    if (nearestRM) {
      // Orbit the ringmaster at ~80px
      const ORBIT_R = 80;
      const rmDx = nearestRM.x - pos.x, rmDy = nearestRM.y - pos.y;
      const rmDist = Math.hypot(rmDx, rmDy) || 1;
      const orbitAngle = Math.atan2(rmDy, rmDx) + 0.022;
      const tx = nearestRM.x - Math.cos(orbitAngle) * ORBIT_R;
      const ty = nearestRM.y - Math.sin(orbitAngle) * ORBIT_R;
      vel.vx = (vel.vx || 0) * 0.88 + ((tx - pos.x) / 80) * phy.speed * 0.25;
      vel.vy = (vel.vy || 0) * 0.88 + ((ty - pos.y) / 80) * phy.speed * 0.25;
    } else {
      // Keep ~200px from player — chase if too far, flee if too close
      const PREFERRED_DIST = 200;
      const distErr = dist - PREFERRED_DIST;
      const dirX = dx / dist, dirY = dy / dist;
      vel.vx = (vel.vx || 0) * 0.88 + dirX * phy.speed * (distErr > 0 ? 0.15 : -0.2);
      vel.vy = (vel.vy || 0) * 0.88 + dirY * phy.speed * (distErr > 0 ? 0.15 : -0.2);
    }
    const spd = Math.hypot(vel.vx, vel.vy);
    if (spd > phy.speed) { vel.vx = vel.vx/spd*phy.speed; vel.vy = vel.vy/spd*phy.speed; }

    ai.sphereAngle += vel.vx * 0.06;

    // ── Capture nearby enemies into juggle slots ──
    if (ai.juggleSlots.length < ai.juggleMax) {
      for (const eid of ECS.query('enemy','pos','ai')) {
        if (eid === id || eid === gs.playerId) continue;
        const etype = ECS.get(eid, 'enemy').type;
        if (etype === 'corRed' || etype === 'corBlue') continue;
        const eai = ECS.get(eid,'ai');
        if (eai.juggled) continue;
        const epos = ECS.get(eid,'pos');
        if (Math.hypot(epos.x - pos.x, epos.y - pos.y) < 44) {
          eai.juggled = true; eai.juggledBy = id;
          ai.juggleSlots.push({ type:'enemy', id: eid, phase: Math.random()*Math.PI*2 });
          spawnParticles(epos.x, epos.y, '#ffdd00', 12);
          showMsg('JUGGLER CAPTURED AN ENEMY!');
          break;
        }
      }
    }

    // ── Position juggled enemies above juggler ──
    const t = Date.now() / 400;
    for (let i = 0; i < ai.juggleSlots.length; i++) {
      const slot = ai.juggleSlots[i];
      const slotAngle = (i / Math.max(ai.juggleMax, 1)) * Math.PI * 2;
      const arcX = Math.cos(slotAngle + t) * 28;
      const arcY = -38 + Math.sin(slotAngle * 2 + t) * 18;
      if (slot.type === 'enemy' && ECS.has(slot.id, 'pos')) {
        const epos = ECS.get(slot.id, 'pos');
        epos.x = pos.x + arcX;
        epos.y = pos.y + arcY;
        const slotAi = ECS.get(slot.id,'ai'), myAi = ECS.get(id,'ai');
        if (slotAi && myAi && myAi.rmStacks) {
          slotAi.rmStacks = Math.max(slotAi.rmStacks || 0, myAi.rmStacks);
          slotAi.rmSizeScale = myAi.rmSizeScale;
          slotAi.rmDmgMult = myAi.rmDmgMult;
          if (myAi.criticalMass) { slotAi.criticalMass = true; slotAi.criticalMassImmune = true; }
        }
      }
    }

    // ── Windup + Arc throw ──
    ai.throwCooldown--;

    if (ai.windupTimer > 0) {
      // Currently winding up — count down, then throw
      ai.windupTimer--;
      if (ai.windupTimer === 0 && ai.windupSlot >= 0 && ai.windupSlot < ai.juggleSlots.length) {
        const slot = ai.juggleSlots.splice(ai.windupSlot, 1)[0];
        ai.windupSlot = -1;

        if (slot.type === 'ball') {
          // Arc projectile toward player's current position
          const targetX = pp.x, targetY = pp.y;
          const horizDist = Math.hypot(targetX - pos.x, targetY - pos.y);
          const GRAVITY = 0.15;
          const HANG_TIME = Math.max(55, Math.min(110, horizDist / 5));
          const vx = (targetX - pos.x) / HANG_TIME;
          const vy_horiz = (targetY - pos.y) / HANG_TIME;
          const vy_up = -HANG_TIME * GRAVITY * 0.5; // initial upward velocity

       const sizeScale = ai.rmSizeScale || 1.0;
          gs.enemyBullets.push({
            x: pos.x, y: pos.y - 38,
            vx, vy: vy_up,
            vyHoriz: vy_horiz,
            gravity: GRAVITY,
            life: HANG_TIME + 30, maxLife: HANG_TIME + 30,
            color: '#ffdd00',
            isArcBall: true,
            targetX, targetY,
            hangTime: HANG_TIME,
            startX: pos.x, startY: pos.y - 38,
            shadowX: pos.x, shadowY: pos.y,
            rmDmgMult: ai.rmDmgMult || 1,
            sizeScale,
          });
          spawnParticles(pos.x, pos.y - 38, '#ffdd00', 10);

       } else if (slot.type === 'enemy' && ECS.has(slot.id, 'pos')) {
          const eai = ECS.get(slot.id, 'ai');
          const etype = ECS.get(slot.id, 'enemy').type;
          const isCannonball = etype === 'cannonball';
          // Detach from juggler
          eai.juggled = false; eai.juggledBy = null;
          // Hide the carried enemy visually during flight
          const carriedId = slot.id;
          const targetX = pp.x, targetY = pp.y;
          const horizDist = Math.hypot(targetX - pos.x, targetY - pos.y);
          const GRAVITY = 0.10;
          const HANG_TIME = Math.max(55, Math.min(110, horizDist / 5));
          const vx = (targetX - pos.x) / HANG_TIME;
          const vy_horiz = (targetY - pos.y) / HANG_TIME;
          const vy_up = -HANG_TIME * GRAVITY * 0.5;
          const sizeScale = ai.rmSizeScale || 1.0;
          gs.enemyBullets.push({
            x: pos.x, y: pos.y - 38,
            vx, vy: vy_up,
            vyHoriz: vy_horiz,
            gravity: GRAVITY,
            life: HANG_TIME + 30, maxLife: HANG_TIME + 30,
            color: isCannonball ? '#ff6600' : '#ff8800',
            isArcBall: true,
            isArcEnemy: true,
            carriedEnemyType: etype,
            carriedId,
            isCannonball,
            targetX, targetY,
            hangTime: HANG_TIME,
            startX: pos.x, startY: pos.y - 38,
            shadowX: pos.x, shadowY: pos.y,
            rmDmgMult: ai.rmDmgMult || 1,
            sizeScale,
          });
          // Move the carried entity off-screen during flight so it isn't visible
          const cpos = ECS.get(carriedId, 'pos');
          if (cpos) { cpos.x = -200; cpos.y = -200; }
          spawnParticles(pos.x, pos.y - 38, isCannonball ? '#ff4400' : '#ff8800', 10);
          showMsg(isCannonball ? 'JUGGLER LAUNCHES A CANNONBALL!!!' : 'JUGGLER THROWS AN ENEMY!');
        }

        // Start regen for the thrown ball slot
        ai.regenTimer = 300; // 5 seconds
        const ballsAfterThrow = ai.juggleSlots.filter(s => s.type === 'ball').length;
        if (ballsAfterThrow === 0) ai.waitingForRegen = true;
      }
    } else if (ai.throwCooldown <= 0 && dist < 320 && ai.juggleSlots.length > 0 && !ai.waitingForRegen) {
      // Start windup
      ai.throwCooldown = 80;
      const ballIdx = ai.juggleSlots.findIndex(s => s.type === 'ball');
      const enemyIdx = ai.juggleSlots.findIndex(s => s.type === 'enemy');
// Always prioritize throwing captured enemies first
      if (enemyIdx >= 0) {
        ai.windupSlot = enemyIdx;
      } else {
        ai.windupSlot = ballIdx;
      }      if (ai.windupSlot >= 0) {
        ai.windupTimer = 30;
        spawnParticles(pos.x, pos.y - 38, '#ffcc00', 6);
        showMsg('JUGGLER WINDING UP!');
      }
    }

// ── Ball regen: one ball every 5 seconds until back to max, then resume throwing ──
    if (ai.regenTimer > 0) {
      ai.regenTimer--;
      if (ai.regenTimer === 0) {
        const ballsNow = ai.juggleSlots.filter(s => s.type === 'ball').length;
        if (ballsNow < ai.juggleBalls) {
          ai.juggleSlots.push({ type: 'ball', phase: Math.random() * Math.PI * 2 });
          spawnParticles(pos.x, pos.y - 38, '#ffcc44', 8);
          if (ballsNow + 1 < ai.juggleBalls) {
            ai.regenTimer = 300; // keep regenerating
          } else {
            ai.waitingForRegen = false; // all balls back — resume throwing
            showMsg('JUGGLER RELOADED!');
          }
        } else {
          ai.waitingForRegen = false;
        }
      }
    }

    // ── Clean up dead juggled enemies ──
    ai.juggleSlots = ai.juggleSlots.filter(s => {
      if (s.type !== 'enemy') return true;
      if (!ECS.has(s.id, 'pos')) return false;
      if (s.id === gs.playerId) return false;
      const sea = ECS.get(s.id, 'ai');
      return sea && sea.juggledBy === id;
    });

    return BT.RUNNING;
  })
);

// ── GiftBox: slow wind-up explosion ──
const BT_GIFTBOX = new BTSelector(
  new BTAction((id, gs) => {
    if (gs.frozen) {
      SFX.syncGiftBoxWindUp(id, false);
      return BT.RUNNING;
    }
    const pos = ECS.get(id, 'pos');
    const vel = ECS.get(id, 'vel');
    const phy = ECS.get(id, 'physics');
    const ai  = ECS.get(id, 'ai');
    const pp  = playerPos(gs);
    if (!pp || !pos || !vel) return BT.FAILURE;

    if (ai.heldByPlayer) {
      SFX.syncGiftBoxWindUp(id, false);
      return BT.RUNNING;
    }

    if (ai.thrown) {
      vel.vx *= 0.97;
      vel.vy *= 0.97;
      ai.windupTimer = Math.min(120, (ai.windupTimer || 0) + 2);
      if (ai.windupTimer >= 120 && !ai.exploded) {
        ai.exploded = true;
        _giftBoxExplode(id, pos, gs);
      }
      return BT.RUNNING;
    }

    if (ai.windupTimer === undefined) ai.windupTimer = 0;
    if (ai.exploded === undefined)    ai.exploded    = false;
    if (ai.pendingDestroy === undefined) ai.pendingDestroy = false;

    if (ai.exploded) return BT.RUNNING;

    const dx = pp.x - pos.x, dy = pp.y - pos.y;
    const dist = Math.hypot(dx, dy) || 1;

    vel.vx = (vel.vx||0)*0.88 + (dx/dist)*phy.speed*0.18;
    vel.vy = (vel.vy||0)*0.88 + (dy/dist)*phy.speed*0.18;
    const spd = Math.hypot(vel.vx, vel.vy);
    if (spd > phy.speed) { vel.vx = vel.vx/spd*phy.speed; vel.vy = vel.vy/spd*phy.speed; }

    if (dist < 140) {
      SFX.syncGiftBoxWindUp(id, true);
      ai.windupTimer++;
      if (ai.windupTimer % 12 === 0) spawnParticles(pos.x, pos.y, '#ffaa00', 4);
      if (ai.windupTimer === 30) showMsg('⚠️ GIFT BOX WINDING UP!');

      if (ai.windupTimer >= 180) {
        ai.exploded = true;
        _giftBoxExplode(id, pos, gs);
      }
    } else {
      SFX.syncGiftBoxWindUp(id, false);
      ai.windupTimer = Math.max(0, ai.windupTimer - 1);
      if (ai.windupTimer === 0) SFX.stopEntitySound('giftBoxWindUp', id);
    }

    return BT.RUNNING;
  })
);

// CRASH FIX: _giftBoxExplode
// - deferred checkWave via setTimeout (prevents offerItemChoice mid-BT-tick)
// - single updateHUD after all mutations
// - waveKills for giftbox only incremented if entity still exists
function _giftBoxExplode(id, pos, gs) {
  if (!ECS.has(id, 'pos')) return;
  const ai = ECS.get(id, 'ai');
  if (ai && ai.explosionStarted) return;
  if (ai) {
    ai.exploded = true;
    ai.explosionStarted = true;
  }
  SFX.stopEntitySound('giftBoxWindUp', id);
  SFX.playAt('partyExplosion', pos.x, pos.y, 0.85);
  triggerGiftBoxChainReaction(pos.x, pos.y, CFG.GIFT_BOX_EXPLOSION_RADIUS, id, gs);
  const vel = ECS.get(id, 'vel');
  if (vel) { vel.vx = 0; vel.vy = 0; }
  spawnPartyParticles(pos.x, pos.y);
  spawnParticles(pos.x, pos.y, '#ff4400', 30);
  gs.shakeX = 22; gs.shakeY = 22;

  // Handle player hit — but defer triggerSFPHit until after all enemy loops
  let triggerSFP = false;
  const ppos = ECS.get(gs.playerId, 'pos');
  if (ppos && Math.hypot(pos.x - ppos.x, pos.y - ppos.y) < CFG.GIFT_BOX_EXPLOSION_RADIUS && gs.invincible <= 0) {
    applyPlayerDamage(30); gs.invincible = CFG.INVINCIBLE_FRAMES;
    SFX.playAt('clippyDamage', ppos.x, ppos.y, 0.6);
    gs.flawlessThisWave = false;
    triggerSFP = true;
    updateHUD();
    if (gs.health <= 0) { gameOver(); return; }
  }

  // Collect damaged and killed enemies — never destroy inside the loop
  const toKill = [];
  for (const eid of ECS.query('enemy', 'pos', 'hp')) {
    if (eid === id) continue;
    if (!ECS.has(eid, 'pos')) continue;          // guard: may already be gone
    const ep = ECS.get(eid, 'pos');
    const eh = ECS.get(eid, 'hp');
    if (Math.hypot(ep.x - pos.x, ep.y - pos.y) < CFG.GIFT_BOX_EXPLOSION_RADIUS) {
      eh.hp -= 8; eh.hitFlash = 14;
      if (eh.hp <= 0) toKill.push({ eid, x: ep.x, y: ep.y });
    }
  }

  // Destroy collected enemies after loop exits
  for (const { eid, x, y } of toKill) {
    if (!ECS.has(eid, 'pos')) continue;          // guard: another explosion may have beaten us
    spawnParticles(x, y, '#ff2222', 14);
    ECS.destroyEntity(eid);
    gs.waveKills++;
  }

  // Destroy the gift box itself
  if (ECS.has(id, 'pos')) {
    ECS.destroyEntity(id);
    gs.waveKills++;
  }

  // Now safe to trigger SFP — all entity loops are done
  if (triggerSFP) triggerSFPHit();

  updateHUD();
  setTimeout(() => checkWave(), 0);
}

function triggerGiftBoxChainReaction(x, y, radius, sourceId, gameState = gs) {
  const chainIds = [];
  for (const id of ECS.query('enemy', 'pos', 'ai')) {
    if (id === sourceId || ECS.get(id, 'enemy').type !== 'giftBox') continue;
    const ai = ECS.get(id, 'ai');
    const pos = ECS.get(id, 'pos');
    if (ai.explosionStarted || Math.hypot(pos.x - x, pos.y - y) >= radius) continue;
    chainIds.push(id);
  }
  for (const id of chainIds) {
    if (!ECS.has(id, 'pos')) continue;
    const ai = ECS.get(id, 'ai');
    if (ai.explosionStarted) continue;
    ai.exploded = true;
    _giftBoxExplode(id, ECS.get(id, 'pos'), gameState);
  }
}

// ── PartyHat: fast + periodic speed dives ──
const BT_PARTYHAT = new BTSelector(
  new BTAction((id, gs) => {
    if (gs.frozen) return BT.RUNNING;
    const pos = ECS.get(id, 'pos');
    const vel = ECS.get(id, 'vel');
    const phy = ECS.get(id, 'physics');
    const ai  = ECS.get(id, 'ai');
    const pp  = playerPos(gs);
    if (!pp || !pos || !vel) return BT.FAILURE;

    // ── Init state ──
if (ai.hatState      === undefined) ai.hatState      = 'IDLE';
if (ai.hatTimer      === undefined) ai.hatTimer      = 60 + Math.floor(Math.random() * 40);
if (ai.hatAnimFrame  === undefined) ai.hatAnimFrame  = 0;
if (ai.hatAnimTimer  === undefined) ai.hatAnimTimer  = 0;
if (ai.hatDiveTarget === undefined) ai.hatDiveTarget = null;
if (ai.ridingId      === undefined) ai.ridingId      = null;

const dx = pp.x - pos.x, dy = pp.y - pos.y;
const dist = Math.hypot(dx, dy) || 1;
const baseSpeed = (1.2 + gs.wave * 0.12) * ENEMY_DEFS.partyHat.speedMult;

ai.hatAnimTimer++;

if (ai.hatState === 'RIDING') {
  // Validate host still alive
  if (!ECS.has(ai.ridingId, 'pos')) {
    SFX.playAt('partyHatDrop', pos.x, pos.y, 0.45);
    ai.ridingId = null;
    ai.hatState = 'IDLE';
    ai.hatTimer = 40;
  } else {
    const hpos = ECS.get(ai.ridingId, 'pos');
    const hai = ECS.get(ai.ridingId, 'ai');
    // Orient hat on the opposite side of the knot (knot is at +Y in sprite = "back" end)
    // balloonOrient is the angle the balloon faces; knot is at orientAngle + PI (rear)
    // Hat should sit at the front (nozzle/top of balloon in sprite = -Y before rotation)
    const bOrient = (hai && typeof hai.balloonOrient === 'number') ? hai.balloonOrient : 0;
    // The balloon sprite's "top" (nozzle) is at angle bOrient - PI/2 in world space
    // We want the hat on the nozzle side (opposite the knot)
    const RIDE_DIST = 55;
    // drawWaterBalloon rotates the canvas by (orientAngle + PI/2).
    // The knot is at the bottom (+Y) of the unrotated sprite, so in world space
    // the knot sits at angle: (bOrient + PI/2) + PI/2  =  bOrient + PI
    const knotAngle = bOrient + Math.PI;
    pos.x = hpos.x + Math.cos(knotAngle) * RIDE_DIST;
    pos.y = hpos.y + Math.sin(knotAngle) * RIDE_DIST;
    vel.vx = 0; vel.vy = 0;
    // Keep hat animation ticking
    ai.hatAnimTimer++;
    if (ai.hatAnimTimer >= 8) { ai.hatAnimTimer = 0; ai.hatAnimFrame = (ai.hatAnimFrame + 1) % 12; }
  }
  return BT.RUNNING;
}

// ── Check for nearby balloons to ride (only when IDLE) ──
if (ai.hatState === 'IDLE' || ai.hatState === 'RECOVER') {
  for (const eid of ECS.query('enemy', 'pos', 'ai')) {
    if (eid === id) continue;
    if (ECS.get(eid, 'enemy').type !== 'waterballoon') continue;
    const eai2 = ECS.get(eid, 'ai');
    if (eai2.hatrider) continue; // already has a hat
    const epos2 = ECS.get(eid, 'pos');
    if (Math.hypot(epos2.x - pos.x, epos2.y - pos.y) < 44) {
      // Mount!
      eai2.hatrider = id;
      ai.ridingId = eid;
      ai.hatState = 'RIDING';
      SFX.playRandom(['partyHatRide', 'partyHatRide2'], 0.45);
      vel.vx = 0; vel.vy = 0;
      spawnParticles(pos.x, pos.y, '#ffdd00', 10);
      showMsg('HAT RIDES THE BALLOON!');
      return BT.RUNNING;
    }
  }
}

// ── Seek nearest balloon if one exists ──
let nearestBalloon = null, nearestBalloonDist = 999999;
for (const eid of ECS.query('enemy', 'pos', 'ai')) {
  if (eid === id) continue;
  if (ECS.get(eid, 'enemy').type !== 'waterballoon') continue;
  if (ECS.get(eid, 'ai').hatrider) continue;
  const epos2 = ECS.get(eid, 'pos');
  const d = Math.hypot(epos2.x - pos.x, epos2.y - pos.y);
  if (d < nearestBalloonDist) { nearestBalloonDist = d; nearestBalloon = epos2; }
}

if (ai.hatState === 'IDLE') {
  if (nearestBalloon) {
    // Chase the balloon
    const bdx = nearestBalloon.x - pos.x, bdy = nearestBalloon.y - pos.y;
    const bd = Math.hypot(bdx, bdy) || 1;
    vel.vx = (vel.vx || 0) * 0.88 + (bdx / bd) * baseSpeed * 0.22;
    vel.vy = (vel.vy || 0) * 0.88 + (bdy / bd) * baseSpeed * 0.22;
    const spd = Math.hypot(vel.vx, vel.vy);
    if (spd > baseSpeed) { vel.vx = vel.vx/spd*baseSpeed; vel.vy = vel.vy/spd*baseSpeed; }
    if (ai.hatAnimTimer >= 8) { ai.hatAnimTimer = 0; ai.hatAnimFrame = (ai.hatAnimFrame + 1) % 12; }
  } else {
    // No balloon — chase player, can dive
    vel.vx = (vel.vx || 0) * 0.88 + (dx / dist) * baseSpeed * 0.14;
    vel.vy = (vel.vy || 0) * 0.88 + (dy / dist) * baseSpeed * 0.14;
    const spd = Math.hypot(vel.vx, vel.vy);
    if (spd > baseSpeed * 0.5) { vel.vx = vel.vx/spd*baseSpeed*0.5; vel.vy = vel.vy/spd*baseSpeed*0.5; }
    if (ai.hatAnimTimer >= 8) { ai.hatAnimTimer = 0; ai.hatAnimFrame = (ai.hatAnimFrame + 1) % 12; }
    ai.hatTimer--;
    if (ai.hatTimer <= 0 && dist < 380) {
      ai.hatState = 'TELEGRAPH';
      ai.hatTimer = 32;
      ai.hatAnimFrame = 0; ai.hatAnimTimer = 0;
      vel.vx *= 0.2; vel.vy *= 0.2;
      spawnParticles(pos.x, pos.y, '#ffdd00', 6);
    }
  }
} else if (ai.hatState === 'TELEGRAPH') {
  vel.vx *= 0.85; vel.vy *= 0.85;
  if (ai.hatAnimTimer >= 8) { ai.hatAnimTimer = 0; ai.hatAnimFrame = Math.min(3, ai.hatAnimFrame + 1); }
  if (ai.hatTimer % 6 === 0) spawnParticles(pos.x, pos.y, '#ff4400', 4);
  ai.hatTimer--;
  if (ai.hatTimer <= 0) {
    ai.hatDiveTarget = { x: pp.x, y: pp.y };
    ai.hatState = 'DIVE';
    SFX.playAt('partyHatAttack', pos.x, pos.y, 0.45);
    ai.hatTimer = 42; ai.hatAnimFrame = 0; ai.hatAnimTimer = 0;
    const tdx = ai.hatDiveTarget.x - pos.x, tdy = ai.hatDiveTarget.y - pos.y;
    const td = Math.hypot(tdx, tdy) || 1;
    vel.vx = (tdx / td) * baseSpeed * 4.5;
    vel.vy = (tdy / td) * baseSpeed * 4.5;
    spawnParticles(pos.x, pos.y, '#ff2200', 12);
  }
} else if (ai.hatState === 'DIVE') {
  if (ai.hatAnimTimer >= 4) { ai.hatAnimTimer = 0; ai.hatAnimFrame = (ai.hatAnimFrame + 1) % 4; }
  ai.hatTimer--;
  const hitPlayer = dist < 24 && gs.invincible <= 0;
  const reachedTarget = ai.hatDiveTarget &&
    Math.hypot(pos.x - ai.hatDiveTarget.x, pos.y - ai.hatDiveTarget.y) < 20;
  if (hitPlayer || reachedTarget || ai.hatTimer <= 0) {
    if (hitPlayer && gs.invincible <= 0) {
      applyPlayerDamage(18); gs.invincible = CFG.INVINCIBLE_FRAMES;
      SFX.playAt('clippyDamage', pos.x, pos.y, 0.55);
      gs.shakeX = 14; gs.shakeY = 14; gs.flawlessThisWave = false;
      triggerSFPHit(); updateHUD();
      spawnParticles(pos.x, pos.y, '#ffdd00', 16);
      if (gs.health <= 0) { gameOver(); return BT.FAILURE; }
    }
    ai.hatState = 'RECOVER'; ai.hatTimer = 50;
    ai.hatAnimFrame = 0; ai.hatAnimTimer = 0;
    ai.recoverSoundPlayed = false;
    vel.vx *= 0.15; vel.vy *= 0.15;
    spawnParticles(pos.x, pos.y, '#ffdd00', 14);
    gs.shakeX = 8; gs.shakeY = 8;
  }
} else if (ai.hatState === 'RECOVER') {
  vel.vx *= 0.88; vel.vy *= 0.88;
  if (ai.hatAnimTimer >= 12) { ai.hatAnimTimer = 0; ai.hatAnimFrame = Math.min(3, ai.hatAnimFrame + 1); }
  if (ai.hatAnimFrame >= 1 && !ai.recoverSoundPlayed) {
    SFX.playAt('partyHatRecover', pos.x, pos.y, 0.5);
    ai.recoverSoundPlayed = true;
  }
  ai.hatTimer--;
  if (ai.hatTimer <= 0) {
    ai.hatState = 'IDLE'; ai.hatTimer = 55 + Math.floor(Math.random() * 35);
    ai.hatAnimFrame = 0; ai.hatAnimTimer = 0;
  }
}

    return BT.RUNNING;
  })
);

const BT_CAKEBOSS = new BTSelector(
  new BTAction((id, gs) => {
    if (gs.frozen) return BT.RUNNING;
    const pos = ECS.get(id, 'pos');
    const vel = ECS.get(id, 'vel');
    const phy = ECS.get(id, 'physics');
    const ai  = ECS.get(id, 'ai');
    const hp  = ECS.get(id, 'hp');
    const pp  = playerPos(gs);
    if (!pp || !pos || !vel) return BT.FAILURE;

    // ── Candle count from HP thresholds ──
    const hpRatio = hp.hp / hp.maxHp;
    const newCandles = hpRatio > 0.8 ? 5 : hpRatio > 0.6 ? 4 : hpRatio > 0.4 ? 3 : hpRatio > 0.2 ? 2 : 1;
    if (newCandles < (ai.candlesLit ?? 5)) {
      // Candle blown out — flash and shake
      ai.candlesLit = newCandles;
      gs.shakeX = 18; gs.shakeY = 18;
      hp.hitFlash = 30;
      spawnPartyParticles(pos.x, pos.y);
      showMsg(newCandles === 1 ? 'THE CAKE IS FURIOUS!' : `CAKE DAMAGED! ${newCandles} STAGES REMAIN!`);
      // Last candle: enter permanent spiral layer
      if (newCandles === 1) ai.permanentSpiral = true;
    }
    if (ai.candlesLit === undefined) ai.candlesLit = 5;

    // ── Init ──
    ai.bossPhase    = ai.bossPhase    || 'IDLE';
    ai.phaseTimer   = ai.phaseTimer   ?? 140;
    ai.candleTimer  = ai.candleTimer  ?? 80;
    ai.spiralAngle  = ai.spiralAngle  || 0;
    ai.bounceCount  = ai.bounceCount  || 0;

    if (ai.antipieBoss && ai.layerDashTimer >= 0) {
      const dashTime = ai.layerDashTimer++;
      const layerDashDuration = 36;
      const layerDashDistance = 100;
      ai.layerDashOffsets = [0, 1, 2].map((layerIndex) => {
        const layerTime = dashTime - layerIndex * layerDashDuration;
        if (layerTime < 0 || layerTime >= layerDashDuration) return 0;
        const progress = layerTime < layerDashDuration / 2
          ? layerTime / (layerDashDuration / 2)
          : 1 - (layerTime - layerDashDuration / 2) / (layerDashDuration / 2);
        const easedProgress = progress * progress * (3 - 2 * progress);
        return (ai.layerDashDirection || 1) * layerDashDistance * easedProgress;
      });
      if (dashTime >= layerDashDuration * 3) {
        ai.layerDashTimer = -1;
        ai.layerDashOffsets = [0, 0, 0];
      }
    }

    const dx = pp.x - pos.x, dy = pp.y - pos.y;

    // ── Permanent spiral overlay at 1 candle ──
    if (ai.permanentSpiral) {
      ai.spiralAngle += 0.14;
      if (ai.phaseTimer % 4 === 0) {
        const a = ai.spiralAngle;
        gs.enemyBullets.push({
          x: pos.x, y: pos.y,
          vx: Math.cos(a) * 1.8, vy: Math.sin(a) * 1.8,
          life: 160, maxLife: 160, color: '#ff69b4'
        });
      }
    }

    // ── IDLE: drift toward center, tick down to next attack ──
    if (ai.bossPhase === 'IDLE') {
      if (ai.antipieBoss) {
        ai.windowOrbitTimer++;
        const windowSide = ai.bossWindowDirection || 1;
        pos.x = ai.bossHomeX + windowSide * Math.abs(Math.sin(ai.windowOrbitTimer * 0.018)) * 34;
        pos.y = ai.bossHomeY + Math.sin(ai.windowOrbitTimer * 0.026) * 18;
        vel.vx = 0;
        vel.vy = 0;
      } else {
        const cx = worldW / 2, cy = worldH / 2;
        const toCX = cx - pos.x, toCY = cy - pos.y;
        const d = Math.hypot(toCX, toCY) || 1;
        vel.vx = (vel.vx || 0) * 0.88 + (toCX / d) * phy.speed * 0.15;
        vel.vy = (vel.vy || 0) * 0.88 + (toCY / d) * phy.speed * 0.15;
      }

      // Candle shots on their own timer
      ai.candleTimer--;
      if (ai.candleTimer <= 0) {
        _cakeBossFireCandles(id, pos, pp, ai, gs);
        // Faster between shots as candles are lost
        ai.candleTimer = [80, 65, 50, 35, 20][5 - ai.candlesLit] || 20;
      }

      ai.phaseTimer--;
      if (ai.phaseTimer <= 0) {
        const roll = Math.random();
        if (roll < 0.45) {
          ai.bossPhase = 'SPIN_TELEGRAPH';
          ai.phaseTimer = 45;
          vel.vx *= 0.2; vel.vy *= 0.2;
          showMsg('⚠️ THE CAKE LAYERS ARE SHIFTING!');
        } else {
          ai.bossPhase = 'FROSTING_CHARGE';
          ai.phaseTimer = 60;
          vel.vx *= 0.1; vel.vy *= 0.1;
        }
      }
    }

    // ── SPIN TELEGRAPH ──
    else if (ai.bossPhase === 'SPIN_TELEGRAPH') {
      vel.vx *= 0.85; vel.vy *= 0.85;
      ai.phaseTimer--;
      if (ai.phaseTimer % 8 === 0) spawnParticles(pos.x, pos.y, '#ff4400', 6);
      if (ai.phaseTimer <= 0) {
        if (ai.antipieBoss) {
          ai.layerDashDirection = Math.random() < 0.5 ? -1 : 1;
          vel.vx = 0;
          vel.vy = 0;
          ai.layerDashTimer = 0;
          ai.layerDashOffsets = [0, 0, 0];
        } else {
          const dist = Math.hypot(dx, dy) || 1;
          vel.vx = (dx / dist) * 18;
          vel.vy = (dy / dist) * 18;
        }
        ai.bossPhase = 'SPIN_BOUNCE';
        ai.bounceCount = 0;
        ai.phaseTimer = 200;
      }
    }

    // ── SPIN BOUNCE ──
    else if (ai.bossPhase === 'SPIN_BOUNCE') {
      ai.phaseTimer--;

      if (ai.antipieBoss) {
        vel.vx = 0;
        vel.vy = 0;
        if (ai.layerDashTimer < 0) {
          ai.bossPhase = 'SPIN_RECOVER';
          ai.phaseTimer = 70;
          showMsg('CAKE STUNNED! HIT IT!');
        }
      } else {
        const bounds = { left: 40, right: worldW - 40, top: 40, bottom: worldH - 40 };
        let bounced = false;
        if (pos.x < bounds.left)   { pos.x = bounds.left;   vel.vx =  Math.abs(vel.vx); bounced = true; }
        if (pos.x > bounds.right)  { pos.x = bounds.right;  vel.vx = -Math.abs(vel.vx); bounced = true; }
        if (pos.y < bounds.top)    { pos.y = bounds.top;    vel.vy =  Math.abs(vel.vy); bounced = true; }
        if (pos.y > bounds.bottom) { pos.y = bounds.bottom; vel.vy = -Math.abs(vel.vy); bounced = true; }

        if (bounced) {
          ai.bounceCount++;
          spawnParticles(pos.x, pos.y, '#ff4400', 18);
          gs.shakeX = 12; gs.shakeY = 12;
          const bulletCount = 10;
          for (let i = 0; i < bulletCount; i++) {
            const a = (i / bulletCount) * Math.PI * 2;
            gs.enemyBullets.push({
              x: pos.x, y: pos.y,
              vx: Math.cos(a) * 1.4, vy: Math.sin(a) * 1.4,
              life: 140, maxLife: 140, color: '#ff6600'
            });
          }
          if (ai.bounceCount >= 5) {
            vel.vx *= 0.1; vel.vy *= 0.1;
            ai.bossPhase = 'SPIN_RECOVER';
            ai.phaseTimer = 70;
            showMsg('CAKE STUNNED! HIT IT!');
          }
        }
      }

      // Player contact damage during spin
      if (gs.invincible <= 0 && Math.hypot(pos.x - pp.x, pos.y - pp.y) < 44) {
        applyPlayerDamage(28);
        SFX.playAt('clippyDamage', pos.x, pos.y, 0.6);
        gs.invincible = CFG.INVINCIBLE_FRAMES;
        gs.shakeX = 20; gs.shakeY = 20;
        gs.flawlessThisWave = false;
        triggerSFPHit(); updateHUD();
        spawnParticles(pp.x, pp.y, '#ff4400', 16);
        if (gs.health <= 0) { gameOver(); return BT.FAILURE; }
      }

      if (!ai.antipieBoss && ai.phaseTimer <= 0) {
        // Safety fallback if somehow 5 bounces not hit
        vel.vx *= 0.1; vel.vy *= 0.1;
        ai.bossPhase = 'SPIN_RECOVER';
        ai.phaseTimer = 70;
      }
    }

    // ── SPIN RECOVER ──
    else if (ai.bossPhase === 'SPIN_RECOVER') {
      vel.vx *= 0.85; vel.vy *= 0.85;
      if (ai.antipieBoss) {
        ai.layerDashTimer = -1;
        ai.layerDashOffsets = [0, 0, 0];
      }
      ai.phaseTimer--;
      if (ai.phaseTimer <= 0) {
        ai.bossPhase = 'IDLE';
        ai.phaseTimer = 100 + Math.floor(Math.random() * 60);
      }
    }

    // ── FROSTING CHARGE (telegraph) ──
    else if (ai.bossPhase === 'FROSTING_CHARGE') {
      vel.vx *= 0.88; vel.vy *= 0.88;
      ai.phaseTimer--;
      if (ai.phaseTimer % 10 === 0) spawnParticles(pos.x, pos.y, '#ffffff', 5);
      if (ai.phaseTimer <= 0) {
        // Fire frosting arc balls at player's current position
        _cakeBossFrostingLaunch(id, pos, pp, ai, gs);
        ai.bossPhase = 'FROSTING_RECOVER';
        ai.phaseTimer = 80;
      }
    }

    // ── FROSTING RECOVER ──
    else if (ai.bossPhase === 'FROSTING_RECOVER') {
      vel.vx *= 0.88; vel.vy *= 0.88;
      ai.phaseTimer--;
      if (ai.phaseTimer <= 0) {
        ai.bossPhase = 'IDLE';
        ai.phaseTimer = 90 + Math.floor(Math.random() * 50);
      }
    }

    // Wall clamping during non-bounce phases
    if (!ai.antipieBoss && ai.bossPhase !== 'SPIN_BOUNCE') {
      pos.x = Math.max(60, Math.min(worldW - 60, pos.x));
      pos.y = Math.max(60, Math.min(worldH - 60, pos.y));
    }

    return BT.RUNNING;
  })
);

function _cakeBossFireCandles(id, pos, pp, ai, gs) {
  const candlesLit = ai.candlesLit ?? 5;
  const dx = pp.x - pos.x, dy = pp.y - pos.y;
  const aim = Math.atan2(dy, dx);

  if (candlesLit === 5) {
    // Slow wide spread
    for (const sa of [-0.5, -0.25, 0, 0.25, 0.5]) {
      gs.enemyBullets.push({ x: pos.x, y: pos.y, vx: Math.cos(aim + sa) * 0.8, vy: Math.sin(aim + sa) * 0.8, life: 160, maxLife: 160, color: '#ffdd00' });
    }
  } else if (candlesLit === 4) {
    for (const sa of [-0.4, -0.13, 0.13, 0.4]) {
      gs.enemyBullets.push({ x: pos.x, y: pos.y, vx: Math.cos(aim + sa) * 1.1, vy: Math.sin(aim + sa) * 1.1, life: 150, maxLife: 150, color: '#ffaa00' });
    }
  } else if (candlesLit === 3) {
    // Pairs with slight delay via two separate pushes at offset angles
    for (const sa of [-0.3, 0, 0.3]) {
      gs.enemyBullets.push({ x: pos.x, y: pos.y, vx: Math.cos(aim + sa) * 1.4, vy: Math.sin(aim + sa) * 1.4, life: 145, maxLife: 145, color: '#ff8800' });
      gs.enemyBullets.push({ x: pos.x, y: pos.y, vx: Math.cos(aim + sa + 0.15) * 1.4, vy: Math.sin(aim + sa + 0.15) * 1.4, life: 145, maxLife: 145, color: '#ff6600' });
    }
  } else if (candlesLit === 2) {
    // Rotating pattern — use spiralAngle offset
    ai.spiralAngle = (ai.spiralAngle || 0) + 0.6;
    for (let i = 0; i < 4; i++) {
      const a = ai.spiralAngle + (i / 4) * Math.PI * 2;
      gs.enemyBullets.push({ x: pos.x, y: pos.y, vx: Math.cos(a) * 1.8, vy: Math.sin(a) * 1.8, life: 140, maxLife: 140, color: '#ff4400' });
    }
  } else {
    // 1 candle: rapid tight spiral handled by permanentSpiral above
    // Plus a direct aimed shot every fire
    gs.enemyBullets.push({ x: pos.x, y: pos.y, vx: Math.cos(aim) * 2.4, vy: Math.sin(aim) * 2.4, life: 130, maxLife: 130, color: '#ff2200' });
  }
  spawnParticles(pos.x, pos.y, '#ffdd00', 4);
}

function _cakeBossFrostingLaunch(id, pos, pp, ai, gs) {
  SFX.playAt('frostingLaunch', pos.x, pos.y, 0.55);
  const count = 3;
  for (let i = 0; i < count; i++) {
    const offsetX = (i - 1) * 40;
    const targetX = pp.x + offsetX;
    const targetY = pp.y;
    const horizDist = Math.hypot(targetX - pos.x, targetY - pos.y);
    const GRAVITY = 0.12;
    const HANG_TIME = Math.max(60, Math.min(120, horizDist / 4.5));
    const vx = (targetX - pos.x) / HANG_TIME;
    const vy_horiz = (targetY - pos.y) / HANG_TIME;
    const vy_up = -HANG_TIME * GRAVITY * 0.5;

    gs.enemyBullets.push({
      x: pos.x, y: pos.y,
      vx, vy: vy_up,
      vyHoriz: vy_horiz,
      gravity: GRAVITY,
      life: HANG_TIME + 30, maxLife: HANG_TIME + 30,
      color: '#ffffff',
      isArcBall: true,
      isFrosting: true,
      targetX, targetY,
      hangTime: HANG_TIME,
      startX: pos.x, startY: pos.y,
      shadowX: pos.x, shadowY: targetY,
      spawnGiftBox: i === 1 && Math.random() < 0.5, // center ball only, 50% chance
    });
    spawnParticles(pos.x, pos.y, '#ffffff', 8);
  }
  showMsg('⚠️ FROSTING INCOMING!');
}

// ── Floor 2: Boss 2 ──
const BT_BOSS2 = new BTSelector(
  new BTAction((id, gs) => {
    if (gs.frozen) return BT.RUNNING;
    const pos = ECS.get(id,'pos'), vel = ECS.get(id,'vel'), phy = ECS.get(id,'physics');
    const ai = ECS.get(id,'ai'), hp = ECS.get(id,'hp'), pp = playerPos(gs);
    if (!pp || !pos || !vel) return BT.FAILURE;
    const phase2 = hp.hp < hp.maxHp * 0.5;
    const dx = pp.x - pos.x, dy = pp.y - pos.y;

    const cx = worldW/2, cy = worldH/2;
    const toCX = cx-pos.x, toCY = cy-pos.y;
    const distCenter = Math.hypot(toCX,toCY);
    if (distCenter > 160) { vel.vx += (toCX/distCenter)*0.1; vel.vy += (toCY/distCenter)*0.1; }
    else { vel.vx += (dx/Math.hypot(dx,dy)||1)*0.06; vel.vy += (dy/Math.hypot(dx,dy)||1)*0.06; }
    const spd = Math.hypot(vel.vx,vel.vy);
    const maxSpd = phase2 ? phy.speed*1.8 : phy.speed*1.2;
    if (spd > maxSpd) { vel.vx=vel.vx/spd*maxSpd; vel.vy=vel.vy/spd*maxSpd; }
    if (pos.x<80) vel.vx+=0.4; if (pos.x>worldW-80) vel.vx-=0.4;
    if (pos.y<80) vel.vy+=0.4; if (pos.y>worldH-80) vel.vy-=0.4;

    ai.bossPhase = ai.bossPhase || 'IDLE';
    ai.phaseTimer = ai.phaseTimer ?? 100;
    ai.spiralAngle = ai.spiralAngle || 0;
    ai.volleyCount = ai.volleyCount || 0;
    ai.volleyTimer = ai.volleyTimer || 0;

    if (ai.bossPhase === 'IDLE') {
      ai.phaseTimer--;
      if (ai.phaseTimer <= 0) {
        const roll = Math.random();
        if (roll < 0.4) { ai.bossPhase = 'SPIRAL'; ai.phaseTimer = phase2 ? 180 : 130; ai.spiralAngle = 0; }
        else if (roll < 0.7) { ai.bossPhase = 'SUMMON'; ai.phaseTimer = phase2 ? 3 : 2; }
        else { ai.bossPhase = 'VOLLEY'; ai.volleyCount = phase2 ? 6 : 4; ai.volleyTimer = 0; }
      }
    } else if (ai.bossPhase === 'SPIRAL') {
      vel.vx *= 0.92; vel.vy *= 0.92; ai.phaseTimer--;
      const rate = phase2 ? 3 : 5;
      if (ai.phaseTimer % rate === 0) {
        const arms = phase2 ? 5 : 3;
        for (let arm=0;arm<arms;arm++) {
          const a = ai.spiralAngle + (arm/arms)*Math.PI*2;
          gs.enemyBullets.push({x:pos.x,y:pos.y,vx:Math.cos(a)*2,vy:Math.sin(a)*2,life:150,maxLife:150,color:'#ff4400'});
        }
        ai.spiralAngle += phase2 ? 0.2 : 0.15;
      }
      if (ai.phaseTimer<=0) { ai.bossPhase='IDLE'; ai.phaseTimer=phase2?45:70; }
    } else if (ai.bossPhase === 'SUMMON') {
      for (let i=0;i<ai.phaseTimer;i++) {
        const angle = Math.random()*Math.PI*2;
        const r = 100+Math.random()*80;
        const sx = Math.max(40,Math.min(worldW-40, pos.x+Math.cos(angle)*r));
        const sy = Math.max(40,Math.min(worldH-40, pos.y+Math.sin(angle)*r));
        const types2 = ['birthdayBomber','balloonWitch','streamerGhost'];
        const stype = types2[Math.floor(Math.random()*types2.length)];
        const def2 = ENEMY_DEFS[stype];
        const baseHp2 = 1 + Math.floor(gs.wave/2);
        const sid = ECS.createEntity();
        ECS.add(sid,'enemy',{type:stype}); ECS.add(sid,'pos',{x:sx,y:sy,angle:0});
        ECS.add(sid,'vel',{vx:0,vy:0}); ECS.add(sid,'hp',{hp:Math.ceil(baseHp2*def2.hpMult),maxHp:Math.ceil(baseHp2*def2.hpMult),hitFlash:0});
        ECS.add(sid,'physics',{speed:(1.2+Math.random()*0.6+gs.wave*0.1)*def2.speedMult});
        ECS.add(sid,'ai',{shootCooldown:120,chargeTimer:0,phaseTimer:0,phased:false});
        spawnParticles(sx,sy,'#ff4400',10);
      }
      showMsg('BOSS SUMMONS MINIONS!');
      ai.bossPhase = 'IDLE'; ai.phaseTimer = phase2 ? 60 : 90;
    } else if (ai.bossPhase === 'VOLLEY') {
      vel.vx *= 0.88; vel.vy *= 0.88; ai.volleyTimer--;
      if (ai.volleyTimer <= 0 && ai.volleyCount > 0) {
        const aim = Math.atan2(dy,dx);
        const count = phase2 ? 10 : 7;
        for (let i=0;i<count;i++) {
          const spread = phase2 ? 0.6 : 0.4;
          const a = aim + (i/(count-1)-.5)*spread*2;
          gs.enemyBullets.push({x:pos.x,y:pos.y,vx:Math.cos(a)*3,vy:Math.sin(a)*3,life:110,maxLife:110,color:'#ff4400'});
        }
        spawnParticles(pos.x,pos.y,'#ff4400',10);
        ai.volleyCount--; ai.volleyTimer = phase2 ? 20 : 28;
        if (ai.volleyCount===0) { ai.bossPhase='IDLE'; ai.phaseTimer=phase2?40:65; }
      }
    }
    return BT.RUNNING;
  })
);

// ── Carnival: Human Cannonball ──
const BT_CANNONBALL = new BTSelector(
  new BTAction((id, gs) => {
    if (gs.frozen) return BT.RUNNING;
    const pos = ECS.get(id,'pos'), vel = ECS.get(id,'vel'), phy = ECS.get(id,'physics');
    const ai = ECS.get(id,'ai'), pp = playerPos(gs);
    if (!pp || !pos || !vel) return BT.FAILURE;
    ai.chargeState = ai.chargeState || 'IDLE';
    ai.chargeTimer = (ai.chargeTimer || 0) - 1;

    if (ai.chargeState === 'IDLE') {
  // Confused: target nearest enemy instead of player
  let targetPos = pp;
  if (ai.confused) {
    let nearDist = 999999;
    for (const eid of ECS.query('enemy', 'pos')) {
      if (eid === id) continue;
      const ep = ECS.get(eid, 'pos');
      const d = Math.hypot(ep.x - pos.x, ep.y - pos.y);
      if (d < nearDist) { nearDist = d; targetPos = ep; }
    }
  }
  const dx = targetPos.x - pos.x, dy = targetPos.y - pos.y, dist = Math.hypot(dx,dy)||1;
  vel.vx = (vel.vx||0)*0.9 + (dx/dist)*phy.speed*0.1;
  vel.vy = (vel.vy||0)*0.9 + (dy/dist)*phy.speed*0.1;
  if (ai.chargeTimer <= 0) {
    ai.chargeTarget = { x: targetPos.x, y: targetPos.y };
        ai.chargeState = 'TELEGRAPH';
        ai.chargeTimer = 70;
        vel.vx *= 0.2; vel.vy *= 0.2;
        spawnParticles(pos.x, pos.y, '#ff6600', 8);
        showMsg('CANNONBALL INCOMING!');
      }
    } else if (ai.chargeState === 'TELEGRAPH') {
      vel.vx *= 0.85; vel.vy *= 0.85;
      if (ai.chargeTimer % 12 === 0) spawnParticles(pos.x, pos.y, '#ff4400', 5);
      if (ai.chargeTimer <= 0) {
        const tx = ai.chargeTarget.x - pos.x, ty = ai.chargeTarget.y - pos.y;
        const tDist = Math.hypot(tx,ty)||1;
        vel.vx = (tx/tDist) * 18;
        vel.vy = (ty/tDist) * 18;
        ai.chargeState = 'CHARGING';
        ai.chargeTimer = 80;
      }
    } else if (ai.chargeState === 'CHARGING') {
      spawnParticles(pos.x, pos.y, '#ff6600', 2);
      const hitWall = pos.x < 30 || pos.x > worldW-30 || pos.y < 30 || pos.y > worldH-30;
      if (hitWall || ai.chargeTimer <= 0) {
        const ppos2 = ECS.get(gs.playerId, 'pos');
        if (Math.hypot(pos.x - ppos2.x, pos.y - ppos2.y) < 80 && gs.invincible <= 0) {
          applyPlayerDamage(15); gs.invincible = CFG.INVINCIBLE_FRAMES;
          SFX.playAt('clippyDamage', pos.x, pos.y, 0.55);
          gs.shakeX = 14; gs.shakeY = 14;
          gs.flawlessThisWave = false;
          updateHUD(); if (gs.health <= 0) { gameOver(); return BT.FAILURE; }
        }
        spawnParticles(pos.x, pos.y, '#ff4400', 20);
        vel.vx *= 0.1; vel.vy *= 0.1;
        ai.chargeState = 'RECOVER';
        ai.chargeTimer = 120;
      }
    } else if (ai.chargeState === 'RECOVER') {
      vel.vx *= 0.92; vel.vy *= 0.92;
      if (ai.chargeTimer <= 0) {
        ai.chargeState = 'IDLE';
        ai.chargeTimer = 90 + Math.random()*60;
      }
    }
    return BT.RUNNING;
  })
);

// ── Carnival: Ringmaster ──
const BT_RINGMASTER = new BTSelector(
  new BTAction((id, gs) => {
    if (gs.frozen) return BT.RUNNING;
    const pos = ECS.get(id,'pos'), vel = ECS.get(id,'vel'), phy = ECS.get(id,'physics');
    const ai = ECS.get(id,'ai'), pp = playerPos(gs);
    if (!pp || !pos || !vel) return BT.FAILURE;
    const dx = pp.x - pos.x, dy = pp.y - pos.y, dist = Math.hypot(dx,dy)||1;
    const AURA_RANGE = 160;

    const flee = dist < 120;
    if (flee) {
      vel.vx = (vel.vx||0)*0.88 - (dx/dist)*phy.speed*0.25;
      vel.vy = (vel.vy||0)*0.88 - (dy/dist)*phy.speed*0.25;
    } else {
      const orbitAngle = Math.atan2(dy,dx) + 0.012;
      const tx = pp.x - Math.cos(orbitAngle)*220;
      const ty = pp.y - Math.sin(orbitAngle)*220;
      vel.vx = (vel.vx||0)*0.88 + ((tx-pos.x)/100)*phy.speed*0.2;
      vel.vy = (vel.vy||0)*0.88 + ((ty-pos.y)/100)*phy.speed*0.2;
    }
    const spd = Math.hypot(vel.vx,vel.vy);
    if (spd > phy.speed) { vel.vx=vel.vx/spd*phy.speed; vel.vy=vel.vy/spd*phy.speed; }

for (const eid of ECS.query('enemy','pos','physics','ai')) {
  if (eid === id) continue;
   if (!ECS.has(eid, 'pos') || !ECS.has(eid, 'hp')) continue;
  const epos2 = ECS.get(eid,'pos');
  const eai2  = ECS.get(eid,'ai');
  const ephy2 = ECS.get(eid,'physics');
  if (Math.hypot(epos2.x-pos.x, epos2.y-pos.y) < AURA_RANGE) {
    eai2.ringmasterBuffed = true;
    eai2.ringmasterBuffTimer = 6;

    // Accumulate stacks
    eai2.rmStacks = (eai2.rmStacks || 0) + 1;
    const CRIT_THRESHOLD = 600; // ~10 seconds in aura at 60fps

    if (!eai2.criticalMass && eai2.rmStacks >= CRIT_THRESHOLD) {
      eai2.criticalMass = true;
      eai2.criticalMassImmune = true; // immune to explosives
      spawnParticles(epos2.x, epos2.y, '#ff0000', 20);
      showMsg('⚠️ CRITICAL MASS! ENEMY IS EXPLOSIVE & IMMUNE!');
    }

    if (!eai2.criticalMass) {
      // Scale up size visually (stored as a multiplier, capped at 2.0x)
      eai2.rmSizeScale = Math.min(2.0, 1.0 + (eai2.rmStacks / CRIT_THRESHOLD));

      // After setting eai2.rmSizeScale and eai2.rmDmgMult:

 const ehp2 = ECS.get(eid, 'hp');
if (!eai2._baseMaxHp) eai2._baseMaxHp = ehp2.maxHp;
const targetMaxHp = Math.round(eai2._baseMaxHp * eai2.rmSizeScale);
if (targetMaxHp > ehp2.maxHp) {
  const diff = targetMaxHp - ehp2.maxHp;
  ehp2.maxHp = targetMaxHp;
  ehp2.hp = Math.min(ehp2.hp + diff, targetMaxHp);
}

      
      // Damage multiplier grows too
      eai2.rmDmgMult = 1.0 + (eai2.rmStacks / CRIT_THRESHOLD) * 2.0; // up to 3x at crit
    } else {
      eai2.rmSizeScale = 2.0;
      eai2.rmDmgMult  = 3.0;
    }
  } else {
    // Outside aura — decay stacks slowly so leaving the ringmaster matters
    if (eai2.rmStacks > 0) {
      eai2.rmStacks = Math.max(0, eai2.rmStacks - 2);
      if (!eai2.criticalMass) {
        const CRIT_THRESHOLD = 600;
        eai2.rmSizeScale = Math.min(2.0, 1.0 + (eai2.rmStacks / CRIT_THRESHOLD));
        eai2.rmDmgMult = 1.0 + (eai2.rmStacks / CRIT_THRESHOLD) * 2.0;
      }
    }
  }
}

ai.shootCooldown = (ai.shootCooldown||180) - (1 / (ai.clownCooldownMult || 1));
    if (ai.shootCooldown <= 0 && dist < 280) {
      ai.shootCooldown = 180;
      const aim = Math.atan2(dy,dx);
      for (const sa of [-0.35, -0.18, 0, 0.18, 0.35]) {
        const a = aim + sa;
gs.enemyBullets.push({ x:pos.x, y:pos.y, vx:Math.cos(a)*1.5, vy:Math.sin(a)*1.5, life:130, maxLife:130, color:'#cc0044', rmDmgMult: 1 });
      }
      spawnParticles(pos.x, pos.y, '#cc0044', 8);
    }
    return BT.RUNNING;
  })
);

// ── Floor 2: Clown Car ──
const BT_CLOWN_CAR = new BTSelector(
  new BTAction((id, gs) => {
    if (gs.frozen) return BT.RUNNING;
    const pos = ECS.get(id, 'pos');
    const vel = ECS.get(id, 'vel');
    const phy = ECS.get(id, 'physics');
    const ai  = ECS.get(id, 'ai');
    const pp  = playerPos(gs);
    if (!pp || !pos || !vel) return BT.FAILURE;

    if (ai.bounceCount    === undefined) ai.bounceCount    = 0;
    if (ai.ejectTimer     === undefined) ai.ejectTimer     = CFG.CLOWN_CAR_EJECT_INTERVAL;
    if (ai.carAngle       === undefined) ai.carAngle       = Math.random() * Math.PI * 2;
    if (ai.roamTarget     === undefined) ai.roamTarget     = null;
    if (ai.roamTimer      === undefined) ai.roamTimer      = 0;

    // Find nearest enemy to roam toward; if none, pick a random point
    ai.roamTimer--;
    if (ai.roamTimer <= 0) {
      ai.roamTimer = 90 + Math.floor(Math.random() * 60);
      let bestDist = 999999, bestPos = null;
      for (const eid of ECS.query('enemy', 'pos')) {
        if (eid === id) continue;
        const ep = ECS.get(eid, 'pos');
        const d = Math.hypot(ep.x - pos.x, ep.y - pos.y);
        if (d < bestDist) { bestDist = d; bestPos = { x: ep.x, y: ep.y }; }
      }
      if (bestPos) {
        ai.roamTarget = bestPos;
      } else {
        ai.roamTarget = {
          x: CFG.WALL_PAD + Math.random() * (worldW - CFG.WALL_PAD * 2),
          y: CFG.WALL_PAD + Math.random() * (worldH - CFG.WALL_PAD * 2),
        };
      }
    }

    if (ai.roamTarget) {
      const dx = ai.roamTarget.x - pos.x, dy = ai.roamTarget.y - pos.y;
      const dist = Math.hypot(dx, dy) || 1;
      const targetAngle = Math.atan2(dy, dx);
      let angleDelta = targetAngle - ai.carAngle;
      while (angleDelta >  Math.PI) angleDelta -= Math.PI * 2;
      while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
      ai.carAngle += angleDelta * 0.06;
      if (dist < 40) ai.roamTarget = null;
    }

    vel.vx = (vel.vx || 0) * 0.92 + Math.cos(ai.carAngle) * phy.speed * 0.22;
    vel.vy = (vel.vy || 0) * 0.92 + Math.sin(ai.carAngle) * phy.speed * 0.22;
    const spd = Math.hypot(vel.vx, vel.vy);
    if (spd > phy.speed) { vel.vx = vel.vx / spd * phy.speed; vel.vy = vel.vy / spd * phy.speed; }

    // Wall bouncing
    let bounced = false;
    if (pos.x < 22)          { pos.x = 22;          vel.vx =  Math.abs(vel.vx) * 1.1; bounced = true; }
    if (pos.x > worldW - 22) { pos.x = worldW - 22; vel.vx = -Math.abs(vel.vx) * 1.1; bounced = true; }
    if (pos.y < 22)          { pos.y = 22;           vel.vy =  Math.abs(vel.vy) * 1.1; bounced = true; }
    if (pos.y > worldH - 22) { pos.y = worldH - 22;  vel.vy = -Math.abs(vel.vy) * 1.1; bounced = true; }
    if (bounced) {
      ai.bounceCount++;
      ai.carAngle = Math.atan2(vel.vy, vel.vx);
      spawnParticles(pos.x, pos.y, '#ffdd00', 8);
      gs.shakeX = 6; gs.shakeY = 6;
      if (ai.bounceCount >= CFG.CLOWN_CAR_BOUNCE_MAX) {
        _clownCarExplode(id, pos, gs, false);
        return BT.FAILURE;
      }
    }

    // Eject mini clowns
    ai.ejectTimer--;
    if (ai.ejectTimer <= 0) {
      ai.ejectTimer = CFG.CLOWN_CAR_EJECT_INTERVAL;
      const ejectCount = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < ejectCount; i++) {
        _spawnMiniClown(pos.x + (Math.random() - 0.5) * 30, pos.y + (Math.random() - 0.5) * 30, gs);
      }
      spawnParticles(pos.x, pos.y, '#ff4400', 10);
      showMsg('MINI CLOWNS DEPLOYED!');
    }

    return BT.RUNNING;
  })
);

// ── Floor 2: Mini Clown ──
const BT_MINI_CLOWN = new BTSelector(
  new BTAction((id, gs) => {
    if (gs.frozen) return BT.RUNNING;
    const pos = ECS.get(id, 'pos');
    const vel = ECS.get(id, 'vel');
    const phy = ECS.get(id, 'physics');
    const ai  = ECS.get(id, 'ai');
    const pp  = playerPos(gs);
    if (!pos || !vel) return BT.FAILURE;

    // ── Init ──
    if (ai.clownState === undefined) ai.clownState = 'ROAM';
    if (ai.attachedTo  === undefined) ai.attachedTo  = null;
    if (ai.attachSlot  === undefined) ai.attachSlot  = 0; // orbit offset index

    // ── If attached: follow host, apply buffs, keep own hitbox ──
    if (ai.clownState === 'ATTACHED') {
      if (!ECS.has(ai.attachedTo, 'pos')) {
        // Host died — go back to roaming
        ai.clownState = 'ROAM';
        ai.attachedTo = null;
        return BT.RUNNING;
      }
      const hpos = ECS.get(ai.attachedTo, 'pos');
      // Orbit the host at a small offset so the clown has its own hitbox
      const slotAngle = (ai.attachSlot / 4) * Math.PI * 2;
      const ORBIT_R = 18;
      const tx = hpos.x + Math.cos(slotAngle) * ORBIT_R;
      const ty = hpos.y + Math.sin(slotAngle) * ORBIT_R;
      vel.vx = (vel.vx || 0) * 0.7 + (tx - pos.x) * 0.28;
      vel.vy = (vel.vy || 0) * 0.7 + (ty - pos.y) * 0.28;
      pos.x += vel.vx;
      pos.y += vel.vy;

      // Apply buff to host each tick (sysAI reads these flags)
      const hai = ECS.get(ai.attachedTo, 'ai');
      if (hai) {
        hai._clownHealTimer = (hai._clownHealTimer || 0) + 1;
        if (hai._clownHealTimer >= 60) {
          hai._clownHealTimer = 0;
          const hhp = ECS.get(ai.attachedTo, 'hp');
          if (hhp) hhp.hp = Math.min(hhp.maxHp, hhp.hp + 2);
        }
        // Mark host as clown-buffed — sysAI applies speed + cooldown boost
        hai.clownRiders = (hai.clownRiders || 0);
      }
      return BT.RUNNING;
    }

    // ── ROAM / FLEE logic ──
const enemies = [...ECS.query('enemy', 'pos', 'hp')].filter(eid => eid !== id);

if (enemies.length === 0) {
      // No enemies — flee until a safe distance away, then wander
      if (!pp) return BT.RUNNING;
      const dx = pos.x - pp.x, dy = pos.y - pp.y;
      const dist = Math.hypot(dx, dy) || 1;
      const SAFE_DIST = 200;
      if (dist < SAFE_DIST) {
        vel.vx = (vel.vx || 0) * 0.85 + (dx / dist) * phy.speed * 0.3;
        vel.vy = (vel.vy || 0) * 0.85 + (dy / dist) * phy.speed * 0.3;
      } else {
        // Far enough — wander slowly
        if (!ai._wanderAngle) ai._wanderAngle = Math.random() * Math.PI * 2;
        if (!ai._wanderTimer) ai._wanderTimer = 0;
        ai._wanderTimer--;
        if (ai._wanderTimer <= 0) {
          ai._wanderAngle = Math.random() * Math.PI * 2;
          ai._wanderTimer = 60 + Math.floor(Math.random() * 60);
        }
        vel.vx = (vel.vx || 0) * 0.88 + Math.cos(ai._wanderAngle) * phy.speed * 0.08;
        vel.vy = (vel.vy || 0) * 0.88 + Math.sin(ai._wanderAngle) * phy.speed * 0.08;
      }
      // Soft wall repulsion — always active
      if (pos.x < 40)          vel.vx += 0.5;
      if (pos.x > worldW - 40) vel.vx -= 0.5;
      if (pos.y < 40)          vel.vy += 0.5;
      if (pos.y > worldH - 40) vel.vy -= 0.5;
    } else {
      // Find biggest (highest maxHp) enemy closest to this clown
      let bestId = null, bestScore = -1;
      for (const eid of enemies) {
        const epos2 = ECS.get(eid, 'pos');
        const ehp2  = ECS.get(eid, 'hp');
        const eai2  = ECS.get(eid, 'ai');
        // Don't attach to another mini clown or to a clown car
        const etype = ECS.get(eid, 'enemy').type;
        if (etype === 'miniClown' || etype === 'clownCar') continue;
        // Don't attach if already has 4 clowns riding it
        const riders = (eai2 && eai2.clownRiders) ? eai2.clownRiders : 0;
        if (riders >= 4) continue;
        const dist2 = Math.hypot(epos2.x - pos.x, epos2.y - pos.y);
        // Score = maxHp / distance  (bigger + closer = higher priority)
        const score = (ehp2.maxHp || 1) / (dist2 + 1);
        if (score > bestScore) { bestScore = score; bestId = eid; }
      }

      if (bestId !== null) {
        const bpos = ECS.get(bestId, 'pos');
        const dist3 = Math.hypot(bpos.x - pos.x, bpos.y - pos.y);

        if (dist3 < 22) {
          // Attach!
          ai.clownState = 'ATTACHED';
          ai.attachedTo = bestId;
          // Find a free slot index (0-3) on the host
          const hostAi = ECS.get(bestId, 'ai');
          if (hostAi) {
            hostAi.clownRiders = (hostAi.clownRiders || 0) + 1;
            ai.attachSlot = hostAi.clownRiders - 1;
          }
          spawnParticles(pos.x, pos.y, '#ff4400', 6);
          showMsg('CLOWN LATCHED ON!');
        } else {
          // Chase the target enemy
          const dx = bpos.x - pos.x, dy = bpos.y - pos.y;
          const dist4 = dist3 || 1;
          vel.vx = (vel.vx || 0) * 0.85 + (dx / dist4) * phy.speed * 0.3;
          vel.vy = (vel.vy || 0) * 0.85 + (dy / dist4) * phy.speed * 0.3;
        }
      } else {
        // All enemies full — flee player
        if (pp) {
          const dx = pos.x - pp.x, dy = pos.y - pp.y, dist = Math.hypot(dx, dy) || 1;
          vel.vx = (vel.vx || 0) * 0.85 + (dx / dist) * phy.speed * 0.25;
          vel.vy = (vel.vy || 0) * 0.85 + (dy / dist) * phy.speed * 0.25;
        }
      }
    }

    // Cap speed
    const spd = Math.hypot(vel.vx, vel.vy);
    if (spd > phy.speed) { vel.vx = vel.vx / spd * phy.speed; vel.vy = vel.vy / spd * phy.speed; }



    return BT.RUNNING;
  })
);
// ================================================================
// ENEMY BT MAP
// ================================================================
const ENEMY_BTS = {
  utensil:        BT_UTENSIL,
  waterballoon:           BT_WATERBALLOON,
  giftBox:        BT_GIFTBOX,
  partyHat:       BT_PARTYHAT,
  cakeBoss: BT_CAKEBOSS,
  
  boss2:          BT_BOSS2,
  cannonball:     BT_CANNONBALL,
  ringmaster:     BT_RINGMASTER,
  juggler:        BT_JUGGLER,
  clownCar:  BT_CLOWN_CAR,
miniClown: BT_MINI_CLOWN,
};

// ================================================================
// ENEMY DEFINITIONS
// ================================================================
const ENEMY_DEFS = {
  utensil:        { hpMult: 1.0, speedMult: 0.9,  size: 28, color: '#cccccc' },
  waterballoon:           { hpMult: 1.1, speedMult: 1.05, size: 28, color: '#44aaff' },
  giftBox:        { hpMult: 2.2, speedMult: 0.5,  size: 34, color: '#ffaa00' },
  partyHat:       { hpMult: 0.8, speedMult: 1.4,  size: 26, color: '#ffdd00' },
  cakeBoss: { hpMult: 1, speedMult: 0.35, size: 44, color: '#ff69b4' },
  birthdayBomber: { hpMult: 1.4, speedMult: 0.85, size: 30, color: '#ff4400' },
  pinata:         { hpMult: 4.0, speedMult: 0.5,  size: 38, color: '#ff88ff' },
  balloonWitch:   { hpMult: 1.1, speedMult: 1.1,  size: 28, color: '#9944ff' },
  streamerGhost:  { hpMult: 0.9, speedMult: 1.3,  size: 26, color: '#44ffcc' },
  boss2:          { hpMult: 1,   speedMult: 0.45, size: 60, color: '#ff2200' },
  cannonball:     { hpMult: 1.6, speedMult: 0.5,  size: 30, color: '#ff6600' },
  ringmaster:     { hpMult: 1.2, speedMult: 0.7,  size: 32, color: '#cc0044' },
  juggler:        { hpMult: 2.0, speedMult: 0.55, size: 36, color: '#ffdd00' },
  clownCar:  { hpMult: 2.5, speedMult: 1.0, size: 36, color: '#ffdd00' },
miniClown: { hpMult: 0.1, speedMult: 1.2, size: 16, color: '#ff4400' },
  corRed:   { hpMult: 0, speedMult: 1, size: 52, color: '#ff2244' },
  corBlue:  { hpMult: 0, speedMult: 1, size: 38, color: '#22ddff' },
};
