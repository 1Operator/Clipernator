// Task Manager UI and run-scoped enemy process patches.
(() => {
  const taskManagerWindow = document.getElementById('task-manager-window');
  const appRows = document.getElementById('task-manager-app-rows');
  const processRows = document.getElementById('task-manager-process-rows');
  const appMessage = document.getElementById('task-manager-app-message');
  const processMessage = document.getElementById('task-manager-process-message');
  const damageButton = document.getElementById('task-manager-damage-process');
  const appSelection = new Set();
  const stoppedApplications = new Set();
  let selectedProcessType = null;
  let appAnchorId = null;
  let appPointer = null;
  let suppressNextAppClick = false;
  let appsSignature = '';
  let processesSignature = '';
  let observingWindows = false;

  const applications = [
    {
      id: 'email',
      name: 'Email - Inbox',
      icon: 'sprites/ui/Email.png',
      window: () => document.getElementById('email-window'),
      close: () => {
        const appWindow = document.getElementById('email-window');
        if (appWindow.classList.contains('wonderweb-embedded-app')
            && typeof window.closeWonderWebAppTab === 'function') {
          window.closeWonderWebAppTab('email');
        } else {
          hideApplicationWindow('email-window');
        }
      },
    },
    {
      id: 'wonderweb',
      name: 'WonderWeb',
      icon: 'sprites/ui/WonderWeb.png',
      window: () => document.getElementById('wonderweb-window'),
      close: () => hideApplicationWindow('wonderweb-window'),
    },
    {
      id: 'trash',
      name: 'Recycle Bin',
      icon: 'sprites/ui/Trash.png',
      window: () => document.getElementById('trash-window'),
      close: () => {
        const appWindow = document.getElementById('trash-window');
        if (appWindow.classList.contains('wonderweb-embedded-app')
            && typeof window.closeWonderWebAppTab === 'function') {
          window.closeWonderWebAppTab('trash');
        } else {
          hideApplicationWindow('trash-window');
        }
      },
    },
    {
      id: 'task-manager',
      name: 'Task Manager',
      icon: 'sprites/ui/TaskManager.png',
      window: () => taskManagerWindow,
      close: closeTaskManager,
    },
  ];

  const enemyNames = {
    utensil: 'Utensil',
    waterballoon: 'Water Balloon',
    giftBox: 'Gift Box',
    partyHat: 'Party Hat',
    cakeBoss: 'Anti-Pie',
    birthdayBomber: 'Birthday Bomber',
    pinata: 'Piñata',
    balloonWitch: 'Balloon Witch',
    streamerGhost: 'Streamer Ghost',
    boss2: 'Boss 2',
    cannonball: 'Cannonball',
    ringmaster: 'Ringmaster',
    juggler: 'Juggler',
    clownCar: 'Clown Car',
    miniClown: 'Mini Clown',
    corRed: 'Red COR',
    corBlue: 'Blue COR',
  };

  const enemyIcons = {
    utensil: 'sprites/enemies/Utensil/Fork/ForkTip.png',
    waterballoon: 'sprites/enemies/WaterBalloon/WaterBalloon.png',
    giftBox: 'sprites/enemies/GiftBox/GiftBox.png',
    partyHat: 'sprites/enemies/PartyHat/PartyHat.png',
    cakeBoss: 'sprites/ui/ANTIPIE.png',
    boss2: 'sprites/ui/ANTIPIE.png',
    corRed: 'sprites/enemies/COR/RedCOR.png',
    corBlue: 'sprites/enemies/COR/BlueCOR.png',
  };

  function getApplications() {
    const virusWindows = window.virusAdPopupIds().map(id => ({
      id: `virus-ad-${id}`,
      name: `Virus ${id}`,
      icon: 'sprites/ui/Virus.png',
      window: () => document.querySelector(`[data-virus-ad-id="${id}"]`),
      isRunning: () => !!document.querySelector(`[data-virus-ad-id="${id}"]`),
      close: () => window.closeVirusAdPopup(id),
    }));
    return [...applications, ...virusWindows];
  }

  function closeTaskManager() {
    taskManagerWindow.style.display = 'none';
    if (typeof updateTaskbarActiveWindow === 'function') updateTaskbarActiveWindow();
  }

  function hideApplicationWindow(id) {
    const appWindow = document.getElementById(id);
    if (!appWindow) return;
    appWindow.style.display = 'none';
    if (typeof updateTaskbarActiveWindow === 'function') updateTaskbarActiveWindow();
  }

  function makeIcon(source, fallbackText, tint) {
    const icon = document.createElement('span');
    icon.className = 'task-manager-icon';
    icon.style.backgroundColor = tint || '#376b9c';
    if (source) {
      const image = document.createElement('img');
      image.alt = '';
      image.src = source;
      image.addEventListener('error', () => {
        image.remove();
        icon.textContent = fallbackText;
      }, { once: true });
      icon.append(image);
    } else {
      icon.textContent = fallbackText;
    }
    return icon;
  }

  function makeCell(className, text) {
    const cell = document.createElement('span');
    cell.className = `task-manager-cell${className ? ` ${className}` : ''}`;
    cell.textContent = text;
    return cell;
  }

  function visibleWindow(element) {
    return !!element && getComputedStyle(element).display !== 'none';
  }

  function renderApplications() {
    const currentApplications = getApplications();
    const currentIds = new Set(currentApplications.map(app => app.id));
    for (const appId of appSelection) {
      if (!currentIds.has(appId)) appSelection.delete(appId);
    }
    const signature = currentApplications.map(app => {
      const running = app.isRunning ? app.isRunning() : !stoppedApplications.has(app.id);
      return `${app.id}:${running}`;
    }).join('|');
    if (signature === appsSignature) return;
    appsSignature = signature;
    appRows.replaceChildren();

    for (const app of currentApplications) {
      const running = app.isRunning ? app.isRunning() : !stoppedApplications.has(app.id);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'task-manager-row task-manager-app-row';
      row.dataset.appId = app.id;
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', String(appSelection.has(app.id)));
      row.tabIndex = 0;
      if (appSelection.has(app.id)) row.classList.add('is-selected');
      if (!running) row.classList.add('is-stopped');

      const task = document.createElement('span');
      task.className = 'task-manager-cell task-manager-program';
      task.append(makeIcon(app.icon, app.name.slice(0, 1)));
      const name = document.createElement('span');
      name.className = 'task-manager-cell';
      name.textContent = app.name;
      task.append(name);
      row.append(task, makeCell('task-manager-status', running ? 'Running' : 'Not running'));
      appRows.append(row);
    }

    appMessage.textContent = appSelection.size
      ? `${appSelection.size} application${appSelection.size === 1 ? '' : 's'} selected.`
      : 'Drag across rows to select multiple applications.';
    document.getElementById('task-manager-end-task').disabled = appSelection.size === 0;
  }

  function makeAppSelection(row, event) {
    const appId = row.dataset.appId;
    const rows = [...appRows.querySelectorAll('[data-app-id]')];
    if (event.shiftKey && appAnchorId) {
      const anchorIndex = rows.findIndex(item => item.dataset.appId === appAnchorId);
      const targetIndex = rows.indexOf(row);
      if (anchorIndex >= 0 && targetIndex >= 0) {
        if (!event.ctrlKey && !event.metaKey) appSelection.clear();
        for (const item of rows.slice(Math.min(anchorIndex, targetIndex), Math.max(anchorIndex, targetIndex) + 1)) {
          appSelection.add(item.dataset.appId);
        }
      }
    } else if (event.ctrlKey || event.metaKey) {
      if (appSelection.has(appId)) appSelection.delete(appId);
      else appSelection.add(appId);
      appAnchorId = appId;
    } else {
      appSelection.clear();
      appSelection.add(appId);
      appAnchorId = appId;
    }
    appsSignature = '';
    renderApplications();
  }

  appRows.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const row = event.target.closest('[data-app-id]');
    if (!row) return;
    appPointer = { id: row.dataset.appId, x: event.clientX, y: event.clientY, dragging: false };
    appRows.setPointerCapture(event.pointerId);
  });

  appRows.addEventListener('pointermove', event => {
    if (!appPointer) return;
    if (!appPointer.dragging && Math.hypot(event.clientX - appPointer.x, event.clientY - appPointer.y) < 4) return;
    appPointer.dragging = true;
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-app-id]');
    if (!row || !appRows.contains(row)) return;
    if (!appSelection.has(row.dataset.appId)) {
      appSelection.add(appPointer.id);
      appSelection.add(row.dataset.appId);
      appAnchorId = appPointer.id;
      appsSignature = '';
      renderApplications();
    }
  });

  appRows.addEventListener('pointerup', event => {
    if (!appPointer) return;
    const pointer = appPointer;
    appPointer = null;
    const row = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-app-id]')
      || appRows.querySelector(`[data-app-id="${pointer.id}"]`);
    if (pointer.dragging) {
      suppressNextAppClick = true;
    } else if (row && appRows.contains(row)) {
      suppressNextAppClick = true;
      makeAppSelection(row, event);
    }
    if (suppressNextAppClick) {
      setTimeout(() => {
        suppressNextAppClick = false;
      }, 0);
    }
  });
  appRows.addEventListener('pointercancel', () => { appPointer = null; });

  appRows.addEventListener('click', event => {
    if (suppressNextAppClick) {
      suppressNextAppClick = false;
      event.preventDefault();
      return;
    }
    const row = event.target.closest('[data-app-id]');
    if (!row) return;
    makeAppSelection(row, event);
  });

  document.getElementById('task-manager-end-task').addEventListener('click', () => {
    const currentApplications = getApplications();
    for (const appId of appSelection) {
      const app = currentApplications.find(candidate => candidate.id === appId);
      const running = app?.isRunning ? app.isRunning() : !stoppedApplications.has(appId);
      if (!app || !running) continue;
      app.close();
      stoppedApplications.add(appId);
    }
    appSelection.clear();
    appsSignature = '';
    renderApplications();
  });

  function getProcessGroups() {
    const groups = [];
    const enemyCounts = new Map();
    if (typeof ECS !== 'undefined') {
      for (const id of ECS.query('enemy')) {
        const type = ECS.get(id, 'enemy')?.type;
        if (type) enemyCounts.set(type, (enemyCounts.get(type) || 0) + 1);
      }
    }
    for (const [type, count] of enemyCounts) {
      const definition = typeof ENEMY_DEFS !== 'undefined' ? ENEMY_DEFS[type] : null;
      groups.push({
        id: `enemy:${type}`,
        kind: 'enemy',
        type,
        name: enemyNames[type] || type,
        count,
        user: type === 'corRed' || type === 'corBlue' ? 'SYSTEM' : 'LOCAL',
        icon: enemyIcons[type] || '',
        tint: definition?.color || '#8d3b54',
      });
    }

    groups.push({
      id: 'player:clippy',
      kind: 'player',
      name: 'Clippy',
      count: 1,
      user: 'USER',
      icon: 'sprites/Clippy.png',
      tint: '#236e9a',
    });

    const objectCounts = new Map();
    if (typeof ECS !== 'undefined') {
      objectCounts.set('Chippy', ECS.query('chippyMachine').size);
    }
    if (typeof gs !== 'undefined' && gs) {
      if (Array.isArray(gs.chipDrops)) {
        for (const chip of gs.chipDrops) {
          const name = chip.golden ? 'Golden Chip' : 'Chip';
          objectCounts.set(name, (objectCounts.get(name) || 0) + 1);
        }
      }
      if (Array.isArray(gs.fieldItems)) {
        for (const item of gs.fieldItems) {
          const itemName = typeof ITEM_DEFS !== 'undefined' ? ITEM_DEFS[item.id]?.name : null;
          const name = itemName || item.id || 'Item';
          objectCounts.set(name, (objectCounts.get(name) || 0) + 1);
        }
      }
    }
    for (const [name, count] of objectCounts) {
      if (!count) continue;
      const isChippy = name === 'Chippy';
      const isChip = name === 'Chip' || name === 'Golden Chip';
      let icon = '';
      if (isChippy) icon = 'sprites/objects/Chippy/Chippy.png';
      else if (name === 'Chip') icon = 'sprites/objects/Chips/Chip.png';
      else if (name === 'Golden Chip') icon = 'sprites/objects/Chips/GoldenChip.png';
      else if (typeof ITEM_DEFS !== 'undefined') icon = ITEM_DEFS[[...Object.keys(ITEM_DEFS)].find(id => ITEM_DEFS[id]?.name === name)]?.img || '';
      groups.push({
        id: `object:${name}`,
        kind: 'object',
        name,
        count,
        user: 'SYSTEM',
        icon,
        tint: isChip ? '#ae8b16' : '#4d7663',
      });
    }
    return groups;
  }

  function readMemoryLeaked(type) {
    return Number(typeof gs !== 'undefined' && gs?.taskManagerDamageByType?.[type]) || 0;
  }

  function renderProcesses() {
    const groups = getProcessGroups();
    const signature = groups.map(group =>
      `${group.id}:${group.count}:${group.kind === 'enemy' ? readMemoryLeaked(group.type).toFixed(2) : ''}`
    ).join('|');
    if (signature !== processesSignature) {
      processesSignature = signature;
      processRows.replaceChildren();
      for (const group of groups) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'task-manager-row task-manager-process-row';
        row.dataset.processId = group.id;
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(group.kind === 'enemy' && selectedProcessType === group.type));
        row.tabIndex = 0;
        if (group.kind === 'enemy' && selectedProcessType === group.type) row.classList.add('is-selected');

        const program = document.createElement('span');
        program.className = 'task-manager-cell task-manager-program';
        program.append(makeIcon(group.icon, group.name.slice(0, 1), group.tint));
        const name = document.createElement('span');
        name.className = 'task-manager-cell';
        name.textContent = group.count > 1 ? `${group.name} (${group.count})` : group.name;
        program.append(name);
        const memory = group.kind === 'enemy' && readMemoryLeaked(group.type) > 0
          ? `${readMemoryLeaked(group.type).toFixed(1)} HP`
          : '—';
        row.append(program, makeCell('', group.user), makeCell('', memory));
        row.dataset.enemyType = group.kind === 'enemy' ? group.type : '';
        processRows.append(row);
      }
    }
    updateProcessDetails(groups);
    updatePerformance(groups);
    const processCount = groups.length;
    const enemyCount = groups.reduce((total, group) => total + (group.kind === 'enemy' ? group.count : 0), 0);
    const activeProjectiles = typeof gs !== 'undefined' && Array.isArray(gs.enemyBullets) ? gs.enemyBullets.length : 0;
    const objectCount = groups.reduce((total, group) => total + (group.kind === 'object' ? group.count : 0), 0);
    document.getElementById('task-manager-statusbar').textContent =
      `${processCount} process types  ·  ${enemyCount} enemies  ·  ${objectCount} objects  ·  ${activeProjectiles} projectiles`;
  }

  processRows.addEventListener('click', event => {
    const row = event.target.closest('[data-process-id]');
    if (!row) return;
    selectedProcessType = row.dataset.enemyType || null;
    processesSignature = '';
    renderProcesses();
  });

  function updateProcessDetails(groups = getProcessGroups()) {
    const process = groups.find(group => group.kind === 'enemy' && group.type === selectedProcessType);
    const nextCost = Number(typeof gs !== 'undefined' && gs?.taskManagerNextNerfCost) || 7;
    const isNerfed = !!(process && gs.taskManagerNerfedTypes?.[process.type]);
    const canDamage = !!process && !isNerfed && gs.chips >= nextCost;
    damageButton.disabled = !canDamage;

    if (!process) {
      processMessage.textContent = 'Select an enemy process. System objects and Clippy cannot be patched.';
      processMessage.title = processMessage.textContent;
      damageButton.title = 'Select an enemy process to continue.';
      return;
    }

    const currentCount = process.count;
    const healthValues = [];
    const speedValues = [];
    for (const id of ECS.query('enemy', 'hp')) {
      if (ECS.get(id, 'enemy')?.type === process.type) healthValues.push(ECS.get(id, 'hp').hp);
    }
    for (const id of ECS.query('enemy', 'physics')) {
      if (ECS.get(id, 'enemy')?.type === process.type) speedValues.push(ECS.get(id, 'physics').speed);
    }
    const health = healthValues.length
      ? `HP ${Math.round(healthValues.reduce((sum, value) => sum + value, 0) / healthValues.length)} avg`
      : 'HP n/a';
    const speed = speedValues.length
      ? `speed ${(speedValues.reduce((sum, value) => sum + value, 0) / speedValues.length * taskManagerMovementMultiplier(process.type)).toFixed(1)} avg`
      : 'speed n/a';
    const patchText = isNerfed
      ? 'Already patched for this run.'
      : process.type === 'corRed' || process.type === 'corBlue'
        ? `Patch movement and damage by 30% for the rest of this run. CORs have no health pool. Cost: ${nextCost} chips (${gs.chips} available).`
        : `Patch movement, damage, and health by 30% for the rest of this run. Cost: ${nextCost} chips (${gs.chips} available).`;
    processMessage.textContent = `${process.name}: ${currentCount} active · ${health} · ${speed}. ${patchText}`;
    processMessage.title = processMessage.textContent;
    damageButton.title = isNerfed
      ? 'This enemy type has already been patched this run.'
      : gs.chips < nextCost
        ? `You need ${nextCost} chips to patch this process.`
        : process.type === 'corRed' || process.type === 'corBlue'
          ? `Spend ${nextCost} chips to reduce this COR's movement and damage by 30%.`
          : `Spend ${nextCost} chips to reduce this type's movement, damage, and health by 30%.`;
  }

  damageButton.addEventListener('click', () => {
    if (!selectedProcessType || typeof taskManagerDamageProcess !== 'function') return;
    const result = taskManagerDamageProcess(selectedProcessType);
    if (!result) return;
    processesSignature = '';
    renderProcesses();
  });

  function updatePerformance(groups) {
    const runningEnemies = groups.reduce((total, group) => total + (group.kind === 'enemy' ? group.count : 0), 0);
    const health = typeof gs !== 'undefined' && Number.isFinite(gs.health) ? Math.max(0, Math.ceil(gs.health)) : null;
    document.getElementById('task-manager-perf-health').textContent =
      health === null ? '—' : `${health} / ${Math.ceil(gs.maxHealth || 0)}`;
    document.getElementById('task-manager-perf-chips').textContent =
      typeof gs !== 'undefined' && Number.isFinite(gs.chips) ? String(gs.chips) : '—';
    document.getElementById('task-manager-perf-enemies').textContent = String(runningEnemies);
    document.getElementById('task-manager-perf-cost').textContent =
      typeof gs !== 'undefined' && Number.isFinite(gs.taskManagerNextNerfCost)
        ? `${gs.taskManagerNextNerfCost} chips`
        : '7 chips';
  }

  function taskManagerRefresh() {
    if (!visibleWindow(taskManagerWindow)) return;
    renderApplications();
    renderProcesses();
  }

  function openTaskManager() {
    stoppedApplications.delete('task-manager');
    appsSignature = '';
    taskManagerWindow.style.display = 'flex';
    if (typeof bringFloatingWindowToFront === 'function') bringFloatingWindowToFront(taskManagerWindow);
    taskManagerRefresh();
  }

  document.getElementById('taskbar-task-manager').addEventListener('click', openTaskManager);
  taskManagerWindow.querySelector('[data-task-manager-close]').addEventListener('click', closeTaskManager);
  document.getElementById('task-manager-tabs').addEventListener('click', event => {
    const tab = event.target.closest('[data-task-manager-tab]');
    if (!tab) return;
    for (const candidate of document.querySelectorAll('[data-task-manager-tab]')) {
      const isSelected = candidate === tab;
      candidate.setAttribute('aria-selected', String(isSelected));
      candidate.tabIndex = isSelected ? 0 : -1;
    }
    for (const panel of document.querySelectorAll('.task-manager-panel')) {
      panel.hidden = panel.id !== `task-manager-panel-${tab.dataset.taskManagerTab}`;
    }
  });

  const windowObserver = new MutationObserver(records => {
    if (!observingWindows) return;
    for (const record of records) {
      const app = getApplications().find(candidate => candidate.window?.() === record.target);
      if (!app) continue;
      if (app.isRunning) continue;
      if (visibleWindow(record.target)) stoppedApplications.delete(app.id);
      else stoppedApplications.add(app.id);
    }
    appsSignature = '';
    if (visibleWindow(taskManagerWindow)) renderApplications();
  });
  for (const app of applications) {
    const element = app.window?.();
    if (element) windowObserver.observe(element, { attributes: true, attributeFilter: ['style'] });
  }
  setTimeout(() => { observingWindows = true; }, 0);
  window.openTaskManager = openTaskManager;
  window.taskManagerRefresh = taskManagerRefresh;
  setInterval(taskManagerRefresh, 500);
})();

function taskManagerDamageMultiplier(type) {
  return gs?.taskManagerNerfedTypes?.[type] ? 0.7 : 1;
}

function taskManagerMovementMultiplier(type) {
  return taskManagerDamageMultiplier(type);
}

function taskManagerReduceHealth(entityId) {
  const hp = ECS.get(entityId, 'hp');
  if (!hp) return;
  if (hp.hp > 0) hp.hp = Math.max(1, Math.ceil(hp.hp * 0.7));
  if (hp.maxHp > 0) hp.maxHp = Math.max(1, Math.ceil(hp.maxHp * 0.7));
}

function taskManagerApplySpawnNerf(entityId, type) {
  if (!gs?.taskManagerNerfedTypes?.[type]) return;
  taskManagerReduceHealth(entityId);
}

function taskManagerDamageProcess(type) {
  if (!Object.hasOwn(ENEMY_DEFS, type)) return false;
  if (gs.taskManagerNerfedTypes[type]) return false;
  const cost = Number(gs.taskManagerNextNerfCost) || 7;
  if (gs.chips < cost) {
    showMsg(`NOT ENOUGH CHIPS — ${cost} NEEDED`);
    return false;
  }

  gs.chips -= cost;
  gs.taskManagerNerfedTypes[type] = true;
  gs.taskManagerNextNerfCost = cost + 7;
  for (const id of ECS.query('enemy')) {
    if (ECS.get(id, 'enemy')?.type !== type) continue;
    taskManagerReduceHealth(id);
  }
  if (typeof updateHUD === 'function') updateHUD();
  if (typeof showMsg === 'function') showMsg(`${type} PROCESS NERFED — 30% LESS THREAT`);
  return true;
}
