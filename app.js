(() => {
  const shell = document.querySelector('.client-shell');
  if (!shell) return;

  const sidebar = document.getElementById('sidebar') || shell.querySelector('.sidebar');
  if (!sidebar) return;
  if (!sidebar.id) sidebar.id = 'sidebar';

  const navLinks = [...sidebar.querySelectorAll('.nav-item[data-section]')];
  const views = [...document.querySelectorAll('[data-view]')];
  const sectionTitle = document.getElementById('sectionTitle');
  const sidebarPreference = document.getElementById('sidebarPreference');
  let toggle = document.getElementById('sidebarToggle');

  // Keep the control outside the sidebar so it remains reachable when collapsed.
  if (!toggle) {
    toggle = document.createElement('button');
    toggle.id = 'sidebarToggle';
    toggle.className = 'sidebar-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-controls', sidebar.id);
    toggle.innerHTML = '<span aria-hidden="true">‹</span>';
    shell.appendChild(toggle);
  }
  toggle.setAttribute('aria-controls', sidebar.id);

  function readStorage(key, fallback) {
    try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
  }
  function writeStorage(key, value) {
    try { localStorage.setItem(key, value); } catch { /* Storage may be disabled. */ }
  }

  function setSidebarOpen(open, persist = true) {
    shell.classList.toggle('sidebar-collapsed', !open);
    sidebar.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Collapse sidebar' : 'Expand sidebar');
    const icon = toggle.querySelector('span');
    if (icon) icon.textContent = open ? '‹' : '›';
    if (sidebarPreference) sidebarPreference.checked = open;
    if (persist) writeStorage('ragged-sidebar-open', String(open));
  }

  toggle.addEventListener('click', () => {
    setSidebarOpen(shell.classList.contains('sidebar-collapsed'));
  });

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
    if (sectionTitle) sectionTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
    if (updateHash && location.hash !== `#${section}`) history.replaceState(null, '', `#${section}`);
  }

  navLinks.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    showSection(link.dataset.section);
    if (matchMedia('(max-width: 620px)').matches) setSidebarOpen(false);
  }));

  const brand = sidebar.querySelector('.brand');
  brand?.addEventListener('click', (event) => {
    event.preventDefault();
    showSection('browser');
  });

  sidebarPreference?.addEventListener('change', () => setSidebarOpen(sidebarPreference.checked));
  window.addEventListener('hashchange', () => showSection(location.hash.slice(1), false));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !shell.classList.contains('sidebar-collapsed')) setSidebarOpen(false);
  });

  setSidebarOpen(readStorage('ragged-sidebar-open', 'true') !== 'false', false);
  showSection(location.hash.slice(1) || 'browser', false);
})();
