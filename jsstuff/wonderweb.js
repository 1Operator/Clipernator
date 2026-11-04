// ============================================================
// CLIPBLAST: PARTY HUNTER — WonderWeb tabbed browser
// ============================================================

(() => {
  const browser = document.getElementById('wonderweb-window');
  const tabs = [...browser.querySelectorAll('[data-wonderweb-tab]')];
  const pages = [...browser.querySelectorAll('[data-wonderweb-page]')];
  const address = document.getElementById('wonderweb-address-text');

  const addresses = {
    home: 'drawa.local/home',
    clipshop: 'drawa.local/clipshop',
  };

  function selectTab(name, focus = false) {
    const selectedTab = tabs.find(tab => tab.dataset.wonderwebTab === name);
    if (!selectedTab || selectedTab.hidden) return;

    for (const tab of tabs) {
      const selected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }

    for (const page of pages) {
      page.hidden = page.dataset.wonderwebPage !== name;
    }

    address.textContent = addresses[name];
    if (name === 'clipshop' && typeof clipShopRender === 'function') clipShopRender();

    if (focus) selectedTab.focus();
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab.dataset.wonderwebTab));
    tab.addEventListener('keydown', event => {
      const visibleTabs = tabs.filter(candidate => !candidate.hidden);
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

  browser.querySelectorAll('[data-wonderweb-open-tab]').forEach(shortcut => {
    shortcut.addEventListener('click', () => {
      const name = shortcut.dataset.wonderwebOpenTab;
      const tab = tabs.find(candidate => candidate.dataset.wonderwebTab === name);
      if (!tab) return;
      tab.hidden = false;
      selectTab(name);
    });
  });

  browser.querySelectorAll('[data-wonderweb-open-app]').forEach(shortcut => {
    shortcut.addEventListener('click', () => {
      if (shortcut.dataset.wonderwebOpenApp === 'email') toggleEmailInbox();
      if (shortcut.dataset.wonderwebOpenApp === 'trash') openTrashWindow();
    });
  });

  browser.querySelector('[data-wonderweb-close]').addEventListener('click', () => {
    browser.style.display = 'none';
    if (typeof updateTaskbarActiveWindow === 'function') updateTaskbarActiveWindow();
  });

  window.openWonderWeb = () => {
    browser.style.display = 'flex';
    if (typeof bringFloatingWindowToFront === 'function') {
      bringFloatingWindowToFront(browser);
    }
    const activeTab = tabs.find(tab => tab.getAttribute('aria-selected') === 'true');
    if (activeTab?.dataset.wonderwebTab === 'clipshop') selectTab('clipshop');
  };
})();
