// ============================================================
// CLIPBLAST: PARTY HUNTER — WonderWeb tabbed browser
// ============================================================

(() => {
  const browser = document.getElementById('wonderweb-window');
  const tabList = browser.querySelector('.wonderweb-tabs');
  const pagesContainer = browser.querySelector('.wonderweb-pages');
  const address = document.getElementById('wonderweb-address-text');
  const addresses = {
    home: 'drawa.local/home',
    clipshop: 'drawa.local/chipshop',
    email: 'drawa.local/email',
    trash: 'drawa.local/trash',
  };

  function tabs() {
    return [...tabList.querySelectorAll('[data-wonderweb-tab]')];
  }

  function pages() {
    return [...pagesContainer.querySelectorAll('[data-wonderweb-page]')];
  }

  function selectTab(name, focus = false) {
    const selectedTab = tabs().find(tab => tab.dataset.wonderwebTab === name);
    if (!selectedTab || selectedTab.hidden) return;

    for (const tab of tabs()) {
      const selected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }

    for (const page of pages()) {
      page.hidden = page.dataset.wonderwebPage !== name;
    }

    address.textContent = addresses[name] || 'drawa.local';
    if (name === 'clipshop' && typeof clipShopRender === 'function') clipShopRender();
    if (focus) selectedTab.focus();
  }

  function removeTab(name) {
    const tab = tabs().find(candidate => candidate.dataset.wonderwebTab === name);
    const page = pages().find(candidate => candidate.dataset.wonderwebPage === name);
    if (tab) {
      const entry = tab.closest('.wonderweb-tab-entry');
      if (entry) entry.remove();
      else tab.remove();
    }
    page?.remove();

    const nextTab = tabs()[0];
    if (nextTab) selectTab(nextTab.dataset.wonderwebTab);
  }

  function makeAppTab(name) {
    const existing = tabs().find(tab => tab.dataset.wonderwebTab === name);
    if (existing) return existing;

    const appWindow = document.getElementById(`${name}-window`);
    if (appWindow.classList.contains('wonderweb-embedded-app')) {
      detachAppWindow(appWindow);
    }

    const page = document.createElement('section');
    page.className = 'wonderweb-page';
    page.id = `wonderweb-page-${name}`;
    page.setAttribute('role', 'tabpanel');
    page.dataset.wonderwebPage = name;
    page.hidden = true;

    appWindow.classList.add('wonderweb-embedded-app');
    appWindow.style.left = '';
    appWindow.style.top = '';
    appWindow.style.transform = '';
    appWindow.style.zIndex = '';
    page.appendChild(appWindow);
    pagesContainer.appendChild(page);

    const entry = document.createElement('span');
    entry.className = 'wonderweb-tab-entry';
    const tab = document.createElement('button');
    tab.className = 'wonderweb-tab';
    tab.type = 'button';
    tab.id = `wonderweb-tab-${name}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.setAttribute('aria-controls', page.id);
    tab.dataset.wonderwebTab = name;
    tab.textContent = name === 'email' ? 'Email' : 'Trash';
    const close = document.createElement('button');
    close.className = 'wonderweb-tab-close';
    close.type = 'button';
    close.setAttribute('aria-label', `Close ${tab.textContent} tab`);
    close.textContent = '×';
    close.addEventListener('click', () => closeAppTab(name));
    entry.append(tab, close);
    tabList.appendChild(entry);
    return tab;
  }

  function closeAppTab(name) {
    const appWindow = document.getElementById(`${name}-window`);
    if (appWindow) {
      document.getElementById('utensil-window-layer').appendChild(appWindow);
      appWindow.classList.remove('wonderweb-embedded-app');
      appWindow.style.display = 'none';
    }
    removeTab(name);
    if (typeof updateTaskbarActiveWindow === 'function') updateTaskbarActiveWindow();
  }

  function openAppTab(name) {
    const tab = makeAppTab(name);
    if (name === 'email') toggleEmailInbox(true);
    else openTrashWindow(true);
    tab.hidden = false;
    browser.style.display = 'flex';
    selectTab(name);
    if (typeof bringFloatingWindowToFront === 'function') {
      bringFloatingWindowToFront(browser);
    }
  }

  function makePopout(name) {
    const tab = tabs().find(candidate => candidate.dataset.wonderwebTab === name);
    const page = pages().find(candidate => candidate.dataset.wonderwebPage === name);
    if (!tab || !page) return;

    if (name === 'email' || name === 'trash') {
      const appWindow = document.getElementById(`${name}-window`);
      document.getElementById('utensil-window-layer').appendChild(appWindow);
      removeTab(name);
      appWindow.classList.remove('wonderweb-embedded-app');
      appWindow.style.display = 'flex';
      if (typeof bringFloatingWindowToFront === 'function') {
        bringFloatingWindowToFront(appWindow);
      }
      return;
    }

    const popout = document.createElement('section');
    popout.className = 'independent-window wonderweb-popout-window';
    popout.dataset.windowTitle = name === 'clipshop' ? 'ChipShop' : 'WonderWeb';
    const titlebar = document.createElement('header');
    titlebar.className = 'desktop-window-titlebar';
    const title = document.createElement('span');
    title.textContent = popout.dataset.windowTitle;
    const close = document.createElement('button');
    close.className = 'desktop-window-close-button';
    close.type = 'button';
    close.setAttribute('aria-label', `Close ${title.textContent}`);
    close.textContent = 'r';
    close.addEventListener('click', () => {
      pagesContainer.appendChild(page);
      addStaticTab(name);
      popout.remove();
      selectTab(name);
      if (typeof updateTaskbarActiveWindow === 'function') updateTaskbarActiveWindow();
    });
    titlebar.append(title, close);
    page.classList.add('wonderweb-detached-page');
    popout.style.display = 'flex';
    popout.append(titlebar, page);
    removeTab(name);
    document.getElementById('utensil-window-layer').appendChild(popout);
    if (typeof registerIndependentWindow === 'function') {
      registerIndependentWindow(popout);
    }
  }

  function addStaticTab(name) {
    const tab = document.querySelector(`[data-wonderweb-tab="${name}"]`);
    if (tab) {
      tab.hidden = false;
      return;
    }
    const templateTab = document.createElement('button');
    templateTab.className = 'wonderweb-tab';
    templateTab.type = 'button';
    templateTab.id = `wonderweb-tab-${name}`;
    templateTab.setAttribute('role', 'tab');
    templateTab.setAttribute('aria-selected', 'false');
    templateTab.setAttribute('aria-controls', `wonderweb-page-${name}`);
    templateTab.dataset.wonderwebTab = name;
    templateTab.textContent = name === 'clipshop' ? 'ChipShop' : 'Home';
    tabList.appendChild(templateTab);
    wireTab(templateTab);
  }

  function wireTab(tab) {
    tab.addEventListener('click', () => selectTab(tab.dataset.wonderwebTab));
    tab.addEventListener('keydown', event => {
      const visibleTabs = tabs().filter(candidate => !candidate.hidden);
      const currentIndex = visibleTabs.indexOf(tab);
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % visibleTabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (currentIndex + visibleTabs.length - 1) % visibleTabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = visibleTabs.length - 1;
      else return;

      event.preventDefault();
      selectTab(visibleTabs[nextIndex].dataset.wonderwebTab, true);
    });
  }

  function detachAppWindow(appWindow) {
    if (!appWindow.classList.contains('wonderweb-embedded-app')) return;
    const name = appWindow.id.replace(/-window$/, '');
    const popout = appWindow.closest('.wonderweb-popout-window');
    document.getElementById('utensil-window-layer').appendChild(appWindow);
    appWindow.classList.remove('wonderweb-embedded-app');
    appWindow.style.display = 'none';
    appWindow.style.left = '';
    appWindow.style.top = '';
    appWindow.style.transform = '';
    appWindow.style.zIndex = '';
    removeTab(name);
    popout?.remove();
  }

  for (const tab of tabs()) wireTab(tab);

  let tabDrag = null;
  tabList.addEventListener('pointerdown', event => {
    const tab = event.target.closest('[data-wonderweb-tab]');
    if (!tab || event.button !== 0 || event.target.closest('.wonderweb-tab-close')) return;
    tabDrag = {
      name: tab.dataset.wonderwebTab,
      x: event.clientX,
      y: event.clientY,
      moved: false,
    };
  });
  document.addEventListener('pointermove', event => {
    if (!tabDrag) return;
    if (Math.hypot(event.clientX - tabDrag.x, event.clientY - tabDrag.y) > 8) {
      tabDrag.moved = true;
    }
  });
  document.addEventListener('pointerup', event => {
    if (!tabDrag) return;
    const drag = tabDrag;
    tabDrag = null;
    const bounds = browser.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (drag.moved && outside) makePopout(drag.name);
  });
  document.addEventListener('pointercancel', () => {
    tabDrag = null;
  });

  browser.querySelectorAll('[data-wonderweb-open-tab]').forEach(shortcut => {
    shortcut.addEventListener('click', () => {
      const name = shortcut.dataset.wonderwebOpenTab;
      const tab = tabs().find(candidate => candidate.dataset.wonderwebTab === name);
      if (!tab) return;
      tab.hidden = false;
      selectTab(name);
    });
  });

  browser.querySelectorAll('[data-wonderweb-open-app]').forEach(shortcut => {
    shortcut.addEventListener('click', () => openAppTab(shortcut.dataset.wonderwebOpenApp));
  });

  browser.querySelector('[data-wonderweb-close]').addEventListener('click', () => {
    browser.style.display = 'none';
    if (typeof updateTaskbarActiveWindow === 'function') updateTaskbarActiveWindow();
  });

  window.detachWonderWebAppWindow = detachAppWindow;
  window.closeWonderWebAppTab = closeAppTab;
  window.openWonderWeb = () => {
    browser.style.display = 'flex';
    if (typeof bringFloatingWindowToFront === 'function') {
      bringFloatingWindowToFront(browser);
    }
    const activeTab = tabs().find(tab => tab.getAttribute('aria-selected') === 'true');
    if (activeTab?.dataset.wonderwebTab === 'clipshop') selectTab('clipshop');
  };
})();
