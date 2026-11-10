// Beta countdown gate: ticks the clock every second from the absolute opening time
// (window.LAUTUS_BETA_OPENS_AT, set in index.html), and opens the normal page by itself at zero.
(function () {
  var root = document.documentElement;
  if (!root.classList.contains('is-gated')) return;
  var opensAt = Date.parse(window.LAUTUS_BETA_OPENS_AT);
  var gate = document.querySelector('[data-beta-gate]');
  var hidden = Array.prototype.filter.call(document.body.children, function (el) {
    return el !== gate && el.tagName !== 'SCRIPT' && !el.classList.contains('sprite');
  });
  hidden.forEach(function (el) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); });

  var out = {};
  ['d', 'h', 'm', 's'].forEach(function (k) { out[k] = gate.querySelector('[data-beta-' + k + ']'); });
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function open() {
    clearInterval(timer);
    root.classList.remove('is-gated');
    hidden.forEach(function (el) { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); });
  }

  function tick() {
    var left = Math.max(0, Math.floor((opensAt - Date.now()) / 1000));
    if (!left || isNaN(left)) return open();
    out.d.textContent = pad(Math.floor(left / 86400));
    out.h.textContent = pad(Math.floor(left / 3600) % 24);
    out.m.textContent = pad(Math.floor(left / 60) % 60);
    out.s.textContent = pad(left % 60);
  }
  var timer = setInterval(tick, 1000);
  tick();
})();
