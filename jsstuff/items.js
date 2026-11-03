// ============================================================
// CLIPBLAST: PARTY HUNTER — Item Definitions 
// ============================================================

const ITEM_DEFS = {
  birthday: {
    id: 'birthday', label: 'BIRTHDAY\nPARTY', icon: '🎂',
    img: 'sprites/items/birthdayparty/BirthdayParty.png',
    desc: 'ALL ENEMIES\nLOSE MOVMENT CONTROL\nFOR 3 SECONDS',
    color: '#ff69b4', shadowColor: '#ff69b4', spawnCooldown: 18000,
    effect(gs) {
      gs.partyFreezeTimer = CFG.PARTY_FREEZE_FRAMES;
      SFX.play('birthdayParty', 0.65);
      const enemies = ECS.query('enemy', 'pos');
      spawnPartyParticles(CFG.W/2, CFG.H/2);
      for (const id of enemies) { const p = ECS.get(id,'pos'); spawnPartyParticles(p.x, p.y); }
      showMsg('SURPRISE!!! PARTY TIME!!!');
    },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/300, bob=Math.sin(t+phase)*6, spin=Math.sin(t*.5+phase)*.15;
      ctx.save(); ctx.translate(x,y+bob); ctx.rotate(spin);
      ctx.shadowColor='#ff69b4'; ctx.shadowBlur=24+Math.sin(t)*8;
      ctx.fillStyle='#ff6699'; ctx.fillRect(-22,-4,44,20);
      ctx.fillStyle='#ff99bb'; ctx.fillRect(-16,-18,32,15);
      ctx.fillStyle='#ffccdd'; ctx.fillRect(-10,-28,20,11);
      ctx.fillStyle='#ffffff';
      for(let i=0;i<5;i++){ctx.beginPath();ctx.arc(-16+i*8,-4,4,0,Math.PI);ctx.fill();}
      const cc=['#ff4444','#ffdd00','#00cc88','#aa44ff'];
      for(let i=0;i<3;i++){
        const cx=-7+i*7;
        ctx.fillStyle=cc[i%cc.length]; ctx.fillRect(cx-2,-38,4,11);
        ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ff8800'; ctx.shadowBlur=8;
        ctx.beginPath(); ctx.ellipse(cx,-40+Math.sin(t*3+i)*1.5,2.5,4,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.ellipse(cx,-40+Math.sin(t*3+i)*1.5,1,2,0,0,Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur=0; ctx.fillStyle='#ffdd00';
      for(let i=0;i<6;i++){ctx.beginPath();ctx.arc(-18+i*7,4,2.5,0,Math.PI*2);ctx.fill();}
      const cols=['#ffdd00','#ff69b4','#00ff99','#ff4444','#aaddff'];
      for(let i=0;i<12;i++){
        const ca=t*1.5+i*.524,cr=30+Math.sin(t+i)*5;
        ctx.fillStyle=cols[i%cols.length]; ctx.shadowColor=cols[i%cols.length]; ctx.shadowBlur=4;
        ctx.fillRect(Math.cos(ca)*cr-2,Math.sin(ca)*cr-2,4,4);
      }
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('BIRTHDAY',0,28); ctx.fillText('PARTY',0,38); ctx.restore();
    }
  },

  cookie: {
    id: 'cookie', label: 'GOLDEN\nCOOKIE', icon: '🍪',
     img: 'sprites/items/goldencookie/GoldenCookie.png',
    desc: '7x SPEED\n+ 7x FASTER RELOAD\nFOR 7 SECONDS',
    color: '#ffdd00', shadowColor: '#ffaa00', spawnCooldown: 17000,
    effect(gs) {
      gs.ammo = emailAmmoCapacity();
      gs.speedBoostTimer = 420;
      gs.speedBoostMult = 7;
      if (gs.reloading) gs.reloadTimer = Math.floor(gs.reloadTimer / 7);
      updateHUD();
      showMsg('GOLDEN COOKIE!!! 7x SPEED + LIGHTNING RELOAD!');
    },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/280, bob=Math.sin(t+phase)*6, pulse=1+Math.sin(t*3)*0.08;
      ctx.save(); ctx.translate(x,y+bob); ctx.scale(pulse,pulse);
      ctx.shadowColor='#ffdd00'; ctx.shadowBlur=28+Math.sin(t)*12;
      ctx.fillStyle='#ffcc00'; ctx.beginPath(); ctx.arc(0,0,19,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ffeeaa'; ctx.beginPath(); ctx.arc(-6,-6,6,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(7,-5,5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#ff8800'; ctx.font='bold 14px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('G', 0, 6);
      ctx.shadowBlur=0; ctx.fillStyle='#ffffff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('GOLDEN',0,29); ctx.fillText('COOKIE',0,38); ctx.restore();
    }
  },

  doubledCake: {
    id: 'doubledCake', label: 'DOUBLE\nLAYERED\nCAKE', icon: '🍰🍰',
     img: 'sprites/items/doublecake/DoubleCake.png',
    desc: 'EVERY BULLET:\n40% CHANCE DO NOTHING\n60% CHANCE 2X DAMAGE',
    color: '#ff44aa', shadowColor: '#ff88dd', spawnCooldown: 999999999,
    effect(gs) { gs.hasDoubleCake = true; showMsg('DOUBLE LAYERED CAKE ACQUIRED!'); },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/260, bob=Math.sin(t+phase)*5.5;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#ff88dd'; ctx.shadowBlur=24;
      ctx.fillStyle='#cc6644'; ctx.fillRect(-25,8,50,14);
      ctx.fillStyle='#eeaa66'; ctx.fillRect(-22,-4,44,13);
      ctx.fillStyle='#ff99cc'; ctx.fillRect(-20,-9,40,7);
      ctx.fillStyle='#ff2266'; ctx.beginPath(); ctx.arc(-11,-14,5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(11,-14,5,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=15; ctx.fillStyle='#ffff77';
      for(let i=0;i<7;i++){const a=t*2.2+i*.9,r=23; ctx.fillRect(Math.cos(a)*r-1.5,Math.sin(a)*r-18,3,3);}
      ctx.shadowBlur=0; ctx.fillStyle='#ffffff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('DOUBLE',0,32); ctx.fillText('LAYERED',0,40); ctx.restore();
    }
  },

  tripleCake: {
    id: 'tripleCake', label: 'TRIPLE\nLAYERED\nCAKE', icon: '🍰🍰🍰',
     img: 'sprites/items/doublecake/TripleCake.png',
    desc: 'EVERY BULLET:\n45% CHANCE DO NOTHING\n55% CHANCE 3X DAMAGE',
    color: '#ff22ff', shadowColor: '#cc00cc', spawnCooldown: 999999999,
    effect(gs) {
      gs.hasDoubleCake = false;
      gs.hasTripleCake = true;
      gs.hasQuadCake = false;
      gs.unlockedItems = gs.unlockedItems.filter(id => id !== 'doubledCake');
      showMsg('TRIPLE LAYERED CAKE ACQUIRED!');
    },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/260, bob=Math.sin(t+phase)*5.5;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#cc00cc'; ctx.shadowBlur=24;
      ctx.fillStyle='#aa2266'; ctx.fillRect(-25,8,50,14);
      ctx.fillStyle='#ee77aa'; ctx.fillRect(-22,-4,44,13);
      ctx.fillStyle='#ff66cc'; ctx.fillRect(-20,-9,40,7);
      ctx.fillStyle='#ff22ff'; ctx.beginPath(); ctx.arc(-11,-14,5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(11,-14,5,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=15; ctx.fillStyle='#ffff77';
      for(let i=0;i<7;i++){const a=t*2.2+i*.9,r=23; ctx.fillRect(Math.cos(a)*r-1.5,Math.sin(a)*r-18,3,3);}
      ctx.shadowBlur=0; ctx.fillStyle='#ffffff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('TRIPLE',0,32); ctx.fillText('LAYERED',0,40); ctx.restore();
    }
  },

  quadCake: {
    id: 'quadCake', label: 'QUADRUPLE\nLAYERED\nCAKE', icon: '🍰🍰🍰🍰',
    img: 'sprites/items/doublecake/QuadCake.png',
    desc: 'EVERY BULLET:\n50% CHANCE DO NOTHING\n50% CHANCE 4X DAMAGE',
    color: '#aa00ff', shadowColor: '#8800cc', spawnCooldown: 999999999,
    effect(gs) {
      gs.hasDoubleCake = false;
      gs.hasTripleCake = false;
      gs.hasQuadCake = true;
      gs.unlockedItems = gs.unlockedItems.filter(id => id !== 'doubledCake' && id !== 'tripleCake');
      showMsg('QUADRUPLE LAYERED CAKE ACQUIRED!');
    },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/260, bob=Math.sin(t+phase)*5.5;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#8800cc'; ctx.shadowBlur=24;
      ctx.fillStyle='#660088'; ctx.fillRect(-25,8,50,14);
      ctx.fillStyle='#aa44cc'; ctx.fillRect(-22,-4,44,13);
      ctx.fillStyle='#dd22ff'; ctx.fillRect(-20,-9,40,7);
      ctx.fillStyle='#aa00ff'; ctx.beginPath(); ctx.arc(-11,-14,5,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(11,-14,5,0,Math.PI*2); ctx.fill();
      ctx.shadowBlur=15; ctx.fillStyle='#ffff77';
      for(let i=0;i<7;i++){const a=t*2.2+i*.9,r=23; ctx.fillRect(Math.cos(a)*r-1.5,Math.sin(a)*r-18,3,3);}
      ctx.shadowBlur=0; ctx.fillStyle='#ffffff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('QUAD',0,32); ctx.fillText('LAYERED',0,40); ctx.restore();
    }
  },

  bouncy: {
    id: 'bouncy', label: 'BOUNCY\nHOUSE', icon: '🏠',
     img: 'sprites/items/bouncyhouse/BouncyHouse.png',
    desc: 'PERMANENT:\nBULLETS + ENEMIES\n+ YOU BOUNCE\nOFF WALLS',
    color: '#88ffdd', shadowColor: '#00ffcc', spawnCooldown: 999999999,
    effect(gs) { gs.bouncyHouse = true; showMsg('BOING!!! EVERYTHING BOUNCES NOW!!!'); },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/300, bob=Math.sin(t+phase)*5, sq=1+Math.sin(t*2.2+phase)*.06;
      ctx.save(); ctx.translate(x,y+bob); ctx.scale(1,sq);
      ctx.shadowColor='#88ffdd'; ctx.shadowBlur=20+Math.sin(t)*8;
      ctx.fillStyle='#22ddbb'; ctx.fillRect(-26,-10,52,30);
      ctx.fillStyle='#ff69b4'; ctx.beginPath(); ctx.moveTo(0,-36); ctx.lineTo(-30,-10); ctx.lineTo(30,-10); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ffdd00'; ctx.beginPath(); ctx.moveTo(0,-36); ctx.lineTo(-8,-26); ctx.lineTo(8,-26); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#44eedd'; ctx.beginPath(); ctx.ellipse(-13,5,9,11,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(13,5,9,11,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#001a14'; ctx.beginPath(); ctx.ellipse(0,14,9,12,0,Math.PI,0,true); ctx.fillRect(-9,14,18,6); ctx.fill();
      ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=6;
      const ab=Math.abs(Math.sin(t*2))*4;
      ctx.beginPath(); ctx.moveTo(-32-ab,5); ctx.lineTo(-26-ab,-2); ctx.lineTo(-26-ab,12); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(32+ab,5); ctx.lineTo(26+ab,-2); ctx.lineTo(26+ab,12); ctx.closePath(); ctx.fill();
      const sc=['#ffffff','#ffdd00','#ff69b4'];
      for(let i=0;i<4;i++){const sx=-18+i*12,sy=-22+Math.sin(t*3+i)*2; ctx.fillStyle=sc[i%sc.length]; ctx.shadowColor=sc[i%sc.length]; ctx.shadowBlur=4; ctx.beginPath(); ctx.arc(sx,sy,1.5,0,Math.PI*2); ctx.fill();}
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.scale(1,1/sq); ctx.fillText('BOUNCY',0,30); ctx.fillText('HOUSE',0,40); ctx.restore();
    }
  },

  dash: {
    id: 'dash', label: 'PARTY\nPOPPER', icon: '🎉',
     img: 'sprites/items/dash/PartyPopper.png',
    desc: 'PERMANENT:\nSHIFT TO DASH\nDAMAGES ENEMIES\n3 CHARGES',
    color: '#ff9900', shadowColor: '#ffcc00', spawnCooldown: 999999999,
    effect(gs) {
      gs.hasDash = true; gs.dashCharges = CFG.DASH_MAX_CHARGES; gs.dashMaxCharges = CFG.DASH_MAX_CHARGES;
      gs.dashCooldownTimer = 0; gs.dashCooldownMax = CFG.DASH_COOLDOWN_FRAMES;
      gs.dashTimer = 0; gs.dashVx = 0; gs.dashVy = 0;
      gs.dashWindupTimer = 0; gs.dashLaunchFrame = 0; gs.dashActiveThisFrame = false; gs.dashBurst = null;
      showMsg('SHIFT TO DASH! 3 CHARGES!');
    },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/300, bob=Math.sin(t+phase)*5;
      ctx.save(); ctx.translate(x,y+bob); ctx.rotate(Math.sin(t*.8+phase)*.12);
      ctx.shadowColor='#ffaa00'; ctx.shadowBlur=20+Math.sin(t)*6;
      ctx.save(); ctx.rotate(-0.7);
      ctx.fillStyle='#ff6600'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-8,-28); ctx.lineTo(8,-28); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#ffdd00'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-4,-8); ctx.lineTo(-6,-20); ctx.stroke(); ctx.beginPath(); ctx.moveTo(2,-10); ctx.lineTo(1,-22); ctx.stroke();
      ctx.fillStyle='#ffcc44'; ctx.fillRect(-10,-30,20,5); ctx.fillStyle='#cc4400'; ctx.fillRect(-4,0,8,14); ctx.restore();
      const bc=['#ff69b4','#ffdd00','#00ff99','#ff4444','#aaddff','#ffffff'];
      for(let i=0;i<10;i++){const ba=-1.2+i*.18+Math.sin(t*2+i)*.12,br=18+Math.sin(t*3+i*.7)*6; ctx.fillStyle=bc[i%bc.length]; ctx.shadowColor=bc[i%bc.length]; ctx.shadowBlur=4; ctx.fillRect(Math.cos(ba)*br-2+6,Math.sin(ba)*br-2-22,4,4);}
      ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=8;
      for(let i=0;i<3;i++){const sa=t*2+i*2.09,sr=26+Math.sin(t+i)*4; ctx.beginPath(); ctx.arc(Math.cos(sa)*sr+4,Math.sin(sa)*sr-14,2.5,0,Math.PI*2); ctx.fill();}
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('PARTY',0,24); ctx.fillText('POPPER',0,34); ctx.restore();
    }
  },

  shakeFizzlePop: {
    id: 'shakeFizzlePop', label: 'SHAKE\nFIZZLE\nPOP!', icon: '🥤',
    img: 'sprites/items/shakefizzlepop/ShakeFizzlePop.png',
    desc: 'PERMANENT:\nCLIPPY FIZZLES UNTIL BECOMING FULL\nWHILE FULL: + SPEED & DAMAGE\nWHEN HIT: SHOCKWAVE BURST',
    color: '#ff4400', shadowColor: '#ff8800', spawnCooldown: 999999999,
    effect(gs) {
      gs.hasShakeFizzlePop = true;
      gs.sfpMeter = 0;
      gs.sfpFull = false;
      showMsg('SHAKE FIZZLE POP! DON\'T GET HIT!');
    },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/280, bob=Math.sin(t+phase)*6;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#ff4400'; ctx.shadowBlur=22+Math.sin(t*2)*8;
      ctx.fillStyle='#cc2200'; ctx.beginPath(); ctx.roundRect(-14,-22,28,38,4); ctx.fill();
      ctx.fillStyle='#ff5500'; ctx.fillRect(-12,-20,24,6);
      ctx.fillStyle='#ff8844'; ctx.fillRect(-11,-14,22,18);
      const bc=['#ff6600','#ffaa00','#ff3300'];
      for(let i=0;i<5;i++){const bx=-7+i*4,by=-8+Math.sin(t*3+i*1.2)*4; ctx.fillStyle=bc[i%bc.length]; ctx.shadowBlur=6; ctx.beginPath(); ctx.arc(bx,by,2.5,0,Math.PI*2); ctx.fill();}
      ctx.shadowColor='#ffcc00'; ctx.shadowBlur=10;
      for(let i=0;i<4;i++){const fx=-6+i*4,fy=-24+Math.sin(t*4+i)*3; ctx.fillStyle='#ffee88'; ctx.fillRect(fx-1,fy,2,6);}
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('SHAKE',0,24); ctx.fillText('FIZZLE',0,32); ctx.restore();
    }
  },

  flawlessBaking: {
    id: 'flawlessBaking', label: 'FLAWLESS\nBAKING', icon: '🧁',
    img: 'sprites/items/flawlessbaking/FlawlessBaking.png',
    desc: 'COMPLETE A WAVE\nWITHOUT DAMAGE:\n+2 MAX AMMO\n',
    color: '#ffaaff', shadowColor: '#ff88ff', spawnCooldown: 999999999,
    effect(gs) {
      gs.hasFlawlessBaking = true;
      gs.flawlessThisWave = true;
      showMsg('FLAWLESS BAKING! STAY CLEAN FOR +AMMO!');
    },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/300, bob=Math.sin(t+phase)*5;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#ff88ff'; ctx.shadowBlur=20+Math.sin(t)*6;
      ctx.fillStyle='#cc44cc'; ctx.beginPath(); ctx.moveTo(-18,18); ctx.lineTo(-14,-2); ctx.lineTo(14,-2); ctx.lineTo(18,18); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ee66ee'; ctx.fillRect(-16,-4,32,6);
      ctx.fillStyle='#ffccff';
      ctx.beginPath(); ctx.arc(-8,-10,10,Math.PI,0); ctx.fill();
      ctx.beginPath(); ctx.arc(8,-10,10,Math.PI,0); ctx.fill();
      ctx.beginPath(); ctx.arc(0,-18,10,Math.PI,0); ctx.fill();
      const sc=['#ff4488','#ffdd00','#00ffaa','#4488ff'];
      for(let i=0;i<6;i++){const sx=-10+i*4,sy=-14+Math.sin(i*1.4)*4; ctx.fillStyle=sc[i%sc.length]; ctx.shadowColor=sc[i%sc.length]; ctx.shadowBlur=4; ctx.fillRect(sx,sy,4,2);}
      ctx.fillStyle='#ff2244'; ctx.shadowColor='#ff2244'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(0,-28,5,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#44cc44'; ctx.lineWidth=1.5;
      ctx.beginPath(); ctx.moveTo(0,-23); ctx.quadraticCurveTo(8,-20,5,-15); ctx.stroke();
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('FLAWLESS',0,30); ctx.fillText('BAKING',0,40); ctx.restore();
    }
  },

  cursedCandles: {
    id: 'cursedCandles', label: 'CURSED\nCANDLES', icon: '🕯️',
    img: 'sprites/items/cursedcandles/CursedCandles.png',
    desc: 'PERMANENT:\n5 CANDLES ORBIT YOU\nDRAIN 5 HP/SEC\nEACH LIT CANDLE\n+2 BULLETS',
    color: '#ff8800', shadowColor: '#ffaa44', spawnCooldown: 999999999,
    effect(gs) {
      gs.hasCursedCandles = true;
      gs.candlesLit = 0;
      gs.candleHpTimer = 0;
      showMsg('CURSED CANDLES! LIGHT THEM WITH YOUR SOUL!');
    },
    draw() {}
  },

  glowsticks: {
    id: 'glowsticks', label: 'GLOW\nSTICKS', icon: '🟢',
    img: 'sprites/items/GlowSticks/GlowSticks.png',
    desc: 'RIGHT-CLICK:\nMELEE SWING\nREFLECTS PROJECTILES',
    color: '#00ff88', shadowColor: '#00ff00', spawnCooldown: 999999999,
    effect() {},
    draw() {}
  },

  // ── General items (appear on any floor, 20% chance) ──

  paperCuts: {
    id: 'paperCuts', label: 'PAPER\nCUTS', icon: '📄',
     img: 'sprites/items/papercuts/PaperCuts.png',
    desc: 'PERMANENT:\nDAMAGED ENEMIES\nTAKE 1 DAMAGE\nPER SECOND',
    color: '#00ffcc', shadowColor: '#00ccaa', spawnCooldown: 999999999,
    effect(gs) {
      gs.hasPaperCuts = true;
      gs.paperCutsTimer = 0;
      showMsg('PAPER CUTS! DAMAGED ENEMIES BLEED OUT!');
    },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/280, bob=Math.sin(t+phase)*5;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#00ffcc'; ctx.shadowBlur=18+Math.sin(t*2)*6;
      // Paper sheets
      for(let i=2;i>=0;i--){
        const off=i*3, col=i===0?'#ffffff':i===1?'#ddffff':'#bbffee';
        ctx.fillStyle=col; ctx.strokeStyle='#00ccaa'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.roundRect(-18+off,-20+off,32,38,2); ctx.fill(); ctx.stroke();
      }
      // Lines on paper
      ctx.strokeStyle='#00ccaa'; ctx.lineWidth=1.2;
      for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(-14,-12+i*7);ctx.lineTo(10,-12+i*7);ctx.stroke();}
      // Red cut marks
      ctx.strokeStyle='#ff2244'; ctx.lineWidth=2; ctx.lineCap='round';
      for(let i=0;i<3;i++){
        const cx=-10+i*8, cy=-6+i*6;
        ctx.beginPath();ctx.moveTo(cx-4,cy);ctx.lineTo(cx+4,cy+3);ctx.stroke();
        ctx.fillStyle='rgba(255,34,68,0.4)'; ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('PAPER',0,28); ctx.fillText('CUTS',0,38); ctx.restore();
    }
  },

  extraClips: {
    id: 'extraClips', label: 'EXTRA\nCLIPS', icon: '📎',
     img: 'sprites/items/extraclips/ExtraClips.png',
    desc: '+15% MAX HP\n+15% MAX AMMO\nSTACKS!',
    color: '#ffdd00', shadowColor: '#ffaa00', spawnCooldown: 999999999,
    effect(gs) {
  gs.hasExtraClips = true;
  const hpBonus  = Math.ceil(gs.maxHealth * 0.15);
  const ammoBonus = Math.ceil(gs.maxAmmo * 0.15);
  gs.maxHealth += hpBonus;
  gs.maxAmmo   += ammoBonus;
  gs.health     = gs.maxHealth;
  gs.ammo       = emailAmmoCapacity();
  gs.reloading  = false;
  updateHUD();
  showMsg('EXTRA CLIPS! +15% HP & AMMO, FULL HEAL!');
},
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/300, bob=Math.sin(t+phase)*5, spin=Math.sin(t*.6+phase)*.1;
      ctx.save(); ctx.translate(x,y+bob); ctx.rotate(spin);
      ctx.shadowColor='#ffdd00'; ctx.shadowBlur=20+Math.sin(t)*8;
      // Draw several paperclip shapes
      const clipColors=['#ffdd00','#ffaa00','#ff8800'];
      for(let c=0;c<3;c++){
        ctx.save(); ctx.translate((c-1)*12, c*4-4); ctx.rotate(c*0.3);
        ctx.strokeStyle=clipColors[c]; ctx.lineWidth=3; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(0,-14); ctx.arcTo(10,-14,10,0,8); ctx.arcTo(10,8,-2,8,8); ctx.arcTo(-2,8,-2,-6,8); ctx.arcTo(-2,-6,6,-6,8); ctx.stroke();
        ctx.restore();
      }
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('EXTRA',0,28); ctx.fillText('CLIPS',0,38); ctx.restore();
    }
  },

  // ── Floor 2 items ──

  

 mirrorMaze: {
  id: 'mirrorMaze', label: 'MIRROR\nMAZE', icon: '🪞',
    img: 'sprites/items/mirrormaze/MirrorMaze.png',
  desc: 'SHOOT THE SHARD\nTO REDIRECT BULLETS\nKILLS SPAWN NEW SHARDS',
  color: '#ccddff', shadowColor: '#8899ff', spawnCooldown: 999999999,
  effect(gs) {
    gs.hasMirrorMaze = true;
    // Remove the bouncyHouse force and old flag
    gs.mirrorShards = [];
    gs.mirrorPlayerShardTimer = 0; // 0 = shard is active (orbiting), >0 = regenerating
    // Spawn the first orbiting shard
    gs.mirrorShards.push({ orbiting: true, angle: 0, x: 0, y: 0, life: -1 });
    showMsg('MIRROR MAZE! SHOOT THE SHARD TO REDIRECT BULLETS!');
  },
 
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/260, bob=Math.sin(t+phase)*5;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#8899ff'; ctx.shadowBlur=18+Math.sin(t)*8;
      ctx.strokeStyle='#8899ff'; ctx.lineWidth=3; ctx.fillStyle='#001133';
      ctx.beginPath(); ctx.roundRect(-14,-24,28,40,2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle='#ccddff'; ctx.lineWidth=1.5; ctx.globalAlpha=0.8;
      for(let i=0;i<4;i++){ctx.beginPath(); ctx.moveTo(-10+i*6,-18); ctx.lineTo(-12+i*6,10); ctx.stroke();}
      ctx.globalAlpha=1;
      const sc=['#ffffff','#8899ff','#ccddff'];
      for(let i=0;i<5;i++){const a=t*2+i*1.26,r=22; ctx.fillStyle=sc[i%sc.length]; ctx.shadowColor=sc[i%sc.length]; ctx.shadowBlur=5; ctx.fillRect(Math.cos(a)*r-1.5,Math.sin(a)*r-1.5,3,3);}
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('MIRROR',0,26); ctx.fillText('MAZE',0,36); ctx.restore();
    }
  },

  popcornBucket: {
    id: 'popcornBucket', label: 'POPCORN\nBUCKET', icon: '🍿',
     img: 'sprites/items/popcornbucket/PopcornBucket.png',
    desc: 'COLLECT POPCORN FROM KILLS FOR A 4-SEC BULLET EXPLOSION FRENZY',
    color: '#ffcc44', shadowColor: '#ffaa00', spawnCooldown: 999999999,
    effect(gs) { gs.hasPopcornBucket = true; gs.popcornKernels = []; showMsg('POPCORN BUCKET! COLLECT KERNELS FOR FRENZY!'); },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/260, bob=Math.sin(t+phase)*5;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#ffaa00'; ctx.shadowBlur=20;
      ctx.fillStyle='#cc3300'; ctx.beginPath(); ctx.moveTo(-16,12); ctx.lineTo(-12,-14); ctx.lineTo(12,-14); ctx.lineTo(16,12); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#ffdd00'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-14,6); ctx.lineTo(-11,-14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-4,6); ctx.lineTo(-3,-14); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(6,6); ctx.lineTo(5,-14); ctx.stroke();
      ctx.fillStyle='#fffacc'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=8;
      for(let i=0;i<4;i++){const a=t*1.5+i*1.57,px=Math.cos(a)*8,py=Math.sin(a)*4-18; ctx.beginPath(); ctx.arc(px,py,5,0,Math.PI*2); ctx.fill();}
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('POPCORN',0,28); ctx.fillText('BUCKET',0,38); ctx.restore();
    }
  },

  // ── Upgrade items ──
  popcornBowl: {
    id: 'popcornBowl', label: 'POPCORN\nBOWL', icon: '🍿⭐',
    img: 'sprites/items/popcornbucket/PopcornBowl.png',
    desc: 'COLLECT 3 KERNELS\n(NOT 5) FOR FRENZY\nFRENZY LASTS 6 SECS\nHUGE EXPLOSION RADIUS',
    color: '#ffaa00', shadowColor: '#ff8800', spawnCooldown: 999999999,
    effect(gs) {
      gs.hasPopcornBowl = true;
      showMsg('MEGA POPCORN! BIGGER FRENZIES, FEWER KERNELS!');
    },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/260, bob=Math.sin(t+phase)*5;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#ff8800'; ctx.shadowBlur=24+Math.sin(t)*8;
      ctx.fillStyle='#aa2200'; ctx.beginPath(); ctx.moveTo(-20,14); ctx.lineTo(-15,-18); ctx.lineTo(15,-18); ctx.lineTo(20,14); ctx.closePath(); ctx.fill();
      ctx.strokeStyle='#ffdd00'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-18,8); ctx.lineTo(-14,-18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5,8); ctx.lineTo(-4,-18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(7,8); ctx.lineTo(6,-18); ctx.stroke();
      ctx.fillStyle='#fffacc'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=12;
      for(let i=0;i<6;i++){const a=t*1.8+i*1.05,px=Math.cos(a)*12,py=Math.sin(a)*5-22; ctx.beginPath(); ctx.arc(px,py,7,0,Math.PI*2); ctx.fill();}
      // Star
      ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ff8800'; ctx.shadowBlur=10;
      ctx.font='12px serif'; ctx.textAlign='center'; ctx.fillText('⭐',14,-22);
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('MEGA',0,30); ctx.fillText('POPCORN',0,40); ctx.restore();
    }
  },

  clownishUpgrade: {
    id: 'clownishUpgrade', label: 'FULL\nCLOWN\nMODE', icon: '🤡',
    desc: 'CLOWN NOSE BLASTS\nA FULL RING OF 8\nBULLETS (3X DMG)\nCONFUSE ALL NEARBY',
    color: '#4488ff', shadowColor: '#2244cc', spawnCooldown: 999999999,
    effect(gs) {
      gs.hasClownishUpgrade = true;
      showMsg('FULL CLOWN MODE! THE NOSE KNOWS!');
    },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/280, bob=Math.sin(t+phase)*5;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#4488ff'; ctx.shadowBlur=22+Math.sin(t*2)*8;
      // Face
      ctx.fillStyle='#fff4cc'; ctx.beginPath(); ctx.arc(0,-4,16,0,Math.PI*2); ctx.fill();
      // Clown makeup
      ctx.fillStyle='#ff2244'; ctx.beginPath(); ctx.arc(-7,-6,4,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(7,-6,4,0,Math.PI*2); ctx.fill();
      // Pulsing blue nose
      const noseR = 5+Math.sin(t*3)*2;
      ctx.fillStyle='#4488ff'; ctx.shadowColor='#88aaff'; ctx.shadowBlur=14;
      ctx.beginPath(); ctx.arc(0,-4,noseR,0,Math.PI*2); ctx.fill();
      // Smile
      ctx.strokeStyle='#333'; ctx.lineWidth=2; ctx.lineCap='round';
      ctx.beginPath(); ctx.arc(0,0,7,0.2,Math.PI-0.2); ctx.stroke();
      // Wig
      ctx.fillStyle='#ff4400'; ctx.shadowColor='#ff6600'; ctx.shadowBlur=8;
      for(let i=0;i<7;i++){const wa=(i/7)*Math.PI*2,wr=20; ctx.beginPath(); ctx.arc(Math.cos(wa)*wr,Math.sin(wa)*wr-4,5,0,Math.PI*2); ctx.fill();}
      // Bullets orbiting
      ctx.shadowBlur=0;
      for(let i=0;i<8;i++){const ba=t*2+(i/8)*Math.PI*2; ctx.fillStyle='#4488ff'; ctx.shadowColor='#4488ff'; ctx.shadowBlur=4; ctx.fillRect(Math.cos(ba)*28-2,Math.sin(ba)*28-10,4,2);}
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('FULL CLOWN',0,22); ctx.fillText('MODE',0,32); ctx.restore();
    }
  },

 ragingRings: {
  id: 'ragingRings', label: 'RAGING\nRINGS', icon: '💫',
     img: 'sprites/items/ragingrings/RagingRings.png',
  desc: 'BULLETS THAT TOUCH YOU\nORBIT FOREVER\n3X DAMAGE WHILE ORBITING\nMAX 8 RINGS',
 
  color: '#ffffff', shadowColor: '#aaaaff', spawnCooldown: 999999999,
  effect(gs) {
    gs.hasRagingRings = true;
    gs.ragingRingBullets = [];
    showMsg('RAGING RINGS! BULLETS ORBIT YOU!');
  },
  draw(fi) {
    const {x,y,phase}=fi, t=Date.now()/260, bob=Math.sin(t+phase)*5;
    ctx.save(); ctx.translate(x,y+bob);
    ctx.shadowColor='#aaaaff'; ctx.shadowBlur=20+Math.sin(t*2)*8;
    const ringColors=['#ffffff','#aaaaff','#88bbff'];
    for(let r=0;r<3;r++){
      const rr=8+r*7, speed=t*(1.2-r*0.3);
      ctx.strokeStyle=ringColors[r]; ctx.lineWidth=1.5; ctx.globalAlpha=0.4;
      ctx.beginPath(); ctx.arc(0,-4,rr,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha=1;
      ctx.fillStyle=ringColors[r]; ctx.shadowColor=ringColors[r]; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(Math.cos(speed)*rr, Math.sin(speed)*rr-4, 3, 0, Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
    ctx.fillText('RAGING',0,22); ctx.fillText('RINGS',0,32); ctx.restore();
  }
},

 bowlingBall: {
    id: 'bowlingBall', label: 'BOWLING\nBALL', icon: '🎳',
   img: 'sprites/items/bowlingball/BowlingBall.png',
    desc: 'NEXT SHOT:\nA GIANT BOWLING BALL\nPIERCES + BOUNCES\nEXPLODES ON EXPIRY\nHITS MIRROR SHARDS',
    color: '#aaaaaa', shadowColor: '#888888', spawnCooldown: 14000,
    effect(gs) {
      gs.hasBowlingBall = true;
      gs.bowlingBallReady = true;
      gs.bowlingBallRegenTimer = 0;
      showMsg('BOWLING BALL READY! NEXT SHOT IS A STRIKE!');
    },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/300, bob=Math.sin(t+phase)*5, spin=t*1.2;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#aaaaaa'; ctx.shadowBlur=18;
      ctx.fillStyle='#333344';
      ctx.beginPath(); ctx.arc(0,-6,18,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#222233';
      ctx.beginPath(); ctx.arc(0,-6,18,0,Math.PI*2); ctx.fill();
      // Shine
      ctx.fillStyle='#666677';
      ctx.beginPath(); ctx.arc(-6,-12,5,0,Math.PI*2); ctx.fill();
      // Finger holes
      ctx.fillStyle='#111122';
      for(let i=0;i<3;i++){
        const a=spin+i*2.09;
        ctx.beginPath(); ctx.arc(Math.cos(a)*7,Math.sin(a)*7-6,3,0,Math.PI*2); ctx.fill();
      }
      ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('BOWLING',0,20); ctx.fillText('BALL',0,30); ctx.restore();
    }
  },
   

  tightropeBoots: {
    id: 'tightropeBoots', label: 'TIGHTROPE\nBOOTS', icon: '👢',
    img: 'sprites/items/tightropeboots/TightropeBoots.png',
    desc: '+200% MOVE SPEED\nDASH = INTANGIBLE',
    color: '#00ccff', shadowColor: '#0088aa', spawnCooldown: 999999999,
    effect(gs) { gs.hasTightropeBoots = true; showMsg('TIGHTROPE BOOTS! +SPEED'); },
    draw(fi) {
      const {x,y,phase}=fi, t=Date.now()/280, bob=Math.sin(t+phase)*5;
      ctx.save(); ctx.translate(x,y+bob);
      ctx.shadowColor='#00ccff'; ctx.shadowBlur=20;
      ctx.fillStyle='#0066aa'; ctx.fillRect(-18,2,12,14); ctx.fillRect(-20,12,16,6);
      ctx.fillStyle='#00ccff'; ctx.fillRect(-18,2,12,5);
      ctx.fillStyle='#0066aa'; ctx.fillRect(6,2,12,14); ctx.fillRect(4,12,16,6);
      ctx.fillStyle='#00ccff'; ctx.fillRect(6,2,12,5);
      for(let i=0;i<4;i++){const a=t*3+i*1.57,r=22; ctx.fillStyle='#aaffff'; ctx.globalAlpha=0.5+Math.sin(t*4+i)*0.3; ctx.beginPath(); ctx.arc(Math.cos(a)*r,Math.sin(a)*r,2,0,Math.PI*2); ctx.fill();}
      ctx.globalAlpha=1; ctx.shadowBlur=0; ctx.fillStyle='#fff'; ctx.font='8px "Fixedsys", monospace'; ctx.textAlign='center';
      ctx.fillText('TIGHTROPE',0,28); ctx.fillText('BOOTS',0,38); ctx.restore();
    }
  },

  clownish: {
    id: 'clownish', label: 'CLOWNISH', icon: '🔵',
    img: 'sprites/items/clownish/Clownish.png',
    desc: 'GROW A NOSE THAT HONKS\nAND CONFUSES ENEMIES',
    color: '#4488ff', shadowColor: '#2266cc', spawnCooldown: 999999999,
    effect(gs) {
      gs.hasClownish = true;
      gs.clownNoseSize = 0;
      gs.clownNoseTimer = 0;
      gs.clownNoseMax = 480;
      showMsg('CLOWNISH! GROW THE NOSE, CONFUSE THE ENEMIES!');
    },
    draw() {}
  },
};

// ── Item pool lists ──
function isCakeItemAvailable(id, state, pendingIds = []) {
  const pending = new Set(pendingIds);
  const hasDouble = Boolean(state?.hasDoubleCake || pending.has('doubledCake'));
  const hasTriple = Boolean(state?.hasTripleCake || pending.has('tripleCake'));
  const hasQuad = Boolean(state?.hasQuadCake || pending.has('quadCake'));

  if (id === 'doubledCake') return !hasDouble && !hasTriple && !hasQuad;
  if (id === 'tripleCake') return hasDouble && !hasTriple && !hasQuad;
  if (id === 'quadCake') return hasTriple && !hasQuad;
  return true;
}

const ALL_ITEM_IDS = [
  'birthday', 'cookie', 'doubledCake', 'bouncy', 'dash',
  'tripleCake', 'quadCake', 'shakeFizzlePop', 'flawlessBaking', 'cursedCandles'
];

const FLOOR2_ITEM_IDS = [
  'popcornBucket', 'ragingRings', 
  'tightropeBoots', 'mirrorMaze', 'clownish'
];
