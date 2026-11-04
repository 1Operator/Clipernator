# CLIPERNATOR — Design Reference

## General Notes
- "Entities" usually refers to both the player and enemies, but can also refer to bosses or projectiles
- Goal is to make floor 1 & 2 as good as possible before adding more floors
- I am trying to make this a actually good game, I do not want to cut any corners
- When suggesting changes, tell me what part of the code to add or change, do not remake entire files unless necessary
- This document should be updated after any signifcant changes
- Sometimes game states are modified for play testing. I'm not playing 30 minutes until wave 19 to see if mirror maze is reflectable with bowling balls.

- want MS Sans Serif to be used for most of the UI, and for fixedsys to be used in a few specific areas, like how microsoft did it: MS Sans Serif was a bitmap, proportional UI font used for Windows interface text in early Windows versions, and Microsoft Sans Serif later replaced it as the TrueType successor distributed with Windows 2000 and later. In practice, this family was used for dialog boxes, labels, and general interface text rather than code-like text areas. Fixedsys was a bitmap, monospaced font originally used as the system font in Windows 1.0 and 2.0, and later it remained the default font in Notepad through the Windows 9x/ME era. It was mainly associated with old-style text display and legacy editor use rather than general GUI text.
- When you press the minimize button the game just closes and becomes a tiny tab in the middle of the screen. this is funny and should be kept.
- The MGW (main game window) and the simulated offscreen windows are part of the game world, not separate OS windows or separate game simulations.
- **Hotbar** means the Windows-style taskbar along the bottom edge of the full-screen desktop (Start, app buttons, active-window button, audio/settings controls, and clock). It does not mean the MGW's bottom bar; that is only a thin window border/status strip.
- The post-boot desktop and its taskbar are HTML UI. The BIOS, loading, bluescreen, and other intro sequences continue to use canvas for their animation.
- Desktop icons and error dialogs are HTML elements so their text, buttons, and click targets are independent of canvas drawing.
- WonderWeb opens a draggable local browser window with working Home, Golden Chips, and About tabs. Golden Chips are earned from Chippy or rare drops and currently only accumulate/display; they do not have a spending use yet.
- Opening-sequence item-draft selections use the BIOS confirmation sound; `ItemConfirm` is reserved for in-game item choices, pickups, and relic unlocks.
- Email is a draggable inbox overlay and does not pause an active run. Offers expire after 20–60 seconds of active gameplay; random mail is checked once per active minute with a 50% chance.
- New email plays a notification chime, bounces the Email hotbar icon briefly, and shows a blinking unread count. Hovering the icon shows the unread total; opening the inbox plays its open cue.
- The inbox lists messages by soonest expiry, with unread messages bolded, an expiry bar, a preview, and up to two message-specific actions. Selecting a message is always safe.
- Bounties and terms agreements count complete waves, starting with the next full wave. Bounties fail without penalty if their accepted condition is broken; terms must be scrolled to the bottom before acceptance and apply their stated modifier.
- Spam consequences happen only through its link button; reporting spam rewards a chip, while reporting a real offer only deletes it. System notices provide information without rewards.
- The desktop Trash icon opens a draggable item-uninstall window without pausing the run. It lists owned items as sprite-only tiles, previews the selected item above the grid, and shows its value/action in a full-height side panel. Items are worth 2 chips by default; Triple Layered Cake, Popcorn Bowl, and Full Clown Mode are worth 4, while Quadruple Layered Cake is worth 8. Uninstalling removes an item from the available loadout and clears its persistent effect; an already-running timed effect finishes normally. Dependent upgrades are removed with their parent, and lower cake tiers do not return after uninstalling an upgrade.
- Trash opening and successful item uninstall play the dedicated `TrashOpen` and `TrashUse` sound effects.

---

## Item Rules
1. Items can be permanent or temporary
2. Items can affect the player, enemies, environment, or a combination
3. Items can have only positive effects, or both positive and negative effects (never only negative)
4. Items can and should interact with each other
5. Item names should be at least loosely related to their effect

---

## Status Effects
- **Leaking** — applied by the Utensil's knife; deals 5% of the player's max health once per second for 3 seconds. Reapplications add another 3 seconds. Affected entities are tinted grey, and active player status is shown in the pause menu.

---

  


## Item Pools

### Floor 1 Items (ALL_ITEM_IDS)
- **Birthday Party** 🎂 — all enemies lose movement for 3 seconds. Temporary, field pickup, 
- **Golden Cookie** 🍪 — 7x speed + 7x reload speed for 7 seconds. Temporary, field pickup
- **Double Layered Cake** 🍰🍰 — every bullet: 40% dud, 60% 2x damage. Permanent
- **Triple Layered Cake** 🍰🍰🍰 — every bullet: 45% dud, 55% 3x damage. Replaces Double. Permanent
- **Quadruple Layered Cake** 🍰🍰🍰🍰 — every bullet: 50% dud, 50% 4x damage. Replaces Triple. Permanent
- **Bouncy House** 🏠 — bullets, enemies, and player all bounce off walls. Permanent
- **Party Popper** 🎉 (Dash) — SHIFT to dash, damages enemies on contact, 3 charges. Permanent
- **Shake Fizzle Pop** 🥤 — meter fills over time; while full: +speed +damage; on hit: shockwave burst and meter resets. Permanent
- **Flawless Baking** 🧁 — complete a wave without taking damage: +2 max ammo. Permanent
- **Cursed Candles** 🕯️ — 5 candles orbit player, drain 5 HP/sec, each lit candle adds +2 bullets/shot. Candles relight over time. Permanent

### Floor 2 Items (FLOOR2_ITEM_IDS)
- **Mirror Maze** 🪞 — one shard orbits player; shoot the shard to redirect bullets toward nearest enemy or shard; kills spawn new shards. Permanent
- **Popcorn Bucket** 🍿 — enemies drop kernels on death; collect 5 for a 4-second bullet explosion frenzy. Permanent
- **Raging Rings** 💫 — player bullets that touch the player begin orbiting at 3x damage, max 16 rings; Permanent
- **Bowling Balls** 🎳 — Pierces enemies, damages each one it passes through (no b.life = 0 on hit)
   - Explodes on expiry/too many bounces
   - Reflectable by glowstick (already handled since tickMeleeWindow iterates gs.bullets — just needs to not skip isBowlingBall)
   - Mirror shard hit → redirected ball + spawn second ball toward nearest enemy
   - Grey preview circle at gun tip while queued
   - Always uses full cake multiplier, never dud
   
- **Tightrope Boots** 👢 — +200% move speed. Permanent
- **Clownish** 🔵 — a nose grows over time; when fully grown and near an enemy it honks, emitting two expanding sound waves that confuse all enemies they pass through. Permanent

### General Items (any floor, ~20% chance, GENERAL_ITEM_IDS)
- **Paper Cuts** 📄 — any enemy that has taken damage loses 1 HP per second until dead. Permanent
- **Extra Clips** 📎 — +15% max HP and +15% max ammo, full heal on pickup. Stacks. Permanent
- *(needs at least 5 more items in this pool — office/technology/retro theme)*



---

## Glowsticks / Melee
- Right-click or F to activate
- everything reflected is explosive
- Activates an instant hitbox box in front of the player for `MELEE_ACTIVE_FRAMES` frames
- Zero delay between button press and hitbox being live
- Reflects enemy bullets and raging ring bullets toward the player's cursor as explosive shots
- Cannonball enemies can be redirected by glowstick at any time (not just while charging)
- **No cooldown on successful reflect** — cooldown only applies on miss
- Brief game freeze (explosionFreezeTimer) on successful reflect
- Melee also damages enemies in front for baseDamage * 3

---

## Enemy Behaviors

### Floor 1
- **Utensil** (fork/knife/spoon) — body drifts toward player; orbiting utensil launches at player on a timer; knife bleeds, spoon knocks back, fork grabs and slows
- **Water Balloon** — moves around randomly and fires gravity-affected bullets at the player
- **Gift Box** — slow wind-up explosion on proximity; player can grab and throw it
- **Party Hat** — fast, periodically speed-dives at player
- **Cake Boss** (wave 11) — multi-phase: candle shots, spin bounce, frosting arc balls; loses a candle per HP threshold; at 1 candle enters permanent spiral

### Floor 2


- **Cannonball** — telegraphs then charges across arena; can be reflected by glowstick at any time into an explosion
- **Ringmaster** — flees player, buffs nearby enemies (speed, size, damage, HP); enemies in aura long enough reach Critical Mass (immune to explosives, 3x damage, explode on contact)
- **Juggler** — captures nearby enemies and juggles them; throws arc balls and captured enemies at player; orbits ringmaster if one is nearby
- Clown car - drives around and throws clowns
- Clowns - chases enemies, gives them extra speed when on them
- **Boss 2** (wave 26) — spiral, summon, and volley phases; phase 2 at 50% HP

---

## Offscreen Windows (Prototype)

- Enemies that move beyond the MGW's world bounds get an in-page floating window that renders the shared game scene around them. Enemies still update and interact through the normal simulation; the window is another camera/view, not a separate arena.
- Nearby offscreen enemies can share a window. Their title lists the enemy types, and the camera frames the group. Enemy windows can be dragged; dragging moves the contained enemies and their world positions together.
- When an enemy window overlaps the MGW, its enemies merge back into the MGW. Moving the MGW does not directly move offscreen windows or their entities.
- Clippy gets a non-draggable window while outside the MGW. Clippy remains controllable and can aim/shoot using the offscreen view. Remaining outside costs 3 HP per second.
- The utensil's launched attacks can travel beyond the MGW boundary, and fork-thrown enemies are not immediately clamped back into it. These changes are scoped to utensil attacks and fork throws; they do not yet guarantee that every projectile or enemy mechanic works seamlessly across all window boundaries.
- Mini-window canvases have a black background. The grid is still drawn only over the MGW's world bounds; it does not extend across the full mini-window view.
- Treat cross-window behavior as experimental. Review mechanics that assume the MGW bounds are hard arena walls (projectile culling, collision, enemy cleanup, knockback, boss attacks, and merge positioning) before expanding this system to more enemy types or relying on it for balance.

---

## Sound Effects

Sound effects are registered in `jsstuff/sounds.js`. “Wired” means the sound is currently triggered by the listed game event; “unused” means the file is present but has no gameplay hook yet.

### Player

| File | Intended event / status |
|---|---|
| `PlayerDamage.mp3` | Wired: player takes damage from enemy contact or a hostile projectile. |
| `ClippyDamage.mp3` | Wired: Clippy takes damage; used alongside `PlayerDamage` on relevant hits. |
| `ClippyDeath.mp3` | Wired: game over. |
| `ClippySpeak.mp3` | Wired: plays with Clippy’s randomized reaction whenever paying Chippy’s health cost. |
| `NotAllowed.mp3` | Wired: plays when an attempted interaction cannot succeed under current conditions, such as Chippy rejecting a health payment, Chippy being out of range or busy, Glowsticks being on cooldown, or using the prize wheel on the wrong floor or without enough tickets. |
| `Shoot1.mp3`–`Shoot4.mp3` | Wired: randomized player shot sounds. |
| `ReloadStart1.mp3`–`ReloadStart3.mp3` | Wired: randomized reload-start cue. |
| `ReloadFinish.mp3` | Wired: reload completes. |
| `SpeedUp.mp3` | Unused for now; reserved for a future speed-up event. |
| `RelicAquire.mp3` | Wired: Glowsticks, the current permanent relic/upgrade, are unlocked. Filename spelling matches the asset. |

### Bullets

| File | Intended event / status |
|---|---|
| `NormalHit1.mp3`, `NormalBulletHit.mp3` | Wired: ordinary player bullet hits an enemy; randomized between the two available impact sounds. |
| `2xHit.mp3`, `3xHit.mp3`, `4xHit.mp3` | Wired: player bullets hit with the corresponding damage multiplier. |
| `BowlingBallBounce.mp3` | Wired: bowling ball bounces. |
| `BowlingBallHit.mp3` | Wired: bowling ball hits an enemy. |
| `DudHit.mp3` | Wired: dud player bullets hit an enemy. |
| `TearHit.mp3` | Wired: an enemy tear projectile hits the player. |
| `BouncyBullet.mp3` | Wired: a bullet ricochets from a wall while Bouncy House is active. |
| `bullets/Shoot1.mp3` | Unused: player firing already uses the four files under `player/`; this duplicate is not layered over them. |

### Enemies

| File | Intended event / status |
|---|---|
| `Utensil/UtensilSpawn.mp3` | Wired: a Utensil spawns. |
| `Utensil/Fork/ForkHit.mp3` | Wired: a fork makes contact with its target. |
| `Utensil/Fork/ForkAttack.mp3` | Wired: a fork launches toward its target, separate from the hit and grab sounds. |
| `Utensil/Fork/ForkGrab.mp3`, `ForkGrab2.mp3` | Wired: randomized cue when the fork grabs the player. |
| `Utensil/Spoon/SpoonDamage.mp3` | Wired: a spoon damages the player. |
| `PartyHat/PartyHatSpawn.mp3` | Wired: a Party Hat spawns. |
| `PartyHat/PartyHatAttack.mp3` | Wired: a Party Hat begins its dive attack. |
| `PartyHat/PartyHatRecover.mp3` | Wired: plays as the Party Hat starts its recovery bounce after a dive. |
| `PartyHat/PartyHatRide.mp3`, `PartyHatRide2.mp3` | Wired: randomized cue when a Party Hat rides an enemy. |
| `PartyHat/PartyHatDrop.mp3` | Wired: a Party Hat loses its ride target. |
| `PartyHat/PartyHatDie.mp3` | Wired: a Party Hat entity is destroyed. |
| `GiftBox/GiftBoxWindUp.mp3` | Wired: winds forward while the player is in range and reverses as its fuse winds down out of range; silence when fully unwound. |
| `WaterBalloon/BalloonSpawn.mp3` | Wired: a Water Balloon enemy spawns. |
| `CakeBoss/FrostingLaunch.mp3` | Wired: the Cake Boss launches frosting projectiles. |
| `CakeBoss/FrostingHit.mp3` | Wired: a frosting projectile lands. |

### Chippy, Chips, and Items

| File | Intended event / status |
|---|---|
| `Chippy/ChippyUse.mp3` | Wired: first Chippy interaction, when the health payment starts production. |
| `Chippy/ChippyClick.mp3` | Wired: repeated spin cue during Chippy’s long spin; cues become progressively farther apart as it slows. No sound is used during Produce until a separate sound is available. |
| `Chippy/ChippyFinish.mp3` | Wired: the long spin reaches its final frame and stops. |
| `Chips/ChipPickup.mp3` | Wired: a normal chip is collected. |
| `Chips/GoldenChipTarget.mp3` | Wired as a loop: plays while at least one golden chip is magnetized and homing toward the player. |
| `Chips/GoldenChipPickup.mp3` | Wired: a golden chip is collected, including from Chippy. |
| `items/ItemConfirm.mp3` | Wired: confirms an in-game item choice, plays when an item is picked up, and plays when Glowsticks are unlocked. Opening-sequence item drafts use `opening/confirm.mp3`. |
| `items/BirthdayParty/BirthdayParty.mp3` | Wired: intended to play when the Birthday Party item effect activates and freezes enemy movement. The current file is 1 byte and needs valid audio data to be audible. |
| `items/ItemReveal.mp3` | Wired: plays at normal speed when in-game item choices appear; cards reveal immediately, at about +0.67 seconds, and at about +1.33 seconds, each with a 1.5-second impact-scale animation. The fourth Floor 2 card reveals with the third. |
| `misc/CandleLight.mp3` | Wired: plays whenever one of the player's Cursed Candles relights. Reuse this cue for future boss-candle lighting events. |
| `misc/Explosions/PartyExplosion.mp3` | Wired: plays on explosive projectiles, Gift Box explosions, and the full Shake Fizzle Pop shockwave, with slight randomized pitch variation. |

### Interface and Opening Sequence

| File | Intended event / status |
|---|---|
| `UI/PauseSound.mp3` | Wired: entering the pause menu. Starts directly from the pause key event; pausing the game loop does not prevent audio playback. |
| `UI/Email/EmailNotification.mp3` | Wired: a new message arrives. |
| `UI/Email/EmailOpen.mp3` | Wired: opening the inbox or selecting an unread message. |
| `UI/Email/EmailAccept.mp3`, `EmailReject.mp3` | Wired: accepting/rejecting an offer. |
| `UI/Trash/TrashOpen.mp3` | Wired: opening the Trash window. |
| `UI/Trash/TrashUse.mp3` | Wired: successfully uninstalling an item. |
| `misc/Waves/WaveComplete.mp3` | Wired: a wave is completed. |
| `misc/CreepySound.mp3`, `misc/OMINI.mp3` | Unused, as requested; reserved for later. |
| `opening/bluescreen.mp3` | Wired: opening sequence blue-screen effect. |
| `opening/click.mp3` | Wired: opening/interface click. |
| `opening/confirm.mp3` | Wired: opening-sequence confirmation outside item selection. |
| `opening/fixing.mp3` | Wired: opening sequence repair effect. |
| `opening/startup1.mp3`, `startup2.ogg`, `startup3.mp3` | Wired: opening computer startup sequence. |
| `opening/startup2.mp3` | Unused duplicate; the opening sequence uses `startup2.ogg`. |
| `opening/switch.mp3` | Wired: opening-sequence selection navigation. |
| `opening/typing1.mp3`–`typing3.mp3` | Wired: randomized opening-sequence typing sounds. |

---
