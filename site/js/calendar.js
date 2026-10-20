/* Aba Calendário: o mês em malha + a linha da semana do dia selecionado. */
(function () {
  'use strict';

  const { dates: D, store: S, esc, icon } = App;
  const root = document.getElementById('view-calendario');
  const MAX_CHIPS = 2;
  let lastSel = null;

  function monthCells(ym) {
    const [y, m] = ym.split('-').map(Number);
    const start = D.weekStart(new Date(y, m - 1, 1));
    const end = D.add(D.weekStart(new Date(y, m, 0)), 6);
    const cells = [];
    for (let d = start; d <= end; d = D.add(d, 1)) cells.push(d);
    return { y, m: m - 1, cells };
  }

  function chip(e, k) {
    const l = App.line(e.line);
    return `
      <li><button class="chip ${e.done ? 'is-done' : ''}" type="button" data-act="edit-event" data-id="${e.id}" data-date="${k}"
        aria-label="Editar ${esc(e.title)}${e.time ? ' às ' + e.time : ''}, linha ${esc(l.name)}">
        <i class="chip-dot" style="--c:${l.color}" aria-hidden="true"></i>
        <span class="chip-text">${e.time ? `<span class="chip-time">${e.time}</span> ` : ''}<span class="chip-title">${esc(e.title)}</span></span>
      </button></li>`;
  }

  function dayCell(d, ctx) {
    const k = D.key(d);
    const hol = D.holiday(k);
    const evs = S.eventsOn(k);
    const cls = [
      'day',
      d.getMonth() !== ctx.m && 'is-out',
      (D.wd(d) === 6 || (hol && hol.off)) && 'is-red',
      k === ctx.today && 'is-today',
      k === ctx.sel && 'is-selected',
      D.key(D.weekStart(d)) === ctx.selWeek && 'is-week',
    ].filter(Boolean).join(' ');
    const n = evs.length;
    const label = `${D.long(d)}${k === ctx.today ? ', hoje' : ''}${hol ? ', ' + hol.name : ''}${n ? `, ${n} compromisso${n > 1 ? 's' : ''}` : ''}`;
    return `
      <div class="${cls}" data-date="${k}">
        <button class="day-btn" type="button" data-act="select" data-date="${k}" aria-label="${esc(label)}"
          aria-pressed="${k === ctx.sel}" tabindex="${k === ctx.sel ? 0 : -1}">
          <span class="day-num">${d.getDate()}</span>
        </button>
        ${hol ? `<span class="day-hol">${esc(hol.name)}</span>` : ''}
        ${n ? `<ul class="chips">${evs.slice(0, MAX_CHIPS).map((e) => chip(e, k)).join('')}${n > MAX_CHIPS ? `<li class="chip-more" aria-hidden="true">+${n - MAX_CHIPS}</li>` : ''}</ul>` : ''}
      </div>`;
  }

  function weekline(ctx) {
    const sel = D.parse(ctx.sel);
    const c = App.ui.composer;
    /* O formulário só abre ao escolher um dia (ou em "Agendar"); fechado, a semana inteira cabe na tela. */
    const open = c && c.where === 'cal' && c.date === ctx.sel ? c : null;
    return `
      <aside class="weekline" aria-label="Linha da semana">
        <div class="weekline-head">
          <div>
            <h2>Linha da semana</h2>
            <p>${D.range(D.weekStart(sel))}</p>
          </div>
          <button class="btn btn-outline btn-sm" type="button" data-act="to-planner">Abrir no planner${icon('open')}</button>
        </div>
        ${App.legendStrip()}
        <ol class="stations stations-col">
          ${D.week(sel)
            .map((d) => {
              const k = D.key(d);
              const isSel = k === ctx.sel;
              return App.station(d, {
                where: 'cal',
                selected: isSel,
                arriving: isSel && ctx.arriving,
                composer: isSel && open ? App.composer.html(open) : '',
                addInline: isSel,
              });
            })
            .join('')}
        </ol>
      </aside>`;
  }

  function render() {
    const { y, m, cells } = monthCells(App.ui.month);
    const ctx = {
      m,
      today: D.today(),
      sel: App.ui.selected,
      selWeek: D.key(D.weekStart(D.parse(App.ui.selected))),
      /* A faixa da estação só "acende" quando o dia selecionado muda. */
      arriving: lastSel !== null && lastSel !== App.ui.selected,
    };
    lastSel = App.ui.selected;
    root.innerHTML = `
      <div class="cal-main">
        <div class="view-head">
          <h1 class="view-title">${D.MESES[m]} <span>${y}</span></h1>
          <div class="pager">
            <button class="btn btn-icon" type="button" data-act="prev" aria-label="Mês anterior">${icon('left')}</button>
            <button class="btn btn-outline" type="button" data-act="today">Hoje</button>
            <button class="btn btn-icon" type="button" data-act="next" aria-label="Próximo mês">${icon('right')}</button>
          </div>
        </div>
        <div class="month" style="--rows:${cells.length / 7}">
          <div class="month-dow" aria-hidden="true">${D.DIAS.map((d, i) => `<span class="${i === 6 ? 'is-red' : ''}">${d}</span>`).join('')}</div>
          <div class="month-grid">${cells.map((d) => dayCell(d, ctx)).join('')}</div>
        </div>
        <p class="hint">Clique em um dia para agendar. Arraste um compromisso para outro dia para mudar a data.</p>
      </div>
      ${weekline(ctx)}`;
  }

  function shiftMonth(n) {
    const [y, m] = App.ui.month.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    App.ui.month = D.key(d).slice(0, 7);
    App.ui.composer = null;
    App.render();
  }

  function bind() {
    App.composer.bind(root);
    App.bindItems(root, 'cal');

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn || btn.closest('form.composer') || btn.closest('.item')) return;
      const act = btn.dataset.act;
      if (act === 'prev') shiftMonth(-1);
      if (act === 'next') shiftMonth(1);
      if (act === 'today') {
        App.ui.composer = null;
        App.select(D.today());
      }
      if (act === 'select' || act === 'compose') {
        const k = btn.dataset.date;
        App.ui.composer = { where: 'cal', date: k };
        /* Mouse/teclado: já deixa o cursor no campo, pronto para digitar.
           Celular: rola até o dia na linha da semana, logo abaixo do mês. */
        if (!App.isTouch()) App.ui.focus = '#cmp-cal-title';
        else if (btn.classList.contains('day-btn') && window.matchMedia('(max-width: 960px)').matches) App.ui.reveal = '.station.is-selected';
        App.select(k, { month: k.slice(0, 7) !== App.ui.month });
      }
      if (act === 'edit-event') {
        const k = btn.dataset.date;
        App.ui.composer = { where: 'cal', date: k, kind: 'event', id: btn.dataset.id };
        App.ui.focus = '#cmp-cal-title';
        App.select(k, { month: k.slice(0, 7) !== App.ui.month });
      }
      if (act === 'to-planner') App.go('planner');
    });

    /* Setas do teclado andam pelos dias do mês. */
    root.addEventListener('keydown', (e) => {
      if (!e.target.classList.contains('day-btn')) return;
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!step) return;
      e.preventDefault();
      const k = D.key(D.add(D.parse(e.target.dataset.date), step));
      App.ui.composer = null;
      App.ui.focus = `.day-btn[data-date="${k}"]`;
      App.select(k);
    });

    App.drag(root, {
      item: '.chip, .item.kind-event',
      zone: '.day, .station',
      onDrop: (ds, zone) => App.moveEventTo(ds.id, zone.dataset.date),
    });
  }

  App.views = App.views || {};
  App.views.calendario = { render, bind };
})();
