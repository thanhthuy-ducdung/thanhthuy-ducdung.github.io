(function () {
  'use strict';

  const CFG = window.WEDDING_CONFIG;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const params = new URLSearchParams(location.search);
  const pad = (n) => String(n).padStart(2, '0');
  const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const VN_UTC_OFFSET_HOURS = 7;
  const DEMO_KEY = 'wedding-demo-wishes';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ----- which side's event is shown -------------------------------------
  const SIDE_ALIASES = { groom: 'groom', trai: 'groom', bride: 'bride', gai: 'bride' };
  let side = SIDE_ALIASES[(params.get('side') || '').toLowerCase()] || CFG.defaultSide || 'groom';

  // Blank date/time are allowed: the card then shows empty lines and hides the calendar.
  const BLANK = '. . . . . . . . .';
  function eventParts(ev) {
    const [y, m, d] = (ev.date || '').split('-').map(Number);
    const [hh, mm] = (ev.time || '').split(':').map(Number);
    return { y, m, d, hh, mm, hasDate: !!(y && m && d), hasTime: Number.isFinite(hh) && Number.isFinite(mm) };
  }

  // ----- static content --------------------------------------------------
  function renderStatic() {
    const { groom, bride } = CFG.couple;
    document.title = `Thiệp cưới ${groom} & ${bride}`;
    $$('[data-text="groom"]').forEach((el) => { el.textContent = groom; });
    $$('[data-text="bride"]').forEach((el) => { el.textContent = bride; });
    $$('[data-decor]').forEach((el) => { el.src = CFG.decor[el.dataset.decor]; });
    if (CFG.couple.photo) {
      $('#couplePhoto').src = CFG.couple.photo;
    } else {
      $('#couplePhoto').hidden = true;
      $('.polaroid').classList.add('is-empty'); // empty frame until a photo is set in config.js
    }
    $('#announcement').textContent = CFG.announcement;
    $('#thanks').textContent = CFG.thanks;

    for (const key of ['groom', 'bride']) {
      const fam = CFG.families[key];
      const box = $(key === 'groom' ? '#familyGroom' : '#familyBride');
      box.append(
        el('h3', '', fam.title),
        el('p', fam.father ? '' : 'is-blank', fam.father || `Ông ${BLANK}`),
        el('p', fam.mother ? '' : 'is-blank', fam.mother || `Bà ${BLANK}`),
        el('p', 'family__address' + (fam.address ? '' : ' is-blank'), fam.address || BLANK),
      );
    }

    $$('.side-switch__btn').forEach((btn) => {
      btn.textContent = CFG.events[btn.dataset.side].label;
      btn.addEventListener('click', () => setSide(btn.dataset.side));
    });

    const guest = (params.get('to') || '').trim().slice(0, 60);
    if (guest) {
      $('#guestName').textContent = guest;
      $('#coverGuest').hidden = false;
      $('#rsvpForm').elements.name.value = guest;
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  // ----- event info (changes with the side) ------------------------------
  let icsUrl = null;

  function renderEvent() {
    const ev = CFG.events[side];
    const { y, m, d, hh, mm, hasDate, hasTime } = eventParts(ev);
    const weekday = hasDate ? WEEKDAYS[new Date(y, m - 1, d).getDay()] : '';
    const dateText = hasDate ? `${pad(d)}.${pad(m)}.${y}` : '';
    const timeText = hasTime ? `${pad(hh)}:${pad(mm)}` : '';
    const blankIf = (node, text, blank = BLANK) => {
      if (!node) return;
      node.textContent = text || blank;
      node.classList.toggle('is-blank', !text);
    };

    renderSwitch();
    blankIf($('#coverDate'), dateText);
    $('#eventTitle').textContent = ev.title;
    blankIf($('#eventTime'), timeText, '--:--');
    blankIf($('#eventDate'), hasDate ? `${weekday} · ${dateText}` : '', 'Ngày .... tháng .... năm ....');
    $('#eventLunar').textContent = ev.lunar ? `(${ev.lunar})` : '';
    blankIf($('#eventArrival'), ev.arrival, '--:--');
    blankIf($('#eventStart'), timeText, '--:--');
    blankIf($('#venueName'), ev.venue, `Địa điểm ${ev.label.toLowerCase()}`);
    blankIf($('#venueAddress'), ev.address, 'Thông tin sẽ được cập nhật');
    $('#rsvpSide').textContent = [ev.title, ev.label, dateText].filter(Boolean).join(' · ');

    // Calendar, map and calendar links need real data: hide them while blank.
    $('#calendar').hidden = !hasDate;
    if (hasDate) renderCalendar(y, m, d);

    const place = ev.mapQuery || ev.address;
    $('.map').hidden = !place;
    $('#directionsLink').hidden = !place;
    if (place) {
      const query = encodeURIComponent(place);
      const mapSrc = `https://www.google.com/maps?q=${query}&output=embed`;
      if ($('#mapFrame').src !== mapSrc) $('#mapFrame').src = mapSrc;
      $('#directionsLink').href = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
    }

    $('#gcalLink').hidden = !(hasDate && hasTime);
    $('#icsLink').hidden = !(hasDate && hasTime);
    if (!(hasDate && hasTime)) {
      if (icsUrl) { URL.revokeObjectURL(icsUrl); icsUrl = null; }
      renderGift();
      return;
    }

    // Calendar links. Times are Vietnam local time (UTC+7, no daylight saving).
    const start = new Date(Date.UTC(y, m - 1, d, hh, mm));
    const end = new Date(start.getTime() + (ev.durationHours || 3) * 3600e3);
    const stamp = (dt) => `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}` +
      `T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`;
    const toUtc = (dt) => new Date(dt.getTime() - VN_UTC_OFFSET_HOURS * 3600e3);
    const summary = `${ev.title} ${CFG.couple.groom} & ${CFG.couple.bride}`;
    const location_ = `${ev.venue}, ${ev.address}`;

    $('#gcalLink').href = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
      action: 'TEMPLATE',
      text: summary,
      dates: `${stamp(start)}/${stamp(end)}`,
      ctz: 'Asia/Ho_Chi_Minh',
      location: location_,
    });

    const esc = (s) => s.replace(/([,;\\])/g, '\\$1');
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//wedding-invitation//VI', 'BEGIN:VEVENT',
      `UID:${side}-${ev.date}@wedding-invitation`,
      `DTSTAMP:${stamp(toUtc(start))}Z`,
      `DTSTART:${stamp(toUtc(start))}Z`,
      `DTEND:${stamp(toUtc(end))}Z`,
      `SUMMARY:${esc(summary)}`,
      `LOCATION:${esc(location_)}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    if (icsUrl) URL.revokeObjectURL(icsUrl);
    icsUrl = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    $('#icsLink').href = icsUrl;
    $('#icsLink').download = `thiep-cuoi-${side}.ics`;

    renderGift();
  }

  function renderCalendar(y, m, d) {
    const box = $('#calendar');
    box.textContent = '';
    box.append(el('p', 'calendar__caption', `Tháng ${m} · ${y}`));
    const grid = el('div', 'calendar__grid');
    for (const head of ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']) grid.append(el('span', 'is-head', head));
    const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Monday first
    const days = new Date(y, m, 0).getDate();
    for (let i = 0; i < offset; i++) grid.append(el('span'));
    for (let day = 1; day <= days; day++) grid.append(el('span', day === d ? 'is-day' : '', day));
    box.append(grid);
  }

  function renderGift() {
    const gift = CFG.gift[side];
    const qr = $('#giftQr');
    qr.hidden = !gift.qr;
    if (gift.qr) qr.src = gift.qr;
    $('#giftBank').textContent = gift.bank || 'Thông tin sẽ được cập nhật';
    $('#giftName').textContent = gift.accountName || '';
    $('#giftNumber').textContent = gift.accountNumber || '';
    $('#copyBtn').hidden = !gift.accountNumber;
  }

  function setSide(next) {
    if (next === side || !CFG.events[next]) return;
    side = next;
    const url = new URL(location.href);
    url.searchParams.set('side', side);
    history.replaceState(null, '', url);
    renderSwitch(); // the thumb slides straight away
    if (reducedMotion) return renderEvent();
    // Everything that differs per side fades out, is updated while
    // invisible, then fades back in.
    const parts = $$('[data-swap]');
    parts.forEach((node) => node.classList.add('is-switching'));
    clearTimeout(swapTimer);
    swapTimer = setTimeout(() => {
      renderEvent();
      parts.forEach((node) => node.classList.remove('is-switching'));
    }, SWAP_OUT_MS);
  }

  const SWAP_OUT_MS = 280;
  let swapTimer;

  function renderSwitch() {
    $$('.side-switch').forEach((sw) => { sw.dataset.side = side; }); // event switch and venue switch stay in sync
    $$('.side-switch__btn').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.side === side));
    });
  }

  // ----- album -----------------------------------------------------------
  let photos = [];
  let photoIndex = 0;

  function renderAlbum() {
    const listed = (CFG.album.photos || []).map((p) => (typeof p === 'string' ? { src: p, thumb: p } : p));
    photos = listed.length ? listed : (window.ALBUM_PHOTOS || []);
    const album = $('#album');
    album.className = `album album--${CFG.album.layout === 'grid' ? 'grid' : 'masonry'}`;
    if (!photos.length) {
      // No photos yet: show empty frames so the layout is visible. Add photos in config.js to replace them.
      album.classList.add('album--frames');
      for (let i = 0; i < (CFG.album.frames || 6); i++) {
        const frame = el('div', 'album__item album__frame');
        frame.setAttribute('aria-hidden', 'true');
        album.append(frame);
      }
      return;
    }
    photos.forEach((photo, i) => {
      const btn = el('button', 'album__item');
      btn.type = 'button';
      btn.setAttribute('aria-label', `Xem ảnh ${i + 1}`);
      const img = el('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = `Ảnh cưới ${i + 1}`;
      if (photo.w && photo.h) { img.width = photo.w; img.height = photo.h; }
      img.src = photo.thumb || photo.src;
      btn.append(img);
      btn.addEventListener('click', () => openLightbox(i));
      album.append(btn);
    });
    if (!photos.length) $('.album-section').hidden = true;
  }

  function openLightbox(i) {
    showPhoto(i);
    $('#lightbox').showModal();
  }

  function showPhoto(i) {
    photoIndex = (i + photos.length) % photos.length;
    $('#lightboxImg').src = photos[photoIndex].src;
    $('#lightboxImg').alt = `Ảnh cưới ${photoIndex + 1}`;
  }

  function setupLightbox() {
    const box = $('#lightbox');
    $('.lightbox__nav--prev').addEventListener('click', () => showPhoto(photoIndex - 1));
    $('.lightbox__nav--next').addEventListener('click', () => showPhoto(photoIndex + 1));
    $('.lightbox__close').addEventListener('click', () => box.close());
    box.addEventListener('click', (e) => { if (e.target === box) box.close(); });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') showPhoto(photoIndex - 1);
      if (e.key === 'ArrowRight') showPhoto(photoIndex + 1);
    });
  }

  // ----- Google Sheet (RSVP + guestbook) ---------------------------------
  function readDemoWishes() {
    try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || []; } catch (e) { return []; }
  }

  async function send(payload) {
    if (!CFG.sheetEndpoint) {
      // No Sheet connected yet: keep wishes in this browser so the page can be tried out.
      if (payload.type === 'wish') {
        const wishes = readDemoWishes();
        wishes.unshift({ name: payload.name, message: payload.message, time: new Date().toISOString() });
        try { localStorage.setItem(DEMO_KEY, JSON.stringify(wishes.slice(0, 50))); } catch (e) { /* private mode */ }
      }
      return { ok: true, demo: true };
    }
    // text/plain keeps this a "simple" request, which Apps Script accepts without a CORS preflight.
    const res = await fetch(CFG.sheetEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || 'Sheet rejected the request');
    return data;
  }

  async function loadWishes() {
    let wishes = [];
    try {
      if (CFG.sheetEndpoint) {
        const res = await fetch(`${CFG.sheetEndpoint}?action=wishes`);
        wishes = (await res.json()).wishes || [];
      } else {
        wishes = readDemoWishes();
      }
    } catch (e) {
      console.error('Could not load wishes', e);
    }
    const list = $('#wishList');
    list.textContent = '';
    wishes.forEach((w) => list.append(wishItem(w)));
    $('#wishEmpty').hidden = wishes.length > 0;
  }

  function wishItem(w) {
    const li = el('li', 'wish');
    const head = el('div', 'wish__head');
    const when = new Date(w.time);
    const time = el('time', 'wish__time', isNaN(when) ? '' : when.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }));
    head.append(el('span', 'wish__name', w.name), time);
    li.append(head, el('p', 'wish__text', w.message));
    return li;
  }

  function setupForm(form, buildPayload, onDone) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      if (data.website) return; // spam trap: real guests never see this field
      const button = $('[type="submit"]', form);
      button.disabled = true;
      try {
        const payload = buildPayload(data);
        const result = await send(payload);
        onDone(payload, result);
      } catch (err) {
        console.error(err);
        toast('Gửi chưa thành công. Bạn thử lại giúp mình nhé.');
      } finally {
        button.disabled = false;
      }
    });
  }

  function setupForms() {
    const wishForm = $('#wishForm');
    setupForm(wishForm, (d) => ({ type: 'wish', name: d.name.trim(), message: d.message.trim() }), (payload, result) => {
      wishForm.reset();
      if (!result.demo) {
        // Wishes are shown only after the couple approves them in the Sheet.
        toast('Cảm ơn bạn! Lời chúc sẽ hiển thị sau khi được duyệt.');
        return;
      }
      $('#wishList').prepend(wishItem({ ...payload, time: new Date().toISOString() }));
      $('#wishEmpty').hidden = true;
      toast('Cảm ơn lời chúc của bạn!');
    });

    const dialog = $('#rsvpDialog');
    const rsvpForm = $('#rsvpForm');
    $('#rsvpBtn').addEventListener('click', () => dialog.showModal());
    $('#rsvpCancel').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    setupForm(rsvpForm, (d) => ({
      type: 'rsvp',
      name: d.name.trim(),
      side: CFG.events[side].label,
      attending: d.attending,
      guests: d.attending === 'Có' ? Number(d.guests) : 0,
      note: (d.note || '').trim(),
    }), (payload, result) => {
      dialog.close();
      toast(result.demo ? 'Đã ghi nhận (chế độ thử, chưa nối Google Sheet).' : 'Cảm ơn bạn đã xác nhận!');
    });
  }

  let toastTimer;
  function toast(message) {
    const box = $('#toast');
    box.textContent = message;
    box.classList.add('is-shown');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => box.classList.remove('is-shown'), 4200);
  }

  // ----- gift box --------------------------------------------------------
  function setupGift() {
    const box = $('#giftBox');
    box.addEventListener('click', () => {
      const open = box.getAttribute('aria-expanded') !== 'true';
      box.setAttribute('aria-expanded', String(open));
      $('#giftPanel').hidden = !open;
      $('.giftbox__hint').textContent = open ? 'Chạm để đóng' : 'Chạm để mở';
    });
    $('#copyBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(CFG.gift[side].accountNumber);
        toast('Đã sao chép số tài khoản.');
      } catch (e) {
        toast('Không sao chép được, bạn chép tay giúp nhé.');
      }
    });
  }

  // ----- cover, petals, music --------------------------------------------
  function spawnPetals(container, count) {
    if (reducedMotion) return;
    for (let i = 0; i < count; i++) {
      const petal = el('span', 'petal');
      const size = 10 + Math.random() * 12;
      petal.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size * 0.8}px;` +
        `--drift:${(Math.random() * 16 - 8).toFixed(1)}vw;` +
        `animation-duration:${(9 + Math.random() * 8).toFixed(1)}s;` +
        `animation-delay:${(-Math.random() * 14).toFixed(1)}s;`;
      container.append(petal);
    }
  }

  function setupCover() {
    const cover = $('#cover');
    const audio = $('#bgm');
    const musicBtn = $('#musicBtn');

    spawnPetals($('#petals'), 16);

    const setPlaying = (on) => musicBtn.setAttribute('aria-pressed', String(on));
    if (CFG.music) {
      audio.src = CFG.music;
      musicBtn.addEventListener('click', () => (audio.paused ? audio.play().catch(() => {}) : audio.pause()));
      audio.addEventListener('play', () => setPlaying(true));
      audio.addEventListener('pause', () => setPlaying(false));
    }

    $('#openBtn').addEventListener('click', () => {
      cover.classList.add('is-opening', 'is-open');
      document.body.classList.remove('is-locked');
      if (CFG.music) {
        musicBtn.hidden = false;
        audio.play().catch(() => {});
      }
      spawnPetals($('#pagePetals'), 12);
      setTimeout(() => { $('#petals').textContent = ''; }, 1800);
    });
  }

  // ----- scroll effects --------------------------------------------------
  function setupScroll() {
    if (reducedMotion || !('IntersectionObserver' in window)) {
      $$('.reveal').forEach((node) => node.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    $$('.reveal').forEach((node) => observer.observe(node));

    const layers = $$('[data-parallax]');
    let ticking = false;
    const update = () => {
      ticking = false;
      const mid = window.innerHeight / 2;
      layers.forEach((layer) => {
        const rect = layer.parentElement.getBoundingClientRect();
        const offset = (rect.top + rect.height / 2 - mid) * Number(layer.dataset.parallax);
        layer.style.translate = `0 ${offset.toFixed(1)}px`;
      });
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  renderStatic();
  renderEvent();
  renderAlbum();
  setupLightbox();
  setupForms();
  setupGift();
  setupCover();
  setupScroll();
  loadWishes();
})();
