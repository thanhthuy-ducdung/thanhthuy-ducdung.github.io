/* Guest list for the couple. Opened by URL (admin.html) and protected by a login: the database only returns
   RSVPs to a signed-in user, so the page being public is not a leak. Everything is rendered with textContent. */
(function () {
  'use strict';

  const CFG = window.WEDDING_CONFIG || {};
  const SBC = CFG.supabase || {};
  const SB = SBC.url && SBC.anonKey ? { url: SBC.url.replace(/\/+$/, ''), key: SBC.anonKey } : null;
  const SESSION_KEY = 'wedding-admin-session';
  const $ = (sel, root = document) => root.querySelector(sel);

  let session = readSession();     // { token, email, exp }
  let rsvps = [];
  let wishes = [];
  let timer = null;
  let sideFilter = '';             // '' = both sides, otherwise 'Nhà trai' or 'Nhà gái'

  // ----- helpers ---------------------------------------------------------
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function say(text, ok) {
    const m = $('#msg');
    m.textContent = text || '';
    m.classList.toggle('ok', !!ok);
  }

  function fmt(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function readSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY));
      return s && s.token && s.exp > Date.now() ? s : null;
    } catch (e) { return null; }
  }

  function saveSession(s) {
    session = s;
    try {
      if (s) sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); else sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { /* private mode */ }
  }

  // Calls the database with the signed-in user's token. A 401 means the session ended.
  async function api(path, opts = {}) {
    const res = await fetch(`${SB.url}${path}`, {
      ...opts,
      headers: { apikey: SB.key, Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
    });
    if (res.status === 401) { logout('Phiên đăng nhập đã hết, bạn đăng nhập lại nhé.'); throw new Error('401'); }
    if (!res.ok) throw new Error(`Lỗi ${res.status}`);
    return res;
  }

  // ----- screens ---------------------------------------------------------
  function show(which) {
    $('#setup').hidden = which !== 'setup';
    $('#login').hidden = which !== 'login';
    $('#panel').hidden = which !== 'panel';
    $('.admin').classList.toggle('is-centered', which !== 'panel');
  }

  async function login(email, password) {
    const res = await fetch(`${SB.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SB.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Email hoặc mật khẩu chưa đúng.');
    const data = await res.json();
    saveSession({ token: data.access_token, email: email, exp: Date.now() + (data.expires_in || 3600) * 1000 - 30000 });
  }

  function logout(message) {
    saveSession(null);
    clearInterval(timer);
    rsvps = [];
    wishes = [];
    $('#password').value = '';
    show('login');
    say(message || '', false);
  }

  // ----- data ------------------------------------------------------------
  async function loadAll() {
    try {
      const [r, w] = await Promise.all([
        api('/rest/v1/rsvps?select=*&order=created_at.desc'),
        api('/rest/v1/wishes?select=*&order=created_at.desc'),
      ]);
      rsvps = await r.json();
      wishes = await w.json();
      say('');
      renderAll();
    } catch (e) {
      if (e.message !== '401') say('Không tải được dữ liệu. Bạn bấm "Làm mới" thử lại.', false);
    }
  }

  // ----- render ----------------------------------------------------------
  function renderAll() {
    $('#who').textContent = `Đã đăng nhập: ${session.email}`;
    renderSeg();
    renderStats();
    renderRsvps();
    renderWishes();
  }

  // The three big buttons: all / groom's side / bride's side, each with its number of replies.
  function renderSeg() {
    document.querySelectorAll('#sideSeg .seg__btn').forEach((btn) => {
      const side = btn.dataset.side;
      const count = side ? rsvps.filter((r) => r.side === side).length : rsvps.length;
      btn.textContent = '';
      btn.append(document.createTextNode(side || 'Tất cả'), el('small', '', ` (${count})`));
      btn.classList.toggle('on', side === sideFilter);
    });
  }

  function renderStats() {
    const base = sideFilter ? rsvps.filter((r) => r.side === sideFilter) : rsvps;   // numbers follow the chosen side
    const yes = base.filter((r) => r.attending === 'Có');
    const no = base.filter((r) => r.attending !== 'Có');
    const people = yes.reduce((sum, r) => sum + (Number(r.guests) || 0), 0);
    const bySide = (side) => rsvps.filter((r) => r.attending === 'Có' && r.side === side).reduce((s, r) => s + (Number(r.guests) || 0), 0);
    const title = sideFilter ? ` (${sideFilter.toLowerCase()})` : '';
    const cards = [
      [`Tổng số người sẽ đến${title}`, people, true],
      ['Lượt xác nhận sẽ đến', yes.length],
      ['Lượt không đến', no.length],
    ];
    if (!sideFilter) cards.push(['Khách nhà trai', bySide('Nhà trai')], ['Khách nhà gái', bySide('Nhà gái')]);
    const box = $('#stats');
    box.textContent = '';
    cards.forEach(([label, value, big]) => {
      const c = el('div', 'stat' + (big ? ' big' : ''));
      c.append(el('b', '', String(value)), el('span', '', label));
      box.append(c);
    });
  }

  function filteredRsvps() {
    const q = $('#q').value.trim().toLowerCase();
    const a = $('#fAttend').value;
    return rsvps.filter((r) =>
      (!a || r.attending === a) && (!sideFilter || r.side === sideFilter) &&
      (!q || `${r.name} ${r.note || ''}`.toLowerCase().includes(q)));
  }

  function renderRsvps() {
    const body = $('#rsvpTable tbody');
    body.textContent = '';
    const rows = filteredRsvps();
    // Two lists, each with its own heading and totals: guests who will come, then guests who will not.
    const groups = [
      ['Khách sẽ đến', 'yes', rows.filter((r) => r.attending === 'Có')],
      ['Khách không đến', 'no', rows.filter((r) => r.attending !== 'Có')],
    ];
    groups.forEach(([title, cls, items]) => {
      if (!items.length) return;
      const people = cls === 'yes' ? items.reduce((s, r) => s + (Number(r.guests) || 0), 0) : 0;
      const head = el('tr', `group ${cls}`);
      const cell = el('td', '', `${title}: ${items.length} lượt` + (cls === 'yes' ? ` · ${people} người` : ''));
      cell.colSpan = 7;
      head.append(cell);
      body.append(head);
      items.forEach((r) => body.append(rsvpRow(r)));
    });
    $('#rsvpEmpty').hidden = rows.length > 0;
  }

  function rsvpRow(r) {
    const tr = el('tr');
    const cell = (label, text, cls) => { const td = el('td', cls || '', text); td.dataset.label = label; tr.append(td); return td; };
    cell('Thời gian', fmt(r.created_at));
    cell('Tên', r.name);
    cell('Bên', r.side || '');
    cell('Tham dự', r.attending === 'Có' ? 'Sẽ đến' : 'Không đến', r.attending === 'Có' ? 'yes' : 'no');
    cell('Số người', r.attending === 'Có' ? String(r.guests) : '-', 'num');
    cell('Lời nhắn', r.note || '', 'note');
    const act = el('td');
    const del = el('button', 'btn small danger', 'Xóa');
    del.type = 'button';
    del.addEventListener('click', () => removeRsvp(r));
    act.append(del);
    tr.append(act);
    return tr;
  }

  function renderWishes() {
    const list = $('#wishAdmin');
    list.textContent = '';
    const badge = $('#pending');
    badge.hidden = wishes.length === 0;
    badge.textContent = String(wishes.length);
    wishes.forEach((w) => {
      const li = el('li', 'wish' + (w.approved ? '' : ' pending'));        // dimmed when hidden from the card
      const top = el('div', 'wish__top');
      top.append(el('span', 'wish__name', w.name), el('span', 'wish__time', fmt(w.created_at)),
        el('span', 'wish__state ' + (w.approved ? 'yes' : 'no'), w.approved ? 'Đang hiện trên thiệp' : 'Đã ẩn'));
      const actions = el('div', 'wish__actions');
      const toggle = el('button', 'btn small', w.approved ? 'Ẩn' : 'Hiện lại');
      toggle.type = 'button';
      toggle.addEventListener('click', () => setApproved(w, !w.approved));
      const del = el('button', 'btn small danger', 'Xóa');
      del.type = 'button';
      del.addEventListener('click', () => removeWish(w));
      actions.append(toggle, del);
      li.append(top, el('p', 'wish__text', w.message), actions);
      list.append(li);
    });
    $('#wishEmpty').hidden = wishes.length > 0;
  }

  // ----- actions ---------------------------------------------------------
  async function removeRsvp(r) {
    if (!window.confirm(`Xóa lượt trả lời của "${r.name}"?`)) return;
    try { await api(`/rest/v1/rsvps?id=eq.${encodeURIComponent(r.id)}`, { method: 'DELETE' }); await loadAll(); } catch (e) { /* shown by api() */ }
  }

  async function setApproved(w, value) {
    try {
      await api(`/rest/v1/wishes?id=eq.${encodeURIComponent(w.id)}`, { method: 'PATCH', body: JSON.stringify({ approved: value }), headers: { Prefer: 'return=minimal' } });
      await loadAll();
    } catch (e) { /* shown by api() */ }
  }

  async function removeWish(w) {
    if (!window.confirm(`Xóa lời chúc của "${w.name}"?`)) return;
    try { await api(`/rest/v1/wishes?id=eq.${encodeURIComponent(w.id)}`, { method: 'DELETE' }); await loadAll(); } catch (e) { /* shown by api() */ }
  }

  // CSV that opens correctly in Excel with Vietnamese letters (UTF-8 BOM). Cells starting with = + - @ are neutralised.
  function exportCsv() {
    const safe = (v) => {
      let s = v == null ? '' : String(v);
      if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const lines = [['Thời gian', 'Tên', 'Bên', 'Tham dự', 'Số người', 'Lời nhắn'].map(safe).join(',')];
    filteredRsvps().forEach((r) => {
      lines.push([fmt(r.created_at), r.name, r.side, r.attending === 'Có' ? 'Sẽ đến' : 'Không đến', r.attending === 'Có' ? r.guests : 0, r.note].map(safe).join(','));
    });
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = el('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'khach-moi-thiep-cuoi.csv';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ----- start -----------------------------------------------------------
  function enterPanel() {
    show('panel');
    loadAll();
    clearInterval(timer);
    timer = setInterval(() => { if (!document.hidden) loadAll(); }, 60000);
  }

  function init() {
    if (!SB) { show('setup'); return; }
    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      say('Đang đăng nhập...', true);
      try {
        await login($('#email').value.trim(), $('#password').value);
        say('');
        enterPanel();
      } catch (err) {
        say(err.message || 'Không đăng nhập được.', false);
      }
    });
    $('#logout').addEventListener('click', () => logout('Đã đăng xuất.'));
    $('#refresh').addEventListener('click', loadAll);
    $('#q').addEventListener('input', renderRsvps);
    $('#fAttend').addEventListener('change', renderRsvps);
    document.querySelectorAll('#sideSeg .seg__btn').forEach((btn) => btn.addEventListener('click', () => {
      sideFilter = btn.dataset.side;
      renderSeg();
      renderStats();
      renderRsvps();
    }));
    $('#csv').addEventListener('click', exportCsv);
    document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t === tab));
      $('#rsvpTab').hidden = tab.dataset.tab !== 'rsvp';
      $('#wishTab').hidden = tab.dataset.tab !== 'wish';
    }));
    if (session) enterPanel(); else show('login');
  }

  init();
})();
