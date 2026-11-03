(() => {
  const shell = document.getElementById('clientShell');
  const sidebar = document.getElementById('sidebar');
  const toggle = document.getElementById('sidebarToggle');
  const views = [...document.querySelectorAll('[data-view]')];
  const navLinks = [...document.querySelectorAll('.nav-item[data-section]')];
  const sectionTitle = document.getElementById('sectionTitle');
  const sidebarPreference = document.getElementById('sidebarPreference');
  const gameForm = document.getElementById('gameForm');
  const gameName = document.getElementById('gameName');
  const gameUrl = document.getElementById('gameUrl');
  const gameLibrary = document.getElementById('gameLibrary');

  function readStorage(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Local storage may be disabled. */ }
  }

  function setSidebarOpen(open, save = true) {
    shell.classList.toggle('sidebar-collapsed', !open);
    sidebar.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Hide sidebar' : 'Show sidebar');
    toggle.querySelector('span').textContent = open ? '↑' : '↓';
    if (sidebarPreference) sidebarPreference.checked = open;
    if (save) writeStorage('ragged-sidebar-open', String(open));
  }

  toggle.addEventListener('click', () => {
    setSidebarOpen(shell.classList.contains('sidebar-collapsed'));
  });

  function readGames() {
    try {
      const items = JSON.parse(readStorage('ragged-games', '[]'));
      return Array.isArray(items) ? items.filter((item) => item && typeof item.name === 'string') : [];
    } catch { return []; }
  }

  function renderGames() {
    if (!gameLibrary) return;
    const games = readGames();
    gameLibrary.replaceChildren();
    if (!games.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-library';
      empty.textContent = 'Your library is empty.';
      gameLibrary.appendChild(empty);
      return;
    }
    games.forEach((game, index) => {
      const card = document.createElement('article');
      card.className = 'game-card';
      const name = document.createElement('strong');
      name.textContent = game.name;
      card.appendChild(name);
      if (game.url) {
        const open = document.createElement('a');
        open.className = 'game-launch';
        open.href = game.url;
        open.target = '_blank';
        open.rel = 'noopener noreferrer';
        open.textContent = 'Open';
        card.appendChild(open);
      }
      const remove = document.createElement('button');
      remove.className = 'game-remove';
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove ${game.name}`);
      remove.addEventListener('click', () => {
        const updated = readGames();
        updated.splice(index, 1);
        writeStorage('ragged-games', JSON.stringify(updated));
        renderGames();
      });
      card.appendChild(remove);
      gameLibrary.appendChild(card);
    });
  }

  gameForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = gameName.value.trim();
    if (!name) return;
    let url = '';
    if (gameUrl.value.trim()) {
      try {
        const parsed = new URL(gameUrl.value.trim());
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported protocol');
        url = parsed.href;
      } catch {
        gameUrl.setCustomValidity('Enter a valid http or https link.');
        gameUrl.reportValidity();
        return;
      }
    }
    gameUrl.setCustomValidity('');
    const games = readGames();
    games.push({ name, url });
    writeStorage('ragged-games', JSON.stringify(games));
    gameForm.reset();
    renderGames();
    gameName.focus();
  });
  gameUrl?.addEventListener('input', () => gameUrl.setCustomValidity(''));
  document.getElementById('clearGames')?.addEventListener('click', () => {
    writeStorage('ragged-games', '[]');
    renderGames();
  });
  sidebarPreference?.addEventListener('change', () => setSidebarOpen(sidebarPreference.checked));

  function showSection(section, updateHash = true) {
    if (!views.some((view) => view.dataset.view === section)) section = 'browser';
    views.forEach((view) => {
      const active = view.dataset.view === section;
      view.classList.toggle('visible', active);
      view.setAttribute('aria-hidden', String(!active));
    });
    navLinks.forEach((link) => {
      const active = link.dataset.section === section;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    sectionTitle.textContent = section[0].toUpperCase() + section.slice(1);
    if (updateHash && location.hash !== `#${section}`) history.replaceState(null, '', `#${section}`);
  }

  navLinks.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showSection(link.dataset.section);
    if (matchMedia('(max-width: 620px)').matches) setSidebarOpen(false);
  }));
  document.querySelector('.brand')?.addEventListener('click', (event) => {
    event.preventDefault();
    showSection('browser');
  });
  window.addEventListener('hashchange', () => showSection(location.hash.slice(1), false));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !shell.classList.contains('sidebar-collapsed')) setSidebarOpen(false);
  });

  setSidebarOpen(readStorage('ragged-sidebar-open', 'true') !== 'false', false);
  renderGames();
  showSection(location.hash.slice(1) || 'browser', false);
})();
