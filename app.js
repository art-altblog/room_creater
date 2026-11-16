/* Прототип интерфейса «Сервис планировки квартиры» v1.0.
   Логика упрощена и нужна для демонстрации поведения интерфейса:
   сохранение — в localStorage вместо API, каталог — встроенный массив. */
(() => {
  'use strict';

  // ---------- каталог (ФТ-03; в реальной версии — из API, до 50 карточек) ----------
  const CATALOG = [
    { code: 'C-001', name: 'Диван 3-местный',   w: 210, d: 95 },
    { code: 'C-002', name: 'Кровать двуспальная', w: 160, d: 200 },
    { code: 'C-003', name: 'Стол обеденный',    w: 120, d: 75 },
    { code: 'C-004', name: 'Стул',              w: 45,  d: 50 },
    { code: 'C-005', name: 'Шкаф-купе',         w: 180, d: 60 },
    { code: 'C-006', name: 'Комод',             w: 100, d: 45 },
    { code: 'C-007', name: 'Письменный стол',   w: 140, d: 70 },
    { code: 'C-008', name: 'Тумба под ТВ',      w: 150, d: 40 },
    { code: 'C-009', name: 'Кресло',            w: 80,  d: 85 },
    { code: 'C-010', name: 'Стеллаж',           w: 80,  d: 30 },
  ];

  const WALL_NAMES = ['верхней', 'правой', 'нижней', 'левой'];
  const STORE_KEY = 'plan-prototype-v1';
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';

  // ---------- состояние ----------
  let state = demoState();
  let savedSnapshot = null;       // последняя успешно сохранённая версия
  let selectedId = null;
  let dirty = true;
  let drag = null;

  function demoState() {
    return {
      room: { w: 400, h: 300 },
      openings: {
        door:   { wall: 0, width: 90,  offset: 20 },
        window: { wall: 2, width: 120, offset: 150 },
      },
      items: [
        mk('Диван 3-местный', 210, 95, 125, 250, 0),
        mk('Стол обеденный', 120, 75, 300, 90, 0),
        mk('Стол обеденный', 120, 75, 330, 130, 0),   // наложение — для демонстрации
        mk('Комод', 100, 45, 15, 140, 90),
      ],
      nextId: 5,
    };
  }
  function mk(name, w, d, x, y, angle) {
    mk.n = (mk.n || 0) + 1;
    return { id: mk.n, name, w, d, x, y, angle };
  }

  // ---------- геометрия ----------
  const dims = it => (it.angle % 180 === 90) ? { w: it.d, h: it.w } : { w: it.w, h: it.d };
  function rect(it) {
    const s = dims(it);
    return { l: it.x - s.w / 2, r: it.x + s.w / 2, t: it.y - s.h / 2, b: it.y + s.h / 2 };
  }
  const overlaps = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;   // касание — не наложение
  const isOut = r => r.l < 0 || r.t < 0 || r.r > state.room.w || r.b > state.room.h;

  function analyze() {
    const out = new Set(), coll = new Set(), pairs = [];
    const it = state.items;
    it.forEach(a => { if (isOut(rect(a))) out.add(a.id); });
    for (let i = 0; i < it.length; i++)
      for (let j = i + 1; j < it.length; j++)
        if (overlaps(rect(it[i]), rect(it[j]))) { coll.add(it[i].id); coll.add(it[j].id); pairs.push([it[i], it[j]]); }
    return { out, coll, pairs };
  }

  function wallLen(w) { return (w % 2 === 0) ? state.room.w : state.room.h; }
  function wallSeg(wall, off, width) {
    const { w: W, h: H } = state.room;
    switch (+wall) {
      case 0: return [off, 0, off + width, 0];
      case 1: return [W, off, W, off + width];
      case 2: return [W - off, H, W - off - width, H];
      default: return [0, H - off, 0, H - off - width];
    }
  }

  // подписи экземпляров: «Стол обеденный №2», если таких несколько
  function labels() {
    const cnt = {}, tot = {}, map = {};
    state.items.forEach(i => tot[i.name] = (tot[i.name] || 0) + 1);
    state.items.forEach(i => {
      cnt[i.name] = (cnt[i.name] || 0) + 1;
      map[i.id] = tot[i.name] > 1 ? `${i.name} №${cnt[i.name]}` : i.name;
    });
    return map;
  }

  // ---------- отрисовка SVG ----------
  const svg = $('plan');
  function el(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function renderPlan() {
    const { w: W, h: H } = state.room;
    const pad = 46;
    svg.setAttribute('viewBox', `${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}`);
    svg.innerHTML = '';
    const a = analyze(), lab = labels();

    // Пол и координатная сетка: шаг 25 см, усиленные линии через 100 см.
    el('rect', { class: 'room-floor', x: 0, y: 0, width: W, height: H }, svg);
    for (let x = 25; x < W; x += 25) {
      el('line', { class: x % 100 === 0 ? 'room-grid room-grid-major' : 'room-grid', x1: x, y1: 0, x2: x, y2: H }, svg);
    }
    for (let y = 25; y < H; y += 25) {
      el('line', { class: y % 100 === 0 ? 'room-grid room-grid-major' : 'room-grid', x1: 0, y1: y, x2: W, y2: y }, svg);
    }

    // размеры комнаты
    el('line', { class: 'dim-line', x1: 0, y1: -22, x2: W, y2: -22 }, svg);
    el('text', { class: 'dim', x: W / 2, y: -28, 'text-anchor': 'middle' }, svg).textContent = `${W} см`;
    el('line', { class: 'dim-line', x1: -22, y1: 0, x2: -22, y2: H }, svg);
    const th = el('text', { class: 'dim', x: -28, y: H / 2, 'text-anchor': 'middle', transform: `rotate(-90 -28 ${H / 2})` }, svg);
    th.textContent = `${H} см`;

    // стены
    el('rect', { class: 'room-wall', x: 0, y: 0, width: W, height: H }, svg);

    // проёмы
    [['door', 'opening-door', 'Дверь'], ['window', 'opening-win', 'Окно']].forEach(([k, cls, name]) => {
      const o = state.openings[k]; if (!o) return;
      const [x1, y1, x2, y2] = wallSeg(o.wall, o.offset, o.width);
      el('line', { class: cls, x1, y1, x2, y2 }, svg);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const off = { 0: [0, 15], 1: [-16, 3], 2: [0, -9], 3: [16, 3] }[o.wall];
      const t = el('text', { class: 'opening-label', x: mx + off[0], y: my + off[1], 'text-anchor': 'middle' }, svg);
      t.textContent = `${name} ${o.width}`;
    });

    // мебель
    state.items.forEach(it => {
      const s = dims(it);
      const warn = a.coll.has(it.id), out = a.out.has(it.id);
      const g = el('g', {
        class: 'furn' + (warn ? ' warn' : '') + (out ? ' out' : '') + (it.id === selectedId ? ' selected' : ''),
        transform: `translate(${it.x} ${it.y})`, 'data-id': it.id, tabindex: 0,
        role: 'button', 'aria-label': `${lab[it.id]}, ${s.w} на ${s.h} см`
      }, svg);
      el('rect', { x: -s.w / 2, y: -s.h / 2, width: s.w, height: s.h, rx: 3 }, g);
      const small = s.w < 60 || s.h < 34;
      const t1 = el('text', { y: small ? 3 : -2 }, g); t1.textContent = small ? shorten(lab[it.id], 8) : lab[it.id];
      if (!small) { const t2 = el('text', { class: 'sz', y: 10 }, g); t2.textContent = `${s.w} × ${s.h}`; }
      if (warn || out) {
        const b = el('g', { class: 'badge', transform: `translate(${s.w / 2 - 2} ${-s.h / 2 + 2})` }, g);
        el('circle', { r: 8 }, b);
        el('text', { y: 3.5, 'text-anchor': 'middle' }, b).textContent = '!';
      }
    });

    $('emptyHint').hidden = state.items.length > 0;
  }
  const shorten = (s, n) => s.length > n ? s.slice(0, n - 1) + '…' : s;

  // ---------- правая панель и сводка ----------
  function renderSide() {
    const a = analyze(), lab = labels();

    // предупреждения
    const ul = $('warnList'); ul.innerHTML = '';
    a.pairs.forEach(([p, q]) => {
      const li = document.createElement('li'); li.className = 'w';
      li.innerHTML = `<span class="t">Наложение</span>${esc(lab[p.id])} ↔ ${esc(lab[q.id])}`;
      li.onclick = () => select(p.id); ul.appendChild(li);
    });
    state.items.filter(i => a.out.has(i.id)).forEach(i => {
      const r = rect(i), parts = [];
      if (r.l < 0) parts.push(`слева на ${fmt(-r.l)}`);
      if (r.t < 0) parts.push(`сверху на ${fmt(-r.t)}`);
      if (r.r > state.room.w) parts.push(`справа на ${fmt(r.r - state.room.w)}`);
      if (r.b > state.room.h) parts.push(`снизу на ${fmt(r.b - state.room.h)}`);
      const li = document.createElement('li'); li.className = 'o';
      li.innerHTML = `<span class="t">Выход за стену</span>${esc(lab[i.id])}: выступ ${parts.join(', ')} см`;
      li.onclick = () => select(i.id); ul.appendChild(li);
    });
    if (!ul.children.length) ul.innerHTML = '<li class="none">Предупреждений нет</li>';

    // перечень (ФТ-09)
    const groups = new Map();
    state.items.forEach(i => {
      const k = `${i.name}|${i.w}|${i.d}`;
      groups.set(k, { name: i.name, w: i.w, d: i.d, n: (groups.get(k)?.n || 0) + 1 });
    });
    const tb = $('bomBody'); tb.innerHTML = '';
    if (!groups.size) tb.innerHTML = '<tr><td colspan="3" class="none">План пуст</td></tr>';
    [...groups.values()].forEach(g => {
      tb.innerHTML += `<tr><td>${esc(g.name)}</td><td>${g.w} × ${g.d}</td><td class="num">${g.n}</td></tr>`;
    });
    $('bomTotal').textContent = state.items.length;

    // выбранный предмет (ФТ-05)
    const it = state.items.find(i => i.id === selectedId);
    $('selEmpty').hidden = !!it; $('selInfo').hidden = !it;
    $('btnRotate').disabled = $('btnDelete').disabled = !it;
    if (it) {
      const s = dims(it);
      $('selName').textContent = lab[it.id];
      $('selSize').textContent = `${s.w} × ${s.h} см`;
      if (document.activeElement !== $('selX')) $('selX').value = fmt(it.x);
      if (document.activeElement !== $('selY')) $('selY').value = fmt(it.y);
      $('selAngle').textContent = `${it.angle}°`;
      let h = '';
      if (a.coll.has(it.id)) h += '<div class="status-line status-warn">Пересекается с другим предметом</div>';
      if (a.out.has(it.id))  h += '<div class="status-line status-out">Выходит за границы комнаты</div>';
      if (!h) h = '<div class="status-line status-ok">Конфликтов нет</div>';
      $('selStatus').innerHTML = h;
    }
  }

  function renderOpenings() {
    const ul = $('openingsList'); ul.innerHTML = '';
    [['door', 'Дверь', 'var(--door)'], ['window', 'Окно', 'var(--win)']].forEach(([k, n, c]) => {
      const o = state.openings[k]; if (!o) return;
      const li = document.createElement('li');
      li.innerHTML = `<span class="dot" style="background:${c}"></span>${n} ${o.width} · стена ${+o.wall + 1} · отст. ${o.offset}
        <button class="x" aria-label="Убрать ${n.toLowerCase()}" data-k="${k}">×</button>`;
      ul.appendChild(li);
    });
    ul.querySelectorAll('.x').forEach(b => b.onclick = () => { delete state.openings[b.dataset.k]; touch(); });
    updateOpHint();
  }
  function updateOpHint() {
    const w = +$('opWall').value;
    $('opHint').textContent = `Отступ считается по часовой стрелке. Длина стены: ${wallLen(w)} см.`;
  }

  function renderCatalog() {
    const q = $('catSearch').value.trim().toLowerCase();
    const ul = $('catalog'); ul.innerHTML = '';
    CATALOG.filter(c => c.name.toLowerCase().includes(q)).forEach(c => {
      const k = 34 / Math.max(c.w, c.d);
      const li = document.createElement('li');
      li.className = 'cat-item'; li.tabIndex = 0; li.setAttribute('role', 'button');
      li.setAttribute('aria-label', `Добавить: ${c.name}, ${c.w} на ${c.d} см`);
      li.innerHTML = `<div class="thumb"><i style="width:${Math.max(8, c.w * k * 1.2)}px;height:${Math.max(6, c.d * k * 1.2)}px"></i></div>
        <div><b>${esc(c.name)}</b><span>${c.w} × ${c.d} см</span> <span class="cat-code">${c.code}</span></div>
        <div class="plus">+</div>`;
      const add = () => addItem(c.name, c.w, c.d);
      li.onclick = add;
      li.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(); } };
      ul.appendChild(li);
    });
    if (!ul.children.length) ul.innerHTML = '<li class="muted" style="padding:8px">Ничего не найдено</li>';
  }

  function renderSaveState() {
    const c = $('saveState');
    c.className = 'chip ' + (dirty ? 'chip-dirty' : 'chip-ok');
    c.textContent = dirty ? 'Есть несохранённые изменения' : 'Сохранено';
  }

  function render() { renderPlan(); renderSide(); renderSaveState(); }
  function touch() { dirty = true; renderOpenings(); render(); }

  // ---------- действия ----------
  function addItem(name, w, d) {
    const n = state.items.length;
    const it = { id: state.nextId++, name, w, d,
      x: Math.round(state.room.w / 2 + (n % 5) * 14), y: Math.round(state.room.h / 2 + (n % 5) * 14), angle: 0 };
    state.items.push(it); selectedId = it.id; touch();
  }
  function select(id) { selectedId = id; render(); }
  function rotate() {
    const it = sel(); if (!it) return;
    it.angle = (it.angle + 90) % 360; touch(); focusSel();
  }
  function remove() {
    const it = sel(); if (!it) return;
    state.items = state.items.filter(i => i !== it); selectedId = null; touch();
  }
  const sel = () => state.items.find(i => i.id === selectedId);
  const focusSel = () => svg.querySelector('.furn.selected')?.focus({ preventScroll: true });

  // ---------- форма комнаты ----------
  function fieldCheck(input, ok) { input.classList.toggle('invalid', !ok); return ok; }
  function showErr(id, msg) { const e = $(id); e.hidden = !msg; e.textContent = msg || ''; }

  $('btnRoom').onclick = () => {
    const w = +$('roomW').value, h = +$('roomH').value;
    const okW = fieldCheck($('roomW'), w > 0), okH = fieldCheck($('roomH'), h > 0);
    if (!okW || !okH) return showErr('roomErr', 'Размеры должны быть положительными числами.');
    const prev = state.room; state.room = { w, h };
    for (const k of Object.keys(state.openings)) {
      const o = state.openings[k];
      if (o.offset + o.width > wallLen(o.wall)) {
        state.room = prev;
        return showErr('roomErr', `Нельзя уменьшить: ${k === 'door' ? 'дверь' : 'окно'} не помещается на стене.`);
      }
    }
    showErr('roomErr'); touch();
  };

  $('btnOpening').onclick = () => {
    const type = document.querySelector('input[name=opType]:checked').value;
    const wall = +$('opWall').value, width = +$('opWidth').value, offset = +$('opOffset').value;
    const okW = fieldCheck($('opWidth'), width > 0), okO = fieldCheck($('opOffset'), offset >= 0);
    if (!okW || !okO) return showErr('opErr', 'Ширина — больше 0, отступ — не меньше 0.');
    if (offset + width > wallLen(wall)) {
      $('opOffset').classList.add('invalid');
      return showErr('opErr', `Проём выходит за край стены: ${offset} + ${width} > ${wallLen(wall)} см.`);
    }
    state.openings[type] = { wall, width, offset };
    showErr('opErr'); touch();
  };
  $('opWall').onchange = updateOpHint;

  $('btnCustom').onclick = () => {
    const name = $('cName').value.trim(), w = +$('cW').value, d = +$('cD').value;
    const a = fieldCheck($('cName'), !!name), b = fieldCheck($('cW'), w > 0), c = fieldCheck($('cD'), d > 0);
    if (!a || !b || !c) return showErr('cErr', !a ? 'Введите название предмета.' : 'Ширина и глубина должны быть больше 0.');
    showErr('cErr'); addItem(name, w, d);
    $('cName').value = $('cW').value = $('cD').value = '';
  };

  $('catSearch').oninput = renderCatalog;
  $('btnRotate').onclick = rotate;
  $('btnDelete').onclick = remove;

  $('selX').onchange = () => { const it = sel(); if (it && isFinite($('selX').value) && $('selX').value !== '') { it.x = +$('selX').value; touch(); } };
  $('selY').onchange = () => { const it = sel(); if (it && isFinite($('selY').value) && $('selY').value !== '') { it.y = +$('selY').value; touch(); } };

  // ---------- перетаскивание ----------
  function toSvg(e) {
    const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  svg.addEventListener('pointerdown', e => {
    const g = e.target.closest('.furn');
    if (!g) { selectedId = null; render(); return; }
    const it = state.items.find(i => i.id === +g.dataset.id);
    const p = toSvg(e);
    selectedId = it.id;
    drag = { it, dx: it.x - p.x, dy: it.y - p.y, moved: false };
    svg.setPointerCapture(e.pointerId);
    render();
  });
  svg.addEventListener('pointermove', e => {
    const p = toSvg(e);
    $('coords').textContent = `x ${Math.round(p.x)} · y ${Math.round(p.y)}`;
    if (!drag) return;
    const s = dims(drag.it);
    // привязка к целым сантиметрам по левому верхнему углу
    const left = Math.round(p.x + drag.dx - s.w / 2), top = Math.round(p.y + drag.dy - s.h / 2);
    drag.it.x = left + s.w / 2; drag.it.y = top + s.h / 2;
    drag.moved = true;
    render();
  });
  const endDrag = () => { if (drag) { if (drag.moved) { dirty = true; } drag = null; render(); focusSel(); } };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
  svg.addEventListener('pointerleave', () => { if (!drag) $('coords').textContent = '—'; });

  svg.addEventListener('focusin', e => {
    const g = e.target.closest?.('.furn');
    if (g && +g.dataset.id !== selectedId && !drag) { selectedId = +g.dataset.id; renderSide(); svg.querySelectorAll('.furn').forEach(n => n.classList.toggle('selected', n === g)); }
  });

  // Единственная горячая клавиша для мебели — Delete.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Delete' || e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (!sel()) return;
    e.preventDefault();
    remove();
  });

  // ---------- сохранение / открытие (локальное хранилище) ----------
  function banner(msg, ok) {
    const b = $('banner'); b.hidden = !msg; b.textContent = msg || ''; b.className = 'banner' + (ok ? ' ok' : '');
    if (ok) setTimeout(() => { if (b.textContent === msg) b.hidden = true; }, 3000);
  }
  $('btnSave').onclick = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
      savedSnapshot = true; dirty = false; renderSaveState(); banner('План сохранён.', true);
    } catch (_) {
      banner('Не удалось сохранить план в браузере (хранилище недоступно).');
    }
  };
  $('btnOpen').onclick = () => {
    let raw = null;
    try { raw = localStorage.getItem(STORE_KEY); } catch (_) {}
    if (!raw) return banner('Сохранённых планов в этом браузере нет.');
    if (dirty && !confirm('Несохранённые изменения будут потеряны. Открыть сохранённый план?')) return;
    state = JSON.parse(raw); mk.n = Math.max(0, ...state.items.map(i => i.id));
    selectedId = null; dirty = false;
    $('roomW').value = state.room.w; $('roomH').value = state.room.h;
    banner('План открыт. Предупреждения пересчитаны.', true);
    renderOpenings(); render();
  };
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- утилиты ----------
  const fmt = n => Number.isInteger(n) ? String(n) : n.toFixed(1);
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  // старт
  renderCatalog(); renderOpenings(); render();
})();
