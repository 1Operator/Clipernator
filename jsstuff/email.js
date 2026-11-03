// ============================================================
// Timed inbox and email offers
// ============================================================

const EMAIL_DURATION_WAVE_WEIGHTS = [5, 4, 3, 2, 1];
const EMAIL_TYPES = {
  system: { icon: '🖥️', sender: 'System Administrator' },
  bounty: { icon: '📎', sender: 'Clippy' },
  terms: { icon: '📄', sender: 'Drawa Licensing' },
  spam: { icon: '⚠️', sender: 'Unknown Sender' },
};

const EMAIL_TERMS = [
  {
    name: 'Low Memory',
    ammoMultiplier: 0.7,
    chipMultiplier: 2,
    damageMultiplier: 1,
    moveMultiplier: 1,
    body: `NOTICE OF TEMPORARY MEMORY REALLOCATION

The Drawa desktop service is temporarily reserving a portion of your available memory. Your weapon magazine capacity will be reduced by 30% while this agreement remains active. Existing ammunition above the new capacity will be discarded when you agree.

In exchange, the service will apply a 2x multiplier to chips collected, bounty rewards, and agreement-completion rewards earned while this agreement is active. The multiplier is applied when a reward is granted; it does not change chips already owned.

This service applies immediately and remains active until the stated number of complete waves has ended. A wave already underway when you agree is not counted toward the duration.

The service cannot be paused or cancelled early. If the run ends before the full duration, the agreement ends and its completion reward is forfeited. Your ordinary game controls and window interactions remain available.

By selecting “I Agree,” you accept the reduced magazine capacity and authorize the displayed duration. Please scroll through the entire notice before accepting.`,
  },
  {
    name: 'Priority Handling',
    ammoMultiplier: 1,
    chipMultiplier: 1.5,
    damageMultiplier: 1.25,
    moveMultiplier: 1.2,
    body: `PRIORITY HANDLING SERVICE AGREEMENT

The Drawa service will prioritize movement and processing requests. Your movement speed will increase by 20% while this agreement remains active. Incoming damage will also increase by 25% while the agreement is active.

In exchange, chips collected, bounty rewards, and agreement-completion rewards earned during this service receive a 1.5x multiplier. Individual chip pickups may award one or two chips to average out fractional rewards. The multiplier is applied when the reward is granted; it does not change chips already owned.

This service begins immediately and remains active until the stated number of complete waves has ended. A wave already underway when you agree is not counted toward the duration.

The service cannot be paused or cancelled early. If the run ends before the full duration, the agreement ends and its completion reward is forfeited. Your ordinary game controls and window interactions remain available.

By selecting “I Agree,” you accept the increased incoming damage and displayed duration. Please scroll through the entire notice before accepting.`,
  },
];

let emailMessages = [];
let emailSelectedId = null;
let emailNextId = 1;
let emailActiveMs = 0;
let emailLastTickMs = 0;
let emailNextRandomAt = 60_000;
let emailActiveBounty = null;
let emailActiveTerms = [];
let emailRepairUntil = 0;
let emailRepairNextTick = 0;
let emailInitialized = false;

function emailWeightedWaveDuration() {
  const total = EMAIL_DURATION_WAVE_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  let choice = Math.random() * total;
  for (let i = 0; i < EMAIL_DURATION_WAVE_WEIGHTS.length; i++) {
    choice -= EMAIL_DURATION_WAVE_WEIGHTS[i];
    if (choice < 0) return i + 1;
  }
  return EMAIL_DURATION_WAVE_WEIGHTS.length;
}

function emailDifficultyMultiplier() {
  const label = String(gs._difficultyLabel || '').toLowerCase();
  if (label.includes('hard')) return 1.5;
  if (label.includes('easy')) return 0.75;
  return 1;
}

function emailChipMultiplier() {
  return emailActiveTerms.reduce((multiplier, agreement) => multiplier * agreement.chipMultiplier, 1);
}

function emailPickupChipAmount() {
  const multiplier = emailChipMultiplier();
  const wholeChips = Math.floor(multiplier);
  const fractionalChip = Math.random() < multiplier - wholeChips ? 1 : 0;
  return Math.max(1, wholeChips + fractionalChip);
}

function emailAmmoCapacity() {
  return Math.max(1, Math.floor(gs.maxAmmo * emailActiveTerms.reduce(
    (multiplier, agreement) => multiplier * agreement.ammoMultiplier, 1
  )));
}

function emailMoveMultiplier() {
  return emailActiveTerms.reduce((multiplier, agreement) => multiplier * agreement.moveMultiplier, 1);
}

function emailIncomingDamage(amount) {
  return amount * emailActiveTerms.reduce(
    (multiplier, agreement) => multiplier * agreement.damageMultiplier, 1
  );
}

function emailSelectedMessage() {
  return emailMessages.find(message => message.id === emailSelectedId) || null;
}

function emailUnreadCount() {
  return emailMessages.filter(message => !message.read && !message.expired).length;
}

function emailRenderBadge() {
  const badge = document.getElementById('email-unread-badge');
  const app = document.getElementById('taskbar-email');
  if (!badge || !app) return;
  const unread = emailUnreadCount();
  badge.hidden = unread === 0;
  badge.textContent = unread > 99 ? '99+' : String(unread);
  const title = `${unread} unread email${unread === 1 ? '' : 's'}`;
  app.title = title;
  app.setAttribute('aria-label', title);
}

function emailRenderExpiryBars() {
  for (const message of emailMessages) {
    const row = document.querySelector(`[data-email-row="${message.id}"]`);
    const bar = row?.querySelector('.email-expiry-bar');
    if (!bar) continue;
    const ratio = Math.max(0, Math.min(1,
      (message.expiresAt - emailActiveMs) / message.lifetime
    ));
    bar.style.transform = `scaleX(${ratio})`;
    bar.classList.toggle('low', ratio <= 0.5 && ratio > 0.2);
    bar.classList.toggle('critical', ratio <= 0.2);
  }
}

function emailCreateAction(label, action, disabled = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'email-action-button';
  button.dataset.emailAction = action;
  button.textContent = label;
  button.disabled = disabled;
  return button;
}

function emailRenderPreview() {
  const preview = document.getElementById('email-preview');
  const actions = document.getElementById('email-actions');
  const message = emailSelectedMessage();
  actions.replaceChildren();
  if (!message) {
    preview.textContent = 'Select a message to read it. Reading is always safe.';
    return;
  }

  preview.replaceChildren();
  const header = document.createElement('div');
  header.className = 'email-preview-header';
  header.textContent = `From: ${message.sender}  |  Subject: ${message.subject}`;
  const body = document.createElement('div');
  body.textContent = message.body;
  preview.append(header, body);

  if (message.type === 'bounty') {
    const busy = Boolean(emailActiveBounty);
    actions.append(
      emailCreateAction(busy ? 'Bounty Active' : 'Accept Bounty', 'accept-bounty', busy),
      emailCreateAction('Report Spam', 'report-spam')
    );
  } else if (message.type === 'terms') {
    const busy = !preview.dataset.termsScrolled;
    actions.append(
      emailCreateAction('I Agree', 'accept-terms', busy),
      emailCreateAction('Report Spam', 'report-spam')
    );
  } else if (message.type === 'spam') {
    actions.append(
      emailCreateAction('Open Link', 'open-spam'),
      emailCreateAction('Report Spam', 'report-spam')
    );
  } else {
    actions.append(
      emailCreateAction('Dismiss', 'dismiss'),
      emailCreateAction('Report Spam', 'report-spam')
    );
  }
}

function emailSetActionStatus(text, isError = false) {
  const status = document.getElementById('email-action-status');
  if (!status) return;
  status.textContent = text;
  status.classList.toggle('visible', Boolean(text));
  status.classList.toggle('error', isError);
}

function emailRenderList() {
  const list = document.getElementById('email-list');
  const sorted = [...emailMessages].sort((a, b) => a.expiresAt - b.expiresAt || a.id - b.id);
  list.replaceChildren();
  if (!sorted.length) {
    const empty = document.createElement('div');
    empty.className = 'email-empty';
    empty.textContent = 'Your inbox is empty.';
    list.appendChild(empty);
  }

  for (const message of sorted) {
    const row = document.createElement('div');
    row.className = `email-row${message.read ? '' : ' unread'}`;
    if (message.expired) row.classList.add('expiring');
    row.setAttribute('role', 'option');
    row.setAttribute('aria-selected', String(message.id === emailSelectedId));
    row.dataset.emailRow = String(message.id);

    const icon = document.createElement('span');
    icon.className = 'email-row-icon';
    icon.textContent = EMAIL_TYPES[message.type].icon;

    const main = document.createElement('div');
    main.className = 'email-row-main';
    const sender = document.createElement('div');
    sender.className = 'email-row-sender';
    sender.textContent = message.sender;
    const subject = document.createElement('div');
    subject.className = 'email-row-subject';
    subject.textContent = message.subject;
    const track = document.createElement('div');
    track.className = 'email-expiry-track';
    const bar = document.createElement('div');
    bar.className = 'email-expiry-bar';
    track.appendChild(bar);
    main.append(sender, subject, track);
    row.append(icon, main);
    list.appendChild(row);
  }
  emailRenderExpiryBars();
  emailRenderPreview();
  emailRenderBadge();
}

function emailRenderTracker() {
  const tracker = document.getElementById('email-contract-tracker');
  tracker.replaceChildren();
  const appendLine = (text, className = '') => {
    const line = document.createElement('div');
    line.className = className;
    line.textContent = text;
    tracker.appendChild(line);
  };
  if (emailActiveBounty) {
    appendLine("Clippy's Bounty", 'email-contract-title');
    appendLine(emailActiveBounty.subject);
    appendLine(`Starts wave ${emailActiveBounty.eligibleWave}; ${emailActiveBounty.progress}/${emailActiveBounty.duration} complete waves`);
  }
  for (const agreement of emailActiveTerms) {
    appendLine(agreement.name, 'email-contract-title');
    appendLine(agreement.name === 'Low Memory'
      ? 'Ammo capacity reduced; chips and rewards doubled.'
      : 'Movement speed and incoming damage increased; chips and rewards boosted.');
    appendLine(`Effect active now; duration starts wave ${agreement.eligibleWave}.`);
    appendLine(`${agreement.completed}/${agreement.duration} complete waves`);
  }
  tracker.hidden = tracker.childElementCount === 0;
}

function emailDeliver({ type, sender, subject, body, payload = null, lifetime = 20_000 + Math.random() * 40_000 }) {
  const message = {
    id: emailNextId++,
    type,
    sender: sender || EMAIL_TYPES[type].sender,
    subject,
    body,
    payload,
    read: false,
    deliveredAt: emailActiveMs,
    lifetime,
    expiresAt: emailActiveMs + lifetime,
    expired: false,
  };
  emailMessages.push(message);
  SFX.play('EmailNotification', 0.65);
  const app = document.getElementById('taskbar-email');
  app.classList.remove('has-new-mail');
  void app.offsetWidth;
  app.classList.add('has-new-mail');
  emailRenderList();
  return message;
}

function deliverSystemEmail(subject, body) {
  if (emailMessages.some(message => message.type === 'system' && message.subject === subject)) return;
  emailDeliver({
    type: 'system',
    subject,
    body,
    lifetime: 20_000 + Math.random() * 40_000,
  });
}

function emailCreateRandomOffer() {
  const roll = Math.random();
  if (roll < 0.4) {
    const duration = emailWeightedWaveDuration();
    const goals = [
      { key: 'noReload', text: 'Goal: clear the next complete waves without reloading.' },
      { key: 'noDamage', text: 'Goal: clear the next complete waves without taking damage.' },
      { key: 'noMove', text: 'Goal: clear the next complete waves without changing position.' },
    ];
    const goal = goals[Math.floor(Math.random() * goals.length)];
    emailDeliver({
      type: 'bounty',
      subject: goal.text.replace('the next complete waves', `${duration} complete wave${duration === 1 ? '' : 's'}`),
      body: `Hello, player.\n\n${goal.text.replace('the next complete waves', `${duration} complete wave${duration === 1 ? '' : 's'}`)}\n\nAccepting starts with the next full wave. Any reload, damage, or physical position change during an eligible wave immediately fails the bounty. Failure has no penalty.\n\nOnly one bounty can be active at a time. Completing every wave pays chips scaled to the current difficulty.`,
      payload: { goal: goal.key, duration },
    });
  } else if (roll < 0.75) {
    const terms = EMAIL_TERMS[Math.floor(Math.random() * EMAIL_TERMS.length)];
    const duration = emailWeightedWaveDuration();
    const additionalClauses = Array.from({ length: duration }, (_, index) =>
      `Section ${index + 1}: Service conditions remain in effect through one additional complete wave. Benefits, drawbacks, and reward eligibility continue unchanged during this period.`
    ).join('\n\n');
    const body = `Offer duration: ${duration} complete waves.\n\n${terms.body}\n\nADDITIONAL SERVICE SCHEDULE\n\n${additionalClauses}`;
    const wordCount = body.trim().split(/\s+/).length;
    emailDeliver({
      type: 'terms',
      subject: `Terms: ${terms.name} — ${duration} waves`,
      body,
      payload: { ...terms, duration, wordCount },
    });
  } else {
    const subjects = [
      'URGENT: Your account needs verification!',
      'You have won a free supply of chips!',
      'Open this attachment to fix your computer!',
      'Your password expires today!',
    ];
    emailDeliver({
      type: 'spam',
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      body: `This message was not requested.\n\nReading is safe. Selecting “Open Link” is the trap and will trigger a random consequence. Reporting genuine spam earns 1 chip.`,
      payload: {},
    });
  }
}

function emailSelectMessage(id) {
  const message = emailMessages.find(item => item.id === id);
  if (!message || message.expired) return;
  emailSetActionStatus('');
  emailSelectedId = id;
  if (!message.read) {
    message.read = true;
    SFX.play('EmailOpen', 0.45);
  }
  const preview = document.getElementById('email-preview');
  preview.dataset.termsScrolled = '';
  emailRenderList();
  if (message.type === 'terms') {
    const onScroll = () => {
      if (preview.scrollTop + preview.clientHeight >= preview.scrollHeight - 2) {
        preview.dataset.termsScrolled = 'true';
        emailRenderPreview();
        preview.removeEventListener('scroll', onScroll);
      }
    };
    preview.addEventListener('scroll', onScroll);
    requestAnimationFrame(onScroll);
  }
}

function emailRemoveMessage(message, fade = false) {
  if (fade) {
    message.expired = true;
    const row = document.querySelector(`[data-email-row="${message.id}"]`);
    row?.classList.add('expiring');
    if (emailSelectedId === message.id) {
      emailSelectedId = null;
      emailRenderPreview();
    }
    emailRenderBadge();
    setTimeout(() => {
      emailMessages = emailMessages.filter(item => item.id !== message.id);
      if (emailSelectedId === message.id) emailSelectedId = null;
      emailRenderList();
    }, 700);
    return;
  }
  emailMessages = emailMessages.filter(item => item.id !== message.id);
  if (emailSelectedId === message.id) emailSelectedId = null;
  emailRenderList();
}

function emailRewardChips(baseAmount) {
  const amount = Math.max(0, Math.floor(baseAmount * emailDifficultyMultiplier() * emailChipMultiplier()));
  gs.chips += amount;
  updateHUD();
  return amount;
}

function emailRunAvailable() {
  return Number.isFinite(gs.playerId) && gs.health > 0;
}

function pauseEmailTimers() {
  emailLastTickMs = performance.now();
}

function emailAcceptBounty(message) {
  if (emailActiveBounty) {
    emailSetActionStatus('A bounty is already active. Finish or fail it before accepting another.', true);
    return;
  }
  if (!emailRunAvailable()) {
    emailSetActionStatus('There is no active game state to attach this offer to. Start a game, then accept while it is running or paused.', true);
    return;
  }
  const { goal, duration } = message.payload;
  const pos = ECS.get(gs.playerId, 'pos');
  emailActiveBounty = {
    goal,
    subject: message.subject,
    duration,
    progress: 0,
    eligibleWave: gs.wave + 1,
    lastX: pos.x,
    lastY: pos.y,
    reward: Math.ceil(2 + duration * 2 + Math.floor(gs.wave / 5)),
  };
  SFX.play('EmailAccept', 0.6);
  emailRemoveMessage(message);
  emailRenderTracker();
  showMsg('BOUNTY ACCEPTED — STARTS NEXT WAVE');
  emailSetActionStatus(`Accepted. The bounty starts at wave ${emailActiveBounty.eligibleWave} and tracks progress in the desktop corner.`);
}

function emailAcceptTerms(message) {
  if (!emailRunAvailable()) {
    emailSetActionStatus('There is no active game state to apply these terms to. Start a game, then accept while it is running or paused.', true);
    return;
  }
  if (document.getElementById('email-preview').dataset.termsScrolled !== 'true') {
    emailSetActionStatus('Scroll to the bottom of the full agreement to enable acceptance.', true);
    return;
  }
  const agreement = {
    name: message.payload.name,
    ammoMultiplier: message.payload.ammoMultiplier,
    chipMultiplier: message.payload.chipMultiplier,
    damageMultiplier: message.payload.damageMultiplier,
    moveMultiplier: message.payload.moveMultiplier,
    duration: message.payload.duration,
    completed: 0,
    eligibleWave: gs.wave + 1,
    reward: Math.ceil(message.payload.duration * 2 + message.payload.wordCount / 40),
  };
  emailActiveTerms.push(agreement);
  gs.ammo = Math.min(gs.ammo, emailAmmoCapacity());
  SFX.play('EmailAccept', 0.6);
  emailRemoveMessage(message);
  emailRenderTracker();
  updateHUD();
  showMsg(`${agreement.name.toUpperCase()} TERMS ACCEPTED`);
  const effect = agreement.name === 'Low Memory'
    ? `Ammo capacity is now ${emailAmmoCapacity()}; chips and rewards are doubled.`
    : 'Movement speed and incoming damage are increased; chips and rewards receive a 1.5x multiplier.';
  emailSetActionStatus(`Accepted for ${agreement.duration} complete waves. ${effect} The effect is active now; its duration counter starts with wave ${agreement.eligibleWave}.`);
}

function emailReportSpam(message) {
  const isSpam = message.type === 'spam';
  const reward = isSpam && emailRunAvailable() ? 1 : 0;
  if (reward) {
    gs.chips++;
    updateHUD();
  }
  SFX.play(isSpam ? 'EmailAccept' : 'EmailReject', 0.55);
  emailRemoveMessage(message);
  showMsg(isSpam
    ? reward ? 'SPAM REPORTED: +1 CHIP' : 'SPAM DELETED'
    : 'REAL OFFER DELETED');
}

function emailSpawnOutsideEnemies() {
  for (let i = 0; i < 2; i++) {
    const before = new Set(ECS.query('enemy'));
    spawnEnemy(true);
    const spawnedId = [...ECS.query('enemy')].find(id => !before.has(id));
    if (spawnedId == null) continue;
    const pos = ECS.get(spawnedId, 'pos');
    const ai = ECS.get(spawnedId, 'ai');
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) { pos.x = -100; pos.y = Math.random() * worldH; }
    else if (edge === 1) { pos.x = worldW + 100; pos.y = Math.random() * worldH; }
    else if (edge === 2) { pos.x = Math.random() * worldW; pos.y = -100; }
    else { pos.x = Math.random() * worldW; pos.y = worldH + 100; }
    if (ai) {
      ai.windowActive = true;
      ai.windowGroup = ++utensilWindowGroupSequence;
    }
  }
}

function emailSpawnPopupStorm() {
  const layer = document.getElementById('email-popup-layer');
  for (let i = 0; i < 3; i++) {
    const popup = document.createElement('aside');
    popup.className = 'email-ad-popup';
    popup.style.left = `${Math.max(4, Math.random() * (window.innerWidth - 230))}px`;
    popup.style.top = `${Math.max(4, Math.random() * (window.innerHeight - 130))}px`;
    const header = document.createElement('header');
    header.textContent = 'FREE SYSTEM SCAN';
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close advertisement');
    close.addEventListener('click', () => popup.remove());
    header.appendChild(close);
    const text = document.createElement('p');
    text.textContent = 'Congratulations! Your computer has 47 imaginary problems.';
    popup.append(header, text);
    layer.appendChild(popup);
    setTimeout(() => popup.remove(), 6000);
  }
}

function emailOpenSpam(message) {
  if (!emailRunAvailable()) return;
  const consequence = Math.floor(Math.random() * 4);
  if (consequence === 0) {
    const stolen = Math.min(gs.chips, 1 + Math.floor(Math.random() * 4));
    gs.chips -= stolen;
    updateHUD();
    showMsg(stolen ? `SPAM SCAM! ${stolen} CHIPS STOLEN` : 'SPAM SCAM! YOU HAD NO CHIPS TO STEAL');
  } else if (consequence === 1) {
    emailSpawnPopupStorm();
    showMsg('SPAM SCAM! CLOSE THE AD WINDOWS');
  } else if (consequence === 2) {
    emailSpawnOutsideEnemies();
    showMsg('SPAM SCAM! ENEMIES ENTERED FROM OUTSIDE');
  } else {
    emailRepairUntil = emailActiveMs + 5000;
    emailRepairNextTick = emailActiveMs + 1000;
    showMsg('SPAM SCAM! ENEMIES REPAIR 5% HEALTH EACH SECOND');
  }
  SFX.play('EmailReject', 0.55);
  emailRemoveMessage(message);
}

function emailHandleAction(action) {
  const message = emailSelectedMessage();
  if (!message || message.expired) return;
  if (action === 'accept-bounty') emailAcceptBounty(message);
  else if (action === 'accept-terms') emailAcceptTerms(message);
  else if (action === 'report-spam') emailReportSpam(message);
  else if (action === 'open-spam') emailOpenSpam(message);
  else if (action === 'dismiss') {
    SFX.play('EmailReject', 0.45);
    emailRemoveMessage(message);
  }
}

function emailFailBounty(reason) {
  if (!emailActiveBounty) return;
  emailActiveBounty = null;
  emailRenderTracker();
  emailRenderPreview();
  showMsg(`BOUNTY FAILED: ${reason}`);
}

function notifyEmailPlayerDamaged() {
  if (emailActiveBounty?.goal === 'noDamage' && gs.wave >= emailActiveBounty.eligibleWave) {
    emailFailBounty('DAMAGE TAKEN');
  }
}

function notifyEmailReloaded() {
  if (emailActiveBounty?.goal === 'noReload' && gs.wave >= emailActiveBounty.eligibleWave) {
    emailFailBounty('RELOADED');
  }
}

function notifyEmailPlayerMoved(pos) {
  const bounty = emailActiveBounty;
  if (!bounty) return;
  if (gs.wave >= bounty.eligibleWave && bounty.goal === 'noMove'
      && (pos.x !== bounty.lastX || pos.y !== bounty.lastY)) {
    emailFailBounty('POSITION CHANGED');
    return;
  }
  bounty.lastX = pos.x;
  bounty.lastY = pos.y;
}

function emailOnWaveCompleted(completedWave) {
  if (emailActiveBounty && completedWave >= emailActiveBounty.eligibleWave) {
    emailActiveBounty.progress++;
    emailActiveBounty.lastX = ECS.get(gs.playerId, 'pos').x;
    emailActiveBounty.lastY = ECS.get(gs.playerId, 'pos').y;
    if (emailActiveBounty.progress >= emailActiveBounty.duration) {
      const reward = emailRewardChips(emailActiveBounty.reward);
      SFX.play('EmailAccept', 0.65);
      emailActiveBounty = null;
      emailRenderPreview();
      showMsg(`BOUNTY COMPLETE: +${reward} CHIPS`);
    }
  }

  const remaining = [];
  for (const agreement of emailActiveTerms) {
    if (completedWave >= agreement.eligibleWave) agreement.completed++;
    if (agreement.completed >= agreement.duration) {
      const reward = emailRewardChips(agreement.reward);
      showMsg(`${agreement.name.toUpperCase()} COMPLETE: +${reward} CHIPS`);
      SFX.play('EmailAccept', 0.6);
    } else {
      remaining.push(agreement);
    }
  }
  emailActiveTerms = remaining;
  emailRenderTracker();
  updateHUD();
}

function tickEmailEnemyRepairing() {
  if (emailActiveMs >= emailRepairUntil) return;
  if (emailActiveMs < emailRepairNextTick) return;
  emailRepairNextTick += 1000;
  for (const id of ECS.query('enemy', 'hp', 'pos')) {
    const hp = ECS.get(id, 'hp');
    hp.hp = Math.min(hp.maxHp, hp.hp + hp.maxHp * 0.05);
    spawnParticles(ECS.get(id, 'pos').x, ECS.get(id, 'pos').y, '#66ff99', 2);
  }
}

function tickEmailSystem(now = performance.now()) {
  if (!gameRunning) {
    emailLastTickMs = now;
    return;
  }
  if (!emailLastTickMs) emailLastTickMs = now;
  const elapsed = Math.max(0, Math.min(250, now - emailLastTickMs));
  emailLastTickMs = now;
  emailActiveMs += elapsed;

  for (const message of [...emailMessages]) {
    if (!message.expired && emailActiveMs >= message.expiresAt) emailRemoveMessage(message, true);
  }
  while (emailActiveMs >= emailNextRandomAt) {
    emailNextRandomAt += 60_000;
    if (Math.random() < 0.5) emailCreateRandomOffer();
  }
  emailRenderExpiryBars();
  tickEmailEnemyRepairing();
}

function resetEmailRunState() {
  emailActiveBounty = null;
  emailActiveTerms = [];
  emailRepairUntil = 0;
  emailRepairNextTick = 0;
  emailActiveMs = 0;
  emailLastTickMs = performance.now();
  emailNextRandomAt = 60_000;
  emailMessages = emailMessages.filter(message => message.type === 'system' && !message.expired);
  if (!emailMessages.some(message => message.id === emailSelectedId)) emailSelectedId = null;
  for (const message of emailMessages) {
    if (!message.expired) message.expiresAt = message.lifetime;
  }
  emailRenderTracker();
  emailRenderList();
}

function endEmailRun() {
  emailActiveBounty = null;
  emailActiveTerms = [];
  emailRepairUntil = 0;
  document.getElementById('email-popup-layer').replaceChildren();
  emailRenderTracker();
}

function toggleEmailInbox() {
  const inbox = document.getElementById('email-window');
  const opening = getComputedStyle(inbox).display === 'none';
  inbox.style.display = opening ? 'flex' : 'none';
  if (opening) {
    SFX.play('EmailOpen', 0.45);
    bringFloatingWindowToFront(inbox);
  }
  else updateTaskbarActiveWindow();
}

function initializeEmailSystem() {
  if (emailInitialized) return;
  emailInitialized = true;
  const list = document.getElementById('email-list');
  const preview = document.getElementById('email-preview');
  const inbox = document.getElementById('email-window');
  document.getElementById('taskbar-email').addEventListener('click', toggleEmailInbox);
  document.getElementById('email-actions').addEventListener('click', event => {
    const button = event.target.closest('[data-email-action]');
    if (button && !button.disabled) emailHandleAction(button.dataset.emailAction);
  });
  list.addEventListener('click', event => {
    const row = event.target.closest('[data-email-row]');
    if (row) emailSelectMessage(Number(row.dataset.emailRow));
  });
  document.querySelector('[data-email-close]').addEventListener('click', () => {
    inbox.style.display = 'none';
    updateTaskbarActiveWindow();
  });
  document.querySelector('[data-email-close]').addEventListener('pointerdown', event => {
    event.stopPropagation();
  });
  preview.addEventListener('scroll', () => {
    const message = emailSelectedMessage();
    if (message?.type !== 'terms') return;
    if (preview.scrollTop + preview.clientHeight >= preview.scrollHeight - 2) {
      preview.dataset.termsScrolled = 'true';
      emailRenderPreview();
    }
  });
  emailRenderList();
}

document.addEventListener('DOMContentLoaded', initializeEmailSystem, { once: true });
