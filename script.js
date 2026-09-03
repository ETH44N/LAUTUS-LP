/* Lautus — coming soon. Signup form only, no dependencies. */
(() => {
  // ------------------------------------------------------------------
  // CONFIG — Supabase project + the lautus-waitlist Edge Function.
  // The publishable key is meant to ship in the browser; the function
  // does the writing with the service role server-side (see README.md).
  // ------------------------------------------------------------------
  const SUPABASE_URL = 'https://vakvqlyvvaxpqabewtei.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_IPFsqDzii7NDalWUlpU-NA_nCy8ce3z';
  const FORM_ENDPOINT = `${SUPABASE_URL}/functions/v1/lautus-waitlist`;

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

    setState('loading', 'Sending…');
    btnLabel.textContent = 'Sending';

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          email,
          source: 'lautus.ai coming-soon',
          referrer: document.referrer || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.duplicate) {
        $('.signup__done-title', form).textContent = "You're already on the list.";
        $('.signup__done-sub', form).textContent = 'No need to sign up twice. Talk soon.';
      }
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
