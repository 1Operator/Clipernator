// ============================================================
// ChipShop virus-ad pop-ups
// ============================================================

(() => {
  const host = document.getElementById('virus-ad-window-host');
  const maxPopups = 5;
  const popups = new Map();
  let nextPopupId = 0;
  let animationFrame = null;
  let lastFrameTime = 0;

  function makePopup(id) {
    const popup = document.createElement('section');
    popup.className = 'independent-window virus-ad-window';
    popup.dataset.windowTitle = 'Virus';
    popup.setAttribute('aria-label', 'Virus pop-up window');

    const titlebar = document.createElement('header');
    titlebar.className = 'desktop-window-titlebar virus-ad-titlebar';
    const close = document.createElement('button');
    close.className = 'desktop-window-close-button';
    close.type = 'button';
    close.setAttribute('aria-label', 'Close virus pop-up');
    close.textContent = 'r';
    close.addEventListener('click', () => closePopup(id));

    const image = document.createElement('img');
    image.src = 'sprites/ui/Virus.png';
    image.alt = 'Virus';
    image.draggable = false;

    titlebar.appendChild(close);
    popup.append(titlebar, image);

    const width = 136;
    const height = 152;
    const x = Math.random() * Math.max(0, window.innerWidth - width);
    const y = Math.random() * Math.max(0, window.innerHeight - height);
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.transform = 'none';
    popup.addEventListener('pointerenter', () => {
      popup.dataset.pointerOver = 'true';
    });
    popup.addEventListener('pointerleave', () => {
      delete popup.dataset.pointerOver;
    });
    host.appendChild(popup);
    if (typeof bringFloatingWindowToFront === 'function') {
      bringFloatingWindowToFront(popup);
    }

    return {
      element: popup,
      audio: SFX.playLoopInstance('virus', 0.35),
      x,
      y,
      vx: (Math.random() - 0.5) * 260,
      vy: (Math.random() - 0.5) * 260,
      width,
      height,
      turnIn: 0.5 + Math.random(),
    };
  }

  function closePopup(id) {
    const popup = popups.get(id);
    if (!popup) return;
    SFX.stopLoopInstance(popup.audio);
    popup.element.remove();
    popups.delete(id);
    if (!popups.size) {
      host.style.display = 'none';
      if (animationFrame !== null) cancelAnimationFrame(animationFrame);
      animationFrame = null;
    }
    if (typeof window.taskManagerRefresh === 'function') window.taskManagerRefresh();
  }

  function animatePopups(time) {
    const delta = Math.min((time - (lastFrameTime || time)) / 1000, 0.05);
    lastFrameTime = time;

    for (const popup of popups.values()) {
      if (popup.element.dataset.pointerOver === 'true') continue;
      popup.turnIn -= delta;
      if (popup.turnIn <= 0) {
        popup.vx = (Math.random() - 0.5) * 260;
        popup.vy = (Math.random() - 0.5) * 260;
        popup.turnIn = 0.5 + Math.random();
      }

      const maxX = Math.max(0, window.innerWidth - popup.width);
      const maxY = Math.max(0, window.innerHeight - popup.height);
      popup.x += popup.vx * delta;
      popup.y += popup.vy * delta;
      if (popup.x < 0 || popup.x > maxX) {
        popup.x = Math.max(0, Math.min(maxX, popup.x));
        popup.vx *= -1;
      }
      if (popup.y < 0 || popup.y > maxY) {
        popup.y = Math.max(0, Math.min(maxY, popup.y));
        popup.vy *= -1;
      }
      popup.element.style.left = `${popup.x}px`;
      popup.element.style.top = `${popup.y}px`;
    }

    animationFrame = popups.size ? requestAnimationFrame(animatePopups) : null;
  }

  window.openVirusAdPopups = () => {
    const count = Math.min(3 + Math.floor(Math.random() * 3), maxPopups - popups.size);
    if (count <= 0) {
      return false;
    }

    host.style.display = 'contents';
    for (let index = 0; index < count; index++) {
      const id = ++nextPopupId;
      popups.set(id, makePopup(id));
    }
    lastFrameTime = 0;
    if (animationFrame === null) animationFrame = requestAnimationFrame(animatePopups);
    if (typeof window.taskManagerRefresh === 'function') window.taskManagerRefresh();
    return true;
  };

  window.closeVirusAdPopups = () => {
    for (const id of [...popups.keys()]) closePopup(id);
  };
  window.virusAdPopupCount = () => popups.size;
})();
