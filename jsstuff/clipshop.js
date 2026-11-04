// ============================================================
// ClipShop stock, purchases, and player upgrades
// ============================================================

const CLIPSHOP_ITEM_LEVELS = {
  doubledCake: 2,
  popcornBowl: 2,
  clownishUpgrade: 2,
  tripleCake: 3,
  quadCake: 4,
};

const CLIPSHOP_PRICE_RANGES = {
  1: [6, 12],
  2: [12, 18],
  3: [18, 24],
  4: [24, 30],
};

const CLIPSHOP_PERCENTAGES = [10, 15, 20, 25, 30];
let clipShopRunSequence = 0;

function clipShopHasRun() {
  return typeof gs !== 'undefined'
    && Number.isFinite(gs.playerId)
    && gs.health > 0;
}

function clipShopRandomItemIds() {
  const floorItems = gs.floor === 2 ? FLOOR2_ITEM_IDS : ALL_ITEM_IDS;
  const itemIds = [...floorItems, ...GENERAL_ITEM_IDS];
  if (gs.hasClownish && !gs.hasClownishUpgrade) itemIds.push('clownishUpgrade');
  if (gs.hasPopcornBucket && !gs.hasPopcornBowl) itemIds.push('popcornBowl');
  return [...new Set(itemIds)].filter(id =>
    ITEM_DEFS[id]
    && !gs.unlockedItems.includes(id)
    && isCakeItemAvailable(id, gs)
  );
}

function clipShopRandomFrom(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function clipShopCakeProgressionPair(usedItemIds) {
  if (gs.floor !== 1) return null;
  if (!gs.hasDoubleCake && !gs.hasTripleCake && !gs.hasQuadCake
      && !usedItemIds.has('doubledCake') && !usedItemIds.has('tripleCake')
      && !gs.unlockedItems.includes('doubledCake') && !gs.unlockedItems.includes('tripleCake')) {
    return ['doubledCake', 'tripleCake'];
  }
  if (gs.hasDoubleCake && !gs.hasTripleCake && !gs.hasQuadCake
      && !usedItemIds.has('tripleCake') && !usedItemIds.has('quadCake')
      && !gs.unlockedItems.includes('tripleCake') && !gs.unlockedItems.includes('quadCake')) {
    return ['tripleCake', 'quadCake'];
  }
  return null;
}

function clipShopCreateItemListing(usedItemIds) {
  const available = clipShopRandomItemIds().filter(id => !usedItemIds.has(id));
  if (!available.length) return null;

  if (Math.random() < 0.12) {
    let bundle = null;
    const progressionPair = clipShopCakeProgressionPair(usedItemIds);
    if (progressionPair && Math.random() < 0.12) bundle = progressionPair;

    if (!bundle) {
      const first = clipShopRandomFrom(available);
      let secondCandidates = available.filter(id => id !== first);
      if (first === 'doubledCake' && !gs.hasDoubleCake && !usedItemIds.has('tripleCake')) {
        secondCandidates = [...new Set([...secondCandidates, 'tripleCake'])];
      } else if (first === 'tripleCake' && gs.hasDoubleCake && !gs.hasTripleCake
          && !usedItemIds.has('quadCake')) {
        secondCandidates = [...new Set([...secondCandidates, 'quadCake'])];
      }
      if (secondCandidates.length) {
        bundle = [first, clipShopRandomFrom(secondCandidates)];
      }
    }

    if (bundle?.length === 2 && bundle.every(id =>
      !usedItemIds.has(id) && !gs.unlockedItems.includes(id)
    )) {
      for (const id of bundle) usedItemIds.add(id);
      return {
        id: `clipshop-${gs.clipShopNextListingId++}`,
        kind: 'golden',
        itemIds: bundle,
        price: 1,
      };
    }
  }

  const itemId = clipShopRandomFrom(available);
  usedItemIds.add(itemId);
  const level = CLIPSHOP_ITEM_LEVELS[itemId] || 1;
  const [minimum, maximum] = CLIPSHOP_PRICE_RANGES[level];
  return {
    id: `clipshop-${gs.clipShopNextListingId++}`,
    kind: 'item',
    itemIds: [itemId],
    level,
    price: minimum + Math.floor(Math.random() * (maximum - minimum + 1)),
  };
}

function clipShopCreateUpgradeListing() {
  const stat = clipShopRandomFrom(['health', 'speed', 'damage']);
  const kind = Math.random() < 0.5 ? 'fixed' : 'percent';
  const wave = Math.max(1, Math.floor(gs.wave));
  let value;

  if (kind === 'percent') {
    value = clipShopRandomFrom(CLIPSHOP_PERCENTAGES) / 100;
  } else if (stat === 'health') {
    value = 3 + wave * 2;
  } else {
    value = 0.01 + wave * 0.01;
  }

  const labels = {
    health: 'Max Health',
    speed: 'Speed',
    damage: 'Damage',
  };
  const name = kind === 'percent'
    ? `+${Math.round(value * 100)}% ${labels[stat]}`
    : stat === 'health'
      ? `+${value} Max Health`
      : `+${Math.round(value * 100)}% ${labels[stat]}`;

  return {
    id: `clipshop-${gs.clipShopNextListingId++}`,
    kind: 'upgrade',
    upgrade: { stat, type: kind, value },
    name,
    price: 4 + Math.floor(Math.random() * 5),
  };
}

function clipShopGenerateStock() {
  const count = 3 + Math.floor(Math.random() * 4);
  const usedItemIds = new Set();
  const stock = [];

  for (let index = 0; index < count; index++) {
    const wantsItem = Math.random() < 0.5;
    const itemListing = wantsItem ? clipShopCreateItemListing(usedItemIds) : null;
    stock.push(itemListing || clipShopCreateUpgradeListing());
  }

  gs.clipShopStock = stock;
}

function clipShopRestockNotice(reason) {
  const count = gs.clipShopStock.length;
  const subject = reason === 'floor'
    ? `ClipShop Restocked — Run ${gs.clipShopRunId}, Floor ${gs.floor}`
    : `ClipShop Stock Refreshed — Run ${gs.clipShopRunId}, ${gs.clipShopRefreshCount}`;
  const body = reason === 'floor'
    ? `A new floor is open, and ClipShop has ${count} new listing${count === 1 ? '' : 's'} ready to browse. Check the shop tab in WonderWeb before the stock changes again.`
    : `Your ClipShop refresh is complete. There are ${count} new listing${count === 1 ? '' : 's'} waiting in WonderWeb. The next refresh costs ${gs.clipShopRefreshCost} chips.`;
  deliverSystemEmail(subject, body);
}

function clipShopRestock(reason) {
  clipShopGenerateStock();
  gs.clipShopRestockCount++;
  clipShopRestockNotice(reason);
  clipShopRender();
}

function clipShopStartRun() {
  gs.clipShopRunId = ++clipShopRunSequence;
  gs.clipShopRefreshCost = 5;
  gs.clipShopRefreshCount = 0;
  gs.clipShopRestockCount = 0;
  gs.clipShopNextListingId = 1;
  clipShopRestock('floor');
}

function clipShopStartFloor() {
  if (!clipShopHasRun()) return;
  clipShopRestock('floor');
}

function clipShopUpdateBalances() {
  if (typeof gs === 'undefined' || !gs) return;
  const chips = document.getElementById('clipshop-chip-balance');
  const golden = document.getElementById('clipshop-golden-balance');
  if (!chips || !golden) return;
  chips.textContent = String(Number.isFinite(gs.chips) ? gs.chips : 0);
  golden.textContent = String(Number.isFinite(gs.goldenChips) ? gs.goldenChips : 0);
}

function clipShopAddItemPreview(container, itemIds) {
  const preview = document.createElement('div');
  preview.className = `clipshop-item-preview${itemIds.length > 1 ? ' is-bundle' : ''}`;
  for (const id of itemIds) {
    const definition = ITEM_DEFS[id];
    if (definition?.img) {
      const image = document.createElement('img');
      image.src = definition.img;
      image.alt = '';
      image.addEventListener('error', () => {
        const fallback = document.createElement('span');
        fallback.className = 'clipshop-item-fallback';
        fallback.textContent = definition.icon || '?';
        image.replaceWith(fallback);
      }, { once: true });
      preview.appendChild(image);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'clipshop-item-fallback';
      fallback.textContent = definition?.icon || '?';
      preview.appendChild(fallback);
    }
  }
  container.appendChild(preview);
}

function clipShopItemName(id) {
  return ITEM_DEFS[id].label.replace(/\n/g, ' ');
}

function clipShopUpgradeDetails(upgrade) {
  const label = { health: 'Max Health', speed: 'Speed', damage: 'Damage' }[upgrade.stat];
  if (upgrade.type === 'percent') return `Permanent +${Math.round(upgrade.value * 100)}% ${label}`;
  if (upgrade.stat === 'health') return `Permanent +${upgrade.value} max health`;
  return `Permanent +${Math.round(upgrade.value * 100)}% ${label.toLowerCase()}`;
}

function clipShopCanAfford(listing) {
  if (listing.kind === 'golden') return gs.goldenChips >= listing.price;
  return gs.chips >= listing.price;
}

function clipShopRender() {
  const listings = document.getElementById('clipshop-listings');
  const notice = document.getElementById('clipshop-notice');
  const floor = document.getElementById('clipshop-floor');
  const refresh = document.getElementById('clipshop-refresh');
  if (!listings || !notice || !floor || !refresh) return;

  const hasRun = clipShopHasRun();
  floor.textContent = `Floor ${hasRun ? gs.floor : '—'}`;
  refresh.textContent = `Restock · ${hasRun ? gs.clipShopRefreshCost : 5} chips`;
  refresh.disabled = !hasRun || gs.chips < gs.clipShopRefreshCost;
  listings.replaceChildren();

  if (!hasRun || !Array.isArray(gs.clipShopStock)) {
    notice.textContent = 'Start a run to browse today’s listings.';
    listings.appendChild(Object.assign(document.createElement('div'), {
      className: 'clipshop-empty',
      textContent: 'No active stock. Start a game to open ClipShop.',
    }));
    clipShopUpdateBalances();
    return;
  }

  notice.textContent = `${gs.clipShopStock.length} listings · Refreshing costs ${gs.clipShopRefreshCost} chips.`;
  for (const listing of gs.clipShopStock) {
    const card = document.createElement('article');
    card.className = `clipshop-card${listing.kind === 'golden' ? ' clipshop-card-golden' : ''}`;
    if (listing.kind === 'upgrade') {
      const icon = document.createElement('div');
      icon.className = 'clipshop-upgrade-icon';
      icon.textContent = listing.upgrade.stat === 'health' ? '+HP'
        : listing.upgrade.stat === 'speed' ? 'SPD' : 'DMG';
      card.appendChild(icon);
    } else {
      clipShopAddItemPreview(card, listing.itemIds);
    }

    const name = document.createElement('div');
    name.className = 'clipshop-item-name';
    if (listing.kind === 'upgrade') {
      name.textContent = listing.name;
    } else {
      name.textContent = listing.kind === 'golden'
        ? listing.itemIds.map(clipShopItemName).join(' + ')
        : clipShopItemName(listing.itemIds[0]);
    }

    const detail = document.createElement('div');
    detail.className = 'clipshop-item-detail';
    if (listing.kind === 'upgrade') {
      detail.textContent = clipShopUpgradeDetails(listing.upgrade);
    } else if (listing.kind === 'golden') {
      detail.textContent = 'Golden deal · both items for 1 Golden Chip';
    } else {
      detail.textContent = `Level ${listing.level} item · ${listing.price} chips`;
    }

    const buy = document.createElement('button');
    buy.type = 'button';
    buy.className = 'clipshop-button';
    buy.dataset.clipshopBuy = listing.id;
    buy.textContent = listing.kind === 'golden'
      ? 'Buy · 1 Golden Chip'
      : `Buy · ${listing.price} chips`;
    buy.disabled = !clipShopCanAfford(listing);

    card.append(name, detail, buy);
    listings.appendChild(card);
  }
  clipShopUpdateBalances();
}

function clipShopApplyUpgrade(upgrade) {
  if (upgrade.stat === 'health') {
    const previousMaxHealth = gs.maxHealth;
    gs.maxHealth = upgrade.type === 'percent'
      ? Math.ceil(gs.maxHealth * (1 + upgrade.value))
      : gs.maxHealth + upgrade.value;
    gs.health = Math.min(gs.maxHealth, gs.health + gs.maxHealth - previousMaxHealth);
  } else if (upgrade.stat === 'speed') {
    if (upgrade.type === 'percent') {
      gs.clipShopSpeedMultiplier *= 1 + upgrade.value;
    } else {
      gs.clipShopSpeedBonus += upgrade.value;
    }
  } else if (upgrade.stat === 'damage') {
    if (upgrade.type === 'percent') {
      gs.clipShopDamageMultiplier *= 1 + upgrade.value;
    } else {
      gs.clipShopDamageBonus += upgrade.value;
    }
  }
}

function clipShopGrantItems(itemIds) {
  const eligibilityState = {
    hasDoubleCake: gs.hasDoubleCake,
    hasTripleCake: gs.hasTripleCake,
    hasQuadCake: gs.hasQuadCake,
  };
  for (const id of itemIds) {
    if (!ITEM_DEFS[id] || gs.unlockedItems.includes(id) || !isCakeItemAvailable(id, eligibilityState)) {
      return false;
    }
    if (id === 'doubledCake') eligibilityState.hasDoubleCake = true;
    if (id === 'tripleCake') {
      eligibilityState.hasDoubleCake = false;
      eligibilityState.hasTripleCake = true;
    }
    if (id === 'quadCake') {
      eligibilityState.hasDoubleCake = false;
      eligibilityState.hasTripleCake = false;
      eligibilityState.hasQuadCake = true;
    }
  }

  const granted = [];
  for (const id of itemIds) {
    const definition = ITEM_DEFS[id];
    gs.unlockedItems.push(id);
    definition.effect(gs);
    granted.push(id);
  }
  if (typeof trySpawnFieldItems === 'function') trySpawnFieldItems();
  return granted.length === itemIds.length;
}

function clipShopPurchase(listingId) {
  if (!clipShopHasRun()) return;
  const notice = document.getElementById('clipshop-notice');
  const stock = gs.clipShopStock;
  const index = stock.findIndex(listing => listing.id === listingId);
  if (index < 0) return;
  const listing = stock[index];
  if (!clipShopCanAfford(listing)) {
    document.getElementById('clipshop-notice').textContent = listing.kind === 'golden'
      ? 'You need a Golden Chip for this listing.'
      : 'You do not have enough chips for this listing.';
    return;
  }

  if (listing.kind === 'golden') {
    if (listing.itemIds.some(id => gs.unlockedItems.includes(id))) {
      notice.textContent = 'One of those items is already installed. Refresh the stock to find another deal.';
      return;
    }
    if (!clipShopGrantItems(listing.itemIds)) {
      clipShopRender();
      notice.textContent = 'That item combination is no longer available.';
      return;
    }
    gs.goldenChips -= listing.price;
    SFX.play('itemConfirm', 0.65);
  } else if (listing.kind === 'item') {
    if (!clipShopGrantItems(listing.itemIds)) {
      clipShopRender();
      notice.textContent = 'That item is no longer available.';
      return;
    }
    gs.chips -= listing.price;
    SFX.play('itemConfirm', 0.65);
  } else {
    gs.chips -= listing.price;
    clipShopApplyUpgrade(listing.upgrade);
    SFX.play('itemConfirm', 0.65);
  }

  stock.splice(index, 1);
  updateHUD();
  if (typeof renderPauseMenu === 'function') renderPauseMenu();
  clipShopRender();
  notice.textContent = 'Purchase complete. Your listing has been installed.';
}

function clipShopBuyRefresh() {
  if (!clipShopHasRun()) return;
  if (gs.chips < gs.clipShopRefreshCost) {
    document.getElementById('clipshop-notice').textContent = 'You do not have enough chips to restock.';
    return;
  }
  gs.chips -= gs.clipShopRefreshCost;
  gs.clipShopRefreshCost *= 2;
  gs.clipShopRefreshCount++;
  updateHUD();
  clipShopRestock('refresh');
  document.getElementById('clipshop-notice').textContent = `Stock refreshed. The next restock costs ${gs.clipShopRefreshCost} chips.`;
}

document.getElementById('clipshop-refresh').addEventListener('click', clipShopBuyRefresh);
document.getElementById('clipshop-listings').addEventListener('click', event => {
  const button = event.target.closest('[data-clipshop-buy]');
  if (button && !button.disabled) clipShopPurchase(button.dataset.clipshopBuy);
});

clipShopRender();
