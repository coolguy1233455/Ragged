(() => {
  const shell = document.querySelector('.client-shell');
  const sidebar = document.getElementById('sidebar');
  const hideButton = document.getElementById('sidebarToggle');
  const showButton = document.getElementById('sidebarReopen');
  const views = [...document.querySelectorAll('[data-view]')];
  const navLinks = [...document.querySelectorAll('.nav-item[data-section]')];
  const sectionTitle = document.getElementById('sectionTitle');
  const gameForm = document.getElementById('gameForm');
  const gameName = document.getElementById('gameName');
  const gameUrl = document.getElementById('gameUrl');
  const gameLibrary = document.getElementById('gameLibrary');
  const sidebarPreference = document.getElementById('sidebarPreference');
  const storage = {
    get(key, fallback) { try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* Storage may be disabled. */ } }
  };

  function setSidebarOpen(open) {
    shell.classList.toggle('sidebar-collapsed', !open);
    hideButton.setAttribute('aria-expanded', String(open));
    showButton.setAttribute('aria-expanded', String(open));
    sidebar.setAttribute('aria-hidden', String(!open));
    if (sidebarPreference) sidebarPreference.checked = open;
  }
  hideButton.addEventListener('click', () => setSidebarOpen(false));
  showButton.addEventListener('click', () => setSidebarOpen(true));

  function renderGames() {
    let games;
    try { games = JSON.parse(storage.get('ragged-games', '[]')); } catch { games = []; }
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
        games.splice(index, 1);
        storage.set('ragged-games', JSON.stringify(games));
        renderGames();
      });
      card.appendChild(remove);
      gameLibrary.appendChild(card);
    });
  }

  gameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = gameName.value.trim();
    if (!name) return;
    const urlValue = gameUrl.value.trim();
    let url = '';
    if (urlValue) {
      try {
        const parsed = new URL(urlValue);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('Unsupported URL scheme');
        url = parsed.href;
      } catch {
        gameUrl.setCustomValidity('Enter a valid http or https link.');
        gameUrl.reportValidity();
        return;
      }
    }
    gameUrl.setCustomValidity('');
    let games;
    try { games = JSON.parse(storage.get('ragged-games', '[]')); } catch { games = []; }
    games.push({ name, url });
    storage.set('ragged-games', JSON.stringify(games));
    gameForm.reset();
    renderGames();
  });
  gameUrl.addEventListener('input', () => gameUrl.setCustomValidity(''));
  document.getElementById('clearGames').addEventListener('click', () => {
    storage.set('ragged-games', '[]');
    renderGames();
  });
  sidebarPreference.addEventListener('change', () => setSidebarOpen(sidebarPreference.checked));

  function showSection(section) {
    if (!views.some((view) => view.dataset.view === section)) section = 'browser';
    views.forEach((view) => view.classList.toggle('visible', view.dataset.view === section));
    navLinks.forEach((link) => {
      const active = link.dataset.section === section;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    sectionTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
    if (location.hash !== `#${section}`) history.replaceState(null, '', `#${section}`);
  }
  navLinks.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showSection(link.dataset.section);
    if (window.matchMedia('(max-width: 620px)').matches) setSidebarOpen(false);
  }));

  const brandLink = document.querySelector('.brand');
  brandLink.addEventListener('click', (event) => {
    event.preventDefault();
    showSection('browser');
  });
  window.addEventListener('hashchange', () => showSection(location.hash.slice(1)));

  const startOpen = storage.get('ragged-sidebar-open', 'true') !== 'false';
  setSidebarOpen(startOpen);
  sidebarPreference.addEventListener('change', () => storage.set('ragged-sidebar-open', String(sidebarPreference.checked)));
  hideButton.addEventListener('click', () => storage.set('ragged-sidebar-open', 'false'));
  showButton.addEventListener('click', () => storage.set('ragged-sidebar-open', 'true'));
  renderGames();
  showSection(location.hash.slice(1) || 'browser');
})();
