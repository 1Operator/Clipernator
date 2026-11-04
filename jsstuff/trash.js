// ============================================================
// CLIPBLAST: PARTY HUNTER — Trash / item uninstall window
// ============================================================

(() => {
  const trashWindow = document.getElementById('trash-window');
  const itemList = document.getElementById('trash-item-list');
  const preview = document.getElementById('trash-item-preview');
  const selectedName = document.getElementById('trash-selected-name');
  const itemValue = document.getElementById('trash-item-value');
  const uninstallButton = document.getElementById('trash-uninstall');
  const status = document.getElementById('trash-status');
  let selectedItemId = null;

  const ITEM_VALUES = {
    tripleCake: 4,
    quadCake: 8,
    popcornBowl: 4,
    clownishUpgrade: 4,
  };

  function itemLabel(id) {
    return ITEM_DEFS[id]?.label.replace(/\n/g, ' ') || 'Unknown item';
  }

  function addItemIcon(container, definition, className) {
    if (definition?.img) {
      const image = document.createElement('img');
      image.src = definition.img;
      image.alt = '';
      image.addEventListener('error', () => {
        const icon = document.createElement('span');
        icon.className = className;
        icon.textContent = definition.icon || '?';
        image.replaceWith(icon);
      }, { once: true });
      container.appendChild(image);
      return;
    }

    const icon = document.createElement('span');
    icon.className = className;
    icon.textContent = definition?.icon || '?';
    container.appendChild(icon);
  }

  function renderTrashWindow(message = '') {
    const ownedItems = typeof gs !== 'undefined' && Array.isArray(gs.unlockedItems)
      ? gs.unlockedItems
      : [];
    if (selectedItemId && !ownedItems.includes(selectedItemId)) selectedItemId = null;

    itemList.replaceChildren();
    for (const id of ownedItems) {
      const definition = ITEM_DEFS[id];
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'trash-item-row';
      row.setAttribute('role', 'option');
      row.setAttribute('aria-pressed', String(id === selectedItemId));
      row.setAttribute('aria-label', itemLabel(id));
      addItemIcon(row, definition, 'trash-item-row-icon');

      row.disabled = !definition;
      row.addEventListener('click', () => {
        selectedItemId = id;
        renderTrashWindow();
      });
      itemList.appendChild(row);
    }

    preview.replaceChildren();
    const selectedDefinition = selectedItemId ? ITEM_DEFS[selectedItemId] : null;
    if (selectedItemId && selectedDefinition) {
      addItemIcon(preview, selectedDefinition, 'trash-item-preview-icon');
      selectedName.textContent = itemLabel(selectedItemId);
      itemValue.textContent = `Value: ${ITEM_VALUES[selectedItemId] || 2} chips`;
      uninstallButton.disabled = false;
    } else {
      selectedName.textContent = selectedItemId
        ? 'Unknown item'
        : ownedItems.length ? 'No item selected' : 'No installed items';
      itemValue.textContent = 'Value: —';
      uninstallButton.disabled = true;
      if (selectedItemId) {
        const icon = document.createElement('span');
        icon.className = 'trash-item-preview-icon';
        icon.textContent = '?';
        preview.appendChild(icon);
      }
    }

    status.textContent = message || (ownedItems.length
      ? 'Uninstalling removes the item from your loadout and returns its chip value.'
      : 'You have no installed items to uninstall.');
  }

  function uninstallItem(id) {
    if (typeof gs === 'undefined' || !gs.unlockedItems.includes(id) || !ITEM_DEFS[id]) return false;

    const itemsToRemove = new Set([id]);
    if (['doubledCake', 'tripleCake', 'quadCake'].includes(id)) {
      itemsToRemove.add('doubledCake');
      itemsToRemove.add('tripleCake');
      itemsToRemove.add('quadCake');
      gs.hasDoubleCake = false;
      gs.hasTripleCake = false;
      gs.hasQuadCake = false;
    }

    switch (id) {
      case 'bouncy':
        gs.bouncyHouse = false;
        break;
      case 'dash':
        gs.hasDash = false;
        gs.dashCharges = 0;
        gs.dashCooldownTimer = 0;
        gs.dashTimer = 0;
        gs.dashVx = 0;
        gs.dashVy = 0;
        gs.dashWindupTimer = 0;
        gs.dashLaunchFrame = 0;
        gs.dashActiveThisFrame = false;
        gs.dashBurst = null;
        break;
      case 'shakeFizzlePop':
        gs.hasShakeFizzlePop = false;
        gs.sfpMeter = 0;
        gs.sfpFull = false;
        break;
      case 'flawlessBaking':
        gs.hasFlawlessBaking = false;
        break;
      case 'cursedCandles':
        gs.hasCursedCandles = false;
        gs.candlesLit = 0;
        gs.candleHpTimer = 0;
        gs.candleRelightDelay = 0;
        break;
      case 'glowsticks':
        gs.hasGlowsticks = false;
        gs.glowCooldown = 0;
        break;
      case 'paperCuts':
        gs.hasPaperCuts = false;
        gs.paperCutsTimer = 0;
        break;
      case 'extraClips':
        gs.hasExtraClips = false;
        gs.maxHealth = Math.max(1, gs.maxHealth - (gs.extraClipsHpBonus || 0));
        gs.maxAmmo = Math.max(1, gs.maxAmmo - (gs.extraClipsAmmoBonus || 0));
        gs.extraClipsHpBonus = 0;
        gs.extraClipsAmmoBonus = 0;
        gs.health = Math.min(gs.health, gs.maxHealth);
        gs.ammo = Math.min(gs.ammo, typeof emailAmmoCapacity === 'function'
          ? emailAmmoCapacity()
          : gs.maxAmmo);
        gs.reloading = false;
        break;
      case 'mirrorMaze':
        gs.hasMirrorMaze = false;
        gs.mirrorShards = [];
        gs.mirrorPlayerShardTimer = 1;
        break;
      case 'popcornBucket':
        itemsToRemove.add('popcornBowl');
        gs.hasPopcornBucket = false;
        gs.hasPopcornBowl = false;
        gs.popcornKernels = [];
        gs.popcornFrenzyTimer = 0;
        gs._kernelsCollected = 0;
        break;
      case 'popcornBowl':
        gs.hasPopcornBowl = false;
        gs.popcornFrenzyTimer = Math.min(gs.popcornFrenzyTimer || 0, 240);
        break;
      case 'clownish':
        itemsToRemove.add('clownishUpgrade');
        gs.hasClownish = false;
        gs.hasClownishUpgrade = false;
        gs.clownNoseSize = 0;
        gs.clownNoseTimer = 0;
        gs.clownNoseHonkTimer = 0;
        gs.clownConfuseActive = false;
        gs.clownSoundWaves = [];
        break;
      case 'clownishUpgrade':
        gs.hasClownishUpgrade = false;
        break;
      case 'ragingRings':
        gs.hasRagingRings = false;
        gs.ragingRingBullets = [];
        break;
      case 'bowlingBall':
        gs.hasBowlingBall = false;
        gs.bowlingBallReady = false;
        gs.bowlingBallRegenTimer = 0;
        break;
      case 'tightropeBoots':
        gs.hasTightropeBoots = false;
        break;
    }

    const removedItems = gs.unlockedItems.filter(itemId => itemsToRemove.has(itemId));
    const value = removedItems.reduce((total, itemId) => total + (ITEM_VALUES[itemId] || 2), 0);
    gs.unlockedItems = gs.unlockedItems.filter(itemId => !itemsToRemove.has(itemId));
    if (Array.isArray(gs.fieldItems)) {
      gs.fieldItems = gs.fieldItems.filter(item => !itemsToRemove.has(item.id));
    }
    gs.chips += value;
    SFX.play('trashUse', 0.65);
    if (typeof updateHUD === 'function') updateHUD();
    if (typeof renderPauseMenu === 'function') renderPauseMenu();
    return value;
  }

  uninstallButton.addEventListener('click', () => {
    const id = selectedItemId;
    const value = uninstallItem(id);
    if (!value) {
      renderTrashWindow('This item could not be uninstalled.');
      return;
    }
    selectedItemId = null;
    const removedName = itemLabel(id);
    renderTrashWindow(`${removedName} uninstalled${value > (ITEM_VALUES[id] || 2) ? ' with its upgrade' : ''}. +${value} chips.`);
  });

  trashWindow.querySelector('[data-trash-close]').addEventListener('click', () => {
    trashWindow.style.display = 'none';
    if (typeof updateTaskbarActiveWindow === 'function') updateTaskbarActiveWindow();
  });

  window.openTrashWindow = (openInWonderWeb = false) => {
    if (!openInWonderWeb && typeof window.detachWonderWebAppWindow === 'function') {
      window.detachWonderWebAppWindow(trashWindow);
    }
    SFX.play('trashOpen', 0.6);
    selectedItemId = typeof gs !== 'undefined' && Array.isArray(gs.unlockedItems)
      ? gs.unlockedItems[0] || null
      : null;
    trashWindow.style.display = 'flex';
    renderTrashWindow();
    if (!openInWonderWeb && typeof bringFloatingWindowToFront === 'function') {
      bringFloatingWindowToFront(trashWindow);
    }
  };
})();
