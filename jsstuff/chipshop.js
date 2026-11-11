// ============================================================
// ChipShop stock, cart, and player upgrades
// ============================================================

const CHIPSHOP_ITEM_LEVELS = {
  doubledCake: 2,
  popcornBowl: 2,
  clownishUpgrade: 2,
  tripleCake: 3,
  quadCake: 4,
};

const CHIPSHOP_PRICE_RANGES = {
  1: [6, 12],
  2: [12, 18],
  3: [18, 24],
  4: [24, 30],
};

const CHIPSHOP_PERCENTAGES = [10, 15, 20, 25, 30];
const CHIPSHOP_UPGRADE_SPRITES = {
  health: 'FloppyDisk.png',
  speed: 'AmberFloppyDisk.png',
  damage: 'RedFloppyDisk.png',
};
let chipShopRunSequence = 0;
let chipShopCurrentView = 'home';
let chipShopRemovalTimer = null;
const CHIPSHOP_INVALIDATION_DURATION = 650;

function chipShopHasRun() {
  return typeof gs !== 'undefined'
    && Number.isFinite(gs.playerId)
    && gs.health > 0;
}

function chipShopRandomItemIds() {
  const floorItems = gs.floor === 2 ? FLOOR2_ITEM_IDS : ALL_ITEM_IDS;
  const itemIds = [...floorItems, ...GENERAL_ITEM_IDS];
  const inCart = new Set((gs.chipShopCart || []).flatMap(listing => listing.itemIds || []));
  if (gs.hasClownish && !gs.hasClownishUpgrade) itemIds.push('clownishUpgrade');
  if (gs.hasPopcornBucket && !gs.hasPopcornBowl) itemIds.push('popcornBowl');
  return [...new Set(itemIds)].filter(id =>
    ITEM_DEFS[id]
    && !inCart.has(id)
    && !gs.unlockedItems.includes(id)
    && isCakeItemAvailable(id, gs)
  );
}

function chipShopRandomFrom(values) {
  return values[Math.floor(Math.random() * values.length)];
}

function chipShopPriceListing(listing) {
  listing.listPrice = listing.price;
  listing.discountPercent = null;
  if (listing.kind !== 'golden' && Math.random() < 0.3) {
    listing.discountPercent = chipShopRandomFrom([10, 20, 30]);
    listing.price = Math.max(1, Math.floor(
      listing.listPrice * (100 - listing.discountPercent) / 100
    ));
  }
  listing.partNumber = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return listing;
}

function chipShopCakeProgressionPair(usedItemIds) {
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

function chipShopCreateItemListing(usedItemIds) {
  const available = chipShopRandomItemIds().filter(id => !usedItemIds.has(id));
  if (!available.length) return null;

  if (Math.random() < 0.12) {
    let bundle = null;
    const progressionPair = chipShopCakeProgressionPair(usedItemIds);
    if (progressionPair && Math.random() < 0.12) bundle = progressionPair;

    if (!bundle) {
      const first = chipShopRandomFrom(available);
      let secondCandidates = available.filter(id => id !== first);
      if (first === 'doubledCake' && !gs.hasDoubleCake && !usedItemIds.has('tripleCake')) {
        secondCandidates = [...new Set([...secondCandidates, 'tripleCake'])];
      } else if (first === 'tripleCake' && gs.hasDoubleCake && !gs.hasTripleCake
          && !usedItemIds.has('quadCake')) {
        secondCandidates = [...new Set([...secondCandidates, 'quadCake'])];
      }
      if (secondCandidates.length) {
        bundle = [first, chipShopRandomFrom(secondCandidates)];
      }
    }

    if (bundle?.length === 2 && bundle.every(id =>
      !usedItemIds.has(id) && !gs.unlockedItems.includes(id)
    )) {
      for (const id of bundle) usedItemIds.add(id);
      return chipShopPriceListing({
        id: `chipshop-${gs.chipShopNextListingId++}`,
        kind: 'golden',
        itemIds: bundle,
        price: 1,
      });
    }
  }

  const itemId = chipShopRandomFrom(available);
  usedItemIds.add(itemId);
  const level = CHIPSHOP_ITEM_LEVELS[itemId] || 1;
  const [minimum, maximum] = CHIPSHOP_PRICE_RANGES[level];
  return chipShopPriceListing({
    id: `chipshop-${gs.chipShopNextListingId++}`,
    kind: 'item',
    itemIds: [itemId],
    level,
    price: minimum + Math.floor(Math.random() * (maximum - minimum + 1)),
  });
}

function chipShopCreateUpgradeListing() {
  const stat = chipShopRandomFrom(['health', 'speed', 'damage']);
  const kind = Math.random() < 0.5 ? 'fixed' : 'percent';
  const wave = Math.max(1, Math.floor(gs.wave));
  let value;

  if (kind === 'percent') {
    value = chipShopRandomFrom(CHIPSHOP_PERCENTAGES) / 100;
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

  return chipShopPriceListing({
    id: `chipshop-${gs.chipShopNextListingId++}`,
    kind: 'upgrade',
    upgrade: { stat, type: kind, value },
    name,
    price: 4 + Math.floor(Math.random() * 5),
  });
}

function chipShopListingName(listing) {
  if (listing.kind === 'upgrade') return listing.name;
  return listing.itemIds.map(chipShopItemName).join(' + ');
}

function chipShopMakeAd(stock, chance = 0.5) {
  if (Math.random() >= chance) return null;
  const listings = stock.filter(listing => listing.kind !== 'golden');
  if (!listings.length) return null;
  const listing = chipShopRandomFrom(listings);
  return {
    listingId: listing.id,
    discount: 10 * (1 + Math.floor(Math.random() * 5)),
    color: chipShopRandomFrom(['#aaff77', '#8ee7f2', '#fff18a', '#ffadd2', '#ffad6e']),
    effect: Math.random() < 0.2 ? 'virus' : 'discount',
  };
}

function chipShopGenerateStock() {
  const count = 3 + Math.floor(Math.random() * 4);
  const usedItemIds = new Set((gs.chipShopCart || []).flatMap(listing => listing.itemIds || []));
  const stock = [];

  for (let index = 0; index < count; index++) {
    const wantsItem = Math.random() < 0.5;
    const itemListing = wantsItem ? chipShopCreateItemListing(usedItemIds) : null;
    stock.push(itemListing || chipShopCreateUpgradeListing());
  }

  gs.chipShopStock = stock;
  gs.chipShopAds = {
    top: chipShopMakeAd(stock, 0.5),
    bottom: chipShopMakeAd(stock, 0.5),
  };
}

function chipShopMaybeGeneratePurchaseAd() {
  if (!gs.chipShopStock.length || Math.random() >= 0.5) return;
  const slot = chipShopRandomFrom(['top', 'bottom']);
  gs.chipShopAds[slot] = chipShopMakeAd(gs.chipShopStock, 1);
}

function chipShopRestockNotice(reason) {
  const count = gs.chipShopStock.length;
  const subject = reason === 'floor'
    ? `ChipShop Restocked — Run ${gs.chipShopRunId}, Floor ${gs.floor}`
    : `ChipShop Stock Refreshed — Run ${gs.chipShopRunId}, ${gs.chipShopRefreshCount}`;
  const body = reason === 'floor'
    ? `A new floor is open, and ChipShop has ${count} new listing${count === 1 ? '' : 's'} ready to browse. Check the shop tab in WonderWeb before the stock changes again.`
    : `Your ChipShop refresh is complete. There are ${count} new listing${count === 1 ? '' : 's'} waiting in WonderWeb. The next refresh costs ${gs.chipShopRefreshCost} chips.`;
  deliverSystemEmail(subject, body);
}

function chipShopRestock(reason) {
  chipShopGenerateStock();
  gs.chipShopRestockCount++;
  chipShopRestockNotice(reason);
  chipShopRender();
}

function chipShopStartRun() {
  clearTimeout(chipShopRemovalTimer);
  chipShopRemovalTimer = null;
  gs.chipShopRunId = ++chipShopRunSequence;
  gs.chipShopRefreshCost = 5;
  gs.chipShopRefreshCount = 0;
  gs.chipShopRestockCount = 0;
  gs.chipShopNextListingId = 1;
  gs.chipShopCart = [];
  gs.chipShopPurchases = [];
  gs.chipShopView = 'home';
  chipShopCurrentView = 'home';
  chipShopRestock('floor');
}

function chipShopHandleItemAcquired(itemId) {
  const stock = Array.isArray(gs.chipShopStock) ? gs.chipShopStock : [];
  const cart = Array.isArray(gs.chipShopCart) ? gs.chipShopCart : [];
  const removedStock = stock.filter(listing =>
    listing.kind !== 'upgrade' && listing.itemIds?.includes(itemId)
  );
  const removedCart = cart.filter(listing =>
    listing.kind !== 'upgrade' && listing.itemIds?.includes(itemId)
  );
  if (!removedStock.length && !removedCart.length) return;

  const removedStockIds = new Set(removedStock.map(listing => listing.id));
  const removedCartIds = new Set(removedCart.map(listing => listing.id));
  const removedIds = new Set([...removedStockIds, ...removedCartIds]);
  gs.chipShopStock = stock.filter(listing => !removedStockIds.has(listing.id));
  gs.chipShopCart = cart.filter(listing => !removedCartIds.has(listing.id));
  for (const slot of ['top', 'bottom']) {
    if (removedIds.has(gs.chipShopAds?.[slot]?.listingId)) {
      gs.chipShopAds[slot] = null;
    }
  }

  for (const [containerId, selector] of [
    ['chipshop-listings', '.clipshop-card'],
    ['chipshop-cart-list', '.clipshop-cart-item'],
  ]) {
    const container = document.getElementById(containerId);
    if (!container) continue;
    for (const card of container.querySelectorAll(selector)) {
      if (!removedIds.has(card.dataset.clipshopListingId)) continue;
      card.classList.add('is-invalidating');
      card.querySelectorAll('button').forEach(button => {
        button.disabled = true;
      });
    }
  }
  if (typeof chipShopRenderAd === 'function') {
    chipShopRenderAd(document.getElementById('chipshop-ad-top'), gs.chipShopAds?.top);
    chipShopRenderAd(document.getElementById('chipshop-ad-bottom'), gs.chipShopAds?.bottom);
  }

  clearTimeout(chipShopRemovalTimer);
  chipShopRemovalTimer = setTimeout(() => {
    chipShopRemovalTimer = null;
    chipShopRender();
  }, CHIPSHOP_INVALIDATION_DURATION);
}

function chipShopStartFloor() {
  if (!chipShopHasRun()) return;
  chipShopRestock('floor');
}

function chipShopUpdateBalances() {
  if (typeof gs === 'undefined' || !gs) return;
  const chips = document.getElementById('chipshop-chip-balance');
  const golden = document.getElementById('chipshop-golden-balance');
  if (!chips || !golden) return;
  chips.textContent = String(Number.isFinite(gs.chips) ? gs.chips : 0);
  golden.textContent = String(Number.isFinite(gs.goldenChips) ? gs.goldenChips : 0);
}

function chipShopAddItemPreview(container, itemIds) {
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

function chipShopItemName(id) {
  return ITEM_DEFS[id].label.replace(/\n/g, ' ');
}

function chipShopUpgradeDetails(upgrade) {
  const label = { health: 'Max Health', speed: 'Speed', damage: 'Damage' }[upgrade.stat]
    || 'Upgrade';
  if (upgrade.type === 'percent') return `Permanent +${Math.round(upgrade.value * 100)}% ${label}`;
  if (upgrade.stat === 'health') return `Permanent +${upgrade.value} max health`;
  return `Permanent +${Math.round(upgrade.value * 100)}% ${label.toLowerCase()}`;
}

function chipShopListingDescription(listing) {
  if (listing.kind === 'upgrade') return chipShopUpgradeDetails(listing.upgrade);
  return listing.itemIds.map(id => {
    const description = ITEM_DEFS[id]?.desc;
    return description
      ? description.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim()
      : 'Installs this item into your current run.';
  }).join(' / ');
}

function chipShopCanAfford(listing) {
  if (listing.kind === 'golden') return gs.goldenChips >= listing.price;
  return gs.chips >= listing.price;
}

function chipShopRenderAd(element, ad) {
  if (!element) return;
  const listing = ad && gs.chipShopStock?.find(candidate => candidate.id === ad.listingId);
  element.hidden = !ad || !listing;
  element.replaceChildren();
  if (!ad || !listing) return;
  element.style.backgroundColor = ad.color;
  element.setAttribute('aria-label',
    ad.effect === 'virus'
      ? `Click the ad for ${chipShopListingName(listing)}; it may open moving virus pop-up windows.`
      : `Apply ${ad.discount}% off ${chipShopListingName(listing)}`);

  const image = document.createElement('span');
  image.className = 'clipshop-ad-image';
  if (listing.kind === 'upgrade') {
    const icon = document.createElement('img');
    icon.src = `sprites/ui/ChipShop/${CHIPSHOP_UPGRADE_SPRITES[listing.upgrade.stat]}`;
    icon.alt = '';
    image.appendChild(icon);
  } else {
    chipShopAddItemPreview(image, listing.itemIds);
  }

  const copy = document.createElement('span');
  copy.className = 'clipshop-ad-copy';
  copy.append('SPECIAL OFFER: ');
  const itemName = document.createElement('strong');
  itemName.textContent = chipShopListingName(listing);
  copy.append(itemName, ' — Limited-time software deal!');

  const discount = document.createElement('strong');
  discount.className = 'clipshop-ad-discount';
  discount.textContent = `${ad.discount}% OFF`;
  element.append(image, copy, discount);

  const callouts = ['CLICK HERE', 'AMAZING DEAL', 'BUY NOW'];
  const positions = [
    { top: '2px', left: `${8 + Math.floor(Math.random() * 28)}%` },
    { top: '2px', right: `${8 + Math.floor(Math.random() * 20)}%` },
    { bottom: '1px', left: `${24 + Math.floor(Math.random() * 36)}%` },
  ];
  for (let index = 0; index < callouts.length; index++) {
    const callout = document.createElement('span');
    callout.className = 'clipshop-ad-callout';
    callout.textContent = callouts[index];
    Object.assign(callout.style, positions[index]);
    callout.style.transform = `rotate(${Math.floor(Math.random() * 17) - 8}deg)`;
    element.appendChild(callout);
  }
}

function chipShopApplyAd(element) {
  if (!chipShopHasRun()) return;
  const slot = element.dataset.chipshopAd;
  const ad = gs.chipShopAds?.[slot];
  const listing = ad && gs.chipShopStock?.find(candidate => candidate.id === ad.listingId);
  if (!ad || !listing) return;

  if (ad.effect === 'virus') {
    gs.chipShopAds[slot] = null;
    chipShopRender();
    const opened = window.openVirusAdPopups();
    if (!opened) {
      listing.listPrice = listing.price;
      listing.discountPercent = ad.discount;
      listing.price = Math.max(1, Math.floor(
        listing.listPrice * (100 - ad.discount) / 100
      ));
      chipShopRender();
      document.getElementById('chipshop-notice').textContent =
        `All virus pop-up windows are already open; ${ad.discount}% off ${chipShopListingName(listing)} was applied instead.`;
      return;
    }
    document.getElementById('chipshop-notice').textContent =
      `The ${chipShopListingName(listing)} ad opened some unexpected windows!`;
    return;
  }

  listing.listPrice = listing.price;
  listing.discountPercent = ad.discount;
  listing.price = Math.max(1, Math.floor(
    listing.listPrice * (100 - ad.discount) / 100
  ));
  gs.chipShopAds[slot] = null;
  chipShopRender();
  document.getElementById('chipshop-notice').textContent =
    `${ad.discount}% ad discount applied to ${chipShopListingName(listing)}.`;
}

function chipShopSetView(view) {
  if (!['home', 'profile', 'help'].includes(view)) return;
  chipShopCurrentView = view;
  if (typeof gs !== 'undefined' && gs) gs.chipShopView = view;
  chipShopRender();
}

function chipShopRenderContentView() {
  const home = document.getElementById('chipshop-home-view');
  const content = document.getElementById('chipshop-content-view');
  if (!home || !content) return;
  const view = typeof gs !== 'undefined'
    ? gs.chipShopView || chipShopCurrentView
    : chipShopCurrentView;
  home.hidden = view !== 'home';
  content.hidden = view === 'home';
  if (content.hidden) return;

  content.replaceChildren();
  const header = document.createElement('header');
  header.className = 'clipshop-content-header';
  const heading = document.createElement('h2');
  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'clipshop-content-back';
  back.dataset.chipshopView = 'home';
  back.textContent = 'Back to Shop';
  const body = document.createElement('div');
  body.className = 'clipshop-content-body';
  if (view === 'profile') {
    heading.textContent = 'Customer Profile — Installed Listings';
    const purchases = typeof gs !== 'undefined' && Array.isArray(gs.chipShopPurchases)
      ? gs.chipShopPurchases
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
  header.append(heading, back);
  content.append(header, body);
}

function chipShopRenderCart() {
  const cart = document.getElementById('chipshop-cart-list');
  const total = document.getElementById('chipshop-cart-total');
  const installAll = document.getElementById('chipshop-install-all');
  if (!cart || !total || !installAll) return;
  const entries = typeof gs !== 'undefined' && Array.isArray(gs.chipShopCart)
    ? gs.chipShopCart
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
    item.dataset.clipshopListingId = listing.id;
    const name = document.createElement('div');
    name.className = 'clipshop-cart-item-title';
    name.textContent = chipShopListingName(listing);
    const description = document.createElement('div');
    description.className = 'clipshop-cart-description';
    description.textContent = chipShopListingDescription(listing);
    const actions = document.createElement('div');
    actions.className = 'clipshop-cart-actions';
    const price = document.createElement('span');
    price.textContent = listing.kind === 'golden'
      ? `${listing.price} Golden Chip`
      : `${listing.price} chips`;
    const install = document.createElement('button');
    install.type = 'button';
    install.className = 'clipshop-button';
    install.dataset.chipshopInstall = listing.id;
    install.textContent = 'Install';
    install.disabled = !chipShopHasRun() || !chipShopCanAfford(listing);
    actions.append(price, install);
    item.append(name, description, actions);
    cart.appendChild(item);
  }
  total.textContent = entries.length
    ? `Cart: ${chipsTotal} chips${goldTotal ? ` + ${goldTotal} Gold` : ''}`
    : '';
  installAll.disabled = !entries.length || !chipShopHasRun();
}

function chipShopRender() {
  const listings = document.getElementById('chipshop-listings');
  const notice = document.getElementById('chipshop-notice');
  const floor = document.getElementById('chipshop-floor');
  const refresh = document.getElementById('chipshop-refresh');
  if (!listings || !notice || !floor || !refresh) return;

  const hasRun = chipShopHasRun();
  const page = document.getElementById('wonderweb-page-clipshop');
  if (page) {
    page.dataset.floor = String(hasRun ? gs.floor : 1);
    chipShopRenderAd(document.getElementById('chipshop-ad-top'),
      hasRun ? gs.chipShopAds?.top : null);
    chipShopRenderAd(document.getElementById('chipshop-ad-bottom'),
      hasRun ? gs.chipShopAds?.bottom : null);
  }
  floor.textContent = `Floor ${hasRun ? gs.floor : '—'}`;
  refresh.textContent = `Restock · ${hasRun ? gs.chipShopRefreshCost : 5} chips`;
  refresh.disabled = !hasRun || gs.chips < gs.chipShopRefreshCost;
  listings.replaceChildren();

  if (!hasRun || !Array.isArray(gs.chipShopStock)) {
    notice.textContent = 'Start a run to browse today’s listings.';
    listings.appendChild(Object.assign(document.createElement('div'), {
      className: 'clipshop-empty',
      textContent: 'No active stock. Start a game to open ChipShop.',
    }));
    chipShopUpdateBalances();
    chipShopRenderContentView();
    chipShopRenderCart();
    return;
  }

  notice.textContent = `${gs.chipShopStock.length} listings · Refreshing costs ${gs.chipShopRefreshCost} chips.`;
  for (const listing of gs.chipShopStock) {
    const card = document.createElement('article');
    card.className = 'clipshop-card';
    card.dataset.chipshopListingId = listing.id;
    const productImage = document.createElement('div');
    productImage.className = 'clipshop-product-image';
    if (listing.kind === 'upgrade') {
      const sprite = CHIPSHOP_UPGRADE_SPRITES[listing.upgrade.stat];
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
      chipShopAddItemPreview(productImage, listing.itemIds);
    }

    const name = document.createElement('div');
    name.className = 'clipshop-item-name';
    name.textContent = chipShopListingName(listing);

    const detail = document.createElement('div');
    detail.className = 'clipshop-item-detail';
    detail.textContent = listing.kind === 'golden'
      ? `Golden deal · ${chipShopListingDescription(listing)}`
      : chipShopListingDescription(listing);
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
    addToCart.dataset.chipshopAdd = listing.id;
    addToCart.textContent = 'Add to cart';
    action.append(partNumber, addToCart);

    card.append(productImage, productInfo, action);
    listings.appendChild(card);
  }
  chipShopRenderContentView();
  chipShopRenderCart();
  chipShopUpdateBalances();
}

function chipShopApplyUpgrade(upgrade) {
  if (upgrade.stat === 'health') {
    const previousMaxHealth = gs.maxHealth;
    gs.maxHealth = upgrade.type === 'percent'
      ? Math.ceil(gs.maxHealth * (1 + upgrade.value))
      : gs.maxHealth + upgrade.value;
    gs.health = Math.min(gs.maxHealth, gs.health + gs.maxHealth - previousMaxHealth);
  } else if (upgrade.stat === 'speed') {
    if (upgrade.type === 'percent') {
      gs.chipShopSpeedMultiplier *= 1 + upgrade.value;
    } else {
      gs.chipShopSpeedBonus += upgrade.value;
    }
  } else if (upgrade.stat === 'damage') {
    if (upgrade.type === 'percent') {
      gs.chipShopDamageMultiplier *= 1 + upgrade.value;
    } else {
      gs.chipShopDamageBonus += upgrade.value;
    }
  }
}

function chipShopGrantItems(itemIds) {
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

function chipShopAddToCart(listingId) {
  if (!chipShopHasRun()) return;
  const index = gs.chipShopStock.findIndex(listing => listing.id === listingId);
  if (index < 0) return;
  const [listing] = gs.chipShopStock.splice(index, 1);
  gs.chipShopCart.push(listing);
  chipShopRender();
  document.getElementById('chipshop-notice').textContent =
    `${chipShopListingName(listing)} added to your cart. Install it when you are ready.`;
}

function chipShopInstallListing(listing) {
  if (listing.kind === 'golden') {
    if (listing.itemIds.some(id => gs.unlockedItems.includes(id))) {
      return 'One of those items is already installed.';
    }
    if (!chipShopGrantItems(listing.itemIds)) return 'That item combination is no longer available.';
    gs.goldenChips -= listing.price;
    SFX.play('itemConfirm', 0.65);
  } else if (listing.kind === 'item') {
    if (!chipShopGrantItems(listing.itemIds)) return 'That item is no longer available.';
    gs.chips -= listing.price;
    SFX.play('itemConfirm', 0.65);
  } else {
    gs.chips -= listing.price;
    chipShopApplyUpgrade(listing.upgrade);
    SFX.play('itemConfirm', 0.65);
  }

  gs.chipShopPurchases.push({
    name: chipShopListingName(listing),
    description: chipShopListingDescription(listing),
    priceText: listing.kind === 'golden'
      ? `${listing.price} Golden Chip`
      : `${listing.price} chips`,
  });
  chipShopMaybeGeneratePurchaseAd();
  return null;
}

function chipShopInstallFromCart(listingId) {
  if (!chipShopHasRun()) return;
  const index = gs.chipShopCart.findIndex(listing => listing.id === listingId);
  if (index < 0) return;
  const listing = gs.chipShopCart[index];
  if (!chipShopCanAfford(listing)) {
    document.getElementById('chipshop-notice').textContent = listing.kind === 'golden'
      ? 'You need a Golden Chip to install this listing.'
      : 'You do not have enough chips to install this listing.';
    return;
  }
  const error = chipShopInstallListing(listing);
  if (error) {
    document.getElementById('chipshop-notice').textContent = error;
    return;
  }
  gs.chipShopCart.splice(index, 1);
  updateHUD();
  if (typeof renderPauseMenu === 'function') renderPauseMenu();
  chipShopRender();
  document.getElementById('chipshop-notice').textContent = 'Installation complete.';
}

function chipShopInstallEverything() {
  if (!chipShopHasRun() || !gs.chipShopCart.length) return;
  let installed = 0;
  let message = '';
  while (gs.chipShopCart.length) {
    const listing = gs.chipShopCart[0];
    if (!chipShopCanAfford(listing)) {
      message = listing.kind === 'golden'
        ? 'Not enough Golden Chips to install the remaining cart listings.'
        : 'Not enough chips to install the remaining cart listings.';
      break;
    }
    const error = chipShopInstallListing(listing);
    if (error) {
      message = error;
      break;
    }
    gs.chipShopCart.shift();
    installed++;
  }
  updateHUD();
  if (typeof renderPauseMenu === 'function') renderPauseMenu();
  chipShopRender();
  document.getElementById('chipshop-notice').textContent = message
    ? `${installed} listing${installed === 1 ? '' : 's'} installed. ${message}`
    : `${installed} listing${installed === 1 ? '' : 's'} installed successfully.`;
}

function chipShopBuyRefresh() {
  if (!chipShopHasRun()) return;
  if (gs.chips < gs.chipShopRefreshCost) {
    document.getElementById('chipshop-notice').textContent = 'You do not have enough chips to restock.';
    return;
  }
  gs.chips -= gs.chipShopRefreshCost;
  gs.chipShopRefreshCost *= 2;
  gs.chipShopRefreshCount++;
  updateHUD();
  chipShopRestock('refresh');
  document.getElementById('chipshop-notice').textContent = `Stock refreshed. The next restock costs ${gs.chipShopRefreshCost} chips.`;
}

document.getElementById('chipshop-refresh').addEventListener('click', chipShopBuyRefresh);
document.getElementById('chipshop-listings').addEventListener('click', event => {
  const button = event.target.closest('[data-chipshop-add]');
  if (button && !button.disabled) chipShopAddToCart(button.dataset.chipshopAdd);
});
document.getElementById('chipshop-cart-list').addEventListener('click', event => {
  const button = event.target.closest('[data-chipshop-install]');
  if (button && !button.disabled) chipShopInstallFromCart(button.dataset.chipshopInstall);
});
document.getElementById('chipshop-install-all').addEventListener('click', chipShopInstallEverything);
document.querySelectorAll('[data-chipshop-ad]').forEach(ad => {
  ad.addEventListener('click', () => chipShopApplyAd(ad));
});
document.querySelector('.clipshop-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-chipshop-view]');
  if (button) chipShopSetView(button.dataset.chipshopView);
});
document.getElementById('chipshop-content-view').addEventListener('click', event => {
  const button = event.target.closest('[data-chipshop-view]');
  if (button) chipShopSetView(button.dataset.chipshopView);
});

chipShopRender();
