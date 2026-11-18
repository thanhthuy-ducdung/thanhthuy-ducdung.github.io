/* Gold glitter drifting over the card, plus a burst when the invitation opens. */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  canvas.id = 'sparkle';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.append(canvas);
  const ctx = canvas.getContext('2d');
  const COLORS = ['255,226,236', '255,170,200', '255,255,255', '244,143,180'];
  let w = 0, h = 0, dpr = 1, raf = 0;
  let stars = [];
  const burst = [];
  const confetti = [];
  const CONFETTI_COLORS = ['255,143,180', '255,214,230', '255,255,255', '255,205,130', '236,122,161', '255,176,204'];

  // A shower of pink paper confetti and little hearts falling from the top of the screen.
  function popConfetti() {
    for (let i = 0; i < 150; i++) {
      confetti.push({
        x: Math.random() * w,
        y: -20 - Math.random() * h * 0.7,
        vx: (Math.random() - 0.5) * 1.4,
        vy: 1.8 + Math.random() * 3.4,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.3,
        s: 6 + Math.random() * 8,
        c: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
        heart: Math.random() < 0.25,
      });
    }
  }

  function drawConfetti(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(Math.cos(p.rot * 2), 1);                 // flutter
    ctx.fillStyle = `rgba(${p.c},.95)`;
    if (p.heart) {
      const s = p.s * 0.9;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.35);
      ctx.bezierCurveTo(-s, -s * 0.35, -s * 0.5, -s, 0, -s * 0.4);
      ctx.bezierCurveTo(s * 0.5, -s, s, -s * 0.35, 0, s * 0.35);
      ctx.fill();
    } else {
      ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * 0.6);
    }
    ctx.restore();
  }

  function make(anywhere) {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 1.2 + Math.random() * 3.2,
      vy: -(0.12 + Math.random() * 0.4),
      vx: (Math.random() - 0.5) * 0.25,
      ph: Math.random() * Math.PI * 2,
      sp: 0.02 + Math.random() * 0.035,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    };
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(22, Math.min(54, Math.round(w / 14)));
    stars = Array.from({ length: count }, () => make(true));
  }

  // Four-point glint with a soft glow.
  function glint(x, y, r, alpha, c) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = `rgba(${c},.95)`;
    ctx.shadowBlur = r * 4;
    ctx.fillStyle = `rgba(${c},1)`;
    ctx.beginPath();
    ctx.moveTo(0, -r * 2.2);
    ctx.quadraticCurveTo(r * 0.28, -r * 0.28, r * 2.2, 0);
    ctx.quadraticCurveTo(r * 0.28, r * 0.28, 0, r * 2.2);
    ctx.quadraticCurveTo(-r * 0.28, r * 0.28, -r * 2.2, 0);
    ctx.quadraticCurveTo(-r * 0.28, -r * 0.28, 0, -r * 2.2);
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.ph += s.sp;
      s.x += s.vx;
      s.y += s.vy;
      if (s.y < -12 || s.x < -12 || s.x > w + 12) Object.assign(s, make(false));
      glint(s.x, s.y, s.r, 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(s.ph)), s.c);
    }
    for (let i = burst.length - 1; i >= 0; i--) {
      const b = burst[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.045;
      b.vx *= 0.99;
      b.life -= 0.012;
      if (b.life <= 0) { burst.splice(i, 1); continue; }
      glint(b.x, b.y, b.r, Math.min(1, b.life * 1.4), b.c);
    }
    for (let i = confetti.length - 1; i >= 0; i--) {
      const p = confetti[i];
      p.x += p.vx + Math.sin(p.y / 38) * 0.7;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > h + 24) { confetti.splice(i, 1); continue; }
      drawConfetti(p);
    }
    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  if (reduced) {
    stars.slice(0, 12).forEach((s) => glint(s.x, s.y, s.r, 0.5, s.c));
    return;
  }
  raf = requestAnimationFrame(frame);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  });

  const openBtn = document.getElementById('openBtn');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const r = openBtn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      popConfetti();
      for (let i = 0; i < 140; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 1.2 + Math.random() * 4.2;
        burst.push({
          x: cx, y: cy,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.8,
          r: 1.4 + Math.random() * 3,
          life: 0.8 + Math.random() * 0.9,
          c: COLORS[(Math.random() * COLORS.length) | 0],
        });
      }
    });
  }
})();
