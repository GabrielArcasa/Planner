/* Aba Planner: a semana de segunda a domingo + a rotina que se repete. */
(function () {
  'use strict';

  const { dates: D, store: S, esc, icon, disc } = App;
  const root = document.getElementById('view-planner');

  function routineRow(r) {
    return `
      <li class="routine" data-id="${r.id}">
        <span class="item-time">${r.time ? esc(r.time) : '<span class="sr-only">sem horário</span>'}</span>
        ${disc(r.line, 'disc-sm', true)}
        <button class="routine-title" type="button" data-act="edit-routine" data-id="${r.id}">${esc(r.title)}</button>
        <span class="routine-days" aria-label="Repete ${App.daysText(r.days)}">
          ${D.DIAS.map((d, i) => `<span class="${r.days.includes(i) ? 'on' : ''}" aria-hidden="true">${d.slice(0, 1)}</span>`).join('')}
        </span>
      </li>`;
  }

  function routineSection() {
    const c = App.ui.composer;
    const list = S.routines();
    const open = c && c.where === 'routine';
    return `
      <section class="routines" aria-labelledby="routines-title">
        <div class="routines-head">
          <div>
            <h2 id="routines-title">Rotina semanal</h2>
            <p>O que se repete toda semana aparece sozinho nos dias marcados.</p>
          </div>
          ${open && !c.id ? '' : `<button class="btn btn-outline" type="button" data-act="new-routine">${icon('plus')}Nova rotina</button>`}
        </div>
        ${open ? `<div class="routines-form">${App.composer.html(c)}</div>` : ''}
        ${list.length
          ? `<ul class="routine-list">${list.map(routineRow).join('')}</ul>`
          : open ? '' : '<p class="empty">Nenhuma rotina ainda. Ex.: Academia, seg, qua e sex às 07:00.</p>'}
      </section>`;
  }

  function render() {
    const sel = D.parse(App.ui.selected);
    const start = D.weekStart(sel);
    const c = App.ui.composer;
    const isThisWeek = D.key(start) === D.key(D.weekStart(new Date()));
    /* O dia com o formulário aberto ganha mais largura. */
    const cols = D.week(sel)
      .map((d) => (c && c.where === 'planner' && c.date === D.key(d) ? 'minmax(300px, 2.2fr)' : 'minmax(0, 1fr)'))
      .join(' ');
    root.innerHTML = `
      <div class="view-head">
        <h1 class="view-title">Semana <span>${D.range(start)}</span></h1>
        <div class="pager">
          <button class="btn btn-icon" type="button" data-act="prev" aria-label="Semana anterior">${icon('left')}</button>
          <button class="btn btn-outline" type="button" data-act="today" ${isThisWeek ? 'aria-disabled="true"' : ''}>Esta semana</button>
          <button class="btn btn-icon" type="button" data-act="next" aria-label="Próxima semana">${icon('right')}</button>
        </div>
      </div>
      ${App.legendStrip()}
      <ol class="stations stations-row" aria-label="Dias da semana" style="--cols:${cols}">
        ${D.week(sel)
          .map((d) => {
            const k = D.key(d);
            const mine = c && c.where === 'planner' && c.date === k;
            return App.station(d, {
              where: 'planner',
              composer: mine ? App.composer.html(c) : '',
              addButton: true,
            });
          })
          .join('')}
      </ol>
      ${routineSection()}`;
  }

  function shiftWeek(n) {
    App.ui.composer = null;
    App.select(D.key(D.add(D.parse(App.ui.selected), n * 7)));
  }

  function bind() {
    App.composer.bind(root);
    App.bindItems(root, 'planner');

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn || btn.closest('form.composer') || btn.closest('.item')) return;
      const act = btn.dataset.act;
      if (act === 'prev') shiftWeek(-1);
      if (act === 'next') shiftWeek(1);
      if (act === 'today') {
        App.ui.composer = null;
        App.select(D.today());
      }
      if (act === 'compose' || act === 'select') {
        const k = btn.dataset.date;
        App.ui.selected = k;
        App.ui.composer = { where: 'planner', date: k };
        App.ui.focus = '#cmp-planner-title';
        App.render();
      }
      if (act === 'new-routine') {
        App.ui.composer = { where: 'routine' };
        App.ui.focus = '#cmp-routine-title';
        App.render();
      }
      if (act === 'edit-routine') {
        App.ui.composer = { where: 'routine', kind: 'routine', id: btn.dataset.id };
        App.ui.focus = '#cmp-routine-title';
        App.render();
      }
    });

    App.drag(root, {
      item: '.item.kind-event',
      zone: '.station',
      onDrop: (ds, zone) => App.moveEventTo(ds.id, zone.dataset.date),
    });
  }

  App.views = App.views || {};
  App.views.planner = { render, bind };
})();
