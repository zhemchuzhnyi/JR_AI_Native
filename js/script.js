/**
 * CLAWD Wisdom — living mascot.
 *
 * Single global namespace: window.CLAWD.
 * One animation loop; everything is a single `transform` per frame:
 *   translate3d(position + bob)  rotate(tilt)  scale(facing, 1)
 *
 * Movement model: the TARGET changes (cursor, or a self-driven wander curve),
 * and the POSITION chases it with exponential smoothing. Because the target
 * is always what moves, switching modes never snaps the sprite.
 */
(function () {
  'use strict';

  /* ---- tuning ------------------------------------------------------- */
  const IDLE_MS = 2500; // mouse idle before the wander curve takes over
  const EDGE_MARGIN = 24; // keeps the cursor-target (and sprite) on screen

  const LERP_PER_FRAME = 0.045; // fraction of the gap closed per 60fps frame
  const FLIP_PX_PER_FRAME = 0.4; // horizontal movement (px/frame) that flips the sprite
  const TILT_MAX = 18; // degrees, vertical-speed tilt limit
  const TILT_GAIN = 0.08; // degrees of tilt per px/s of vertical speed
  const TILT_SMOOTH = 0.08; // tilt eases toward its target, per 60fps frame
  const BOB_PX = 4; // idle bob amplitude
  const BOB_MS = 700; // bob period
  const DT_MAX = 0.1; // seconds; clamps dt against tab-switch / hidden-tab jumps

  /* ---- tips --------------------------------------------------------- */
  const TIPS = [
    '/help покажет полный список доступных команд в любой момент.',
    '/clear начинает новый диалог с чистого листа.',
    'Диалог разросся? /compact сожмёт его, сохранив суть.',
    'Начни строку с ! — выполнишь команду прямо из сессии.',
    'Упомяни @файл — он попадёт в контекст разговора.',
    '/init создаст CLAUDE.md — инструкцию о проекте для Claude.',
    'claude -p «вопрос» — одноразовый ответ для скриптов.',
    'claude -c продолжит последний диалог в этой папке.',
    'claude -r откроет список прошлых сессий для продолжения.',
    '/code-review проверит твои незакоммиченные изменения.',
    '/security-review — ревью изменений с фокусом на безопасность.',
    '/mcp подключает Claude к внешним сервисам: БД, API, браузер.',
    '/doctor проверит здоровье установки Claude Code.',
    'Esc дважды — прервать текущую работу Claude.',
    'Shift+Tab переключает режим разрешений на лету.',
    '/status покажет информацию о текущей сессии.',
    '/cost — сколько потрачено токенов в этой сессии.',
    '/context покажет, что занимает контекст сессии.',
    '/model сменит модель, если нужна другая.',
    '/resume продолжит диалог по ID или из списка.',
    '/export сохранит текущий диалог в файл.',
    '/rewind откатит сессию к предыдущему состоянию.',
    '/permissions управляет правилами разрешений.',
    '/hooks настраивает автоматические действия на события.',
    '/config открывает настройки сессии: тему, режим, модель.',
    '/fast ускорит ответы на рутинные задачи.',
    'claude update проверит и установит обновления.',
    'claude --version покажет установленную версию.',
    'claude mcp list — список подключённых MCP-серверов.',
    'claude --permission-mode auto — режим с меньшим числом вопросов.',
  ];
  const TIP_HOLD_MS = 20000; // total visible time incl. fades (20 s)
  const TIP_FADE_IN_MS = 180; // fade-in duration
  const TIP_FADE_OUT_MS = 260; // fade-out duration
  const MAX_TIPS = 3; // at most this many bubbles on screen at once
  const TIP_GAP = 16; // px between the click point and the bubble
  const TIP_MARGIN = 8; // min px from the bubble to the viewport edge

  /* ---- state -------------------------------------------------------- */
  const state = {
    x: 0,
    y: 0,
    facing: 1, // 1 = normal, -1 = mirrored horizontally
    tilt: 0, // degrees
    t: 0, // seconds — drives the wander curve
    lastNow: 0,
    mouse: { x: 0, y: 0, lastMove: -Infinity },
    viewport: { w: 0, h: 0 },
    size: { w: 180, h: 180 }, // rendered mascot box (refined once the SVG loads)
    tipsOpened: 0,
    lastTipIndex: -1,
    tips: [], // active bubbles: { el, text, index, startMs, cx, cy }
  };

  const el = { root: null, counter: null };
  let rafId = null;

  /* ---- tiny helpers ------------------------------------------------ */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---- input ------------------------------------------------------- */
  function onPointerMove(e) {
    state.mouse.x = e.clientX;
    state.mouse.y = e.clientY;
    state.mouse.lastMove = performance.now();
  }

  function onResize() {
    state.viewport.w = window.innerWidth;
    state.viewport.h = window.innerHeight;
  }

  function measure() {
    const ratio = el.root.naturalWidth ? el.root.naturalHeight / el.root.naturalWidth : 1;
    state.size.w = el.root.offsetWidth || 180;
    state.size.h = state.size.w * ratio || state.size.w;
  }

  /* ---- one step of the animation ------------------------------------- */
  function step(dt, nowMs) {
    state.t += dt;

    // 1) Pick the target.
    let tx;
    let ty;
    if (nowMs - state.mouse.lastMove >= IDLE_MS) {
      // Self-driven wander curve (t in seconds, W/H = window size).
      const W = state.viewport.w;
      const H = state.viewport.h;
      tx = 0.5 * W + Math.sin(state.t * 0.5) * 0.28 * W;
      ty = 0.42 * H + Math.sin(state.t * 0.9) * 0.16 * H;
    } else {
      tx = clamp(state.mouse.x, EDGE_MARGIN, state.viewport.w - EDGE_MARGIN);
      ty = clamp(state.mouse.y, EDGE_MARGIN, state.viewport.h - EDGE_MARGIN);
    }

    // 2) Position chases the target. Recompute the per-frame lerp factor
    //    for the actual delta time (0.045 at 60 fps).
    const alpha = 1 - Math.pow(1 - LERP_PER_FRAME, dt * 60);
    const dx = tx - state.x;
    const dy = ty - state.y;
    const moveX = dx * alpha; // px moved this frame, horizontal
    const moveY = dy * alpha; // px moved this frame, vertical
    state.x += moveX;
    state.y += moveY;

    // 3) Face the direction of travel once horizontal motion is noticeable.
    if (Math.abs(moveX) > FLIP_PX_PER_FRAME) {
      state.facing = moveX < 0 ? -1 : 1;
    }

    // 4) Tilt from vertical speed, eased toward its target, capped at ±18°.
    const vy = dt > 0 ? moveY / dt : 0; // px/s
    const targetTilt = clamp(vy * TILT_GAIN, -TILT_MAX, TILT_MAX);
    const tiltAlpha = 1 - Math.pow(1 - TILT_SMOOTH, dt * 60);
    state.tilt += (targetTilt - state.tilt) * tiltAlpha;
  }

  /* ---- render: one transform per frame -------------------------------- */
  function render(nowMs) {
    const bobY = Math.sin(nowMs / BOB_MS) * BOB_PX; // px, added to Y
    const hw = state.size.w / 2;
    const hh = state.size.h / 2;

    el.root.style.transform =
      'translate3d(' + (state.x - hw) + 'px,' + (state.y - hh + bobY) + 'px,0)' +
      ' rotate(' + state.tilt + 'deg)' +
      ' scale(' + state.facing + ', 1)';
  }

  /* ---- counter ------------------------------------------------------ */
  function renderTipCount() {
    if (el.counter) el.counter.textContent = String(state.tipsOpened);
  }

  /* ---- tips --------------------------------------------------------- */
  function pickTip() {
    if (TIPS.length <= 1) return 0;
    let i = Math.floor(Math.random() * TIPS.length);
    if (i === state.lastTipIndex) i = (i + 1) % TIPS.length; // never repeat back-to-back
    return i;
  }

  function showTip(e) {
    // Where did the user click? Fall back to the last known pointer position.
    const cx = e ? e.clientX : state.mouse.x;
    const cy = e ? e.clientY : state.mouse.y;

    // At most MAX_TIPS bubbles at once — retire the oldest to make room.
    while (state.tips.length >= MAX_TIPS) {
      const oldest = state.tips.shift();
      if (oldest.el.parentNode) oldest.el.parentNode.removeChild(oldest.el);
    }

    const i = pickTip();
    state.lastTipIndex = i;

    const tipEl = document.createElement('div');
    tipEl.className = 'tip';
    tipEl.setAttribute('role', 'status');
    tipEl.setAttribute('aria-live', 'polite');
    tipEl.textContent = TIPS[i];
    document.body.appendChild(tipEl);

    state.tips.push({ el: tipEl, text: TIPS[i], index: i, startMs: performance.now(), cx: cx, cy: cy });
    state.tipsOpened += 1;
    renderTipCount();
  }

  // Every active bubble is positioned & faded here, in the single loop.
  function stepTips(nowMs) {
    for (let k = state.tips.length - 1; k >= 0; k--) {
      const tip = state.tips[k];
      const age = Math.max(0, nowMs - tip.startMs); // never negative

      if (age >= TIP_HOLD_MS) {
        // Expired — drop the element and forget it.
        if (tip.el.parentNode) tip.el.parentNode.removeChild(tip.el);
        state.tips.splice(k, 1);
        continue;
      }

      let opacity = 1;
      if (age < TIP_FADE_IN_MS) opacity = age / TIP_FADE_IN_MS;
      else if (age > TIP_HOLD_MS - TIP_FADE_OUT_MS) {
        opacity = Math.max(0, (TIP_HOLD_MS - age) / TIP_FADE_OUT_MS);
      }

      const tipW = tip.el.offsetWidth;
      const tipH = tip.el.offsetHeight;

      // Bubble hovers above the click point; flips below if it would overflow the top.
      let bx = tip.cx - tipW / 2;
      let by = tip.cy - tipH - TIP_GAP;
      if (by < TIP_MARGIN) by = tip.cy + TIP_GAP;
      bx = clamp(bx, TIP_MARGIN, state.viewport.w - tipW - TIP_MARGIN);
      by = clamp(by, TIP_MARGIN, state.viewport.h - tipH - TIP_MARGIN);

      tip.el.style.transform = 'translate3d(' + bx + 'px,' + by + 'px,0)';
      tip.el.style.opacity = opacity;
      tip.el.style.visibility = 'visible';
    }
  }

  /* ---- loop ----------------------------------------------------------- */
  function schedule() {
    rafId = requestAnimationFrame(loop);
  }

  function loop(now) {
    if (document.hidden) {
      rafId = null;
      return;
    }
    const dt = Math.min((now - state.lastNow) / 1000, DT_MAX);
    state.lastNow = now;
    step(dt, now);
    render(now);
    stepTips(now);
    schedule();
  }

  /* ---- boot ------------------------------------------------------------- */
  function init() {
    el.root = document.getElementById('mascot');
    el.counter = document.getElementById('tip-count');
    measure();
    onResize();

    // Start centred; the wander curve pulls it into its own circuit from rest.
    state.x = state.viewport.w / 2;
    state.y = state.viewport.h * 0.42;
    renderTipCount();

    el.root.addEventListener('load', measure);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerMove);
    window.addEventListener('click', showTip);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
      } else {
        state.lastNow = performance.now();
        schedule();
      }
    });

    state.lastNow = performance.now();
    schedule();
  }

  window.CLAWD = {
    version: '0.6.0',
    init,
    showTip,
    getTipsOpened: () => state.tipsOpened,
    incrementTips: () => {
      state.tipsOpened += 1;
      renderTipCount();
      return state.tipsOpened;
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
