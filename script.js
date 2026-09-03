/* Lautus — coming soon. Signup form only, no dependencies. */
(() => {
  // ------------------------------------------------------------------
  // CONFIG — point this at your email-capture endpoint (see README.md)
  // ------------------------------------------------------------------
  const FORM_ENDPOINT = 'https://formspree.io/f/YOUR_FORM_ID';

  const $ = (sel, root = document) => root.querySelector(sel);

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
})();
