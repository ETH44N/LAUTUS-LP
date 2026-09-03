/* Lautus — coming soon
   Signup form, timecode HUD, waveform, and pointer tilt. No dependencies. */
(() => {
  // ------------------------------------------------------------------
  // CONFIG — point this at your email-capture endpoint (see README.md)
  // ------------------------------------------------------------------
  const FORM_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';

  const $ = (sel, root = document) => root.querySelector(sel);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Signup -------------------------------------------------------
  const form = $('#signup');
  const input = $('#email');
  const msg = $('#signup-msg');
  const btnLabel = $('.btn__label', form);
  const done = $('.signup__done', form);
  const DEFAULT_NOTE = msg.textContent;

  const setState = (state, text) => {
    form.classList.remove('is-loading', 'is-error', 'is-success');
    if (state) form.classList.add(`is-${state}`);
    msg.textContent = text ?? DEFAULT_NOTE;
  };

  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.classList.contains('is-loading')) return;

    const email = input.value.trim();
    if (!validEmail(email)) {
      setState('error', "That email doesn't look right — mind checking it?");
      input.focus();
      return;
    }

    // Honeypot: bots fill hidden fields. Pretend it worked, send nothing.
    if ($('.hp', form).value) {
      setState('success', 'Thanks — talk soon.');
      return;
    }

    if (FORM_ENDPOINT.includes('YOUR_FORM_ID')) {
      setState('error', "Signup isn't connected yet — set FORM_ENDPOINT in script.js.");
      return;
    }

    setState('loading', 'Sending…');
    btnLabel.textContent = 'Sending';

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, source: 'lautus.ai coming-soon' }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState('success', 'Thanks — talk soon.');
      done.setAttribute('aria-hidden', 'false');
    } catch (err) {
      console.error('[lautus] signup failed', err);
      setState('error', 'Something went wrong on our side. Please try again in a moment.');
    } finally {
      btnLabel.textContent = 'Request access';
    }
  });

  input.addEventListener('input', () => {
    if (form.classList.contains('is-error')) setState(null);
  });

  // ---- Timecode HUD (25 fps) ---------------------------------------
  const tc = $('#tc');
  if (tc) {
    const FPS = 25;
    let frames = (12 * 60 + 47) * FPS + 3;
    const pad = (n) => String(n).padStart(2, '0');
    const render = () => {
      const s = Math.floor(frames / FPS);
      tc.textContent = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(frames % FPS)}`;
    };
    render();
    if (!reduced) {
      let last = performance.now();
      let acc = 0;
      const tick = (now) => {
        acc += now - last;
        last = now;
        while (acc >= 1000 / FPS) { acc -= 1000 / FPS; frames++; }
        render();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  // ---- Speaker confidence flicker -----------------------------------
  const conf = $('#conf');
  if (conf && !reduced) {
    setInterval(() => { conf.textContent = (0.93 + Math.random() * 0.06).toFixed(2); }, 1700);
  }

  // ---- Waveform bars ------------------------------------------------
  const wave = $('#wave');
  if (wave) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 44; i++) {
      const bar = document.createElement('i');
      bar.style.setProperty('--h', `${20 + Math.round(Math.random() * 80)}%`);
      bar.style.setProperty('--d', `${(0.9 + Math.random() * 1.4).toFixed(2)}s`);
      bar.style.setProperty('--dl', `${(-Math.random() * 2).toFixed(2)}s`);
      frag.appendChild(bar);
    }
    wave.appendChild(frag);
  }

  // ---- Pointer tilt on the stage -----------------------------------
  const stage = $('#stage');
  if (stage && !reduced && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      stage.style.transform = `perspective(1400px) rotateX(${cy.toFixed(3)}deg) rotateY(${cx.toFixed(3)}deg)`;
      raf = (Math.abs(tx - cx) > 0.01 || Math.abs(ty - cy) > 0.01) ? requestAnimationFrame(loop) : null;
    };
    window.addEventListener('pointermove', (e) => {
      const nx = (e.clientX / innerWidth) * 2 - 1;
      const ny = (e.clientY / innerHeight) * 2 - 1;
      tx = nx * 6;
      ty = -ny * 4;
      if (!raf) raf = requestAnimationFrame(loop);
    }, { passive: true });
  }
})();
