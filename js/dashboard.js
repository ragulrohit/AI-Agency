/* =========================================================
   Stackly AI Agency — Dashboard shell & interactions
   Demo data is stored in localStorage and clearly labelled.
   ========================================================= */
(function () {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const page = document.body.dataset.page || 'overview';
  const SESSION_KEY = 'stackly_user';
  const PROJECTS_KEY = 'stackly_demo_projects';
  const TEAM_KEY = 'stackly_demo_team';
  const NOTIFS_KEY = 'stackly_demo_notifications';
  const PREFS_KEY = 'stackly_demo_prefs';
  const TASKS_KEY = 'stackly_demo_tasks';
  const SIDEBAR_KEY = 'stackly_sidebar_collapsed';

  /* ---------- Session guard ---------- */
  let session = null;
  try {
    session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch (_) {
    session = null;
  }
  if (!session || !session.email) {
    const next = window.location.pathname.split('/').pop() || 'dashboard.html';
    window.location.replace(`login.html?next=${encodeURIComponent(next)}`);
    return;
  }

  let userName = session.name || session.email.split('@')[0];
  let userEmail = session.email;
  let firstName = userName.trim().split(/\s+/)[0] || 'there';
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Utilities ---------- */
  const esc = (value) => {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  };
  const readJSON = (key, fallback) => {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  };
  const writeJSON = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* storage may be full */ }
  };

  /* ---------- Custom select controls ---------- */
  function closeCustomSelects(except) {
    $$('.custom-select-menu.open').forEach((menu) => {
      if (menu !== except) {
        menu.classList.remove('open');
        const trigger = menu._customTrigger || menu.closest('.custom-select')?.querySelector('.custom-select-trigger');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function enhanceCustomSelects(root = document) {
    $$('select:not([data-custom-select])', root).forEach((select) => {
      select.dataset.customSelect = 'true';
      const wrapper = document.createElement('div');
      wrapper.className = `custom-select${select.classList.contains('form-control') ? ' custom-select-form' : ''}`;
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = `custom-select-trigger ${select.classList.contains('form-control') ? 'form-control' : 'dash-control'}`;
      trigger.setAttribute('aria-haspopup', 'listbox');
      trigger.setAttribute('aria-expanded', 'false');
      const menu = document.createElement('div');
      menu.className = 'custom-select-menu';
      menu.setAttribute('role', 'listbox');
      menu.dataset.portal = 'true';
      menu._customTrigger = trigger;

      const sync = () => {
        const option = select.options[select.selectedIndex];
        trigger.innerHTML = `<span>${esc(option ? option.textContent : '')}</span><span class="custom-select-chevron" aria-hidden="true">⌄</span>`;
        Array.from(menu.children).forEach((item) => item.setAttribute('aria-selected', String(item.dataset.value === select.value)));
      };

      Array.from(select.options).forEach((option) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'custom-select-option';
        item.dataset.value = option.value;
        item.setAttribute('role', 'option');
        item.textContent = option.textContent;
        item.addEventListener('click', () => {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          sync();
          menu.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        });
        menu.appendChild(item);
      });

      const toggleSelect = () => {
        const opening = !menu.classList.contains('open');
        closeCustomSelects(menu);
        menu.classList.toggle('open', opening);
        trigger.setAttribute('aria-expanded', String(opening));
        if (opening) {
          const rect = trigger.getBoundingClientRect();
          const width = Math.max(rect.width, 150);
          const maxLeft = window.innerWidth - width - 8;
          menu.style.width = `${width}px`;
          menu.style.left = `${Math.max(8, Math.min(rect.left, maxLeft))}px`;
          menu.style.top = 'auto';
          menu.style.bottom = 'auto';
          const menuHeight = Math.min(menu.scrollHeight, 280);
          if (rect.bottom + menuHeight + 8 <= window.innerHeight) menu.style.top = `${rect.bottom + 6}px`;
          else menu.style.bottom = `${Math.max(8, window.innerHeight - rect.top + 6)}px`;
        }
      };
      trigger.addEventListener('pointerdown', (event) => {
        if (event.button === 0) {
          event.preventDefault();
          toggleSelect();
        }
      });
      trigger.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggleSelect();
        }
      });
      select.addEventListener('change', sync);
      select.parentNode.insertBefore(wrapper, select);
      wrapper.appendChild(select);
      wrapper.appendChild(trigger);
      document.body.appendChild(menu);
      select.classList.add('custom-select-native');
      sync();
    });
  }

  function closeCustomDates() {
    $$('.custom-date-menu.open').forEach((menu) => {
      menu.classList.remove('open');
      if (menu._customTrigger) menu._customTrigger.setAttribute('aria-expanded', 'false');
    });
  }

  function enhanceCustomDateInputs(root = document) {
    $$('input[type="date"]:not([data-custom-date])', root).forEach((input) => {
      input.dataset.customDate = 'true';
      const wrapper = document.createElement('div');
      wrapper.className = 'custom-date custom-select-form';
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'custom-date-trigger form-control';
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-expanded', 'false');
      const menu = document.createElement('div');
      menu.className = 'custom-date-menu';
      menu.dataset.portal = 'true';
      menu._customTrigger = trigger;
      let view = input.value ? new Date(`${input.value}T12:00:00`) : new Date();

      const pad = (value) => String(value).padStart(2, '0');
      const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      const display = () => {
        if (!input.value) return 'Select due date';
        return new Date(`${input.value}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      };
      const render = () => {
        const year = view.getFullYear();
        const month = view.getMonth();
        const first = new Date(year, month, 1);
        const days = new Date(year, month + 1, 0).getDate();
        const start = first.getDay();
        const cells = [];
        for (let i = 0; i < start; i += 1) cells.push('<span class="custom-date-empty"></span>');
        for (let day = 1; day <= days; day += 1) {
          const value = iso(new Date(year, month, day));
          cells.push(`<button type="button" class="custom-date-day${input.value === value ? ' selected' : ''}" data-date="${value}">${day}</button>`);
        }
        menu.innerHTML = `<div class="custom-date-head"><button type="button" class="custom-date-nav" data-month="prev" aria-label="Previous month">‹</button><strong>${view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</strong><button type="button" class="custom-date-nav" data-month="next" aria-label="Next month">›</button></div><div class="custom-date-weekdays"><span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span></div><div class="custom-date-grid">${cells.join('')}</div><button type="button" class="custom-date-today">Today</button>`;
        trigger.innerHTML = `<span>${display()}</span><span class="custom-select-chevron" aria-hidden="true">⌄</span>`;
        $$('.custom-date-day', menu).forEach((day) => day.addEventListener('click', () => {
          input.value = day.dataset.date;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          render();
          menu.classList.remove('open');
          trigger.setAttribute('aria-expanded', 'false');
        }));
        $('.custom-date-nav[data-month="prev"]', menu).addEventListener('click', () => { view = new Date(year, month - 1, 1); render(); });
        $('.custom-date-nav[data-month="next"]', menu).addEventListener('click', () => { view = new Date(year, month + 1, 1); render(); });
        $('.custom-date-today', menu).addEventListener('click', () => { input.value = iso(new Date()); input.dispatchEvent(new Event('change', { bubbles: true })); view = new Date(); render(); });
      };
      trigger.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        const opening = !menu.classList.contains('open');
        closeCustomSelects();
        closeCustomDates();
        menu.classList.toggle('open', opening);
        trigger.setAttribute('aria-expanded', String(opening));
        if (opening) {
          const rect = trigger.getBoundingClientRect();
          menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 276))}px`;
          menu.style.top = rect.bottom + 6 + 'px';
          if (rect.bottom + 330 > window.innerHeight) { menu.style.top = 'auto'; menu.style.bottom = `${Math.max(8, window.innerHeight - rect.top + 6)}px`; }
        }
      });
      input.parentNode.insertBefore(wrapper, input);
      wrapper.appendChild(input);
      wrapper.appendChild(trigger);
      document.body.appendChild(menu);
      input.classList.add('custom-date-native');
      render();
    });
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('.custom-select')) closeCustomSelects();
  });
  document.addEventListener('pointerdown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.custom-select') && !target?.closest('.custom-select-menu')) closeCustomSelects();
    if (!target?.closest('.custom-date') && !target?.closest('.custom-date-menu')) closeCustomDates();
  }, true);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeCustomSelects(); closeCustomDates(); }
  });
  window.addEventListener('resize', () => closeCustomSelects());
  const initials = (name) => {
    const parts = String(name || 'Stackly User').trim().split(/\s+/);
    return ((parts[0] || 'S')[0] + (parts.length > 1 ? (parts[parts.length - 1] || '')[0] : '')).toUpperCase();
  };
  const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value + 'T12:00:00');
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const timeAgo = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const toast = (title, text, type = 'success') => {
    if (window.Stackly && window.Stackly.toast) {
      window.Stackly.toast(title, text, type);
    } else {
      const stack = $('.toast-stack') || (() => {
        const el = document.createElement('div');
        el.className = 'toast-stack';
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
        return el;
      })();
      const el = document.createElement('div');
      el.className = `toast ${type}`;
      el.innerHTML = `<div><strong>${esc(title)}</strong><p>${esc(text || '')}</p></div>`;
      stack.appendChild(el);
      setTimeout(() => el.remove(), 4200);
    }
  };

  /* ---------- Inline SVG icon set ---------- */
  const ICON_PATHS = {
    overview: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
    analytics: '<path d="M3 3v18h18"/><path d="m7 14 3-4 4 3 5-7"/>',
    tools: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z"/><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z"/>',
    projects: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    team: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    reports: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21h-4v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06a1.7 1.7 0 0 0 .34-1.88 1.7 1.7 0 0 0-1.55-1H3v-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06a1.7 1.7 0 0 0 1.88.34 1.7 1.7 0 0 0 1-1.55V3h4v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1H21v4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>',
    notifications: '<path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M5 12l7 7 7-7"/>',
    dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M8 13h.01M16 13h.01M9 17h6"/><path d="M2 12h2M20 12h2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
    play: '<path d="m5 3 14 9-14 9Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/>',
    clipboard: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
    pulse: '<path d="M2 12h4l3-8 6 16 3-8h4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    zap: '<path d="M13 2 3 14h8l-1 8 10-12h-8Z"/>',
    brain: '<path d="M12 3a4 4 0 0 0-4 4v1a4 4 0 0 0 0 8v1a4 4 0 0 0 8 0v-1a4 4 0 0 0 0-8V7a4 4 0 0 0-4-4Z"/><path d="M9 9h6M9 15h6"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/>',
    code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    bellOff: '<path d="M8.7 3A6 6 0 0 1 18 8c0 2.1.3 3.8.8 5M6 8c0 7-3 9-3 9h13M3 3l18 18"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'
  };
  const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ICON_PATHS.overview}</svg>`;

  const avatarHTML = (name, cls = 'avatar') => `<span class="${cls}" aria-hidden="true">${esc(initials(name))}</span>`;

  /* ---------- Demo data ---------- */
  const defaultProjects = [
    { id: 'p1', name: 'Atlas Support Copilot', category: 'Automation', owner: 'Maya Chen', progress: 78, status: 'in-progress', due: '2026-11-12', client: 'Northstar Financial', color: '#7c5cff' },
    { id: 'p2', name: 'Revenue Signal Engine', category: 'Analytics', owner: 'Daniel Okafor', progress: 54, status: 'in-progress', due: '2026-12-02', client: 'Luma Commerce', color: '#22d3ee' },
    { id: 'p3', name: 'Onboarding Flow AI', category: 'Automation', owner: 'Priya Raman', progress: 100, status: 'completed', due: '2026-10-10', client: 'Atlas Health', color: '#38d996' },
    { id: 'p4', name: 'Content Intelligence', category: 'AI Tools', owner: 'Sofia Almeida', progress: 31, status: 'planning', due: '2027-01-18', client: 'Halo Studios', color: '#ff4ecd' },
    { id: 'p5', name: 'Risk Review Assistant', category: 'Machine Learning', owner: 'Arun Mehta', progress: 66, status: 'review', due: '2026-11-28', client: 'Northstar Financial', color: '#ff9f68' },
    { id: 'p6', name: 'Churn Predictor v2', category: 'Predictive Analytics', owner: 'Daniel Okafor', progress: 88, status: 'active', due: '2026-11-05', client: 'Luma Commerce', color: '#3b82f6' },
    { id: 'p7', name: 'Vendor Document Agent', category: 'Document AI', owner: 'Maya Chen', progress: 42, status: 'at-risk', due: '2026-12-15', client: 'Meridian Group', color: '#a78bfa' }
  ];

  const defaultTeam = [
    { id: 't1', name: 'Maya Chen', role: 'Experience Design Lead', department: 'Design', project: 'Atlas Support Copilot', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', skills: ['Product design', 'Research', 'AI UX'] },
    { id: 't2', name: 'Daniel Okafor', role: 'Principal ML Engineer', department: 'Engineering', project: 'Revenue Signal Engine', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', skills: ['Python', 'LLMs', 'MLOps'] },
    { id: 't3', name: 'Priya Raman', role: 'Delivery & Change Lead', department: 'Strategy', project: 'Onboarding Flow AI', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80', skills: ['Delivery', 'Change', 'Strategy'] },
    { id: 't4', name: 'Arun Mehta', role: 'Founder & AI Strategist', department: 'Strategy', project: 'Risk Review Assistant', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80', skills: ['AI strategy', 'Governance', 'ROI'] },
    { id: 't5', name: 'Sofia Almeida', role: 'AI Product Designer', department: 'Design', project: 'Content Intelligence', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', skills: ['Design systems', 'Prototyping', 'Content'] },
    { id: 't6', name: 'Noah Williams', role: 'Automation Engineer', department: 'Engineering', project: 'Vendor Document Agent', image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80', skills: ['n8n', 'APIs', 'Workflow'] }
  ];

  const defaultNotifications = [
    { id: 'n1', title: 'AI agent run completed', message: 'Atlas Support Copilot resolved 142 tickets with a 94% helpfulness score.', type: 'success', at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), read: false },
    { id: 'n2', title: 'New report is ready', message: 'Monthly AI Performance Report for October is ready to review and export.', type: 'info', at: new Date(Date.now() - 1000 * 60 * 78).toISOString(), read: false },
    { id: 'n3', title: 'Review requested', message: 'Risk Review Assistant needs human approval before the next deployment.', type: 'warning', at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), read: false },
    { id: 'n4', title: 'Project milestone reached', message: 'Onboarding Flow AI moved into adoption tracking with the client team.', type: 'success', at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), read: true },
    { id: 'n5', title: 'Weekly digest', message: 'Your team saved 47 hours across 12 automated workflows this week.', type: 'info', at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), read: true },
    { id: 'n6', title: 'Security check passed', message: 'The demo workspace integrity check completed with no issues.', type: 'success', at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), read: true }
  ];

  const tools = [
    { id: 'prompt-studio', name: 'Prompt Studio', category: 'Content', iconName: 'message', color: '#7c5cff', bg: 'rgba(124,92,255,.13)', desc: 'Turn a rough brief into a structured, reusable prompt with role, context, constraints, and output format.', price: 'Demo tool', output: (input) => `ROLE\nYou are a senior ${input ? input.slice(0, 90) : 'AI operations specialist'}.\n\nCONTEXT\nExplain the business context, audience, and data available here.\n\nTASK\nDescribe the specific outcome you need. Break it into numbered steps and state what good looks like.\n\nGUARDRAILS\n- Cite sources when facts are involved.\n- Ask for missing information instead of inventing it.\n- Keep the answer concise and action-oriented.\n\nOUTPUT FORMAT\n1. Executive summary\n2. Recommended actions\n3. Risks / unknowns` },
    { id: 'data-summarizer', name: 'Data Summarizer', category: 'Data', iconName: 'chart', color: '#22d3ee', bg: 'rgba(34,211,238,.12)', desc: 'Paste notes or a dataset description and get a demo summary with themes, counts, and suggested next questions.', price: 'Demo tool', output: (input) => {
      const words = input.trim() ? input.trim().split(/\s+/).length : 0;
      return `DEMO SUMMARY\nWords analysed: ${words}\n\nKey signals\n• The input focuses on operational reporting and decision speed.\n• Two recurring themes were identified: data quality and human review.\n• Suggested next question: which metric changes fastest if this workflow is automated?\n\nNote: this is a deterministic local demo, not a live AI inference.`;
    } },
    { id: 'support-copilot', name: 'Support Copilot', category: 'CX', iconName: 'bot', color: '#ff4ecd', bg: 'rgba(255,78,205,.11)', desc: 'Draft an empathetic, concise support reply grounded in your pasted policy or context.', price: 'Demo tool', output: (input) => `DRAFT REPLY\n\nHi there,\n\nThank you for reaching out${input ? ` about "${input.slice(0, 70)}${input.length > 70 ? '…' : ''}"` : ''}. I understand how frustrating this is, and I want to help you get it sorted quickly.\n\nHere is what I can do next:\n1. Confirm the account or order details.\n2. Review the available resolution options.\n3. Follow up with a clear timeline.\n\nIf this needs a human specialist, I will escalate it with full context.\n\nWarmly,\nStackly Support (demo draft)` },
    { id: 'content-repurposer', name: 'Content Repurposer', category: 'Content', iconName: 'layers', color: '#ff9f68', bg: 'rgba(255,159,104,.12)', desc: 'Turn one idea into a LinkedIn post, email hook, and short-form video outline.', price: 'Demo tool', output: (input) => {
      const idea = input || 'Why AI pilots fail without workflow ownership';
      return `SOURCE IDEA\n${idea}\n\nLINKEDIN POST\nMost AI pilots don't fail because of the model. They fail because nobody owns the workflow after launch. Start with the person who feels the pain, define one metric, and give them the keys.\n\nEMAIL HOOK\nSubject: The missing owner in your AI pilot\n\nSHORT VIDEO OUTLINE\n1. Hook: the demo looked great.\n2. Tension: six weeks later, no one uses it.\n3. Fix: name the workflow owner before you build.`;
    } },
    { id: 'meeting-actions', name: 'Meeting → Actions', category: 'Productivity', iconName: 'clipboard', color: '#38d996', bg: 'rgba(56,217,150,.1)', desc: 'Convert pasted meeting notes into owners, decisions, and next steps.', price: 'Demo tool', output: (input) => `MEETING EXTRACT (DEMO)\n\nDecisions\n• Proceed with the onboarding automation pilot.\n• Keep human review on high-risk documents.\n\nActions\n• [ ] Confirm data-access scope — owner: Maya — due: Friday\n• [ ] Draft evaluation rubric — owner: Daniel — due: next Tuesday\n• [ ] Schedule client enablement — owner: Priya — due: 3 days\n\nSource note: ${input ? input.slice(0, 110) + '…' : 'No notes supplied; sample output shown.'}` },
    { id: 'sql-assistant', name: 'SQL Assistant', category: 'Engineering', iconName: 'database', color: '#3b82f6', bg: 'rgba(59,130,246,.12)', desc: 'Describe a question in plain language and get a demo SQL pattern with safety notes.', price: 'Demo tool', output: (input) => `-- Demo query pattern (review before running)\nSELECT\n  DATE_TRUNC('month', created_at) AS month,\n  status,\n  COUNT(*) AS project_count,\n  ROUND(AVG(progress), 1) AS avg_progress\nFROM projects\nWHERE created_at >= NOW() - INTERVAL '90 days'\nGROUP BY 1, 2\nORDER BY 1 DESC, 3 DESC;\n\n-- Request: ${input || 'Project progress by month and status'}\n-- Safety: read-only demo; validate table names and access controls first.` },
    { id: 'persona-builder', name: 'Persona Builder', category: 'Strategy', iconName: 'target', color: '#a78bfa', bg: 'rgba(167,139,250,.12)', desc: 'Create a practical customer persona with goals, objections, and AI use-case fit.', price: 'Demo tool', output: (input) => `PERSONA (DEMO)\nName: Operations Olivia\nRole: COO at a 120-person services business\n\nGoals\n• Reduce manual handoffs without losing quality.\n• Get trustworthy weekly performance visibility.\n\nObjections\n• "Will the team actually use it?"\n• "How do we know the output is correct?"\n\nAI fit\nHigh for document intake, status updates, and weekly reporting. Human approval required for customer commitments.\n\nContext supplied: ${input || 'B2B services operations leader'}` },
    { id: 'workflow-mapper', name: 'Workflow Mapper', category: 'Operations', iconName: 'pulse', color: '#baf94d', bg: 'rgba(186,249,77,.1)', desc: 'Sketch an automation-ready workflow with steps, owners, and human checkpoints.', price: 'Demo tool', output: (input) => `WORKFLOW MAP (DEMO)\nTrigger: ${input || 'New client request received'}\n\n1. Capture request → intake form (owner: client)\n2. Validate required fields → rules engine (owner: automation)\n3. Enrich with CRM data → API (owner: automation)\n4. Risk check → AI draft (owner: AI, human review required)\n5. Approve or edit → account owner (human checkpoint)\n6. Send confirmation → email integration\n7. Log outcome → reporting table\n\nMetrics: cycle time, rework rate, approval SLA.` }
  ];

  const reports = [
    { id: 'r1', title: 'Monthly AI Performance Report', period: 'October 2026', type: 'Performance', size: '1.8 MB', status: 'Ready' },
    { id: 'r2', title: 'Revenue Impact Analysis', period: 'Q3 2026', type: 'Revenue', size: '2.3 MB', status: 'Ready' },
    { id: 'r3', title: 'Automation Savings Summary', period: 'September 2026', type: 'Efficiency', size: '980 KB', status: 'Ready' },
    { id: 'r4', title: 'Support Automation Quality', period: 'Last 30 days', type: 'Quality', size: '1.1 MB', status: 'Ready' },
    { id: 'r5', title: 'Executive Board Pack', period: 'October 2026', type: 'Executive', size: '3.4 MB', status: 'Draft' }
  ];

  const statusLabels = {
    'in-progress': 'In Progress',
    completed: 'Completed',
    planning: 'Planning',
    review: 'In Review',
    active: 'Active',
    'at-risk': 'At Risk'
  };

  const hasStoredProjects = localStorage.getItem(PROJECTS_KEY) !== null;
  const hasStoredTeam = localStorage.getItem(TEAM_KEY) !== null;
  const hasStoredNotifications = localStorage.getItem(NOTIFS_KEY) !== null;
  let projects = readJSON(PROJECTS_KEY, defaultProjects.slice());
  if (!hasStoredProjects || !Array.isArray(projects)) { projects = defaultProjects.slice(); writeJSON(PROJECTS_KEY, projects); }
  let team = readJSON(TEAM_KEY, defaultTeam.slice());
  if (!hasStoredTeam || !Array.isArray(team)) { team = defaultTeam.slice(); writeJSON(TEAM_KEY, team); }
  let notifications = readJSON(NOTIFS_KEY, defaultNotifications.slice());
  if (!hasStoredNotifications || !Array.isArray(notifications)) { notifications = defaultNotifications.slice(); writeJSON(NOTIFS_KEY, notifications); }
  let prefs = Object.assign({
    theme: 'midnight',
    emailNotif: true,
    productNotif: true,
    weeklyDigest: false
  }, readJSON(PREFS_KEY, {}));

  const saveProjects = () => writeJSON(PROJECTS_KEY, projects);
  const saveTeam = () => writeJSON(TEAM_KEY, team);
  const saveNotifications = () => writeJSON(NOTIFS_KEY, notifications);
  const savePrefs = () => writeJSON(PREFS_KEY, prefs);

  /* ---------- Theme ---------- */
  function resolvedTheme(value) {
    if (value === 'auto') {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'midnight';
    }
    return value === 'light' ? 'light' : 'midnight';
  }
  function applyTheme(value = prefs.theme) {
    document.body.dataset.dashTheme = resolvedTheme(value);
    const button = $('#quickThemeBtn');
    if (button) {
      button.innerHTML = resolvedTheme(value) === 'light' ? icon('moon', 17) : icon('sun', 17);
      button.setAttribute('aria-label', resolvedTheme(value) === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    }
  }
  function updateThemeQuickButton() {
    applyTheme();
  }

  /* ---------- Sidebar ---------- */
  const navItems = [
    { id: 'overview', label: 'Overview', href: 'dashboard.html', icon: 'overview' },
    { id: 'analytics', label: 'Analytics', href: 'analytics.html', icon: 'analytics' },
    { id: 'ai-tools', label: 'AI Tools', href: 'ai-tools.html', icon: 'tools' },
    { id: 'projects', label: 'Projects', href: 'projects.html', icon: 'projects' },
    { id: 'team', label: 'Team', href: 'team.html', icon: 'team' },
    { id: 'reports', label: 'Reports', href: 'reports.html', icon: 'reports' },
    { id: 'settings', label: 'Settings', href: 'settings.html', icon: 'settings' },
    { id: 'notifications', label: 'Notifications', href: 'notifications.html', icon: 'notifications' }
  ];

  function renderSidebar() {
    const root = $('#dashSidebar');
    if (!root) return;
    const links = navItems.map((item) => {
      const active = page === item.id;
      const badge = item.id === 'notifications' ? '<span class="side-badge" id="sideNotifBadge">0</span>' : '';
      return `<a class="dash-side-link${active ? ' active' : ''}" href="${item.href}"${active ? ' aria-current="page"' : ''}>${icon(item.icon, 18)}<span class="side-link-label">${item.label}</span>${badge}</a>`;
    }).join('');
    root.innerHTML = `
      <div class="side-header">
        <a class="brand" href="index.html" aria-label="Stackly AI Agency website">
          <img class="stackly-logo-image" src="assets/images/stackly-logo.webp" alt="Stackly">
        </a>
        <button class="side-collapse" id="sidebarCollapse" type="button" aria-label="Minimize dashboard sidebar">×</button>
      </div>
      <div class="side-user">
        ${avatarHTML(userName)}
        <div><strong data-user-name>${esc(userName)}</strong><small data-user-email>${esc(userEmail)}</small></div>
      </div>
      <nav class="side-nav" aria-label="Dashboard navigation">
        <div class="side-section-label">Workspace</div>
        ${links}
      </nav>
      <div class="side-footer">
        <div class="side-demo-note">Demo workspace · data stays in this browser</div>
        <button class="side-logout" id="sideLogoutBtn" type="button">${icon('logout', 17)}<span>Logout</span></button>
      </div>`;
  }

  function renderTopbar() {
    const root = $('#dashTopbar');
    if (!root) return;
    const unread = notifications.filter((item) => !item.read).length;
    root.innerHTML = `
      <button class="sidebar-mobile-toggle" id="sidebarMobileToggle" type="button" aria-label="Toggle dashboard navigation" aria-controls="dashSidebar" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
      <div class="dash-search">
        <form id="globalSearchForm" role="search" autocomplete="off">
          <span class="search-icon">${icon('search', 16)}</span>
          <label class="sr-only" for="globalSearch">Search Stackly dashboard</label>
          <input id="globalSearch" type="search" placeholder="Search projects, tools, people…" aria-label="Search projects, tools, and people" autocomplete="off">
        </form>
        <div class="global-results" id="globalResults" role="listbox" aria-label="Search results"></div>
      </div>
      <div class="topbar-actions">
        <div class="topbar-dropdown">
          <button class="icon-btn" id="notifBtn" type="button" aria-label="Open notifications" aria-haspopup="true" aria-expanded="false">
            ${icon('notifications', 18)}
            <span class="notif-badge${unread ? '' : ' zero'}" id="notifCountBadge">${unread}</span>
          </button>
          <div class="dropdown-panel notification-dropdown" id="notifDropdown" role="menu" aria-label="Notifications">
            <div class="dropdown-head"><strong>Notifications</strong><a href="notifications.html">View all</a></div>
            <div class="notif-preview-list" id="notifPreviewList"></div>
            <div class="dropdown-head" style="border-bottom:0;border-top:1px solid var(--line);margin-top:4px;padding-top:8px;padding-bottom:6px;">
              <button type="button" id="notifMarkAllPreview">Mark all as read</button>
              <a href="notifications.html">Manage</a>
            </div>
          </div>
        </div>
        <button class="icon-btn" id="quickThemeBtn" type="button" aria-label="Switch theme">${icon('sun', 17)}</button>
        <div class="topbar-dropdown">
          <button class="profile-trigger" id="profileBtn" type="button" aria-label="Open account menu" aria-haspopup="true" aria-expanded="false">
            ${avatarHTML(userName)}
            <span class="profile-meta"><strong data-user-name>${esc(userName)}</strong><small data-user-email>${esc(userEmail)}</small></span>
            ${icon('chevron', 13)}
          </button>
          <div class="dropdown-panel profile-dropdown" id="profileDropdown" role="menu" aria-label="Account menu">
            <div class="profile-drop-head">
              ${avatarHTML(userName).replace('class="avatar"', 'class="avatar"')}
              <div><strong data-user-name>${esc(userName)}</strong><small data-user-email>${esc(userEmail)}</small></div>
            </div>
            <div class="dropdown-menu">
              <a class="topbar-dropdown-item" href="dashboard.html">${icon('overview', 16)} Overview</a>
              <a class="topbar-dropdown-item" href="settings.html">${icon('settings', 16)} Account settings</a>
              <a class="topbar-dropdown-item" href="notifications.html">${icon('notifications', 16)} Notifications</a>
              <a class="topbar-dropdown-item" href="contact.html">${icon('mail', 16)} Contact support</a>
              <div class="dropdown-sep"></div>
              <button class="topbar-dropdown-item danger" id="profileLogoutBtn" type="button">${icon('logout', 16)} Logout</button>
            </div>
          </div>
        </div>
      </div>`;
    updateNotificationUI();
  }

  function updateUserChrome() {
    userName = session.name || session.email.split('@')[0];
    userEmail = session.email;
    firstName = userName.trim().split(/\s+/)[0] || 'there';
    $$('[data-user-name]').forEach((el) => { el.textContent = userName; });
    $$('[data-user-email]').forEach((el) => { el.textContent = userEmail; });
    $$('[data-user-first]').forEach((el) => { el.textContent = firstName; });
    $$('.avatar').forEach((el) => { el.textContent = initials(userName); });
    document.title = document.title.replace(/\s—\s.*$/, '') + ' — Stackly AI';
  }

  function fillUserText() {
    $$('[data-user-first]').forEach((el) => { el.textContent = firstName; });
    $$('[data-user-name]').forEach((el) => { el.textContent = userName; });
    $$('[data-user-email]').forEach((el) => { el.textContent = userEmail; });
  }

  /* ---------- Dropdown behavior ---------- */
  function closeDropdowns() {
    $$('.topbar-dropdown .dropdown-panel.open').forEach((panel) => panel.classList.remove('open'));
    $$('.topbar-dropdown [aria-expanded="true"]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
    const results = $('#globalResults');
    if (results) results.classList.remove('open');
  }

  function toggleDropdown(button, panel) {
    if (!button || !panel) return;
    const willOpen = !panel.classList.contains('open');
    closeDropdowns();
    if (willOpen) {
      panel.classList.add('open');
      button.setAttribute('aria-expanded', 'true');
    }
  }

  function bindDropdowns() {
    const profileBtn = $('#profileBtn');
    const profileDropdown = $('#profileDropdown');
    const notifBtn = $('#notifBtn');
    const notifDropdown = $('#notifDropdown');
    if (profileBtn && profileDropdown) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(profileBtn, profileDropdown);
      });
    }
    if (notifBtn && notifDropdown) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleDropdown(notifBtn, notifDropdown);
      });
    }
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.topbar-dropdown') && !e.target.closest('.dash-search')) closeDropdowns();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDropdowns();
    });
  }

  /* ---------- Notifications ---------- */
  function notificationIcon(type) {
    if (type === 'success') return { name: 'check', bg: 'rgba(56,217,150,.11)', color: '#72e9b4' };
    if (type === 'warning') return { name: 'target', bg: 'rgba(255,159,104,.11)', color: '#ffb58e' };
    return { name: 'notifications', bg: 'rgba(34,211,238,.1)', color: '#67e2f5' };
  }

  function updateNotificationUI() {
    const unread = notifications.filter((item) => !item.read).length;
    const badge = $('#notifCountBadge');
    if (badge) {
      badge.textContent = String(unread);
      badge.classList.toggle('zero', unread === 0);
    }
    const sideBadge = $('#sideNotifBadge');
    if (sideBadge) {
      sideBadge.textContent = String(unread);
      sideBadge.style.display = unread ? '' : 'none';
    }
    const preview = $('#notifPreviewList');
    if (preview) {
      const recent = notifications.slice(0, 4);
      preview.innerHTML = recent.length
        ? recent.map((item) => `
          <a class="notif-preview${item.read ? '' : ' unread'}" href="notifications.html">
            <span class="notif-dot" aria-hidden="true"></span>
            <span class="notif-preview-body"><strong>${esc(item.title)}</strong><p>${esc(item.message)}</p><time>${timeAgo(item.at)}</time></span>
          </a>`).join('')
        : '<div class="notif-empty">No notifications yet.</div>';
    }
  }

  function markAllNotificationsRead() {
    let changed = 0;
    notifications = notifications.map((item) => {
      if (!item.read) changed++;
      return { ...item, read: true };
    });
    saveNotifications();
    updateNotificationUI();
    if (page === 'notifications') renderNotificationsPage();
    if (changed) toast('Notifications updated', `${changed} notification${changed === 1 ? '' : 's'} marked as read.`, 'success');
  }

  function bindNotificationActions() {
    const markBtn = $('#notifMarkAllPreview');
    if (markBtn) markBtn.addEventListener('click', markAllNotificationsRead);
  }

  /* ---------- Modal system ---------- */
  let activeModal = null;
  let lastFocusedElement = null;
  let modalKeyHandler = null;

  function ensureModalRoot() {
    let root = $('#modalRoot');
    if (!root) {
      root = document.createElement('div');
      root.id = 'modalRoot';
      document.body.appendChild(root);
    }
    return root;
  }

  function closeModal() {
    if (!activeModal) return;
    const modal = activeModal;
    activeModal = null;
    modal.classList.remove('open');
    document.removeEventListener('keydown', modalKeyHandler);
    document.body.style.overflow = '';
    setTimeout(() => {
      modal.remove();
      if (lastFocusedElement && document.contains(lastFocusedElement)) lastFocusedElement.focus();
    }, 220);
  }

  function openModal(options) {
    if (activeModal) {
      activeModal.classList.remove('open');
    $$('.custom-select-menu[data-portal="true"]').forEach((menu) => menu.remove());
    $$('.custom-date-menu[data-portal="true"]').forEach((menu) => menu.remove());
      activeModal.remove();
      document.removeEventListener('keydown', modalKeyHandler);
    }
    lastFocusedElement = document.activeElement;
    const root = ensureModalRoot();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal-card${options.wide ? ' wide' : ''}${options.className ? ' ' + options.className : ''}" role="dialog" aria-modal="true" aria-labelledby="activeModalTitle">
        <button class="modal-close" type="button" aria-label="Close dialog">${icon('close', 16)}</button>
        ${options.icon ? `<div class="modal-icon"${options.iconStyle || ''}>${icon(options.icon, 22)}</div>` : ''}
        <h2 id="activeModalTitle">${options.title}</h2>
        ${options.description ? `<p>${options.description}</p>` : ''}
        ${options.body || ''}
        ${options.actions ? `<div class="modal-actions">${options.actions}</div>` : ''}
      </div>`;
    root.appendChild(backdrop);
    activeModal = backdrop;
    enhanceCustomSelects(backdrop);
    enhanceCustomDateInputs(backdrop);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => backdrop.classList.add('open'));

    const close = () => closeModal();
    $('.modal-close', backdrop).addEventListener('click', close);
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });

    modalKeyHandler = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusables = $$('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])', backdrop)
        .filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', modalKeyHandler);
    setTimeout(() => {
      const firstFocusable = $('button:not(.modal-close), [href], input, select, textarea', backdrop);
      if (firstFocusable) firstFocusable.focus();
      else $('.modal-close', backdrop).focus();
    }, 80);

    if (options.onMount) options.onMount(backdrop, close);
    return { element: backdrop, close };
  }

  function showLogoutModal() {
    openModal({
      title: 'Are you sure you want to log out?',
      description: 'Your demo data will stay in this browser, but you will need to sign in again to access the dashboard.',
      icon: 'logout',
      className: 'confirm-modal',
      actions: `
        <button class="dash-btn" type="button" id="cancelLogout">Cancel</button>
        <button class="dash-btn primary" type="button" id="confirmLogout">Yes, Logout</button>`,
      onMount(modal, close) {
        $('#cancelLogout', modal).addEventListener('click', close);
        $('#confirmLogout', modal).addEventListener('click', () => {
          sessionStorage.removeItem(SESSION_KEY);
          window.location.href = 'login.html';
        });
        setTimeout(() => $('#cancelLogout', modal).focus(), 60);
      }
    });
  }

  function bindLogout() {
    ['#sideLogoutBtn', '#profileLogoutBtn'].forEach((selector) => {
      const button = $(selector);
      if (button) button.addEventListener('click', () => {
        closeDropdowns();
        showLogoutModal();
      });
    });
  }

  /* ---------- Global search ---------- */
  function searchIndex() {
    const pages = navItems.map((item) => ({ title: item.label, subtitle: 'Dashboard page', href: item.href, type: 'Page' }));
    const projectItems = projects.map((project) => ({ title: project.name, subtitle: project.client + ' · ' + project.category, href: 'projects.html', type: 'Project' }));
    const toolItems = tools.map((tool) => ({ title: tool.name, subtitle: tool.category + ' tool', href: 'ai-tools.html', type: 'Tool' }));
    const teamItems = team.map((member) => ({ title: member.name, subtitle: member.role, href: 'team.html', type: 'Team' }));
    return pages.concat(projectItems, toolItems, teamItems);
  }

  function renderSearchResults(query) {
    const box = $('#globalResults');
    if (!box) return;
    const value = query.trim().toLowerCase();
    if (!value) {
      box.innerHTML = '';
      box.classList.remove('open');
      return;
    }
    const matches = searchIndex().filter((item) => `${item.title} ${item.subtitle} ${item.type}`.toLowerCase().includes(value)).slice(0, 7);
    box.innerHTML = matches.length
      ? matches.map((item) => `<a href="${item.href}" role="option"><span>${icon(item.type === 'Project' ? 'projects' : item.type === 'Tool' ? 'tools' : item.type === 'Team' ? 'team' : 'overview', 15)}</span><span><strong>${esc(item.title)}</strong> <small style="color:var(--muted);font-size:.68rem;">${esc(item.subtitle)}</small></span><span class="result-type">${esc(item.type)}</span></a>`).join('')
      : '<div class="no-results">No matches. Try “projects”, “analytics”, or a team member.</div>';
    box.classList.add('open');
  }

  function bindGlobalSearch() {
    const input = $('#globalSearch');
    const form = $('#globalSearchForm');
    if (!input || !form) return;
    input.addEventListener('input', () => renderSearchResults(input.value));
    input.addEventListener('focus', () => { if (input.value.trim()) renderSearchResults(input.value); });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const first = $('#globalResults a');
      if (first) window.location.href = first.getAttribute('href');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        input.focus();
      }
      if (e.key === 'Escape') {
        const results = $('#globalResults');
        if (results) results.classList.remove('open');
      }
    });
  }

  /* ---------- Sidebar mobile & collapse ---------- */
  function ensureOverlay() {
    let overlay = $('#sidebarOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.id = 'sidebarOverlay';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function closeMobileSidebar() {
    const sidebar = $('#dashSidebar');
    const overlay = $('#sidebarOverlay');
    const toggle = $('#sidebarMobileToggle');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('show');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = activeModal ? 'hidden' : '';
  }

  function bindSidebar() {
    const overlay = ensureOverlay();
    const toggle = $('#sidebarMobileToggle');
    const collapse = $('#sidebarCollapse');
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored === 'true' && window.innerWidth > 1100) document.body.classList.add('sidebar-collapsed');

    if (toggle) {
      toggle.addEventListener('click', () => {
        const sidebar = $('#dashSidebar');
        if (window.innerWidth > 1100) {
          const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
          localStorage.setItem(SIDEBAR_KEY, String(isCollapsed));
          toggle.setAttribute('aria-expanded', String(!isCollapsed));
          return;
        }
        const isOpen = sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('show', isOpen);
        toggle.setAttribute('aria-expanded', String(isOpen));
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });
    }
    if (collapse) {
      collapse.addEventListener('click', () => {
        if (window.innerWidth <= 1100) {
          closeMobileSidebar();
          return;
        }
        document.body.classList.toggle('sidebar-collapsed');
        localStorage.setItem(SIDEBAR_KEY, String(document.body.classList.contains('sidebar-collapsed')));
      });
    }
    overlay.addEventListener('click', closeMobileSidebar);
    $$('.dash-side-link').forEach((link) => link.addEventListener('click', () => {
      if (window.innerWidth <= 1100) closeMobileSidebar();
    }));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMobileSidebar();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1100) closeMobileSidebar();
    });
    const quickTheme = $('#quickThemeBtn');
    if (quickTheme) {
      quickTheme.addEventListener('click', () => {
        prefs.theme = resolvedTheme(prefs.theme) === 'light' ? 'midnight' : 'light';
        savePrefs();
        applyTheme();
        toast('Theme changed', `${prefs.theme === 'light' ? 'Light' : 'Midnight'} theme applied.`, 'info');
      });
    }
  }

  /* ---------- Project helpers ---------- */
  function projectStatusBadge(status) {
    return `<span class="badge ${status}">${statusLabels[status] || status}</span>`;
  }

  function projectRows() {
    return projects.map((project) => `
      <tr>
        <td><div class="table-primary"><span class="project-dot" style="background:${project.color || '#7c5cff'}">${esc(initials(project.name))}</span><div><strong>${esc(project.name)}</strong><small>${esc(project.client || project.category)}</small></div></div></td>
        <td>${esc(project.owner)}</td>
        <td>${projectStatusBadge(project.status)}</td>
        <td><div class="progress-row"><div class="progress"><span style="width:${Number(project.progress) || 0}%"></span></div><small>${Number(project.progress) || 0}%</small></div></td>
        <td>${formatDate(project.due)}</td>
        <td><div class="table-actions">
          <button class="table-action" type="button" data-project-edit="${project.id}" aria-label="Edit ${esc(project.name)}">${icon('edit', 14)}</button>
          <button class="table-action danger" type="button" data-project-delete="${project.id}" aria-label="Delete ${esc(project.name)}">${icon('trash', 14)}</button>
        </div></td>
      </tr>`).join('');
  }

  function renderOverviewProjects() {
    const body = $('#recentProjectsBody');
    if (!body) return;
    body.innerHTML = projectRows();
  }

  function projectCard(project) {
    return `<article class="project-card-item">
      <div class="project-card-top">
        <span class="project-card-icon" style="background:${project.color || '#7c5cff'}">${esc(initials(project.name))}</span>
        ${projectStatusBadge(project.status)}
      </div>
      <h3>${esc(project.name)}</h3>
      <div class="project-owner">${esc(project.client || 'Client project')} · Owner ${esc(project.owner)}</div>
      <div class="progress-row"><div class="progress"><span style="width:${Number(project.progress) || 0}%"></span></div><small>${Number(project.progress) || 0}%</small></div>
      <div class="project-card-meta">
        <small>Due ${formatDate(project.due)}</small>
        <span class="tool-category">${esc(project.category)}</span>
      </div>
      <div class="project-card-actions">
        <button class="table-action" type="button" data-project-edit="${project.id}" aria-label="Edit ${esc(project.name)}">${icon('edit', 14)}</button>
        <button class="table-action danger" type="button" data-project-delete="${project.id}" aria-label="Delete ${esc(project.name)}">${icon('trash', 14)}</button>
      </div>
    </article>`;
  }

  function renderProjectsPage() {
    const cards = $('#projectsCardGrid');
    const tableBody = $('#projectsTableBody');
    if (!cards && !tableBody) return;
    const search = ($('#projectSearch') && $('#projectSearch').value.trim().toLowerCase()) || '';
    const filter = $('.filter-tab.active[data-project-filter]');
    const filterValue = filter ? filter.dataset.projectFilter : 'All';
    const filtered = projects.filter((project) => {
      const matchesSearch = !search || `${project.name} ${project.owner} ${project.client} ${project.category}`.toLowerCase().includes(search);
      const matchesFilter = filterValue === 'All' || project.status === filterValue || project.category === filterValue;
      return matchesSearch && matchesFilter;
    });
    if (cards) {
      cards.innerHTML = filtered.length ? filtered.map(projectCard).join('') : '<div class="empty-state"><strong>No projects found</strong>Try a different filter or create a new project.</div>';
    }
    if (tableBody) {
      tableBody.innerHTML = filtered.length ? filtered.map((project) => `
        <tr>
          <td><div class="table-primary"><span class="project-dot" style="background:${project.color || '#7c5cff'}">${esc(initials(project.name))}</span><div><strong>${esc(project.name)}</strong><small>${esc(project.client || project.category)}</small></div></div></td>
          <td>${esc(project.owner)}</td>
          <td>${esc(project.category)}</td>
          <td>${projectStatusBadge(project.status)}</td>
          <td><div class="progress-row"><div class="progress"><span style="width:${Number(project.progress) || 0}%"></span></div><small>${Number(project.progress) || 0}%</small></div></td>
          <td>${formatDate(project.due)}</td>
          <td><div class="table-actions">
            <button class="table-action" type="button" data-project-edit="${project.id}" aria-label="Edit ${esc(project.name)}">${icon('edit', 14)}</button>
            <button class="table-action danger" type="button" data-project-delete="${project.id}" aria-label="Delete ${esc(project.name)}">${icon('trash', 14)}</button>
          </div></td>
        </tr>`).join('') : '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--muted);">No projects match this view.</td></tr>';
    }
    const count = $('#projectCountLabel');
    if (count) count.textContent = `${filtered.length} of ${projects.length} projects`;
  }

  function openProjectForm(project = null) {
    const isEdit = Boolean(project);
    openModal({
      title: isEdit ? 'Edit project' : 'Add a new project',
      description: isEdit ? 'Update the project details below. Changes are saved to this demo browser.' : 'Create a demo project. In production this would write to your project database through an API.',
      icon: isEdit ? 'edit' : 'folder',
      iconStyle: ' style="background:rgba(124,92,255,.12);color:var(--primary-2);border-color:rgba(124,92,255,.22);"',
      wide: true,
      body: `
        <form id="projectForm" class="modal-form" novalidate>
          <div class="form-grid">
            <div class="form-field" style="grid-column:1/-1;"><label for="projectName">Project name *</label><input class="form-control" id="projectName" name="name" value="${esc(project ? project.name : '')}" placeholder="e.g. Customer onboarding agent" required maxlength="80"><div class="field-hint error" data-error></div></div>
            <div class="form-field"><label for="projectCategory">Category</label><input class="form-control" id="projectCategory" name="category" value="${esc(project ? project.category : 'Automation')}" placeholder="Automation" maxlength="40"></div>
            <div class="form-field"><label for="projectOwner">Owner</label><input class="form-control" id="projectOwner" name="owner" value="${esc(project ? project.owner : userName)}" placeholder="Owner name" maxlength="60"></div>
            <div class="form-field"><label for="projectClient">Client</label><input class="form-control" id="projectClient" name="client" value="${esc(project ? project.client : '')}" placeholder="Client name" maxlength="60"></div>
            <div class="form-field"><label for="projectStatus">Status</label><select class="form-control" id="projectStatus" name="status">${Object.entries(statusLabels).map(([value, label]) => `<option value="${value}"${project && project.status === value ? ' selected' : ''}>${label}</option>`).join('')}</select></div>
            <div class="form-field"><label for="projectProgress">Progress (%)</label><input class="form-control" id="projectProgress" name="progress" type="number" min="0" max="100" value="${project ? project.progress : 15}"></div>
            <div class="form-field"><label for="projectDue">Due date</label><input class="form-control" id="projectDue" name="due" type="date" value="${project ? project.due : ''}"></div>
          </div>
        </form>`,
      actions: `<button class="dash-btn" type="button" id="cancelProjectForm">Cancel</button><button class="dash-btn primary" type="submit" form="projectForm">${isEdit ? 'Save changes' : 'Create project'}</button>`,
      onMount(modal, close) {
        $('#cancelProjectForm', modal).addEventListener('click', close);
        const form = $('#projectForm', modal);
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const nameField = $('#projectName', modal);
          const error = $('[data-error]', nameField.closest('.form-field'));
          if (!nameField.value.trim()) {
            nameField.closest('.form-field').classList.add('invalid');
            error.textContent = 'Project name is required.';
            nameField.focus();
            return;
          }
          const data = {
            name: nameField.value.trim(),
            category: $('#projectCategory', modal).value.trim() || 'Automation',
            owner: $('#projectOwner', modal).value.trim() || userName,
            client: $('#projectClient', modal).value.trim() || 'Internal',
            status: $('#projectStatus', modal).value,
            progress: Math.max(0, Math.min(100, Number($('#projectProgress', modal).value) || 0)),
            due: $('#projectDue', modal).value || new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10)
          };
          if (isEdit) {
            const index = projects.findIndex((item) => item.id === project.id);
            projects[index] = { ...project, ...data };
            toast('Project updated', `${data.name} was updated in this demo workspace.`, 'success');
          } else {
            projects.unshift({ id: 'p' + Date.now(), ...data, color: '#7c5cff' });
            toast('Project created', `${data.name} was added to the demo workspace.`, 'success');
          }
          saveProjects();
          renderProjectsPage();
          renderOverviewProjects();
          updateProjectMetrics();
          close();
        });
      }
    });
  }

  function confirmDeleteProject(id) {
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    openModal({
      title: `Delete “${project.name}”?`,
      description: 'This removes the project from this browser’s demo data. This action cannot be undone.',
      icon: 'trash',
      className: 'confirm-modal',
      actions: `<button class="dash-btn" type="button" id="cancelDelete">Cancel</button><button class="dash-btn danger" type="button" id="confirmDelete">Delete project</button>`,
      onMount(modal, close) {
        $('#cancelDelete', modal).addEventListener('click', close);
        $('#confirmDelete', modal).addEventListener('click', () => {
          projects = projects.filter((item) => item.id !== id);
          saveProjects();
          renderProjectsPage();
          renderOverviewProjects();
          updateProjectMetrics();
          toast('Project deleted', `${project.name} was removed from demo data.`, 'success');
          close();
        });
      }
    });
  }

  function updateProjectMetrics() {
    const total = $('#metricProjects');
    if (total) total.textContent = String(projects.length);
    const active = $('#metricActiveProjects');
    if (active) active.textContent = String(projects.filter((p) => ['active', 'in-progress', 'review'].includes(p.status)).length);
  }

  function bindProjectActions() {
    const handler = (e) => {
      const editBtn = e.target.closest('[data-project-edit]');
      const deleteBtn = e.target.closest('[data-project-delete]');
      if (editBtn) openProjectForm(projects.find((project) => project.id === editBtn.dataset.projectEdit));
      if (deleteBtn) confirmDeleteProject(deleteBtn.dataset.projectDelete);
    };
    document.addEventListener('click', handler);
    const addBtn = $('#addProjectBtn');
    if (addBtn) addBtn.addEventListener('click', () => openProjectForm());
    const search = $('#projectSearch');
    if (search) search.addEventListener('input', renderProjectsPage);
    $$('[data-project-filter]').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('[data-project-filter]').forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        renderProjectsPage();
      });
    });
  }

  /* ---------- Team ---------- */
  function renderTeamPage() {
    const grid = $('#teamCardGrid');
    if (!grid) return;
    const search = ($('#teamSearch') && $('#teamSearch').value.trim().toLowerCase()) || '';
    const filter = $('.filter-tab.active[data-team-filter]');
    const filterValue = filter ? filter.dataset.teamFilter : 'All';
    const filtered = team.filter((member) => {
      const matchesSearch = !search || `${member.name} ${member.role} ${member.department} ${member.project}`.toLowerCase().includes(search);
      const matchesFilter = filterValue === 'All' || member.department === filterValue;
      return matchesSearch && matchesFilter;
    });
    grid.innerHTML = filtered.length ? filtered.map((member) => `
      <article class="team-card-item">
        <div class="team-card-head">
          <img src="${esc(member.image)}" alt="Portrait of ${esc(member.name)}" loading="lazy">
          <div><h3>${esc(member.name)}</h3><p>${esc(member.role)}</p><small>${esc(member.department)}</small></div>
          <div class="team-card-actions"><button class="table-action danger" type="button" data-team-remove="${member.id}" aria-label="Remove ${esc(member.name)}">${icon('trash', 13)}</button></div>
        </div>
        <div class="team-project"><span></span>${esc(member.project || 'Unassigned')}</div>
        <div class="team-skills">${(member.skills || []).map((skill) => `<span class="skill-chip">${esc(skill)}</span>`).join('')}</div>
      </article>`).join('') : '<div class="empty-state"><strong>No team members found</strong>Try a different search or add a new member.</div>';
    const count = $('#teamCountLabel');
    if (count) count.textContent = `${filtered.length} of ${team.length} team members`;
  }

  function openTeamForm() {
    openModal({
      title: 'Add a team member',
      description: 'This adds a demo team record in your browser. Connect your people directory or HR API for production data.',
      icon: 'userPlus',
      iconStyle: ' style="background:rgba(34,211,238,.11);color:var(--cyan);border-color:rgba(34,211,238,.2);"',
      wide: true,
      body: `
        <form id="teamForm" class="modal-form" novalidate>
          <div class="form-grid">
            <div class="form-field"><label for="memberName">Full name *</label><input class="form-control" id="memberName" name="name" placeholder="Alex Morgan" required maxlength="60"><div class="field-hint error" data-error></div></div>
            <div class="form-field"><label for="memberRole">Role</label><input class="form-control" id="memberRole" name="role" placeholder="AI Product Designer" maxlength="60"></div>
            <div class="form-field"><label for="memberDepartment">Department</label><select class="form-control" id="memberDepartment" name="department"><option>Design</option><option>Engineering</option><option>Strategy</option><option>Operations</option><option>Data</option></select></div>
            <div class="form-field"><label for="memberProject">Current project</label><input class="form-control" id="memberProject" name="project" placeholder="Project name" maxlength="70"></div>
            <div class="form-field" style="grid-column:1/-1;"><label for="memberSkills">Skills (comma separated)</label><input class="form-control" id="memberSkills" name="skills" placeholder="AI UX, Research, Prototyping"></div>
            <div class="form-field" style="grid-column:1/-1;"><label for="memberImage">Profile image URL (optional)</label><input class="form-control" id="memberImage" name="image" placeholder="https://images.unsplash.com/…"></div>
          </div>
        </form>`,
      actions: `<button class="dash-btn" type="button" id="cancelTeamForm">Cancel</button><button class="dash-btn primary" type="submit" form="teamForm">Add member</button>`,
      onMount(modal, close) {
        $('#cancelTeamForm', modal).addEventListener('click', close);
        $('#teamForm', modal).addEventListener('submit', (e) => {
          e.preventDefault();
          const nameInput = $('#memberName', modal);
          const field = nameInput.closest('.form-field');
          const error = $('[data-error]', field);
          if (!nameInput.value.trim()) {
            field.classList.add('invalid');
            error.textContent = 'Member name is required.';
            nameInput.focus();
            return;
          }
          const member = {
            id: 't' + Date.now(),
            name: nameInput.value.trim(),
            role: $('#memberRole', modal).value.trim() || 'AI Specialist',
            department: $('#memberDepartment', modal).value,
            project: $('#memberProject', modal).value.trim() || 'Unassigned',
            skills: $('#memberSkills', modal).value.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 4),
            image: $('#memberImage', modal).value.trim() || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80'
          };
          team.push(member);
          saveTeam();
          renderTeamPage();
          toast('Team member added', `${member.name} was added to this demo workspace.`, 'success');
          close();
        });
      }
    });
  }

  function bindTeamActions() {
    const addBtn = $('#addTeamBtn');
    if (addBtn) addBtn.addEventListener('click', openTeamForm);
    const search = $('#teamSearch');
    if (search) search.addEventListener('input', renderTeamPage);
    $$('[data-team-filter]').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('[data-team-filter]').forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        renderTeamPage();
      });
    });
    document.addEventListener('click', (e) => {
      const remove = e.target.closest('[data-team-remove]');
      if (!remove) return;
      const member = team.find((item) => item.id === remove.dataset.teamRemove);
      if (!member) return;
      openModal({
        title: `Remove ${member.name}?`,
        description: 'This only updates demo data in this browser. Their project assignments are not changed on a server.',
        icon: 'trash',
        actions: `<button class="dash-btn" type="button" id="cancelRemoveMember">Cancel</button><button class="dash-btn danger" type="button" id="confirmRemoveMember">Remove member</button>`,
        onMount(modal, close) {
          $('#cancelRemoveMember', modal).addEventListener('click', close);
          $('#confirmRemoveMember', modal).addEventListener('click', () => {
            team = team.filter((item) => item.id !== member.id);
            saveTeam();
            renderTeamPage();
            toast('Team member removed', `${member.name} was removed from demo data.`, 'info');
            close();
          });
        }
      });
    });
  }

  /* ---------- AI Tools ---------- */
  function renderTools() {
    const grid = $('#toolsGrid');
    if (!grid) return;
    const search = ($('#toolSearch') && $('#toolSearch').value.trim().toLowerCase()) || '';
    const filter = $('.filter-tab.active[data-tool-filter]');
    const filterValue = filter ? filter.dataset.toolFilter : 'All';
    const filtered = tools.filter((tool) => {
      const matchesSearch = !search || `${tool.name} ${tool.desc} ${tool.category}`.toLowerCase().includes(search);
      const matchesFilter = filterValue === 'All' || tool.category === filterValue;
      return matchesSearch && matchesFilter;
    });
    grid.innerHTML = filtered.length ? filtered.map((tool) => `
      <article class="tool-card">
        <div class="tool-icon" style="--t-bg:${tool.bg};--t-color:${tool.color};background:${tool.bg};color:${tool.color};">${icon(tool.iconName, 21)}</div>
        <h3>${esc(tool.name)}</h3>
        <p>${esc(tool.desc)}</p>
        <div class="tool-foot"><span class="tool-category">${esc(tool.category)}</span><button class="dash-btn primary sm" type="button" data-launch-tool="${tool.id}">${icon('play', 11)} Launch</button></div>
      </article>`).join('') : '<div class="empty-state"><strong>No tools found</strong>Try another search or category.</div>';
    const count = $('#toolCountLabel');
    if (count) count.textContent = `${filtered.length} tools`;
  }

  function launchTool(toolId) {
    const tool = tools.find((item) => item.id === toolId);
    if (!tool) return;
    openModal({
      title: tool.name,
      description: tool.desc,
      icon: tool.iconName,
      iconStyle: ` style="background:${tool.bg};color:${tool.color};border-color:${tool.color}33;"`,
      wide: true,
      body: `
        <div class="tool-runner">
          <div class="form-field" style="margin:0;"><label for="toolPrompt">Your input</label><textarea class="form-control" id="toolPrompt" placeholder="Type a topic, brief, notes, or question…">${esc(tool.id === 'prompt-studio' ? 'AI onboarding assistant for a B2B SaaS customer success team' : tool.id === 'data-summarizer' ? 'Our support queue is growing 18% month over month while first response time has stayed flat. We need to automate triage without hiding urgent cases.' : 'How can we reduce manual client onboarding?')}</textarea></div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
            <button class="dash-btn primary" type="button" id="runToolBtn">${icon('play', 12)} Run demo</button>
            <span class="demo-label">Runs locally · no external AI model is called</span>
          </div>
          <div class="tool-output" id="toolOutput" aria-live="polite">Your demo output will appear here.</div>
        </div>`,
      actions: `<button class="dash-btn" type="button" id="closeToolBtn">Close</button>`,
      onMount(modal, close) {
        $('#closeToolBtn', modal).addEventListener('click', close);
        $('#runToolBtn', modal).addEventListener('click', () => {
          const input = $('#toolPrompt', modal).value.trim();
          const output = $('#toolOutput', modal);
          const button = $('#runToolBtn', modal);
          button.disabled = true;
          button.innerHTML = '<span class="spinner" aria-hidden="true"></span>Running demo…';
          output.classList.remove('ready');
          output.textContent = 'Generating a local demo output…';
          setTimeout(() => {
            output.textContent = tool.output(input);
            output.classList.add('ready');
            button.disabled = false;
            button.innerHTML = `${icon('play', 12)} Run again`;
            toast('Demo tool finished', `${tool.name} generated a local demo result. No model was called.`, 'info');
          }, 550);
        });
      }
    });
  }

  function bindTools() {
    renderTools();
    const search = $('#toolSearch');
    if (search) search.addEventListener('input', renderTools);
    $$('[data-tool-filter]').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('[data-tool-filter]').forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        renderTools();
      });
    });
    document.addEventListener('click', (e) => {
      const launch = e.target.closest('[data-launch-tool]');
      if (launch) launchTool(launch.dataset.launchTool);
    });
  }

  /* ---------- Reports ---------- */
  function downloadFile(filename, content, mime = 'text/plain;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportReportsCSV() {
    const headers = ['Report', 'Period', 'Type', 'Status', 'Size'];
    const rows = reports.map((item) => [item.title, item.period, item.type, item.status, item.size]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    downloadFile('stackly-reports.csv', '\uFEFF' + csv, 'text/csv;charset=utf-8');
    toast('CSV exported', 'The report index downloaded as stackly-reports.csv.', 'success');
  }

  function downloadReport(report) {
    const content = `STACKLY AI AGENCY — DEMO REPORT\n==============================\n\nTitle: ${report.title}\nPeriod: ${report.period}\nType: ${report.type}\nStatus: ${report.status}\n\nSummary\n-------\nThis is a demo report export. No production business data is included.\nProjects tracked: ${projects.length}\nTeam members: ${team.length}\nAutomation hours saved (sample): 1,284\nAverage project completion: ${Math.round(projects.reduce((sum, p) => sum + Number(p.progress || 0), 0) / Math.max(projects.length, 1))}%\n\nGenerated: ${new Date().toLocaleString()}\n`;
    downloadFile(`${report.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`, content);
    toast('Report downloaded', `${report.title} exported as a demo text report.`, 'success');
  }

  function renderReports() {
    const list = $('#reportList');
    if (!list) return;
    list.innerHTML = reports.map((report) => `
      <div class="report-row">
        <span class="report-icon">${icon('file', 16)}</span>
        <div class="report-info"><strong>${esc(report.title)}</strong><small>${esc(report.period)} · ${esc(report.type)} · ${esc(report.size)}</small></div>
        <span class="badge ${report.status === 'Ready' ? 'completed' : 'planning'}">${esc(report.status)}</span>
        <div class="report-actions">
          <button class="table-action" type="button" data-download-report="${report.id}" aria-label="Download ${esc(report.title)}">${icon('download', 14)}</button>
          <button class="table-action" type="button" data-view-report="${report.id}" aria-label="View ${esc(report.title)}">${icon('eye', 14)}</button>
        </div>
      </div>`).join('');
  }

  function bindReports() {
    renderReports();
    $$('[data-export-csv]').forEach((button) => button.addEventListener('click', exportReportsCSV));
    const printBtn = $('#printReportBtn');
    if (printBtn) printBtn.addEventListener('click', () => window.print());
    document.addEventListener('click', (e) => {
      const download = e.target.closest('[data-download-report]');
      const view = e.target.closest('[data-view-report]');
      if (download) {
        const report = reports.find((item) => item.id === download.dataset.downloadReport);
        if (report) downloadReport(report);
      }
      if (view) {
        const report = reports.find((item) => item.id === view.dataset.viewReport);
        if (!report) return;
        openModal({
          title: report.title,
          description: `${report.period} · ${report.type} · ${report.status}`,
          icon: 'reports',
          wide: true,
          body: `<div style="border:1px solid var(--line);border-radius:12px;padding:18px;background:rgba(255,255,255,.025);font-size:.8rem;line-height:1.7;">
            <p style="color:var(--muted);margin-bottom:12px;">Demo preview. This report is generated from sample data in your browser.</p>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:15px;">
              <div><small style="color:var(--muted)">Projects</small><strong style="display:block;font-family:var(--font-head);font-size:1.2rem;">${projects.length}</strong></div>
              <div><small style="color:var(--muted)">Avg. completion</small><strong style="display:block;font-family:var(--font-head);font-size:1.2rem;">${Math.round(projects.reduce((sum, p) => sum + Number(p.progress || 0), 0) / Math.max(projects.length, 1))}%</strong></div>
              <div><small style="color:var(--muted)">Team</small><strong style="display:block;font-family:var(--font-head);font-size:1.2rem;">${team.length}</strong></div>
            </div>
            <p style="color:var(--muted)">Business insight: support automation continues to show the strongest time savings, while document-heavy projects need more human review. Prioritise evaluation quality before expanding agent autonomy.</p>
          </div>`,
          actions: `<button class="dash-btn" type="button" id="closeReportPreview">Close</button><button class="dash-btn primary" type="button" id="downloadPreviewReport">${icon('download', 13)} Download demo</button>`,
          onMount(modal, close) {
            $('#closeReportPreview', modal).addEventListener('click', close);
            $('#downloadPreviewReport', modal).addEventListener('click', () => downloadReport(report));
          }
        });
      }
    });
    const range = $('#reportRange');
    if (range) range.addEventListener('change', () => {
      document.dispatchEvent(new CustomEvent('dashboard:filter', { detail: { range: range.value, source: 'reports' } }));
      toast('Report range updated', `Charts now show the ${range.options[range.selectedIndex].text} view.`, 'info');
    });
  }

  /* ---------- Analytics ---------- */
  function bindAnalyticsFilters() {
    const range = $('#analyticsRange');
    const metric = $('#analyticsMetric');
    const update = () => {
      document.dispatchEvent(new CustomEvent('dashboard:filter', {
        detail: { range: range ? range.value : '30', metric: metric ? metric.value : 'revenue', source: 'analytics' }
      }));
      const summary = $('#analyticsRangeLabel');
      if (summary && range) summary.textContent = range.options[range.selectedIndex].text;
    };
    if (range) range.addEventListener('change', () => {
      update();
      toast('Analytics updated', `Showing ${range.options[range.selectedIndex].text.toLowerCase()}.`, 'info');
    });
    if (metric) metric.addEventListener('change', update);
  }

  /* ---------- Overview ---------- */
  function bindOverview() {
    fillUserText();
    renderOverviewProjects();
    updateProjectMetrics();
    const range = $('#overviewRange');
    const metric = $('#overviewMetric');
    const dispatch = () => {
      document.dispatchEvent(new CustomEvent('dashboard:filter', {
        detail: { range: range ? range.value : '30', metric: metric ? metric.value : 'activity', source: 'overview' }
      }));
    };
    if (range) range.addEventListener('change', () => {
      dispatch();
      toast('Overview updated', `Charts now show ${range.options[range.selectedIndex].text.toLowerCase()}.`, 'info');
    });
    if (metric) metric.addEventListener('change', dispatch);

    const savedTasks = readJSON(TASKS_KEY, {});
    $$('[data-task-id]').forEach((button) => {
      const taskId = button.dataset.taskId;
      const row = button.closest('.task-item');
      const label = $('span', row);
      if (savedTasks[taskId]) {
        button.classList.add('done');
        if (label) label.classList.add('done');
      }
      button.addEventListener('click', () => {
        const done = button.classList.toggle('done');
        if (label) label.classList.toggle('done', done);
        savedTasks[taskId] = done;
        writeJSON(TASKS_KEY, savedTasks);
        toast(done ? 'Task completed' : 'Task reopened', done ? 'Progress updated in this demo workspace.' : 'The task is active again.', 'info');
      });
    });
  }

  /* ---------- Notifications page ---------- */
  let notifFilter = 'all';
  function renderNotificationsPage() {
    const list = $('#notificationPageList');
    if (!list) return;
    const filtered = notifications.filter((item) => notifFilter === 'all' || (notifFilter === 'unread' ? !item.read : item.read));
    list.innerHTML = filtered.length ? filtered.map((item) => {
      const visual = notificationIcon(item.type);
      return `<div class="notif-row${item.read ? '' : ' unread'}" data-notif-row="${item.id}">
        <span class="notif-badge-icon" style="--n-bg:${visual.bg};--n-color:${visual.color};background:${visual.bg};color:${visual.color};">${icon(visual.name, 16)}</span>
        <div class="notif-main">
          <div class="notif-main-head"><strong>${esc(item.title)}</strong>${item.read ? '' : '<span class="unread-pill">Unread</span>'}</div>
          <p>${esc(item.message)}</p>
          <time datetime="${esc(item.at)}">${timeAgo(item.at)}</time>
        </div>
        <div class="notif-actions">
          <button class="table-action" type="button" data-notif-toggle="${item.id}" aria-label="${item.read ? 'Mark as unread' : 'Mark as read'}">${icon(item.read ? 'mail' : 'check', 14)}</button>
          <button class="table-action danger" type="button" data-notif-delete="${item.id}" aria-label="Delete notification">${icon('trash', 14)}</button>
        </div>
      </div>`;
    }).join('') : `<div class="empty-state" style="border:0;"><strong>You're all caught up</strong>${notifFilter === 'unread' ? 'No unread notifications remain.' : 'No notifications in this view.'}</div>`;
    const unread = notifications.filter((item) => !item.read).length;
    const summary = $('#notifSummary');
    if (summary) summary.innerHTML = `<strong>${unread}</strong> unread · ${notifications.length} total`;
    const tabCount = $('#unreadTabCount');
    if (tabCount) tabCount.textContent = unread ? `(${unread})` : '';
  }

  function bindNotificationsPage() {
    if (!$('#notificationPageList')) return;
    renderNotificationsPage();
    updateNotificationUI();
    const markAll = $('#notifMarkAllPage');
    if (markAll) markAll.addEventListener('click', markAllNotificationsRead);
    $$('[data-notif-filter]').forEach((tab) => {
      tab.addEventListener('click', () => {
        $$('[data-notif-filter]').forEach((item) => item.classList.remove('active'));
        tab.classList.add('active');
        notifFilter = tab.dataset.notifFilter;
        renderNotificationsPage();
      });
    });
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-notif-toggle]');
      const del = e.target.closest('[data-notif-delete]');
      if (toggle) {
        const item = notifications.find((n) => n.id === toggle.dataset.notifToggle);
        if (item) {
          item.read = !item.read;
          saveNotifications();
          updateNotificationUI();
          renderNotificationsPage();
          toast(item.read ? 'Marked as read' : 'Marked as unread', item.title, 'info');
        }
      }
      if (del) {
        const item = notifications.find((n) => n.id === del.dataset.notifDelete);
        notifications = notifications.filter((n) => n.id !== del.dataset.notifDelete);
        saveNotifications();
        updateNotificationUI();
        renderNotificationsPage();
        if (item) toast('Notification deleted', item.title, 'info');
      }
    });
  }

  /* ---------- Settings ---------- */
  function setSettingsFeedback(selector, text, isError = false) {
    const box = $(selector);
    if (!box) return;
    box.textContent = text;
    box.style.color = isError ? '#ff9ab9' : 'var(--cyan)';
  }

  function applySettingsValues() {
    const nameInput = $('#settingsName');
    const emailInput = $('#settingsEmail');
    if (nameInput) nameInput.value = userName;
    if (emailInput) emailInput.value = userEmail;
    $$('[data-pref]').forEach((toggle) => {
      const key = toggle.dataset.pref;
      toggle.setAttribute('aria-checked', String(Boolean(prefs[key])));
    });
    const themeInput = $(`input[name="theme"][value="${prefs.theme}"]`);
    if (themeInput) themeInput.checked = true;
  }

  function bindToggles() {
    $$('[data-pref]').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const key = toggle.dataset.pref;
        const checked = toggle.getAttribute('aria-checked') === 'true';
        toggle.setAttribute('aria-checked', String(!checked));
      });
      toggle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle.click();
        }
      });
    });
  }

  function bindSettings() {
    if (!$('#settingsProfileForm')) return;
    applySettingsValues();
    bindToggles();

    $('#settingsProfileForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#settingsName').value.trim();
      const email = $('#settingsEmail').value.trim().toLowerCase();
      const nameField = $('#settingsName').closest('.form-field');
      const emailField = $('#settingsEmail').closest('.form-field');
      let valid = true;
      if (name.length < 2) {
        nameField.classList.add('invalid');
        $('.field-hint.error', nameField).textContent = 'Please enter at least 2 characters.';
        valid = false;
      } else {
        nameField.classList.remove('invalid');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        emailField.classList.add('invalid');
        $('.field-hint.error', emailField).textContent = 'Enter a valid email address.';
        valid = false;
      } else {
        emailField.classList.remove('invalid');
      }
      if (!valid) {
        setSettingsFeedback('#profileFeedback', 'Please fix the highlighted fields.', true);
        return;
      }
      const oldEmail = userEmail;
      session.name = name;
      session.email = email;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      if (oldEmail !== email) {
        try {
          const users = JSON.parse(localStorage.getItem('stackly_demo_users') || '[]');
          const index = users.findIndex((user) => user.email.toLowerCase() === oldEmail.toLowerCase() && user.provider === 'demo');
          if (index !== -1) {
            users[index].email = email;
            localStorage.setItem('stackly_demo_users', JSON.stringify(users));
          }
        } catch (_) { /* ignore local demo sync errors */ }
      }
      updateUserChrome();
      fillUserText();
      $('#settingsName').value = name;
      $('#settingsEmail').value = email;
      setSettingsFeedback('#profileFeedback', session.provider === 'backend'
        ? 'Profile updated for this session. Your backend account is unchanged because no profile endpoint is configured.'
        : 'Profile saved in this browser’s demo session.');
      toast('Profile updated', 'Your display name and email were updated.', 'success');
    });

    $('#settingsPreferencesForm').addEventListener('submit', (e) => {
      e.preventDefault();
      prefs.emailNotif = $('[data-pref="emailNotif"]').getAttribute('aria-checked') === 'true';
      prefs.productNotif = $('[data-pref="productNotif"]').getAttribute('aria-checked') === 'true';
      prefs.weeklyDigest = $('[data-pref="weeklyDigest"]').getAttribute('aria-checked') === 'true';
      const selectedTheme = $('input[name="theme"]:checked');
      if (selectedTheme) prefs.theme = selectedTheme.value;
      savePrefs();
      applyTheme();
      setSettingsFeedback('#prefsFeedback', 'Preferences saved locally in this browser.');
      toast('Preferences saved', 'Theme and notification choices were saved locally.', 'success');
    });

    const passwordForm = $('#settingsPasswordForm');
    if (passwordForm) {
      passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const current = $('#currentPassword').value;
        const next = $('#newPassword').value;
        const confirm = $('#confirmNewPassword').value;
        let valid = true;
        const currentField = $('#currentPassword').closest('.form-field');
        const nextField = $('#newPassword').closest('.form-field');
        const confirmField = $('#confirmNewPassword').closest('.form-field');
        [currentField, nextField, confirmField].forEach((field) => field.classList.remove('invalid'));

        if (!current) {
          currentField.classList.add('invalid');
          $('.field-hint.error', currentField).textContent = 'Enter your current password.';
          valid = false;
        }
        if (!next || next.length < 8 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) {
          nextField.classList.add('invalid');
          $('.field-hint.error', nextField).textContent = 'Use at least 8 characters with a letter and a number.';
          valid = false;
        }
        if (confirm !== next) {
          confirmField.classList.add('invalid');
          $('.field-hint.error', confirmField).textContent = 'New passwords do not match.';
          valid = false;
        }
        if (!valid) return;

        if (!window.StacklyAuth || typeof window.StacklyAuth.changePassword !== 'function') {
          setSettingsFeedback('#passwordFeedback', 'Password changes need js/auth.js loaded and a secure context.', true);
          return;
        }
        const button = $('#changePasswordBtn');
        const original = button.innerHTML;
        button.disabled = true;
        button.innerHTML = '<span class="spinner" aria-hidden="true"></span>Updating…';
        try {
          await window.StacklyAuth.changePassword(current, next);
          passwordForm.reset();
          setSettingsFeedback('#passwordFeedback', session.provider === 'backend'
            ? 'Password changed through the configured backend endpoint.'
            : 'Demo password updated using a new salted PBKDF2 hash.');
          toast('Password updated', 'Use your new password the next time you log in.', 'success');
        } catch (error) {
          setSettingsFeedback('#passwordFeedback', error.message || 'Password could not be updated.', true);
          toast('Password update failed', error.message || 'Please try again.', 'error');
        } finally {
          button.disabled = false;
          button.innerHTML = original;
        }
      });
    }

    const resetBtn = $('#resetDemoDataBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        openModal({
          title: 'Reset demo workspace data?',
          description: 'This restores sample projects, team members, and notifications, and resets local preferences. Your demo account is not deleted.',
          icon: 'trash',
          className: 'confirm-modal',
          actions: '<button class="dash-btn" type="button" id="cancelReset">Cancel</button><button class="dash-btn danger" type="button" id="confirmReset">Reset demo data</button>',
          onMount(modal, close) {
            $('#cancelReset', modal).addEventListener('click', close);
            $('#confirmReset', modal).addEventListener('click', () => {
              [PROJECTS_KEY, TEAM_KEY, NOTIFS_KEY, PREFS_KEY, TASKS_KEY].forEach((key) => localStorage.removeItem(key));
              toast('Demo data reset', 'Reloading the workspace…', 'info');
              setTimeout(() => window.location.reload(), 500);
            });
          }
        });
      });
    }
  }

  /* ---------- Page routing ---------- */
  function initPage() {
    if (page === 'overview') bindOverview();
    if (page === 'analytics') bindAnalyticsFilters();
    if (page === 'ai-tools') bindTools();
    if (page === 'projects') renderProjectsPage();
    if (page === 'team') {
      renderTeamPage();
      bindTeamActions();
    }
    if (page === 'reports') bindReports();
    if (page === 'settings') bindSettings();
    if (page === 'notifications') bindNotificationsPage();
    bindGlobalSearch();
    bindProjectActions();
    bindNotificationActions();
    enhanceCustomSelects();
    enhanceCustomDateInputs();
  }

  function init() {
    renderSidebar();
    renderTopbar();
    updateUserChrome();
    applyTheme();
    fillUserText();
    bindDropdowns();
    bindSidebar();
    bindLogout();
    updateNotificationUI();
    initPage();
    document.dispatchEvent(new CustomEvent('dashboard:ready', { detail: { page } }));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
