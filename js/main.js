/* =========================================================
   Stackly AI Agency — Global interactions
   Vanilla JavaScript, no framework.
   ========================================================= */
(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toast system (shared publicly as window.Stackly.toast) ---------- */
  const ICONS = {
    success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 16v-4M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>'
  };

  function ensureToastStack() {
    let stack = $('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      stack.setAttribute('aria-live', 'polite');
      stack.setAttribute('aria-atomic', 'false');
      document.body.appendChild(stack);
    }
    return stack;
  }

  /**
   * Display a dismissible toast. type: success | error | info
   */
  function toast(title, message, type = 'success', duration = 4500) {
    const stack = ensureToastStack();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `
      <span class="toast-icon">${ICONS[type] || ICONS.info}</span>
      <div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(message || '')}</p></div>
      <button class="toast-close" type="button" aria-label="Dismiss notification">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>`;
    stack.appendChild(el);
    const remove = () => {
      el.classList.add('removing');
      setTimeout(() => el.remove(), 250);
    };
    $('.toast-close', el).addEventListener('click', remove);
    if (duration > 0) setTimeout(remove, duration);
    return el;
  }

  function escapeHTML(value) {
    const div = document.createElement('div');
    div.textContent = String(value);
    return div.innerHTML;
  }

  window.Stackly = window.Stackly || {};
  window.Stackly.toast = toast;
  window.Stackly.escapeHTML = escapeHTML;
  window.Stackly.$ = $;
  window.Stackly.$$ = $$;

  /* ---------- Safe image fallback ---------- */
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (img.tagName === 'IMG' && !img.dataset.fallbackApplied) {
      img.dataset.fallbackApplied = 'true';
      img.classList.add('image-fallback');
      img.removeAttribute('src');
      img.alt = img.alt || 'Stackly AI Agency image';
    }
  }, true);

  /* ---------- Header scroll state ---------- */
  const header = $('.site-header');
  const onScroll = () => {
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile navigation + dropdowns ---------- */
  const navToggle = $('.nav-toggle');
  const navMenu = $('#navMenu');

  function closeNav() {
    if (!navMenu) return;
    navMenu.classList.remove('open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      const open = navMenu.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
      if (window.innerWidth <= 960) document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  $$('.nav-item.has-dropdown').forEach((item) => {
    const trigger = $('.nav-link', item);
    const dropdown = $('.nav-dropdown', item);
    if (!trigger || !dropdown) return;

    trigger.setAttribute('aria-expanded', 'false');
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = item.classList.toggle('open');
      trigger.setAttribute('aria-expanded', String(isOpen));
      if (isOpen) {
        const firstLink = $('a', dropdown);
        if (firstLink && window.innerWidth > 960) setTimeout(() => firstLink.focus(), 150);
      }
    });

    item.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        item.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
      }
      if (e.key === 'ArrowDown' && document.activeElement === trigger) {
        e.preventDefault();
        item.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
        const firstLink = $('a', dropdown);
        if (firstLink) firstLink.focus();
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item.has-dropdown')) {
      $$('.nav-item.has-dropdown.open').forEach((item) => {
        item.classList.remove('open');
        const trigger = $('.nav-link', item);
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }
    if (navMenu && navMenu.classList.contains('open') && !e.target.closest('.nav-menu') && !e.target.closest('.nav-toggle')) {
      closeNav();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNav();
      $$('.nav-item.has-dropdown.open').forEach((item) => {
        item.classList.remove('open');
        const trigger = $('.nav-link', item);
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
      });
    }
  });

  $$('.nav-menu a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 960) closeNav();
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 960) {
      closeNav();
      document.body.style.overflow = '';
    }
  });

  /* ---------- Authentication-aware navigation ---------- */
  function readSessionUser() {
    try {
      const raw = sessionStorage.getItem('stackly_user');
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }
  const sessionUser = readSessionUser();
  if (sessionUser) {
    $$('[data-login-link]').forEach((el) => {
      el.textContent = 'Login';
      el.href = 'login.html';
    });
    $$('[data-cta-link]').forEach((el) => {
      el.textContent = 'Sign up';
      el.href = 'signup.html';
    });
  }

  /* ---------- Reveal-on-scroll ---------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  /* ---------- Animated counters ---------- */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.count || '0');
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const duration = reduceMotion ? 0 : 1500;
    const start = performance.now();
    const prefix = el.dataset.prefix || '';

    function frame(now) {
      const progress = duration === 0 ? 1 : Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      el.textContent = prefix + current.toFixed(decimals) + suffix;
      if (progress < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(frame);
  }

  const counters = $$('[data-count]');
  if (counters.length) {
    if ('IntersectionObserver' in window) {
      const counterObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.55 });
      counters.forEach((c) => counterObserver.observe(c));
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* ---------- Contact form (honest demo submission) ---------- */
  const contactForm = $('#contactForm');
  if (contactForm) {
    const status = $('#contactStatus');
    const params = new URLSearchParams(window.location.search);
    if (params.get('service')) {
      contactForm.elements.subject.value = 'Inquiry: ' + params.get('service');
      contactForm.elements.message.value = 'Hi Stackly team, I would like to discuss ' + params.get('service') + ' for my business. ';
    }
    if (params.get('subject')) contactForm.elements.subject.value = params.get('subject');
    if (params.get('message')) contactForm.elements.message.value = params.get('message');
    const validators = {
      name: (v) => v.trim().length >= 2 || 'Please enter your full name.',
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Enter a valid email address.',
      subject: (v) => v.trim().length >= 3 || 'Please add a subject.',
      message: (v) => v.trim().length >= 10 || 'Please write at least 10 characters.'
    };

    function setFieldState(input, message) {
      const field = input.closest('.field');
      if (!field) return;
      const error = $('.field-error', field);
      if (message) {
        field.classList.add('invalid');
        input.setAttribute('aria-invalid', 'true');
        if (error) error.textContent = message;
      } else {
        field.classList.remove('invalid');
        input.removeAttribute('aria-invalid');
        if (error) error.textContent = '';
      }
    }

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let valid = true;
      ['name', 'email', 'subject', 'message'].forEach((key) => {
        const input = contactForm.elements[key];
        if (!input) return;
        const result = validators[key](input.value);
        if (result !== true) {
          setFieldState(input, result);
          valid = false;
        } else {
          setFieldState(input, '');
        }
      });

      if (!valid) {
        if (status) {
          status.textContent = 'Please fix the highlighted fields.';
          status.style.color = '#ff8fb2';
        }
        const firstInvalid = $('.field.invalid input, .field.invalid textarea', contactForm);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const submitBtn = $('button[type="submit"]', contactForm);
      const original = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner" aria-hidden="true"></span>Sending…';
      if (status) { status.textContent = ''; }

      const messages = JSON.parse(localStorage.getItem('stackly_contact_messages') || '[]');
      messages.push({
        name: contactForm.elements.name.value.trim(),
        email: contactForm.elements.email.value.trim(),
        subject: contactForm.elements.subject.value.trim(),
        message: contactForm.elements.message.value.trim(),
        at: new Date().toISOString()
      });
      localStorage.setItem('stackly_contact_messages', JSON.stringify(messages));

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
        if (status) {
          status.textContent = 'Demo mode: your message was saved in this browser. Connect an email/backend endpoint (see README) for real delivery.';
          status.style.color = 'var(--cyan)';
        }
        toast('Message saved in demo mode', 'No email was sent. Configure the contact endpoint in README to enable delivery.', 'info', 6000);
        contactForm.reset();
      }, 900);
    });

    ['name', 'email', 'subject', 'message'].forEach((key) => {
      const input = contactForm.elements[key];
      if (!input) return;
      input.addEventListener('input', () => {
        if (input.closest('.field').classList.contains('invalid')) setFieldState(input, '');
      });
    });
  }

  /* ---------- Newsletter form ---------- */
  $$('.news-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('input', form);
      if (!input) return;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) {
        toast('Check your email', 'Please enter a valid email address.', 'error');
        input.focus();
        return;
      }
      toast('You are on the list', 'Demo newsletter signup saved locally. No emails will be sent.', 'info');
      form.reset();
    });
  });

  /* ---------- Footer year ---------- */
  $$('[data-current-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- 404 safe back navigation ---------- */
  $$('[data-go-back]').forEach((button) => {
    button.addEventListener('click', () => {
      const sameOriginReferrer = document.referrer && (() => {
        try { return new URL(document.referrer).origin === window.location.origin; }
        catch (_) { return false; }
      })();
      if (window.history.length > 1 && (sameOriginReferrer || !document.referrer)) {
        window.history.back();
        setTimeout(() => {
          if (document.visibilityState === 'visible') window.location.href = 'index.html';
        }, 900);
      } else {
        window.location.href = 'index.html';
      }
    });
  });

  /* ---------- Smooth internal anchor links ---------- */
  $$('.social-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = '404.html';
    });
  });

  $$('a[href^="#"]:not([href="#"])').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', id);
      }
    });
  });
})();
