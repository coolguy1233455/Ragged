(() => {
  const shell = document.querySelector('.client-shell');
  const toggle = document.getElementById('sidebarToggle');
  const sections = document.querySelectorAll('[data-view]');
  const navLinks = document.querySelectorAll('.nav-item[data-section]');
  const sectionTitle = document.getElementById('sectionTitle');

  toggle.addEventListener('click', () => {
    const collapsed = shell.classList.toggle('sidebar-collapsed');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Open sidebar' : 'Close sidebar');
  });

  navLinks.forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    const target = link.dataset.section;
    sections.forEach((section) => section.classList.toggle('visible', section.dataset.view === target));
    navLinks.forEach((item) => {
      const active = item === link;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    sectionTitle.textContent = target === 'ai' ? 'AI' : 'Browser';
    history.replaceState(null, '', `#${target}`);
  }));
})();
