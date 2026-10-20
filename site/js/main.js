/* Inicialização: abas, legenda das linhas, roteamento por #hash e renderização. */
(function () {
  'use strict';

  const { icon, esc } = App;
  const TABS = [
    { id: 'calendario', name: 'Calendário', icon: 'calendar' },
    { id: 'planner', name: 'Planner', icon: 'route' },
    { id: 'kanban', name: 'Kanban', icon: 'kanban' },
  ];
  let current = null;

  document.querySelectorAll('.tab').forEach((btn) => {
    const t = TABS.find((x) => x.id === btn.dataset.view);
    btn.innerHTML = `${icon(t.icon)}<span>${t.name}</span>`;
    btn.addEventListener('click', () => App.go(t.id));
  });

  /* Setas esquerda/direita andam entre as abas. */
  document.querySelector('.tabs').addEventListener('keydown', (e) => {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
    if (!step) return;
    const i = TABS.findIndex((t) => t.id === current);
    const next = TABS[(i + step + TABS.length) % TABS.length];
    App.go(next.id);
    document.getElementById(`tab-${next.id}`).focus();
  });

  document.querySelector('.legend').innerHTML = App.LINES.map(
    (l) => `<li>${App.disc(l.id, 'disc-sm')}<span>${esc(l.name)}</span></li>`
  ).join('');

  Object.values(App.views).forEach((v) => v.bind());

  App.go = (id) => {
    if (!App.views[id]) id = 'calendario';
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    if (current !== id) {
      App.ui.composer = null;
      if (id === 'calendario') App.ui.month = App.ui.selected.slice(0, 7);
    }
    current = id;
    TABS.forEach((t) => {
      const on = t.id === id;
      const tab = document.getElementById(`tab-${t.id}`);
      tab.setAttribute('aria-selected', on);
      tab.tabIndex = on ? 0 : -1;
      document.getElementById(`view-${t.id}`).hidden = !on;
    });
    App.render();
    window.scrollTo(0, 0);
  };

  App.render = () => {
    if (!current) return;
    App.views[current].render();
    if (App.ui.focus) {
      const el = document.querySelector(`#view-${current} ${App.ui.focus}`);
      App.ui.focus = null;
      if (el) {
        el.focus({ preventScroll: false });
        /* Cursor no fim do texto (campos de data/hora não aceitam seleção). */
        try {
          if (el.setSelectionRange && el.value) el.setSelectionRange(el.value.length, el.value.length);
        } catch (e) {}
      }
    }
    if (App.ui.reveal) {
      const el = document.querySelector(`#view-${current} ${App.ui.reveal}`);
      App.ui.reveal = null;
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (el) el.scrollIntoView({ block: 'start', behavior: calm ? 'auto' : 'smooth' });
    }
  };

  App.store.subscribe(App.render);
  window.addEventListener('hashchange', () => App.go(location.hash.slice(1)));

  /* Virou o dia com o app aberto: atualiza o "hoje". */
  let lastDay = App.dates.today();
  setInterval(() => {
    const t = App.dates.today();
    if (t !== lastDay) {
      lastDay = t;
      App.render();
    }
  }, 60000);

  App.go(location.hash.slice(1) || 'calendario');
})();
