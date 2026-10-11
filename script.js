/* Lautus — landing page. Waitlist forms plus a few interface touches. No dependencies. */
(() => {
  // ------------------------------------------------------------------
  // CONFIG — Supabase project + the lautus-waitlist Edge Function.
  // The publishable key is meant to ship in the browser; the function
  // does the writing with the service role server-side (see README.md).
  // ------------------------------------------------------------------
  const SUPABASE_URL = 'https://vakvqlyvvaxpqabewtei.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_IPFsqDzii7NDalWUlpU-NA_nCy8ce3z';
  const FORM_ENDPOINT = `${SUPABASE_URL}/functions/v1/lautus-waitlist`;

  // Where each pricing button goes. Plans open the customer app (Google
  // sign-in, then Whop checkout); the local app when this page is served
  // locally. A plan left empty falls back to the early-access form, and the
  // signup is tagged with it.
  const APP_URL = ['localhost', '127.0.0.1'].includes(location.hostname)
    ? 'http://localhost:3001'
    : 'https://app.lautus.ai';
  const CHECKOUT = {
    starter: `${APP_URL}/start?plan=starter`,
    pro: `${APP_URL}/start?plan=pro`,
    scale: `${APP_URL}/start?plan=scale`,
    enterprise: '', // e.g. 'mailto:hello@lautus.ai' once the contact address is set
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ------------------------------------------------------------------
  // Button labels: split into letters that roll up on hover. The real
  // text stays in a visually hidden span for screen readers.
  // ------------------------------------------------------------------
  const setLabel = (el, text) => {
    const sr = document.createElement('span');
    sr.className = 'sr-only';
    sr.textContent = text;
    const letters = document.createElement('span');
    letters.className = 'roll';
    letters.setAttribute('aria-hidden', 'true');
    [...text].forEach((ch, i) => {
      const c = document.createElement('span');
      c.className = 'roll__c';
      c.style.setProperty('--i', i);
      c.textContent = ch;
      letters.append(c);
    });
    el.replaceChildren(sr, letters);
  };
  $$('[data-roll]').forEach((el) => {
    el.dataset.text = el.textContent.trim();
    setLabel(el, el.dataset.text);
  });

  // ------------------------------------------------------------------
  // Nav: shadow once scrolled, menu on small screens
  // ------------------------------------------------------------------
  const nav = $('[data-nav]');
  const toggle = $('.nav__toggle', nav);
  const menu = $('#nav-menu');

  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const setMenu = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => setMenu(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  // Pricing buttons: go to checkout when the plan has a link, otherwise
  // behave like "Get early access" and remember which plan was picked.
  let chosenPlan = null;
  $$('[data-plan]').forEach((btn) => {
    const url = CHECKOUT[btn.dataset.plan];
    if (url) {
      btn.href = url;
      return;
    }
    btn.setAttribute('data-to-form', '');
    btn.addEventListener('click', () => { chosenPlan = btn.dataset.plan; });
  });

  // "Get early access" links: use a signup form already on screen,
  // otherwise glide down to the one at the bottom.
  $$('[data-to-form]').forEach((link) => link.addEventListener('click', (e) => {
    const forms = $$('[data-waitlist]').filter((f) => !f.classList.contains('is-success'));
    const onScreen = forms.find((f) => {
      const r = f.getBoundingClientRect();
      return r.top > 80 && r.bottom < window.innerHeight;
    });
    const target = onScreen || $('#access [data-waitlist]');
    const input = target && !target.classList.contains('is-success') && $('input[type="email"]', target);
    if (!input) return; // already signed up: let the anchor scroll to the section
    e.preventDefault();
    if (!onScreen) {
      $('#access').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
    }
    input.focus({ preventScroll: true });
  }));

  // ------------------------------------------------------------------
  // Reveal on scroll
  // ------------------------------------------------------------------
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  // Decorative loops only run while their section is on screen.
  if ('IntersectionObserver' in window) {
    const idle = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-idle', !entry.isIntersecting));
    }, { rootMargin: '120px 0px' });
    $$('.hero, .section, .footer').forEach((el) => idle.observe(el));
  }

  // ------------------------------------------------------------------
  // Marquees (formats, creators): duplicate the list once so the loop
  // is seamless
  // ------------------------------------------------------------------
  $$('.marquee__list, [data-loop]').forEach((list) => {
    [...list.children].forEach((item) => {
      const copy = item.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      list.append(copy);
    });
    list.parentElement.classList.add('is-ready');
  });

  // ------------------------------------------------------------------
  // Example tabs (before / after). Arrow keys move between tabs.
  // ------------------------------------------------------------------
  $$('[data-tabs]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    const select = (tab) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        const next = tabs[(i + step + tabs.length) % tabs.length];
        select(next);
        next.focus();
      });
    });
  });

  // ------------------------------------------------------------------
  // Waveforms (decorative). Seeded so they look the same on every load.
  // ------------------------------------------------------------------
  const seeded = (seed) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  $$('[data-wave]').forEach((el, n) => {
    const count = Number(el.dataset.wave) || 80;
    const variant = el.dataset.variant || 'speech';
    const rand = seeded(n * 97 + 13);
    const track = el.closest('.timeline__track');
    const clips = track
      ? $$('.clip', track).map((c) => [parseFloat(c.style.getPropertyValue('--x')), parseFloat(c.style.getPropertyValue('--w'))])
      : [];

    const bars = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const t = i / count;
      let h;
      if (variant === 'raw') {
        const pause = i % 17 > 12;
        h = pause ? 0.04 + rand() * 0.05 : 0.12 + Math.pow(rand(), 1.5) * 0.88;
      } else if (variant === 'mixed') {
        h = 0.48 + rand() * 0.34;
      } else {
        const envelope = 0.45 + 0.35 * Math.sin(t * 19) * Math.sin(t * 7 + 1);
        h = Math.min(1, Math.max(0.08, envelope + (rand() - 0.5) * 0.6));
      }
      const bar = document.createElement('i');
      bar.style.setProperty('--h', h.toFixed(2));
      const at = t * 100;
      if (clips.some(([x, w]) => at >= x && at <= x + w)) bar.className = 'on';
      bars.append(bar);
    }
    el.append(bars);
  });

  // ------------------------------------------------------------------
  // Footer timecode: the visitor's local time as HH:MM:SS:FF at 25 fps
  // ------------------------------------------------------------------
  const tc = $('[data-timecode]');
  if (tc && 'IntersectionObserver' in window) {
    const pad = (v) => String(v).padStart(2, '0');
    let visible = false;
    let frame = 0;
    const tick = () => {
      const d = new Date();
      const ff = reduceMotion.matches ? 0 : Math.floor(d.getMilliseconds() / 40);
      tc.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}:${pad(ff)}`;
      frame = visible ? (reduceMotion.matches ? setTimeout(tick, 1000) : requestAnimationFrame(tick)) : 0;
    };
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) tick();
    }).observe(tc);
  }

  // ------------------------------------------------------------------
  // Waitlist forms (hero + bottom). Both post to the same function;
  // signing up in one marks the other as done too.
  // ------------------------------------------------------------------
  const validEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const forms = $$('[data-waitlist]').map((form) => {
    const input = $('input[type="email"]', form);
    const note = $('.waitlist__note', form);
    const label = $('.btn__label', form);
    const done = $('.waitlist__done', form);
    const defaultNote = note.textContent;

    const setState = (state, text) => {
      form.classList.remove('is-loading', 'is-error', 'is-success');
      if (state) form.classList.add(`is-${state}`);
      note.textContent = text ?? defaultNote;
    };

    const succeed = (duplicate) => {
      if (duplicate) {
        $('.waitlist__done-title', form).textContent = "You're already on the list.";
        $('.waitlist__done-sub', form).textContent = 'No need to sign up twice. Talk soon.';
      }
      setState('success', 'Thanks. Talk soon.');
      done.hidden = false;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.classList.contains('is-loading')) return;

      const email = input.value.trim();
      if (!validEmail(email)) {
        setState('error', "That email doesn't look right. Mind checking it?");
        input.focus();
        return;
      }

      // Honeypot: bots fill hidden fields. Pretend it worked, send nothing.
      if ($('.hp', form).value) {
        succeed(false);
        return;
      }

      setState('loading', 'Sending…');
      setLabel(label, 'Sending');

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
            source: [form.dataset.source || 'lautus.ai', chosenPlan && `plan: ${chosenPlan}`].filter(Boolean).join(' · '),
            referrer: document.referrer || null,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
        forms.forEach((f) => f.succeed(Boolean(data.duplicate)));
      } catch (err) {
        console.error('[lautus] signup failed', err);
        setState('error', 'Something went wrong on our side. Please try again in a moment.');
      } finally {
        setLabel(label, label.dataset.text);
      }
    });

    input.addEventListener('input', () => {
      if (form.classList.contains('is-error')) setState(null);
    });

    return { succeed };
  });
})();
