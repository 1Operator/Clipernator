// ============================================================
// CLIPBLAST: PARTY HUNTER — WonderWeb tabbed browser
// ============================================================

(() => {
  const browser = document.getElementById('wonderweb-window');
  const tabs = [...browser.querySelectorAll('[data-wonderweb-tab]')];
  const pages = [...browser.querySelectorAll('[data-wonderweb-page]')];
  const address = document.getElementById('wonderweb-address-text');
  const goldenBalance = document.getElementById('wonderweb-golden-balance');

  const addresses = {
    home: 'drawa.local/home',
    golden: 'drawa.local/golden-chips',
    about: 'drawa.local/about',
  };

  function selectTab(name, focus = false) {
    const selectedTab = tabs.find(tab => tab.dataset.wonderwebTab === name);
    if (!selectedTab) return;

    for (const tab of tabs) {
      const selected = tab === selectedTab;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }

    for (const page of pages) {
      page.hidden = page.dataset.wonderwebPage !== name;
    }

    address.textContent = addresses[name];
    if (name === 'golden') {
      const balance = typeof gs !== 'undefined' && Number.isFinite(gs.goldenChips)
        ? gs.goldenChips
        : 0;
      goldenBalance.textContent = `${balance} Golden Chip${balance === 1 ? '' : 's'}`;
    }

    if (focus) selectedTab.focus();
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => selectTab(tab.dataset.wonderwebTab));
    tab.addEventListener('keydown', event => {
      const currentIndex = tabs.indexOf(tab);
      let nextIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') nextIndex = (currentIndex + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = tabs.length - 1;
      else return;

      event.preventDefault();
      selectTab(tabs[nextIndex].dataset.wonderwebTab, true);
    });
  }

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
    if (activeTab?.dataset.wonderwebTab === 'golden') selectTab('golden');
  };
})();
