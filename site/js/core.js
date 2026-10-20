/* Núcleo: datas, linhas (categorias), ícones, armazenamento, toast e arrastar. */
(function () {
  'use strict';

  const App = (window.App = {});

  /* ---------- Utilidades ---------- */

  App.esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  App.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  App.isTouch = () => window.matchMedia('(pointer: coarse)').matches;

  /* ---------- Datas ---------- */

  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const DIAS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const DIAS_LONGOS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  const pad = (n) => String(n).padStart(2, '0');

  const D = (App.dates = {
    MESES,
    DIAS,
    DIAS_LONGOS,
    key: (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    parse: (k) => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m - 1, d);
    },
    today: () => D.key(new Date()),
    /* Segunda = 0 … Domingo = 6 */
    wd: (d) => (d.getDay() + 6) % 7,
    add: (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n),
    weekStart: (d) => D.add(d, -D.wd(d)),
    week: (d) => {
      const s = D.weekStart(d);
      return Array.from({ length: 7 }, (_, i) => D.add(s, i));
    },
    long: (d) => `${DIAS_LONGOS[D.wd(d)]}, ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`,
    short: (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
    range: (start) => {
      const end = D.add(start, 6);
      const m1 = MESES[start.getMonth()].toLowerCase();
      const m2 = MESES[end.getMonth()].toLowerCase();
      if (start.getMonth() === end.getMonth()) return `${start.getDate()} a ${end.getDate()} de ${m2}`;
      if (start.getFullYear() === end.getFullYear()) return `${start.getDate()} de ${m1} a ${end.getDate()} de ${m2}`;
      return `${start.getDate()} de ${m1} de ${start.getFullYear()} a ${end.getDate()} de ${m2} de ${end.getFullYear()}`;
    },
  });

  /* Feriados nacionais do Brasil (fixos + móveis a partir da Páscoa). */
  const holidayCache = {};
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  }
  D.holidays = (y) => {
    if (holidayCache[y]) return holidayCache[y];
    const map = {};
    const fixed = {
      '01-01': 'Confraternização Universal', '04-21': 'Tiradentes', '05-01': 'Dia do Trabalho',
      '09-07': 'Independência', '10-12': 'N. S. Aparecida', '11-02': 'Finados',
      '11-15': 'Proclamação da República', '11-20': 'Consciência Negra', '12-25': 'Natal',
    };
    Object.entries(fixed).forEach(([md, name]) => (map[`${y}-${md}`] = { name, off: true }));
    const p = easter(y);
    map[D.key(D.add(p, -48))] = { name: 'Carnaval', off: false };
    map[D.key(D.add(p, -47))] = { name: 'Carnaval', off: false };
    map[D.key(D.add(p, -2))] = { name: 'Sexta-feira Santa', off: true };
    map[D.key(D.add(p, 60))] = { name: 'Corpus Christi', off: false };
    return (holidayCache[y] = map);
  };
  D.holiday = (k) => D.holidays(Number(k.slice(0, 4)))[k] || null;

  /* "agora", "há 5 min", "hoje, 14:32", "ontem, 09:10", "18/10, 08:00". */
  D.when = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const mins = Math.floor((now - d) / 60000);
    const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const k = D.key(d);
    if (k === D.today()) return `hoje, ${hm}`;
    if (k === D.key(D.add(now, -1))) return `ontem, ${hm}`;
    return `${D.short(d)}${d.getFullYear() !== now.getFullYear() ? '/' + d.getFullYear() : ''}, ${hm}`;
  };

  /* ---------- Linhas (categorias), nas cores do Metrô ---------- */

  App.LINES = [
    { id: 'azul', num: '1', name: 'Trabalho', color: '#0455A1', on: '#FFFFFF' },
    { id: 'verde', num: '2', name: 'Contas', color: '#007E5E', on: '#FFFFFF' },
    { id: 'vermelha', num: '3', name: 'Saúde', color: '#D9261C', on: '#FFFFFF' },
    { id: 'amarela', num: '4', name: 'Casa', color: '#FFD100', on: '#16181A' },
    { id: 'lilas', num: '5', name: 'Pessoal', color: '#9B3894', on: '#FFFFFF' },
    { id: 'prata', num: '15', name: 'Outros', color: '#9EA3A8', on: '#16181A' },
  ];
  App.line = (id) => App.LINES.find((l) => l.id === id) || App.LINES[0];
  /* labeled = true: leitores de tela ouvem "Linha 3, Saúde". */
  App.disc = (id, extra = '', labeled = false) => {
    const l = App.line(id);
    const a11y = labeled ? `role="img" aria-label="Linha ${l.num}, ${App.esc(l.name)}"` : 'aria-hidden="true"';
    return `<span class="disc ${extra}" style="--c:${l.color};--on:${l.on}" ${a11y}>${l.num}</span>`;
  };
  /* Legenda das linhas, para telas onde a da barra superior não cabe. */
  App.legendStrip = () =>
    `<ul class="legend-strip" aria-hidden="true">${App.LINES.map((l) => `<li>${App.disc(l.id, 'disc-sm')}${App.esc(l.name)}</li>`).join('')}</ul>`;

  /* ---------- Ícones (SVG, traço 2px) ---------- */

  const PATHS = {
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
    kanban: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 7v7M12 7v4M16 7v9"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    pencil: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    arrowRight: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    arrowLeft: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    open: '<path d="M7 17 17 7M7 7h10v10"/>',
    tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    checklist: '<path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',
  };
  App.icon = (name, cls = '') =>
    `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${PATHS[name]}</svg>`;

  /* ---------- Armazenamento (localStorage) ---------- */

  const KEY = 'organizador:v1';
  const blank = () => ({ version: 1, events: [], routines: [], tasks: [], lastLine: 'azul' });
  /* Dados salvos antes de cor/tags/checklists/comentários ganham os campos novos. */
  function normalize(d) {
    d.tasks.forEach((t) => {
      if (t.color === undefined) t.color = t.line || '';
      t.tags = t.tags || [];
      t.checklists = t.checklists || [];
      t.comments = t.comments || [];
    });
    return d;
  }
  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      return normalize(raw ? Object.assign(blank(), JSON.parse(raw)) : blank());
    } catch (e) {
      return blank();
    }
  }

  let data = read();
  const listeners = new Set();
  let warned = false;

  /* silent: salva sem redesenhar a tela (edições de texto enquanto a pessoa digita). */
  function commit(opts = {}) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      warned = false;
    } catch (e) {
      if (!warned) App.toast('Não foi possível salvar neste navegador. Libere o armazenamento do site para não perder dados.');
      warned = true;
    }
    if (!opts.silent) listeners.forEach((fn) => fn());
  }

  /* Outra aba alterou os dados: recarrega. */
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    data = read();
    listeners.forEach((fn) => fn());
  });

  const byTime = (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99') || a.title.localeCompare(b.title, 'pt-BR');

  const S = (App.store = {
    subscribe: (fn) => listeners.add(fn),
    get lastLine() {
      return data.lastLine;
    },

    /* Compromissos com data */
    events: () => data.events,
    eventsOn: (k) => data.events.filter((e) => e.date === k).sort(byTime),
    getEvent: (id) => data.events.find((e) => e.id === id),
    addEvent(v) {
      const ev = { id: App.uid(), title: v.title, date: v.date, time: v.time || '', line: v.line, done: false };
      data.events.push(ev);
      data.lastLine = v.line;
      commit();
      return ev;
    },
    updateEvent(id, patch) {
      const ev = S.getEvent(id);
      if (!ev) return;
      Object.assign(ev, patch);
      if (patch.line) data.lastLine = patch.line;
      commit();
    },
    removeEvent(id) {
      const i = data.events.findIndex((e) => e.id === id);
      if (i < 0) return null;
      const [ev] = data.events.splice(i, 1);
      commit();
      return () => {
        data.events.splice(i, 0, ev);
        commit();
      };
    },

    /* Rotina semanal (repete nos dias marcados) */
    routines: () => data.routines.slice().sort(byTime),
    getRoutine: (id) => data.routines.find((r) => r.id === id),
    addRoutine(v) {
      const r = { id: App.uid(), title: v.title, time: v.time || '', line: v.line, days: v.days.slice().sort(), doneOn: [] };
      data.routines.push(r);
      data.lastLine = v.line;
      commit();
      return r;
    },
    updateRoutine(id, patch) {
      const r = S.getRoutine(id);
      if (!r) return;
      Object.assign(r, patch);
      if (patch.days) r.days = patch.days.slice().sort();
      commit();
    },
    removeRoutine(id) {
      const i = data.routines.findIndex((r) => r.id === id);
      if (i < 0) return null;
      const [r] = data.routines.splice(i, 1);
      commit();
      return () => {
        data.routines.splice(i, 0, r);
        commit();
      };
    },

    /* Tudo de um dia: compromissos + ocorrências da rotina */
    itemsOn(k) {
      const wd = D.wd(D.parse(k));
      const evs = S.eventsOn(k).map((e) => ({ kind: 'event', id: e.id, title: e.title, time: e.time, line: e.line, done: e.done }));
      const rts = data.routines
        .filter((r) => r.days.includes(wd))
        .map((r) => ({ kind: 'routine', id: r.id, title: r.title, time: r.time, line: r.line, done: r.doneOn.includes(k) }));
      return evs.concat(rts).sort(byTime);
    },
    toggleDone(kind, id, k) {
      if (kind === 'event') {
        const ev = S.getEvent(id);
        if (ev) ev.done = !ev.done;
      } else {
        const r = S.getRoutine(id);
        if (!r) return;
        r.doneOn = r.doneOn.includes(k) ? r.doneOn.filter((d) => d !== k) : r.doneOn.concat(k);
      }
      commit();
    },

    /* Kanban */
    tasks: (status) => data.tasks.filter((t) => t.status === status),
    getTask: (id) => data.tasks.find((t) => t.id === id),
    addTask(v) {
      const t = {
        id: App.uid(), title: v.title, note: '', color: '', tags: [], checklists: [], comments: [],
        status: 'todo', createdAt: D.today(), doneAt: '',
      };
      data.tasks.unshift(t);
      commit();
      return t;
    },
    updateTask(id, patch, opts) {
      const t = S.getTask(id);
      if (!t) return;
      Object.assign(t, patch);
      commit(opts);
    },
    /* Edita o cartão no lugar: editTask(id, (t) => t.tags.push('casa')). */
    editTask(id, fn, opts) {
      const t = S.getTask(id);
      if (!t) return;
      fn(t);
      commit(opts);
    },
    /* Todas as tags usadas, sem repetir maiúsculas/minúsculas, em ordem alfabética. */
    allTags() {
      const seen = new Map();
      data.tasks.forEach((t) => t.tags.forEach((g) => seen.has(g.toLowerCase()) || seen.set(g.toLowerCase(), g)));
      return [...seen.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    },
    /* Move para uma coluna, antes de outro cartão (ou no fim). */
    moveTask(id, status, beforeId) {
      const i = data.tasks.findIndex((t) => t.id === id);
      if (i < 0) return;
      const [t] = data.tasks.splice(i, 1);
      if (t.status !== status) {
        t.doneAt = status === 'done' ? D.today() : '';
        /* Fica registrado nas atualizações do cartão. */
        t.comments.unshift({ id: App.uid(), kind: 'move', to: status, at: new Date().toISOString() });
      }
      t.status = status;
      let at = beforeId ? data.tasks.findIndex((x) => x.id === beforeId) : -1;
      if (at < 0) {
        const lastOfCol = data.tasks.map((x) => x.status).lastIndexOf(status);
        at = lastOfCol + 1 || data.tasks.length;
      }
      data.tasks.splice(at, 0, t);
      commit();
    },
    removeTasks(ids) {
      const removed = [];
      data.tasks = data.tasks.filter((t, i) => (ids.includes(t.id) ? (removed.push([i, t]), false) : true));
      commit();
      return () => {
        removed.forEach(([i, t]) => data.tasks.splice(i, 0, t));
        commit();
      };
    },
  });

  /* ---------- Toast com "Desfazer" ---------- */

  let toastTimer;
  App.toast = (msg, action) => {
    const el = document.querySelector('.toast');
    el.innerHTML = `<span>${App.esc(msg)}</span>` + (action ? `<button type="button">${App.esc(action.label)}</button>` : '');
    if (action) {
      el.querySelector('button').addEventListener('click', () => {
        action.run();
        el.classList.remove('is-on');
      });
    }
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-on'), action ? 6000 : 4000);
  };

  /* ---------- Arrastar e soltar (mouse e toque) ----------
     No toque, segure ~1/4 de segundo para pegar o item; deslizar sem segurar rola a tela. */

  let dragging = false;
  document.addEventListener('touchmove', (e) => dragging && e.preventDefault(), { passive: false });

  App.drag = function (root, opts) {
    let s = null;

    root.addEventListener('contextmenu', (e) => {
      if (e.target.closest(opts.item) && App.isTouch()) e.preventDefault();
    });

    root.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || s) return;
      const item = e.target.closest(opts.item);
      if (!item || e.target.closest('input, textarea, select, [data-nodrag]')) return;
      s = { item, x: e.clientX, y: e.clientY, pid: e.pointerId, touch: e.pointerType !== 'mouse', active: false };
      if (s.touch) s.timer = setTimeout(() => s && begin(s.x, s.y), 260);
      window.addEventListener('pointermove', move, { passive: false });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', end);
    });

    function begin(x, y) {
      const r = s.item.getBoundingClientRect();
      s.active = true;
      s.dx = x - r.left;
      s.dy = y - r.top;
      s.ghost = s.item.cloneNode(true);
      s.ghost.removeAttribute('id');
      s.ghost.classList.add('drag-ghost');
      s.ghost.style.width = r.width + 'px';
      document.body.appendChild(s.ghost);
      s.item.classList.add('is-dragging');
      document.documentElement.classList.add('is-dragging-any');
      dragging = true;
      if (s.touch && navigator.vibrate) navigator.vibrate(8);
      follow(x, y);
    }

    function follow(x, y) {
      s.ghost.style.transform = `translate(${x - s.dx}px, ${y - s.dy}px) rotate(1.5deg)`;
      const under = document.elementFromPoint(x, y);
      const zone = under && under.closest(opts.zone);
      if (s.zone && s.zone !== zone) s.zone.classList.remove('is-drop');
      s.zone = zone && root.contains(zone) ? zone : null;
      if (s.zone) s.zone.classList.add('is-drop');
      if (opts.sortable) {
        root.querySelectorAll('.drop-before').forEach((n) => n.classList.remove('drop-before'));
        s.before = null;
        if (s.zone) {
          const items = [...s.zone.querySelectorAll(opts.item)].filter((n) => n !== s.item);
          s.before = items.find((n) => {
            const r = n.getBoundingClientRect();
            return y < r.top + r.height / 2;
          });
          if (s.before) s.before.classList.add('drop-before');
        }
      }
    }

    function move(e) {
      if (!s || e.pointerId !== s.pid) return;
      if (!s.active) {
        const dist = Math.hypot(e.clientX - s.x, e.clientY - s.y);
        if (s.touch) {
          if (dist > 8) end();
          return;
        }
        if (dist < 5) return;
        begin(e.clientX, e.clientY);
      }
      e.preventDefault();
      follow(e.clientX, e.clientY);
    }

    function up(e) {
      if (!s || e.pointerId !== s.pid) return;
      if (s.active) {
        /* Engole o clique que o navegador dispara logo depois de soltar. */
        const swallow = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener('click', swallow, true);
        setTimeout(() => window.removeEventListener('click', swallow, true), 0);
        if (s.zone) opts.onDrop(s.item.dataset, s.zone, s.before ? s.before.dataset.id : null);
      }
      end();
    }

    function end() {
      if (!s) return;
      clearTimeout(s.timer);
      if (s.ghost) s.ghost.remove();
      s.item.classList.remove('is-dragging');
      if (s.zone) s.zone.classList.remove('is-drop');
      root.querySelectorAll('.drop-before').forEach((n) => n.classList.remove('drop-before'));
      document.documentElement.classList.remove('is-dragging-any');
      dragging = false;
      s = null;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', end);
    }
  };

  /* ---------- Estado da interface (compartilhado entre as abas) ---------- */

  App.ui = {
    selected: D.today(), // dia selecionado (calendário e planner)
    month: D.today().slice(0, 7), // mês visível no calendário
    composer: null, // { where, date, kind, id } formulário aberto
    kbFocus: 'todo', // coluna visível do kanban no celular
  };

  App.select = (k, opts = {}) => {
    App.ui.selected = k;
    if (opts.month !== false) App.ui.month = k.slice(0, 7);
    App.render();
  };
})();
