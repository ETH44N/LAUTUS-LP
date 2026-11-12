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
    enterprise: 'mailto:founders@lautus.ai?subject=Lautus%20Enterprise',
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ------------------------------------------------------------------
  // Launch offer: 20% off every plan, for as long as the buyer stays,
  // for anyone who checks out between 00:00 Dubai time on 12 November
  // and 00:00 on 26 November 2026. Checkout applies it by itself (the
  // app's lib/billing/launch.ts); this only shows it, in the same window.
  // ------------------------------------------------------------------
  const LAUNCH_START = Date.parse('2026-11-11T20:00:00Z');
  const LAUNCH_END = Date.parse('2026-11-25T20:00:00Z');
  if (Date.now() >= LAUNCH_START && Date.now() < LAUNCH_END) {
    $$('[data-launch]').forEach((el) => { el.hidden = false; });
    $$('[data-launch-price]').forEach((el) => { el.textContent = el.dataset.launchPrice; });
  }
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
  // Log in / Sign up: the customer app's own pages (the local app when served locally).
  $$('[data-app]').forEach((a) => { a.href = `${APP_URL}${a.dataset.app}`; });

  let chosenPlan = null;
  $$('[data-plan]').forEach((btn) => {
    const url = CHECKOUT[btn.dataset.plan];
    if (url) {
      btn.href = url;
      // Sent only to the tools the visitor allowed (lautus-consent.js).
      btn.addEventListener('click', () => window.lautusTrack('begin_checkout', { plan: btn.dataset.plan }));
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

  // ------------------------------------------------------------------
  // Link forms (hero + final CTA): a pasted video link goes to sign-up,
  // and the studio starts the first session on it once the plan is paid.
  // An empty field still goes to sign-up (upload later).
  // ------------------------------------------------------------------
  const startUrl = (link) => {
    const url = new URL(`${APP_URL}/start`);
    if (link) url.searchParams.set('link', link);
    return url.toString();
  };
  const cleanLink = (raw) => {
    const value = raw.trim();
    if (!value) return '';
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') ? url.toString() : null;
    } catch {
      return null;
    }
  };
  $$('[data-linkform]').forEach((form) => {
    const input = $('input[name="link"]', form);
    const note = $('.waitlist__note', form);
    const noteHtml = note ? note.innerHTML : '';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const link = cleanLink(input.value);
      if (link === null) {
        form.classList.add('is-error');
        if (note) note.textContent = 'That doesn\u2019t look like a video link. Try a YouTube or Google Drive URL.';
        input.focus();
        return;
      }
      // The studio picks the link up after sign-up and checkout (a week; every *.lautus.ai).
      if (link) {
        const domain = location.hostname.endsWith('lautus.ai') ? '; Domain=lautus.ai; Secure' : '';
        document.cookie = `lautus_link=${encodeURIComponent(link)}; Path=/; Max-Age=604800; SameSite=Lax${domain}`;
      }
      window.lautusTrack('lead');
      window.location.href = startUrl('');
    });
    input.addEventListener('input', () => {
      if (!form.classList.contains('is-error')) return;
      form.classList.remove('is-error');
      if (note) note.innerHTML = noteHtml;
      wireUpload(form);
    });
    wireUpload(form);
  });
  function wireUpload(root) {
    $$('[data-upload]', root).forEach((a) => {
      a.href = startUrl('');
    });
  }

  // ------------------------------------------------------------------
  // Content machine: a Drive link is typed and sent, the edit runs (sped up), four real
  // Lautus shorts burst out in four styles, then a week of posts fills in. Runs while the
  // demo is on screen and loops; videos load only once it has been seen.
  // ------------------------------------------------------------------
  const mx = $('[data-mx]');
  if (mx) {
    const typed = $('[data-mx-typed]', mx);
    const steps = $$('[data-mx-step]', mx);
    const phones = $$('.mx__phone', mx);
    const videos = phones.map((li) => $('video', li));
    const slots = $$('.mx__slot', mx);
    const count = $('[data-mx-count] b', mx);
    const LINK = 'drive.google.com/file/d/1xK9…/founder-keynote.mp4';
    const quick = reduceMotion.matches;
    let timers = [];
    let visible = false;

    const at = (ms, fn) => timers.push(setTimeout(fn, quick ? 0 : ms));
    const load = () => videos.forEach((v) => { if (!v.src) { v.src = v.dataset.src; v.load(); } });

    const run = () => {
      timers.forEach(clearTimeout);
      timers = [];
      mx.className = mx.className.replace(/\bis-[a-z]+\b/g, '').trim() + ' is-typing';
      typed.textContent = '';
      steps.forEach((li) => li.classList.remove('is-done', 'is-live'));
      phones.forEach((li) => li.classList.remove('is-in', 'is-posted'));
      slots.forEach((el) => el.classList.remove('is-in'));
      videos.forEach((v) => { v.pause(); v.currentTime = 0; });
      count.textContent = '0';

      for (let i = 1; i <= LINK.length; i++) at(200 + i * 28, () => { typed.textContent = LINK.slice(0, i); });
      const sent = 200 + LINK.length * 28 + 250;
      at(sent, () => mx.classList.add('is-press'));
      at(sent + 250, () => { mx.classList.remove('is-typing', 'is-press'); mx.classList.add('is-file', 'is-running'); });
      steps.forEach((li, i) => at(sent + 500 + i * 520, () => {
        if (i) steps[i - 1].classList.replace('is-live', 'is-done');
        li.classList.add('is-live');
      }));
      const boom = sent + 500 + steps.length * 520;
      at(boom, () => {
        steps[steps.length - 1].classList.replace('is-live', 'is-done');
        mx.classList.remove('is-running');
        mx.classList.add('is-boom');
        phones.forEach((li, i) => at(i * 110, () => { li.classList.add('is-in'); videos[i].play().catch(() => {}); }));
      });
      const post = boom + 1500;
      at(post, () => mx.classList.add('is-posting'));
      phones.forEach((li, i) => at(post + 200 + i * 420, () => li.classList.add('is-posted')));
      slots.forEach((el, i) => at(post + 150 + i * 170, () => { el.classList.add('is-in'); count.textContent = String(i + 1); }));
      at(post + 150 + slots.length * 170 + 400, () => mx.classList.add('is-done'));
      // go again while it is still being watched
      at(post + 150 + slots.length * 170 + 6500, () => { if (visible && !document.hidden) run(); });
    };

    $('[data-mx-replay]', mx).addEventListener('click', run);
    videos.forEach((v, i) => v.addEventListener('canplay', () => {
      if (phones[i].classList.contains('is-in') && v.paused) v.play().catch(() => {});
    }));
    let started = false;
    new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      if (visible && !started) { started = true; load(); run(); }
    }, { threshold: 0.3 }).observe(mx);
  }

  // ------------------------------------------------------------------
  // Editing styles: one player, four styles. Each clip plays to its end,
  // then the next style takes over; a click picks one. Clips load only
  // once the section is on screen.
  // ------------------------------------------------------------------
  const styles = $('[data-styles]');
  if (styles) {
    const vids = $$('.styles__stage video', styles);
    const items = $$('[data-style]', styles);
    const tag = $('[data-style-tag]', styles);
    const soundBtn = $('[data-style-sound]', styles);
    let current = 0;
    let started = false;
    let soundOn = false;

    const show = (i) => {
      vids.forEach((v, n) => {
        if (n === i) return;
        v.pause();
        v.classList.remove('is-on');
      });
      items.forEach((b, n) => {
        b.setAttribute('aria-pressed', String(n === i));
        b.style.setProperty('--p', '0');
      });
      current = i;
      const v = vids[i];
      if (!v.src) v.src = v.dataset.src;
      v.muted = !soundOn;
      v.currentTime = 0;
      v.classList.add('is-on');
      if (tag) tag.textContent = `${items[i].querySelector('.styles__num').textContent} · ${items[i].querySelector('.styles__name').textContent}`;
      if (started) v.play().catch(() => {});
      // Fetch the next clip ahead so the hand-off does not wait.
      const next = vids[(i + 1) % vids.length];
      if (!next.src) { next.src = next.dataset.src; next.preload = 'auto'; }
    };

    vids.forEach((v, n) => {
      v.addEventListener('timeupdate', () => {
        if (n !== current || !v.duration) return;
        items[n].style.setProperty('--p', String(v.currentTime / v.duration));
      });
      v.addEventListener('ended', () => {
        if (n === current) show((n + 1) % vids.length);
      });
    });
    items.forEach((b, n) => b.addEventListener('click', () => {
      started = true;
      show(n);
    }));
    if (soundBtn) soundBtn.addEventListener('click', () => {
      soundOn = !soundOn;
      soundBtn.setAttribute('aria-pressed', String(soundOn));
      $('span', soundBtn).textContent = soundOn ? 'Sound off' : 'Sound on';
      vids[current].muted = !soundOn;
      if (vids[current].paused) { started = true; vids[current].play().catch(() => {}); }
    });

    const begin = () => {
      // Under reduced motion nothing plays on its own: the first poster waits for a click.
      started = !reduceMotion.matches;
      show(0);
    };
    if ('IntersectionObserver' in window) {
      const seen = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        seen.disconnect();
        begin();
      }, { threshold: 0.3 });
      seen.observe(styles);
      // Off screen, the player rests; back on screen, it carries on.
      new IntersectionObserver(([entry]) => {
        if (!started) return;
        const v = vids[current];
        if (entry.isIntersecting) { if (v.paused && v.src) v.play().catch(() => {}); }
        else v.pause();
      }, { threshold: 0.1 }).observe(styles);
    } else {
      begin();
    }
  }

  /* Real clips (data-lazyloop): load and play only while on screen, pause when off it. */
  const loops = document.querySelectorAll('video[data-lazyloop]');
  if (loops.length) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const show = (v, on) => {
      if (on) {
        if (!v.src) { v.src = v.dataset.src; v.load(); }
        if (!reduce) v.play().catch(() => {});
      } else if (!v.paused) v.pause();
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => show(e.target, e.isIntersecting));
      }, { rootMargin: '200px 0px', threshold: 0.01 });
      loops.forEach((v) => io.observe(v));
    } else {
      loops.forEach((v) => show(v, true));
    }
  }
})();
