/* Aba Kanban: A fazer → Fazendo → Feito. Independente do calendário. */
(function () {
  'use strict';

  const { dates: D, store: S, esc, icon, disc } = App;
  const root = document.getElementById('view-kanban');

  const COLS = [
    { id: 'todo', name: 'A fazer', empty: 'Nada pendente. Escreva acima a próxima atividade.' },
    { id: 'doing', name: 'Fazendo', empty: 'Arraste para cá o que você começou.' },
    { id: 'done', name: 'Feito', empty: 'O que você terminar fica registrado aqui.' },
  ];
  const idx = (s) => COLS.findIndex((c) => c.id === s);

  let editing = null; // id do cartão em edição

  function editForm(t) {
    return `
      <form class="card-form" data-id="${t.id}" novalidate>
        <label class="sr-only" for="kb-title">Atividade</label>
        <input id="kb-title" name="title" value="${esc(t.title)}" maxlength="120" autocomplete="off" aria-describedby="kb-err">
        <p class="composer-err" id="kb-err" hidden>A atividade precisa de um nome.</p>
        <label class="sr-only" for="kb-note">Anotação</label>
        <textarea id="kb-note" name="note" rows="2" maxlength="400" placeholder="Anotação (opcional)">${esc(t.note)}</textarea>
        <fieldset class="line-pick">
          <legend>Linha</legend>
          <div class="line-opts">
            <label class="line-opt" title="Sem linha"><input type="radio" name="line" value="" ${t.line ? '' : 'checked'}><span class="disc disc-none" aria-hidden="true"></span><span class="sr-only">Sem linha</span></label>
            ${App.LINES.map(
              (l) => `<label class="line-opt" title="${esc(l.name)}"><input type="radio" name="line" value="${l.id}" ${t.line === l.id ? 'checked' : ''}>${disc(l.id)}<span class="sr-only">Linha ${l.num}, ${esc(l.name)}</span></label>`
            ).join('')}
          </div>
        </fieldset>
        <div class="composer-actions">
          <button class="btn btn-primary" type="submit">Salvar</button>
          <button class="btn btn-ghost" type="button" data-act="cancel">Cancelar</button>
          <button class="btn btn-danger" type="button" data-act="delete">${icon('trash')}Excluir</button>
        </div>
      </form>`;
  }

  function card(t) {
    if (editing === t.id) return `<li class="card is-editing" data-id="${t.id}">${editForm(t)}</li>`;
    const i = idx(t.status);
    const prev = COLS[i - 1], next = COLS[i + 1];
    const l = t.line ? App.line(t.line) : null;
    return `
      <li class="card ${t.status === 'done' ? 'is-done' : ''}" data-id="${t.id}">
        <div class="card-main">
          ${l ? disc(l.id, 'disc-sm', true) : ''}
          <button class="card-title" type="button" data-act="edit" aria-label="Editar: ${esc(t.title)}">${esc(t.title)}</button>
        </div>
        ${t.note ? `<p class="card-note">${esc(t.note)}</p>` : ''}
        ${t.status === 'done' && t.doneAt ? `<p class="stamp">${icon('check')}Feito em ${D.short(D.parse(t.doneAt))}</p>` : ''}
        <div class="card-actions">
          ${prev ? `<button class="btn btn-icon btn-sm" type="button" data-act="move" data-to="${prev.id}" aria-label="Voltar para ${prev.name}" title="Voltar para ${prev.name}">${icon('arrowLeft')}</button>` : ''}
          ${next ? `<button class="btn btn-icon btn-sm" type="button" data-act="move" data-to="${next.id}" aria-label="Mover para ${next.name}" title="Mover para ${next.name}">${icon('arrowRight')}</button>` : ''}
        </div>
      </li>`;
  }

  function column(c) {
    const list = S.tasks(c.id);
    return `
      <section class="col" data-status="${c.id}" aria-labelledby="col-${c.id}">
        <h2 class="sr-only" id="col-${c.id}">${c.name}, ${list.length}</h2>
        ${c.id === 'done' && list.length ? `<div class="col-tools"><button class="btn btn-ghost btn-sm" type="button" data-act="clear">${icon('trash')}Limpar concluídos</button></div>` : ''}
        ${c.id === 'todo' ? `
          <form class="kb-add" novalidate>
            <label class="sr-only" for="kb-new">Nova atividade</label>
            <input id="kb-new" name="title" placeholder="Nova atividade…" maxlength="120" autocomplete="off" enterkeyhint="done">
            <button class="btn btn-primary" type="submit">${icon('plus')}<span>Adicionar</span></button>
          </form>` : ''}
        <ol class="cards" data-status="${c.id}">
          ${list.map(card).join('')}
        </ol>
        ${list.length ? '' : `<p class="empty">${c.empty}</p>`}
      </section>`;
  }

  function render() {
    const counts = COLS.map((c) => S.tasks(c.id).length);
    root.innerHTML = `
      <div class="view-head">
        <h1 class="view-title">Kanban <span>${counts[0] + counts[1]} em aberto</span></h1>
      </div>
      ${App.legendStrip()}
      <ol class="kb-line" aria-label="Etapas">
        ${COLS.map(
          (c, i) => `
          <li>
            <button class="kb-stop ${App.ui.kbFocus === c.id ? 'is-on' : ''}" type="button" data-act="focus" data-status="${c.id}" aria-pressed="${App.ui.kbFocus === c.id}">
              <span class="stop stop-${c.id}" aria-hidden="true"></span>
              <span class="kb-stop-name">${c.name}</span>
              <span class="kb-stop-count">${counts[i]}</span>
            </button>
          </li>`
        ).join('')}
      </ol>
      <div class="board" data-focus="${App.ui.kbFocus}">
        ${COLS.map(column).join('')}
      </div>`;
  }

  function bind() {
    root.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const el = f.elements;
      const title = el.title.value.trim();
      if (f.classList.contains('kb-add')) {
        if (!title) return el.title.focus();
        S.addTask({ title });
        App.ui.focus = '#kb-new';
        App.render();
      }
      if (f.classList.contains('card-form')) {
        if (!title) {
          f.querySelector('#kb-err').hidden = false;
          el.title.setAttribute('aria-invalid', 'true');
          return el.title.focus();
        }
        S.updateTask(f.dataset.id, { title, note: el.note.value.trim(), line: el.line.value });
        editing = null;
        App.ui.focus = `.card[data-id="${f.dataset.id}"] .card-title`;
        App.render();
      }
    });

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const cardEl = btn.closest('.card');
      const id = cardEl && cardEl.dataset.id;
      const act = btn.dataset.act;
      if (act === 'focus') {
        App.ui.kbFocus = btn.dataset.status;
        App.render();
      }
      if (act === 'edit') {
        editing = id;
        App.ui.focus = '#kb-title';
        App.render();
      }
      if (act === 'cancel') {
        editing = null;
        App.ui.focus = `.card[data-id="${id}"] .card-title`;
        App.render();
      }
      if (act === 'delete') {
        const t = S.getTask(id);
        editing = null;
        const undo = S.removeTasks([id]);
        App.toast(`“${t.title}” excluída.`, { label: 'Desfazer', run: undo });
      }
      if (act === 'move') {
        const to = btn.dataset.to;
        S.moveTask(id, to, null);
        const t = S.getTask(id);
        App.toast(`“${t.title}” → ${COLS[idx(to)].name}.`);
      }
      if (act === 'clear') {
        const ids = S.tasks('done').map((t) => t.id);
        const undo = S.removeTasks(ids);
        App.toast(`${ids.length} concluída${ids.length > 1 ? 's' : ''} removida${ids.length > 1 ? 's' : ''}.`, { label: 'Desfazer', run: undo });
      }
    });

    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && editing) {
        const id = editing;
        editing = null;
        App.ui.focus = `.card[data-id="${id}"] .card-title`;
        App.render();
      }
    });

    App.drag(root, {
      item: '.card:not(.is-editing)',
      zone: '.col',
      sortable: true,
      onDrop: (ds, zone, beforeId) => S.moveTask(ds.id, zone.dataset.status, beforeId),
    });
  }

  App.views = App.views || {};
  App.views.kanban = { render, bind };
})();
