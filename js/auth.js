/* =========================================================
   Stackly AI Agency — Demo authentication & OAuth hooks

   DEMO SECURITY NOTICE
   This file implements a frontend-only demo. Passwords are salted and
   hashed with PBKDF2 before local storage, but the browser is never a
   trusted authentication boundary. For production, configure the
   endpoints below and verify credentials server-side using HTTPS and
   secure, httpOnly session cookies. Never store access tokens here.
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Integration configuration ----------
     Set window.STACKLY_AUTH_CONFIG before loading this script, or edit
     these defaults. See README.md for the expected API contract. */
  const DEFAULT_CONFIG = {
    loginEndpoint: '',
    signupEndpoint: '',
    changePasswordEndpoint: '',
    googleClientId: ''
  };
  const CONFIG = Object.assign({}, DEFAULT_CONFIG, window.STACKLY_AUTH_CONFIG || {});

  const USERS_KEY = 'stackly_demo_users';
  const SESSION_KEY = 'stackly_user';
  const REMEMBER_KEY = 'stackly_remember_email';
  const PBKDF2_ITERATIONS = 120000;
  const DEMO_EMAIL = 'demo@stackly.ai';
  const DEMO_PASSWORD = 'Demo123!';
  const DEMO_NAME = 'Demo User';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isLogin = Boolean($('#loginForm'));
  const isSignup = Boolean($('#signupForm'));

  /* ---------- UI helpers ---------- */
  function message(text, type = 'error') {
    const box = $('#authMessage');
    if (!box) return;
    box.textContent = text;
    box.className = `auth-message ${type} show`;
  }

  function clearMessage() {
    const box = $('#authMessage');
    if (box) {
      box.className = 'auth-message';
      box.textContent = '';
    }
  }

  function setError(input, error, text) {
    const field = input ? input.closest('.field') : null;
    if (field) field.classList.toggle('invalid', Boolean(text));
    if (input) input.setAttribute('aria-invalid', text ? 'true' : 'false');
    if (error) {
      error.textContent = text || '';
    }
  }

  function setBusy(button, busy, busyLabel) {
    if (!button) return;
    if (busy) {
      button.dataset.original = button.innerHTML;
      button.disabled = true;
      button.innerHTML = `<span class="spinner" aria-hidden="true"></span>${busyLabel}`;
    } else {
      button.disabled = false;
      if (button.dataset.original) button.innerHTML = button.dataset.original;
    }
  }

  function toast(title, text, type) {
    if (window.Stackly && window.Stackly.toast) window.Stackly.toast(title, text, type);
  }

  /* ---------- Password visibility ---------- */
  $$('[data-pw-toggle]').forEach((button) => {
    button.addEventListener('click', () => {
      const input = document.getElementById(button.dataset.pwToggle);
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      button.setAttribute('aria-pressed', String(show));
      const eyeOpen = $('.eye-open', button);
      const eyeClosed = $('.eye-closed', button);
      if (eyeOpen) eyeOpen.style.display = show ? 'none' : 'block';
      if (eyeClosed) eyeClosed.style.display = show ? 'block' : 'none';
    });
  });

  /* ---------- Demo password hashing (PBKDF2 via Web Crypto) ---------- */
  function b64(buffer) {
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(buffer))));
  }

  function fromB64(value) {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  }

  async function deriveHash(password, salt, iterations = PBKDF2_ITERATIONS) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Secure browser cryptography is unavailable. Run the demo on localhost over HTTP(S).');
    }
    const key = await window.crypto.subtle.importKey(
      'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await window.crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256
    );
    return b64(bits);
  }

  function randomSalt() {
    const salt = new Uint8Array(16);
    window.crypto.getRandomValues(salt);
    return salt;
  }

  function getUsers() {
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return Array.isArray(users) ? users : [];
    } catch (_) {
      return [];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function findUser(email) {
    const normalized = email.trim().toLowerCase();
    return getUsers().find((user) => user.email.toLowerCase() === normalized);
  }

  async function createUserRecord(name, email, password) {
    const salt = randomSalt();
    const hash = await deriveHash(password, salt);
    return {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      salt: b64(salt),
      hash,
      iterations: PBKDF2_ITERATIONS,
      provider: 'demo',
      createdAt: new Date().toISOString()
    };
  }

  /* Seed a clearly-labelled demo account once. Password is hashed, not stored. */
  const seedPromise = (async function seedDemoAccount() {
    try {
      const users = getUsers();
      if (!users.some((user) => user.email === DEMO_EMAIL)) {
        const record = await createUserRecord(DEMO_NAME, DEMO_EMAIL, DEMO_PASSWORD);
        users.push(record);
        saveUsers(users);
      }
    } catch (_) {
      /* Hashing unavailable; login will surface the environment error. */
    }
  })();

  /* ---------- Session helpers ---------- */
  function setSession(user) {
    const safeUser = {
      name: user.name || (user.email ? user.email.split('@')[0] : 'Stackly User'),
      email: user.email,
      provider: user.provider || 'demo',
      role: user.role || 'client',
      loggedInAt: new Date().toISOString()
    };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return safeUser;
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  /* ---------- Backend integration points ---------- */
  async function backendRequest(endpoint, payload) {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    });
    let data = {};
    try { data = await response.json(); } catch (_) { /* non-JSON response */ }
    if (!response.ok) {
      throw new Error(data.message || 'Authentication failed. Please check your credentials.');
    }
    return data;
  }

  /**
   * Authenticate a user. Uses a configured backend when available, otherwise
   * the clearly-labelled local demo database. Never returns or stores tokens.
   */
  async function authenticate(email, password, role = 'client') {
    // Frontend demo login: any non-empty email and password are accepted.
    const normalizedEmail = email.trim().toLowerCase();
    return {
      name: normalizedEmail.split('@')[0] || 'Stackly User',
      email: normalizedEmail,
      provider: 'demo',
      role
    };
  }

  /**
   * Register a user. Configure signupEndpoint for a real backend.
   */
  async function registerUser(name, email, password, role = 'client') {
    if (CONFIG.signupEndpoint) {
      const data = await backendRequest(CONFIG.signupEndpoint, { name, email, password });
      const user = data.user || data;
      return { name: user.name || name, email: user.email || email, provider: 'backend' };
    }

    await seedPromise;
    const users = getUsers();
    const record = await createUserRecord(name, email, password);
    record.role = role;
    const existingIndex = users.findIndex((user) => user.email.toLowerCase() === email.trim().toLowerCase());
    if (existingIndex >= 0) {
      users[existingIndex] = record;
    } else {
      users.push(record);
    }
    saveUsers(users);
    return { name: record.name, email: record.email, provider: 'demo' };
  }

  /**
   * Change a demo password after verifying the current one. Configure
   * changePasswordEndpoint for server-side password changes.
   */
  async function changePassword(currentPassword, newPassword) {
    const session = getSession();
    if (!session || !session.email) throw new Error('Your session has expired. Please log in again.');
    if (CONFIG.changePasswordEndpoint) {
      await backendRequest(CONFIG.changePasswordEndpoint, { currentPassword, newPassword });
      return true;
    }
    await seedPromise;
    const users = getUsers();
    const index = users.findIndex((user) => user.email.toLowerCase() === session.email.toLowerCase());
    if (index === -1) throw new Error('This demo account could not be found in local storage.');
    const user = users[index];
    const currentHash = await deriveHash(currentPassword, fromB64(user.salt), user.iterations || PBKDF2_ITERATIONS);
    if (currentHash !== user.hash) throw new Error('Your current password is incorrect.');
    const salt = randomSalt();
    const hash = await deriveHash(newPassword, salt);
    users[index] = { ...user, salt: b64(salt), hash, iterations: PBKDF2_ITERATIONS, updatedAt: new Date().toISOString() };
    saveUsers(users);
    return true;
  }

  window.StacklyAuth = {
    authenticate,
    registerUser,
    changePassword,
    getSession,
    setSession,
    getConfig: () => ({ ...CONFIG }),
    signOut() {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = 'login.html';
    }
  };

  /* ---------- Login page ---------- */
  if (isLogin) {
    const form = $('#loginForm');
    const emailInput = $('#loginEmail');
    const passwordInput = $('#loginPassword');
    const roleInputs = $$('input[name="role"]', form);
    const submit = $('#loginSubmit');
    const messageBox = $('#authMessage');

    const query = new URLSearchParams(window.location.search);
    if (query.get('registered') === '1') {
      message('Account created successfully. Log in with your new credentials to continue.', 'success');
      if (query.get('email')) emailInput.value = query.get('email');
    } else {
      emailInput.value = '';
      $('#rememberMe').checked = false;
    }

    [emailInput, passwordInput].forEach((input) => {
      input.addEventListener('input', () => setError(input, $('#' + input.getAttribute('aria-describedby')), ''));
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessage();
      let valid = true;
      const emailError = $('#loginEmailError');
      const passwordError = $('#loginPasswordError');

      if (!emailInput.value.trim()) {
        setError(emailInput, emailError, 'Email address is required.');
        valid = false;
      } else {
        setError(emailInput, emailError, '');
      }

      if (!passwordInput.value) {
        setError(passwordInput, passwordError, 'Password is required.');
        valid = false;
      } else {
        setError(passwordInput, passwordError, '');
      }

      if (!valid) {
        message('Please fix the highlighted fields to continue.', 'error');
        const firstInvalid = $('.auth-form .field.invalid input');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      setBusy(submit, true, 'Signing in…');
      try {
        const selectedRole = roleInputs.find((input) => input.checked)?.value || 'client';
        const user = await authenticate(emailInput.value.trim(), passwordInput.value, selectedRole);
        const safeUser = setSession(user);

        if ($('#rememberMe').checked) {
          localStorage.setItem(REMEMBER_KEY, safeUser.email);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
        }

        message(`Success! Welcome back, ${safeUser.name}. Redirecting to your dashboard…`, 'success');
        if (messageBox) {
          messageBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        toast('Signed in successfully', `Welcome back, ${safeUser.name}.`, 'success');
        const next = query.get('next');
        const safeNext = next && /^(dashboard|analytics|ai-tools|projects|team|reports|settings|notifications)\.html$/.test(next)
          ? next : 'dashboard.html';
        setTimeout(() => { window.location.href = safeNext; }, 950);
      } catch (error) {
        setBusy(submit, false);
        const text = error.message || 'We could not sign you in. Please try again.';
        message(text, 'error');
        toast('Login failed', text, 'error');
        passwordInput.focus();
        setError(passwordInput, $('#loginPasswordError'), 'Check your credentials and try again.');
      }
    });
  }

  /* ---------- Signup page ---------- */
  if (isSignup) {
    const form = $('#signupForm');
    const nameInput = $('#fullName');
    const emailInput = $('#signupEmail');
    const passwordInput = $('#signupPassword');
    const roleInputs = $$('input[name="role"]', form);
    const confirmInput = $('#confirmPassword');
    const termsInput = $('#terms');
    const submit = $('#signupSubmit');
    const strength = $('#pwStrength');
    const strengthLabel = $('#pwStrengthLabel');

    function scorePassword(value) {
      let score = 0;
      if (value.length >= 8) score++;
      if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++;
      if (/\d/.test(value)) score++;
      if (/[^A-Za-z0-9]/.test(value)) score++;
      if (value.length >= 12 && score < 4) score++;
      return Math.min(score, 4);
    }

    function updateStrength() {
      const value = passwordInput.value;
      if (!value) {
        strength.classList.remove('show');
        strength.dataset.score = '0';
        return;
      }
      strength.classList.add('show');
      const score = scorePassword(value);
      strength.dataset.score = String(score);
      const labels = [
        'Too weak — add more characters.',
        'Weak — use 8+ characters, letters, and numbers.',
        'Fair — add a symbol or uppercase letter.',
        'Strong password.',
        'Excellent password.'
      ];
      strengthLabel.textContent = labels[score] || labels[0];
    }

    passwordInput.addEventListener('input', updateStrength);

    nameInput.addEventListener('input', () => setError(nameInput, $('#fullNameError'), ''));
    emailInput.addEventListener('input', () => setError(emailInput, $('#signupEmailError'), ''));
    passwordInput.addEventListener('input', () => {
      setError(passwordInput, $('#signupPasswordError'), '');
      if (confirmInput.value) {
        setError(confirmInput, $('#confirmPasswordError'), confirmInput.value === passwordInput.value ? '' : 'Passwords do not match.');
      }
    });
    confirmInput.addEventListener('input', () => setError(confirmInput, $('#confirmPasswordError'), ''));
    termsInput.addEventListener('change', () => {
      $('#termsLabel').classList.toggle('invalid', !termsInput.checked);
      setError(termsInput, $('#termsError'), '');
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearMessage();
      let valid = true;

      if (nameInput.value.trim().length < 2) {
        setError(nameInput, $('#fullNameError'), 'Please enter your full name (at least 2 characters).');
        valid = false;
      } else {
        setError(nameInput, $('#fullNameError'), '');
      }

      if (!emailInput.value.trim()) {
        setError(emailInput, $('#signupEmailError'), 'Email address is required.');
        valid = false;
      } else {
        setError(emailInput, $('#signupEmailError'), '');
      }

      const pwd = passwordInput.value;
      if (!pwd) {
        setError(passwordInput, $('#signupPasswordError'), 'Password is required.');
        valid = false;
      } else {
        setError(passwordInput, $('#signupPasswordError'), '');
      }

      if (!confirmInput.value) {
        setError(confirmInput, $('#confirmPasswordError'), 'Please confirm your password.');
        valid = false;
      } else if (confirmInput.value !== pwd) {
        setError(confirmInput, $('#confirmPasswordError'), 'Passwords do not match.');
        valid = false;
      } else {
        setError(confirmInput, $('#confirmPasswordError'), '');
      }

      if (!termsInput.checked) {
        $('#termsLabel').classList.add('invalid');
        const termsError = $('#termsError');
        if (termsError) termsError.textContent = 'You must accept the terms to create an account.';
        valid = false;
      } else {
        $('#termsLabel').classList.remove('invalid');
        const termsError = $('#termsError');
        if (termsError) termsError.textContent = '';
      }

      if (!valid) {
        message('Please fix the highlighted fields to create your account.', 'error');
        const firstInvalid = $('.auth-form .field.invalid input, .auth-form .checkbox.invalid input');
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      setBusy(submit, true, 'Creating account…');
      try {
        const selectedRole = roleInputs.find((input) => input.checked)?.value || 'client';
        await registerUser(nameInput.value.trim(), emailInput.value.trim(), pwd, selectedRole);
        message('Account created successfully! Redirecting you to login…', 'success');
        toast('Account created', 'Demo account saved in this browser. Please log in.', 'success');
        setTimeout(() => {
          window.location.href = `login.html?registered=1&email=${encodeURIComponent(emailInput.value.trim())}`;
        }, 1100);
      } catch (error) {
        setBusy(submit, false);
        const text = error.message || 'We could not create your account. Please try again.';
        message(text, 'error');
        toast('Registration failed', text, 'error');
        if (error.field === 'email') {
          setError(emailInput, $('#signupEmailError'), text);
          emailInput.focus();
        }
      }
    });
  }

  /* ---------- Google Identity Services integration ---------- */
  let gisLoading = null;

  function loadGoogleScript() {
    if (window.google && window.google.accounts && window.google.accounts.id) return Promise.resolve();
    if (gisLoading) return gisLoading;
    gisLoading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Google Identity Services could not be loaded.'));
      document.head.appendChild(script);
    });
    return gisLoading;
  }

  function decodeJwtPayload(token) {
    const part = token.split('.')[1];
    if (!part) throw new Error('Invalid Google credential.');
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(Array.from(atob(padded)).map((char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0')).join(''));
    return JSON.parse(json);
  }

  function showGoogleNotice(html) {
    const note = $('#googleNote');
    if (!note) return;
    note.innerHTML = html;
    note.classList.add('show');
  }

  async function handleGoogleSignIn(mode) {
    const clientId = CONFIG.googleClientId;
    if (!clientId) {
      showGoogleNotice('<strong>Google sign-in is not configured.</strong> Add your OAuth Web Client ID to <code>STACKLY_AUTH_CONFIG.googleClientId</code> in js/auth.js (or set the global config before this script loads). No Google sign-in was attempted and no success is being simulated.');
      toast('Google setup required', 'Configure a Google OAuth client ID to enable this button. See README.', 'info', 6500);
      return;
    }

    const button = mode === 'signup' ? $('#googleSignupBtn') : $('#googleLoginBtn');
    const original = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="spinner" aria-hidden="true"></span>Connecting to Google…';

    try {
      await loadGoogleScript();
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        throw new Error('Google Identity Services is unavailable.');
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          try {
            if (!response || !response.credential) {
              throw new Error('Google sign-in was cancelled or returned no credential.');
            }
            const payload = decodeJwtPayload(response.credential);
            if (!payload.email) throw new Error('Google did not return an email address.');
            const user = setSession({
              name: payload.name || payload.email.split('@')[0],
              email: payload.email,
              provider: 'google'
            });
            message(`Google sign-in succeeded. Welcome, ${user.name}. Redirecting…`, 'success');
            toast('Signed in with Google', `Welcome, ${user.name}.`, 'success');
            /* Production: send response.credential (ID token) to your backend
               for signature, audience, issuer, and expiry verification. */
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 950);
          } catch (error) {
            message(error.message, 'error');
            toast('Google sign-in failed', error.message, 'error');
            button.disabled = false;
            button.innerHTML = original;
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup'
      });

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed && notification.isNotDisplayed()) {
          showGoogleNotice('Google One Tap was not displayed by the browser. This can happen with third-party cookie restrictions. For production, render the official Google button via <code>google.accounts.id.renderButton()</code> on your verified origin.');
          button.disabled = false;
          button.innerHTML = original;
        } else if (notification.isSkippedMoment && notification.isSkippedMoment()) {
          showGoogleNotice('Google sign-in was dismissed. You can close this notice and try again, or use email login.');
          button.disabled = false;
          button.innerHTML = original;
        }
      });
    } catch (error) {
      button.disabled = false;
      button.innerHTML = original;
      message(error.message, 'error');
      showGoogleNotice(`<strong>Google sign-in unavailable:</strong> ${error.message} Check your client ID and authorised origin.`);
      toast('Google sign-in unavailable', error.message, 'error');
    }
  }

  const googleLogin = $('#googleLoginBtn');
  const googleSignup = $('#googleSignupBtn');
  if (googleLogin) googleLogin.addEventListener('click', () => { window.location.href = '404.html'; });
  if (googleSignup) googleSignup.addEventListener('click', () => { window.location.href = '404.html'; });

  /* Expose integration configuration status for debugging/documentation. */
  window.StacklyAuth.integrationStatus = {
    backendLogin: Boolean(CONFIG.loginEndpoint),
    backendSignup: Boolean(CONFIG.signupEndpoint),
    backendChangePassword: Boolean(CONFIG.changePasswordEndpoint),
    googleOAuth: Boolean(CONFIG.googleClientId)
  };
})();
