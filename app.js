(() => {
  const shell = document.querySelector('.client-shell');
  const sidebar = document.getElementById('sidebar');
  const hideSidebarButton = document.getElementById('sidebarToggle');
  const showSidebarButton = document.getElementById('sidebarReopen');
  const views = [...document.querySelectorAll('[data-view]')];
  const navLinks = [...document.querySelectorAll('.nav-item[data-section]')];
  const sectionTitle = document.getElementById('sectionTitle');
  const sidebarPreference = document.getElementById('sidebarPreference');
  const gameForm = document.getElementById('gameForm');
  const gameName = document.getElementById('gameName');
  const gameUrl = document.getElementById('gameUrl');
  const gameLibrary = document.getElementById('gameLibrary');
  const storage = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch { /* Storage can be unavailable in private contexts. */ }
    }
  };

  function setSidebarOpen(open, persist = true) {
    if (!shell || !sidebar) return;
    shell.classList.toggle('sidebar-collapsed', !open);
    hideSidebarButton?.setAttribute('aria-expanded', String(open));
    showSidebarButton?.setAttribute('aria-expanded', String(open));
    sidebar.setAttribute('aria-hidden', String(!open));
    if (sidebarPreference) sidebarPreference.checked = open;
    if (persist) storage.set('ragged-sidebar-open', String(open));
  }

  hideSidebarButton?.addEventListener('click', () => setSidebarOpen(false));
  showSidebarButton?.addEventListener('click', () => setSidebarOpen(true));
  sidebarPreference?.addEventListener('change', () => setSidebarOpen(sidebarPreference.checked));

  function getGames() {
    try {
      const saved = JSON.parse(storage.get('ragged-games', '[]'));
      return Array.isArray(saved) ? saved.filter((game) => game && typeof game.name === 'string') : [];
    } catch {
      return [];
    }
  }

  function renderGames() {
    if (!gameLibrary) return;
    const games = getGames();
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
        const launch = document.createElement('a');
        launch.href = game.url;
        launch.target = '_blank';
        launch.rel = 'noopener noreferrer';
        launch.className = 'game-launch';
        launch.textContent = 'Open';
        card.appendChild(launch);
      }

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'game-remove';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove ${game.name}`);
      remove.addEventListener('click', () => {
        const latestGames = getGames();
        latestGames.splice(index, 1);
        storage.set('ragged-games', JSON.stringify(latestGames));
        renderGames();
      });
      card.appendChild(remove);
      gameLibrary.appendChild(card);
    });
  }

  gameForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = gameName?.value.trim();
    if (!name) return;

    let url = '';
    const rawUrl = gameUrl?.value.trim();
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Unsupported URL protocol');
        url = parsed.href;
      } catch {
        gameUrl.setCustomValidity('Enter a valid http or https link.');
        gameUrl.reportValidity();
        return;
      }
    }

    gameUrl?.setCustomValidity('');
    const games = getGames();
    games.push({ name, url });
    storage.set('ragged-games', JSON.stringify(games));
    gameForm.reset();
    renderGames();
    gameName?.focus();
  });
  gameUrl?.addEventListener('input', () => gameUrl.setCustomValidity(''));
  document.getElementById('clearGames')?.addEventListener('click', () => {
    storage.set('ragged-games', '[]');
    renderGames();
  });

  function showSection(section, updateAddress = true) {
    if (!views.some((view) => view.dataset.view === section)) section = 'browser';
    views.forEach((view) => {
      view.classList.toggle('visible', view.dataset.view === section);
      view.setAttribute('aria-hidden', String(view.dataset.view !== section));
    });
    navLinks.forEach((link) => {
      const active = link.dataset.section === section;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (sectionTitle) sectionTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
    if (updateAddress && location.hash !== `#${section}`) history.replaceState(null, '', `#${section}`);
  }

  navLinks.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showSection(link.dataset.section);
    if (window.matchMedia('(max-width: 620px)').matches) setSidebarOpen(false);
  }));

  document.querySelector('.brand')?.addEventListener('click', (event) => {
    event.preventDefault();
    showSection('browser');
  });

  window.addEventListener('hashchange', () => showSection(location.hash.slice(1), false));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && shell && !shell.classList.contains('sidebar-collapsed')) setSidebarOpen(false);
  });

  setSidebarOpen(storage.get('ragged-sidebar-open', 'true') !== 'false', false);
  renderGames();
  showSection(location.hash.slice(1) || 'browser', false);
})();
