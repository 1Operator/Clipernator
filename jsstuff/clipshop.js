// ============================================================
// ChipShop stock, cart, and player upgrades
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
const CLIPSHOP_UPGRADE_SPRITES = {
  health: 'FloppyDisk.png',
  speed: 'AmberFloppyDisk.png',
  damage: 'RedFloppyDisk.png',
};
let clipShopRunSequence = 0;
let clipShopCurrentView = 'home';

function clipShopHasRun() {
  return typeof gs !== 'undefined'
    && Number.isFinite(gs.playerId)
    && gs.health > 0;
}

function clipShopRandomItemIds() {
  const floorItems = gs.floor === 2 ? FLOOR2_ITEM_IDS : ALL_ITEM_IDS;
  const itemIds = [...floorItems, ...GENERAL_ITEM_IDS];
  const inCart = new Set((gs.clipShopCart || []).flatMap(listing => listing.itemIds || []));
  if (gs.hasClownish && !gs.hasClownishUpgrade) itemIds.push('clownishUpgrade');
  if (gs.hasPopcornBucket && !gs.hasPopcornBowl) itemIds.push('popcornBowl');
  return [...new Set(itemIds)].filter(id =>
    ITEM_DEFS[id]
    && !inCart.has(id)
    && !gs.unlockedItems.includes(id)
    && isCakeItemAvailable(id, gs)
  );
}

function clipShopRandomFrom(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function clipShopPriceListing(listing) {
  listing.listPrice = listing.price;
  listing.discountPercent = null;
  if (listing.kind !== 'golden' && Math.random() < 0.3) {
    listing.discountPercent = clipShopRandomFrom([10, 20, 30]);
    listing.price = Math.max(1, Math.floor(
      listing.listPrice * (100 - listing.discountPercent) / 100
    ));
  }
  listing.partNumber = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return listing;
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
      return clipShopPriceListing({
        id: `clipshop-${gs.clipShopNextListingId++}`,
        kind: 'golden',
        itemIds: bundle,
        price: 1,
      });
    }
  }

  const itemId = clipShopRandomFrom(available);
  usedItemIds.add(itemId);
  const level = CLIPSHOP_ITEM_LEVELS[itemId] || 1;
  const [minimum, maximum] = CLIPSHOP_PRICE_RANGES[level];
  return clipShopPriceListing({
    id: `clipshop-${gs.clipShopNextListingId++}`,
    kind: 'item',
    itemIds: [itemId],
    level,
    price: minimum + Math.floor(Math.random() * (maximum - minimum + 1)),
  });
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

  return clipShopPriceListing({
    id: `clipshop-${gs.clipShopNextListingId++}`,
    kind: 'upgrade',
    upgrade: { stat, type: kind, value },
    name,
    price: 4 + Math.floor(Math.random() * 5),
  });
}

function clipShopListingName(listing) {
  if (listing.kind === 'upgrade') return listing.name;
  return listing.itemIds.map(clipShopItemName).join(' + ');
}

function clipShopMakeAd(stock) {
  if (!stock.length || Math.random() >= 0.36) return null;
  const listing = clipShopRandomFrom(stock);
  return {
    name: clipShopListingName(listing),
    discount: 10 * (1 + Math.floor(Math.random() * 5)),
    color: clipShopRandomFrom(['#f8e6d9', '#f7e8d2', '#f6edda', '#f3e5dc', '#f8eadc']),
  };
}

function clipShopGenerateStock() {
  const count = 3 + Math.floor(Math.random() * 4);
  const usedItemIds = new Set((gs.clipShopCart || []).flatMap(listing => listing.itemIds || []));
  const stock = [];

  for (let index = 0; index < count; index++) {
    const wantsItem = Math.random() < 0.5;
    const itemListing = wantsItem ? clipShopCreateItemListing(usedItemIds) : null;
    stock.push(itemListing || clipShopCreateUpgradeListing());
  }

  gs.clipShopStock = stock;
  gs.clipShopAds = {
    top: clipShopMakeAd(stock),
    bottom: clipShopMakeAd(stock),
  };
}

function clipShopRestockNotice(reason) {
  const count = gs.clipShopStock.length;
  const subject = reason === 'floor'
    ? `ChipShop Restocked — Run ${gs.clipShopRunId}, Floor ${gs.floor}`
    : `ChipShop Stock Refreshed — Run ${gs.clipShopRunId}, ${gs.clipShopRefreshCount}`;
  const body = reason === 'floor'
    ? `A new floor is open, and ChipShop has ${count} new listing${count === 1 ? '' : 's'} ready to browse. Check the shop tab in WonderWeb before the stock changes again.`
    : `Your ChipShop refresh is complete. There are ${count} new listing${count === 1 ? '' : 's'} waiting in WonderWeb. The next refresh costs ${gs.clipShopRefreshCost} chips.`;
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
  gs.clipShopCart = [];
  gs.clipShopPurchases = [];
  gs.clipShopView = 'home';
  clipShopCurrentView = 'home';
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
  const label = { health: 'Max Health', speed: 'Speed', damage: 'Damage' }[upgrade.stat]
    || 'Upgrade';
  if (upgrade.type === 'percent') return `Permanent +${Math.round(upgrade.value * 100)}% ${label}`;
  if (upgrade.stat === 'health') return `Permanent +${upgrade.value} max health`;
  return `Permanent +${Math.round(upgrade.value * 100)}% ${label.toLowerCase()}`;
}

function clipShopListingDescription(listing) {
  if (listing.kind === 'upgrade') return clipShopUpgradeDetails(listing.upgrade);
  return listing.itemIds.map(id => {
    const description = ITEM_DEFS[id]?.desc;
    return description
      ? description.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
      : 'Installs this item into your current run.';
  }).join(' / ');
}

function clipShopCanAfford(listing) {
  if (listing.kind === 'golden') return gs.goldenChips >= listing.price;
  return gs.chips >= listing.price;
}

function clipShopRenderAd(element, ad) {
  if (!element) return;
  element.hidden = !ad;
  if (!ad) return;
  element.style.backgroundColor = ad.color;
  element.querySelector('.clipshop-ad-copy').textContent =
    `SPECIAL OFFER: ${ad.name} — Limited-time software deal!`;
  element.querySelector('.clipshop-ad-discount').textContent = `${ad.discount}% OFF`;
}

function clipShopSetView(view) {
  if (!['home', 'profile', 'help'].includes(view)) return;
  clipShopCurrentView = view;
  if (typeof gs !== 'undefined' && gs) gs.clipShopView = view;
  clipShopRender();
}

function clipShopRenderContentView() {
  const listings = document.getElementById('clipshop-listings');
  const content = document.getElementById('clipshop-content-view');
  if (!listings || !content) return;
  const view = typeof gs !== 'undefined'
    ? gs.clipShopView || clipShopCurrentView
    : clipShopCurrentView;
  listings.hidden = view !== 'home';
  content.hidden = view === 'home';
  if (content.hidden) return;

  content.replaceChildren();
  const heading = document.createElement('h3');
  const body = document.createElement('div');
  if (view === 'profile') {
    heading.textContent = 'Customer Profile — Installed Listings';
    const purchases = typeof gs !== 'undefined' && Array.isArray(gs.clipShopPurchases)
      ? gs.clipShopPurchases
      : [];
    if (!purchases.length) {
      body.textContent = 'You have not installed any listings this run yet.';
    } else {
      for (const purchase of purchases) {
        const row = document.createElement('div');
        row.className = 'clipshop-history-item';
        row.textContent = `${purchase.name} — ${purchase.priceText}. ${purchase.description}`;
        body.appendChild(row);
      }
    }
  } else {
    heading.textContent = 'ChipShop Help';
    body.textContent = 'Add a listing to your Shopping Cart, then install it here or use Install Everything. Chips are charged when a listing is installed. Installed items and upgrades apply to this run only; new stock appears when you reach another floor or pay to restock.';
  }
  content.append(heading, body);
}

function clipShopRenderCart() {
  const cart = document.getElementById('clipshop-cart-list');
  const total = document.getElementById('clipshop-cart-total');
  const installAll = document.getElementById('clipshop-install-all');
  if (!cart || !total || !installAll) return;
  const entries = typeof gs !== 'undefined' && Array.isArray(gs.clipShopCart)
    ? gs.clipShopCart
    : [];
  cart.replaceChildren();
  if (!entries.length) {
    cart.appendChild(Object.assign(document.createElement('div'), {
      className: 'clipshop-cart-empty',
      textContent: 'Your cart is empty.',
    }));
  }

  let chipsTotal = 0;
  let goldTotal = 0;
  for (const listing of entries) {
    if (listing.kind === 'golden') goldTotal += listing.price;
    else chipsTotal += listing.price;

    const item = document.createElement('div');
    item.className = 'clipshop-cart-item';
    const name = document.createElement('div');
    name.className = 'clipshop-cart-item-title';
    name.textContent = clipShopListingName(listing);
    const description = document.createElement('div');
    description.className = 'clipshop-cart-description';
    description.textContent = clipShopListingDescription(listing);
    const actions = document.createElement('div');
    actions.className = 'clipshop-cart-actions';
    const price = document.createElement('span');
    price.textContent = listing.kind === 'golden'
      ? `${listing.price} Golden Chip`
      : `${listing.price} chips`;
    const install = document.createElement('button');
    install.type = 'button';
    install.className = 'clipshop-button';
    install.dataset.clipshopInstall = listing.id;
    install.textContent = 'Install';
    install.disabled = !clipShopHasRun() || !clipShopCanAfford(listing);
    actions.append(price, install);
    item.append(name, description, actions);
    cart.appendChild(item);
  }
  total.textContent = entries.length
    ? `Cart: ${chipsTotal} chips${goldTotal ? ` + ${goldTotal} Gold` : ''}`
    : '';
  installAll.disabled = !entries.length || !clipShopHasRun();
}

function clipShopRender() {
  const listings = document.getElementById('clipshop-listings');
  const notice = document.getElementById('clipshop-notice');
  const floor = document.getElementById('clipshop-floor');
  const refresh = document.getElementById('clipshop-refresh');
  if (!listings || !notice || !floor || !refresh) return;

  const hasRun = clipShopHasRun();
  const page = document.getElementById('wonderweb-page-clipshop');
  if (page) {
    clipShopRenderAd(document.getElementById('clipshop-ad-top'),
      hasRun ? gs.clipShopAds?.top : null);
    clipShopRenderAd(document.getElementById('clipshop-ad-bottom'),
      hasRun ? gs.clipShopAds?.bottom : null);
  }
  floor.textContent = `Floor ${hasRun ? gs.floor : '—'}`;
  refresh.textContent = `Restock · ${hasRun ? gs.clipShopRefreshCost : 5} chips`;
  refresh.disabled = !hasRun || gs.chips < gs.clipShopRefreshCost;
  listings.replaceChildren();

  if (!hasRun || !Array.isArray(gs.clipShopStock)) {
    notice.textContent = 'Start a run to browse today’s listings.';
    listings.appendChild(Object.assign(document.createElement('div'), {
      className: 'clipshop-empty',
      textContent: 'No active stock. Start a game to open ChipShop.',
    }));
    clipShopUpdateBalances();
    clipShopRenderContentView();
    clipShopRenderCart();
    return;
  }

  notice.textContent = `${gs.clipShopStock.length} listings · Refreshing costs ${gs.clipShopRefreshCost} chips.`;
  for (const listing of gs.clipShopStock) {
    const card = document.createElement('article');
    card.className = 'clipshop-card';
    const productImage = document.createElement('div');
    productImage.className = 'clipshop-product-image';
    if (listing.kind === 'upgrade') {
      const sprite = CLIPSHOP_UPGRADE_SPRITES[listing.upgrade.stat];
      if (sprite) {
        const icon = document.createElement('img');
        icon.className = 'clipshop-upgrade-icon';
        icon.src = `sprites/ui/ChipShop/${sprite}`;
        icon.alt = '';
        productImage.appendChild(icon);
      } else {
        const placeholder = document.createElement('span');
        placeholder.className = 'clipshop-upgrade-placeholder';
        placeholder.textContent = '?';
        productImage.appendChild(placeholder);
      }
    } else {
      clipShopAddItemPreview(productImage, listing.itemIds);
    }

    const name = document.createElement('div');
    name.className = 'clipshop-item-name';
    name.textContent = clipShopListingName(listing);

    const detail = document.createElement('div');
    detail.className = 'clipshop-item-detail';
    detail.textContent = listing.kind === 'golden'
      ? `Golden deal · ${clipShopListingDescription(listing)}`
      : clipShopListingDescription(listing);
    const productInfo = document.createElement('div');
    productInfo.className = 'clipshop-product-info';
    productInfo.append(name, detail);

    const price = document.createElement('div');
    price.className = 'clipshop-price';
    if (listing.kind === 'golden') {
      price.textContent = `Price: ${listing.price} Golden Chip`;
    } else if (listing.discountPercent) {
      const oldPrice = document.createElement('s');
      oldPrice.textContent = `${listing.listPrice} chips`;
      const discountedPrice = document.createElement('span');
      discountedPrice.className = 'clipshop-price-new';
      discountedPrice.textContent =
        `${listing.discountPercent}% Discount: ${listing.price} chips`;
      price.append('List price: ', oldPrice, document.createElement('br'), discountedPrice);
    } else {
      price.textContent = `List price: ${listing.listPrice} chips`;
    }
    productInfo.appendChild(price);

    const action = document.createElement('div');
    action.className = 'clipshop-product-action';
    const partNumber = document.createElement('div');
    partNumber.className = 'clipshop-part-number';
    partNumber.textContent = `P/N: ${listing.partNumber}`;
    const addToCart = document.createElement('button');
    addToCart.type = 'button';
    addToCart.className = 'clipshop-button';
    addToCart.dataset.clipshopAdd = listing.id;
    addToCart.textContent = 'Add to cart';
    action.append(partNumber, addToCart);

    card.append(productImage, productInfo, action);
    listings.appendChild(card);
  }
  clipShopRenderContentView();
  clipShopRenderCart();
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

function clipShopAddToCart(listingId) {
  if (!clipShopHasRun()) return;
  const index = gs.clipShopStock.findIndex(listing => listing.id === listingId);
  if (index < 0) return;
  const [listing] = gs.clipShopStock.splice(index, 1);
  gs.clipShopCart.push(listing);
  clipShopRender();
  document.getElementById('clipshop-notice').textContent =
    `${clipShopListingName(listing)} added to your cart. Install it when you are ready.`;
}

function clipShopInstallListing(listing) {
  if (listing.kind === 'golden') {
    if (listing.itemIds.some(id => gs.unlockedItems.includes(id))) {
      return 'One of those items is already installed.';
    }
    if (!clipShopGrantItems(listing.itemIds)) return 'That item combination is no longer available.';
    gs.goldenChips -= listing.price;
    SFX.play('itemConfirm', 0.65);
  } else if (listing.kind === 'item') {
    if (!clipShopGrantItems(listing.itemIds)) return 'That item is no longer available.';
    gs.chips -= listing.price;
    SFX.play('itemConfirm', 0.65);
  } else {
    gs.chips -= listing.price;
    clipShopApplyUpgrade(listing.upgrade);
    SFX.play('itemConfirm', 0.65);
  }

  gs.clipShopPurchases.push({
    name: clipShopListingName(listing),
    description: clipShopListingDescription(listing),
    priceText: listing.kind === 'golden'
      ? `${listing.price} Golden Chip`
      : `${listing.price} chips`,
  });
  return null;
}

function clipShopInstallFromCart(listingId) {
  if (!clipShopHasRun()) return;
  const index = gs.clipShopCart.findIndex(listing => listing.id === listingId);
  if (index < 0) return;
  const listing = gs.clipShopCart[index];
  if (!clipShopCanAfford(listing)) {
    document.getElementById('clipshop-notice').textContent = listing.kind === 'golden'
      ? 'You need a Golden Chip to install this listing.'
      : 'You do not have enough chips to install this listing.';
    return;
  }
  const error = clipShopInstallListing(listing);
  if (error) {
    document.getElementById('clipshop-notice').textContent = error;
    return;
  }
  gs.clipShopCart.splice(index, 1);
  updateHUD();
  if (typeof renderPauseMenu === 'function') renderPauseMenu();
  clipShopRender();
  document.getElementById('clipshop-notice').textContent = 'Installation complete.';
}

function clipShopInstallEverything() {
  if (!clipShopHasRun() || !gs.clipShopCart.length) return;
  let installed = 0;
  let message = '';
  while (gs.clipShopCart.length) {
    const listing = gs.clipShopCart[0];
    if (!clipShopCanAfford(listing)) {
      message = listing.kind === 'golden'
        ? 'Not enough Golden Chips to install the remaining cart listings.'
        : 'Not enough chips to install the remaining cart listings.';
      break;
    }
    const error = clipShopInstallListing(listing);
    if (error) {
      message = error;
      break;
    }
    gs.clipShopCart.shift();
    installed++;
  }
  updateHUD();
  if (typeof renderPauseMenu === 'function') renderPauseMenu();
  clipShopRender();
  document.getElementById('clipshop-notice').textContent = message
    ? `${installed} listing${installed === 1 ? '' : 's'} installed. ${message}`
    : `${installed} listing${installed === 1 ? '' : 's'} installed successfully.`;
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
  const button = event.target.closest('[data-clipshop-add]');
  if (button && !button.disabled) clipShopAddToCart(button.dataset.clipshopAdd);
});
document.getElementById('clipshop-cart-list').addEventListener('click', event => {
  const button = event.target.closest('[data-clipshop-install]');
  if (button && !button.disabled) clipShopInstallFromCart(button.dataset.clipshopInstall);
});
document.getElementById('clipshop-install-all').addEventListener('click', clipShopInstallEverything);
document.querySelector('.clipshop-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-clipshop-view]');
  if (button) clipShopSetView(button.dataset.clipshopView);
});

clipShopRender();
