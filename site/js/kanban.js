/* Aba Kanban: A fazer → Fazendo → Feito. Independente do calendário.
   Cada cartão tem cor, tags, checklists e um histórico de atualizações. */
(function () {
  'use strict';

  const { dates: D, store: S, esc, icon } = App;
  const root = document.getElementById('view-kanban');

  const COLS = [
    { id: 'todo', name: 'A fazer', empty: 'Nada pendente. Escreva acima a próxima atividade.' },
    { id: 'doing', name: 'Fazendo', empty: 'Arraste para cá o que você começou.' },
    { id: 'done', name: 'Feito', empty: 'O que você terminar fica registrado aqui.' },
  ];
  const idx = (s) => COLS.findIndex((c) => c.id === s);
  const sameTag = (a, b) => a.toLowerCase() === b.toLowerCase();

  App.ui.kbOpen = null; // cartão aberto no painel
  App.ui.kbTag = null; // filtro por tag
  let editingComment = null;
  let lastOpen = null;

  const visible = (t) => !App.ui.kbTag || t.tags.some((g) => sameTag(g, App.ui.kbTag));
  /* A cor do cartão é uma das linhas: tom no fundo + disco numerado ao lado do título. */
  const colorAttrs = (t) => (t.color ? ` data-color="${t.color}" style="--c:${App.line(t.color).color}"` : '');
  function progress(list) {
    const items = list.flatMap((c) => c.items);
    return { done: items.filter((i) => i.done).length, total: items.length };
  }

  /* ---------- Quadro ---------- */

  function tagChips(tags) {
    if (!tags.length) return '';
    return `<ul class="tags">${tags
      .map((g) => `<li><button class="tag" type="button" data-act="filter" data-tag="${esc(g)}" title="Mostrar só cartões com esta tag">${esc(g)}</button></li>`)
      .join('')}</ul>`;
  }

  function card(t) {
    const i = idx(t.status);
    const prev = COLS[i - 1], next = COLS[i + 1];
    const p = progress(t.checklists);
    const notes = t.comments.filter((c) => c.kind !== 'move').length;
    return `
      <li class="card ${t.color ? 'has-color' : ''} ${t.status === 'done' ? 'is-done' : ''} ${App.ui.kbOpen === t.id ? 'is-open' : ''}" data-id="${t.id}"${colorAttrs(t)}>
        <div class="card-head">
          ${t.color ? App.disc(t.color, 'disc-sm', true) : ''}
          <button class="card-title" type="button" data-act="open" aria-controls="card-panel">${esc(t.title)}</button>
        </div>
        ${tagChips(t.tags)}
        ${t.note ? `<p class="card-note">${esc(t.note)}</p>` : ''}
        ${t.status === 'done' && t.doneAt ? `<p class="stamp">${icon('check')}Feito em ${D.short(D.parse(t.doneAt))}</p>` : ''}
        <div class="card-foot">
          ${p.total ? `<span class="meta ${p.done === p.total ? 'is-complete' : ''}" title="Checklist">${icon('checklist')}<span class="sr-only">Checklist:</span>${p.done}/${p.total}</span>` : ''}
          ${notes ? `<span class="meta" title="Atualizações">${icon('message')}<span class="sr-only">Atualizações:</span>${notes}</span>` : ''}
          <span class="card-actions">
            ${prev ? `<button class="btn btn-icon btn-sm" type="button" data-act="move" data-to="${prev.id}" aria-label="Voltar para ${prev.name}" title="Voltar para ${prev.name}">${icon('arrowLeft')}</button>` : ''}
            ${next ? `<button class="btn btn-icon btn-sm" type="button" data-act="move" data-to="${next.id}" aria-label="Mover para ${next.name}" title="Mover para ${next.name}">${icon('arrowRight')}</button>` : ''}
          </span>
        </div>
      </li>`;
  }

  function column(c) {
    const list = S.tasks(c.id).filter(visible);
    const done = S.tasks('done');
    return `
      <section class="col" data-status="${c.id}" aria-labelledby="col-${c.id}">
        <h2 class="sr-only" id="col-${c.id}">${c.name}, ${list.length}</h2>
        ${c.id === 'done' && done.length && !App.ui.kbTag ? `<div class="col-tools"><button class="btn btn-ghost btn-sm" type="button" data-act="clear">${icon('trash')}Limpar concluídos</button></div>` : ''}
        ${c.id === 'todo' ? `
          <form class="kb-add" novalidate>
            <label class="sr-only" for="kb-new">Nova atividade</label>
            <input id="kb-new" name="title" placeholder="Nova atividade…" maxlength="120" autocomplete="off" enterkeyhint="done">
            <button class="btn btn-primary" type="submit">${icon('plus')}<span>Adicionar</span></button>
          </form>` : ''}
        <ol class="cards" data-status="${c.id}">
          ${list.map(card).join('')}
        </ol>
        ${list.length ? '' : `<p class="empty">${App.ui.kbTag ? 'Nenhum cartão com essa tag aqui.' : c.empty}</p>`}
      </section>`;
  }

  function line() {
    return `
      <ol class="kb-line" aria-label="Etapas">
        ${COLS.map(
          (c) => `
          <li>
            <button class="kb-stop ${App.ui.kbFocus === c.id ? 'is-on' : ''}" type="button" data-act="focus" data-status="${c.id}" aria-pressed="${App.ui.kbFocus === c.id}">
              <span class="stop stop-${c.id}" aria-hidden="true"></span>
              <span class="kb-stop-name">${c.name}</span>
              <span class="kb-stop-count">${S.tasks(c.id).filter(visible).length}</span>
            </button>
          </li>`
        ).join('')}
      </ol>`;
  }

  function board() {
    return `<div class="board" data-focus="${App.ui.kbFocus}">${COLS.map(column).join('')}</div>`;
  }

  /* Redesenha só as colunas (o painel aberto fica intacto enquanto a pessoa digita). */
  function renderBoard() {
    root.querySelector('.kb-line').outerHTML = line();
    root.querySelector('.board').outerHTML = board();
  }

  /* ---------- Painel do cartão ---------- */

  function checklist(c) {
    const p = progress([c]);
    const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
    return `
      <div class="checklist ${p.total && p.done === p.total ? 'is-complete' : ''}" data-cl="${c.id}">
        <div class="cl-head">
          <label class="sr-only" for="cl-title-${c.id}">Nome da checklist</label>
          <input class="cl-title" id="cl-title-${c.id}" value="${esc(c.title)}" maxlength="60" autocomplete="off">
          <span class="cl-count">${p.done}/${p.total}</span>
          <button class="btn btn-icon btn-sm btn-quiet" type="button" data-act="del-checklist" aria-label="Excluir checklist ${esc(c.title)}" title="Excluir checklist">${icon('trash')}</button>
        </div>
        <div class="cl-bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
        <ul class="cl-items">
          ${c.items
            .map(
              (it) => `
            <li class="cl-item ${it.done ? 'is-done' : ''}" data-item="${it.id}">
              <button class="mark" type="button" data-act="toggle-item" aria-pressed="${it.done}" aria-label="${it.done ? 'Desmarcar' : 'Marcar como feito'}: ${esc(it.text)}">${icon('check')}</button>
              <label class="sr-only" for="cl-i-${it.id}">Item</label>
              <input class="cl-text" id="cl-i-${it.id}" value="${esc(it.text)}" maxlength="120" autocomplete="off">
              <button class="btn btn-icon btn-sm btn-quiet" type="button" data-act="del-item" aria-label="Remover item: ${esc(it.text)}" title="Remover item">${icon('x')}</button>
            </li>`
            )
            .join('')}
        </ul>
        <form class="cl-add" data-cl="${c.id}" novalidate>
          <label class="sr-only" for="cl-new-${c.id}">Novo item</label>
          <input id="cl-new-${c.id}" name="text" placeholder="Adicionar item…" maxlength="120" autocomplete="off" enterkeyhint="done">
          <button class="btn btn-outline btn-sm" type="submit">${icon('plus')}Adicionar</button>
        </form>
      </div>`;
  }

  function entry(c) {
    if (c.kind === 'move') {
      return `<li class="entry entry-move" data-to="${c.to}">Movido para <strong>${COLS[idx(c.to)].name}</strong> · <time datetime="${c.at}">${D.when(c.at)}</time></li>`;
    }
    if (editingComment === c.id) {
      return `
        <li class="entry is-editing">
          <form class="comment-edit" data-c="${c.id}" novalidate>
            <label class="sr-only" for="ce-${c.id}">Editar atualização</label>
            <textarea id="ce-${c.id}" name="text" rows="3">${esc(c.text)}</textarea>
            <div class="comment-actions">
              <button class="btn btn-ghost btn-sm" type="button" data-act="cancel-edit">Cancelar</button>
              <button class="btn btn-primary btn-sm" type="submit">Salvar</button>
            </div>
          </form>
        </li>`;
    }
    return `
      <li class="entry" data-c="${c.id}">
        <div class="entry-meta">
          <time datetime="${c.at}">${D.when(c.at)}</time>${c.edited ? '<span>· editado</span>' : ''}
          <span class="entry-actions">
            <button class="btn btn-ghost btn-sm" type="button" data-act="edit-comment">Editar</button>
            <button class="btn btn-ghost btn-sm" type="button" data-act="del-comment">Excluir</button>
          </span>
        </div>
        <p class="entry-text">${esc(c.text)}</p>
      </li>`;
  }

  function panel(t) {
    const suggestions = S.allTags().filter((g) => !t.tags.some((x) => sameTag(x, g))).slice(0, 8);
    return `
      <section class="card-panel ${t.color ? 'has-color' : ''} ${lastOpen !== t.id ? 'is-entering' : ''}" id="card-panel"
        role="dialog" aria-modal="false" aria-labelledby="cp-title-label" data-id="${t.id}"${colorAttrs(t)}>
        <div class="cp-head">
          <div class="cp-top">
            <div class="cp-status" role="group" aria-label="Etapa">
              ${COLS.map(
                (c) => `<button class="cp-stop ${t.status === c.id ? 'is-on' : ''}" type="button" data-act="status" data-status="${c.id}" aria-pressed="${t.status === c.id}">
                  <span class="stop stop-${c.id}" aria-hidden="true"></span>${c.name}</button>`
              ).join('')}
            </div>
            <button class="btn btn-icon btn-sm cp-close" type="button" data-act="close" aria-label="Fechar detalhes" title="Fechar (Esc)">${icon('x')}</button>
          </div>
          <div class="cp-title-row">
            ${t.color ? App.disc(t.color, '', true) : ''}
            <label class="sr-only" id="cp-title-label" for="cp-title">Título do cartão</label>
            <textarea class="cp-title" id="cp-title" rows="1" maxlength="120">${esc(t.title)}</textarea>
          </div>
        </div>

        <div class="cp-body">
          <section class="cp-sec" aria-labelledby="cp-color-h">
            <h3 id="cp-color-h">Cor <output class="line-name">${t.color ? `Linha ${App.line(t.color).num} · ${esc(App.line(t.color).name)}` : 'Sem cor'}</output></h3>
            <div class="line-opts" role="radiogroup" aria-labelledby="cp-color-h">
              <label class="line-opt" title="Sem cor"><input type="radio" name="cp-color" value="" ${t.color ? '' : 'checked'}><span class="disc disc-none" aria-hidden="true"></span><span class="sr-only">Sem cor</span></label>
              ${App.LINES.map(
                (l) => `<label class="line-opt" title="${esc(l.name)}"><input type="radio" name="cp-color" value="${l.id}" ${t.color === l.id ? 'checked' : ''}>${App.disc(l.id)}<span class="sr-only">Linha ${l.num}, ${esc(l.name)}</span></label>`
              ).join('')}
            </div>
          </section>

          <section class="cp-sec" aria-labelledby="cp-tags-h">
            <h3 id="cp-tags-h">Tags</h3>
            ${t.tags.length ? `<ul class="tags">${t.tags.map((g) => `<li class="tag">${esc(g)}<button type="button" data-act="untag" data-tag="${esc(g)}" aria-label="Remover tag ${esc(g)}">${icon('x')}</button></li>`).join('')}</ul>` : ''}
            <form class="tag-add" novalidate>
              <label class="sr-only" for="cp-tag">Nova tag</label>
              <input id="cp-tag" name="tag" placeholder="Nova tag…" maxlength="24" autocomplete="off" enterkeyhint="done">
              <button class="btn btn-outline btn-sm" type="submit">${icon('plus')}Adicionar</button>
            </form>
            ${suggestions.length ? `<div class="tag-suggest"><span>Usadas:</span>${suggestions.map((g) => `<button class="tag tag-ghost" type="button" data-act="tag" data-tag="${esc(g)}">${icon('plus')}${esc(g)}</button>`).join('')}</div>` : ''}
          </section>

          <section class="cp-sec">
            <h3><label for="cp-note">Descrição</label></h3>
            <textarea class="cp-note" id="cp-note" rows="3" maxlength="2000" placeholder="Detalhes, links, o que for preciso…">${esc(t.note)}</textarea>
          </section>

          <section class="cp-sec" aria-labelledby="cp-cl-h">
            <div class="cp-sec-head">
              <h3 id="cp-cl-h">Checklists</h3>
              <button class="btn btn-ghost btn-sm" type="button" data-act="add-checklist">${icon('plus')}Nova checklist</button>
            </div>
            ${t.checklists.length ? t.checklists.map(checklist).join('') : '<p class="empty">Divida a atividade em passos. Ex.: comprar tinta, cobrir os móveis, pintar.</p>'}
          </section>

          <section class="cp-sec" aria-labelledby="cp-feed-h">
            <h3 id="cp-feed-h">Atualizações</h3>
            <form class="comment-add" novalidate>
              <label class="sr-only" for="cp-comment">Nova atualização</label>
              <textarea id="cp-comment" name="text" rows="2" maxlength="2000" placeholder="Escreva uma atualização ou feedback…"></textarea>
              <div class="comment-actions">
                <span class="hint-key">Ctrl + Enter publica</span>
                <button class="btn btn-primary btn-sm" type="submit">Publicar</button>
              </div>
            </form>
            <ol class="feed">
              ${t.comments.map(entry).join('')}
              <li class="entry entry-created">Cartão criado · ${D.short(D.parse(t.createdAt))}</li>
            </ol>
          </section>

          <div class="cp-foot">
            <button class="btn btn-danger btn-sm" type="button" data-act="delete">${icon('trash')}Excluir cartão</button>
          </div>
        </div>
      </section>`;
  }

  function fitTitle() {
    const el = root.querySelector('.cp-title');
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  /* ---------- Tela inteira ---------- */

  function render() {
    const open = App.ui.kbOpen && S.getTask(App.ui.kbOpen);
    if (App.ui.kbOpen && !open) App.ui.kbOpen = null;
    const prevPanel = root.querySelector('.card-panel');
    const scroll = prevPanel ? prevPanel.scrollTop : 0;
    const counts = COLS.map((c) => S.tasks(c.id).length);
    root.innerHTML = `
      <div class="view-head">
        <h1 class="view-title">Kanban <span>${counts[0] + counts[1]} em aberto</span></h1>
      </div>
      ${App.ui.kbTag ? `
        <div class="kb-filter" role="status">
          ${icon('tag')}<span>Mostrando só a tag</span><span class="tag">${esc(App.ui.kbTag)}</span>
          <button class="btn btn-ghost btn-sm" type="button" data-act="clear-filter">${icon('x')}Limpar filtro</button>
        </div>` : ''}
      ${line()}
      ${board()}
      ${open ? panel(open) : ''}`;
    root.classList.toggle('has-panel', Boolean(open));
    const panelEl = root.querySelector('.card-panel');
    if (panelEl && open.id === lastOpen) panelEl.scrollTop = scroll;
    lastOpen = open ? open.id : null;
    fitTitle();
  }

  /* ---------- Ações ---------- */

  function openCard(id) {
    App.ui.kbOpen = id;
    editingComment = null;
    App.ui.focus = '.cp-close';
    App.render();
  }
  function closeCard() {
    const id = App.ui.kbOpen;
    App.ui.kbOpen = null;
    editingComment = null;
    App.ui.focus = `.card[data-id="${id}"] .card-title`;
    App.render();
  }
  function addTag(id, raw) {
    const tag = raw.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!tag) return;
    const existing = S.allTags().find((g) => sameTag(g, tag)) || tag;
    S.editTask(id, (t) => t.tags.some((g) => sameTag(g, existing)) || t.tags.push(existing));
  }
  const findChecklist = (t, el) => t.checklists.find((c) => c.id === el.closest('[data-cl]').dataset.cl);
  const findItem = (cl, el) => cl.items.find((i) => i.id === el.closest('[data-item]').dataset.item);

  function bind() {
    root.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const id = App.ui.kbOpen;

      if (f.classList.contains('kb-add')) {
        const title = f.elements.title.value.trim();
        if (!title) return f.elements.title.focus();
        S.addTask({ title });
        App.ui.focus = '#kb-new';
        App.render();
      }
      if (f.classList.contains('tag-add')) {
        addTag(id, f.elements.tag.value);
        App.ui.focus = '#cp-tag';
        App.render();
      }
      if (f.classList.contains('cl-add')) {
        const text = f.elements.text.value.trim();
        if (!text) return f.elements.text.focus();
        S.editTask(id, (t) => findChecklist(t, f).items.push({ id: App.uid(), text, done: false }));
        App.ui.focus = `#cl-new-${f.dataset.cl}`;
        App.render();
      }
      if (f.classList.contains('comment-add')) {
        const text = f.elements.text.value.trim();
        if (!text) return f.elements.text.focus();
        S.editTask(id, (t) => t.comments.unshift({ id: App.uid(), kind: 'comment', text, at: new Date().toISOString() }));
        App.ui.focus = '#cp-comment';
        App.render();
      }
      if (f.classList.contains('comment-edit')) {
        const text = f.elements.text.value.trim();
        if (!text) return f.elements.text.focus();
        S.editTask(id, (t) => Object.assign(t.comments.find((c) => c.id === f.dataset.c), { text, edited: true }));
        editingComment = null;
        App.render();
      }
    });

    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      const cardEl = e.target.closest('.card');
      /* Clique no corpo do cartão (fora de botões) também abre. */
      if (!btn && cardEl) return openCard(cardEl.dataset.id);
      if (!btn) return;
      const act = btn.dataset.act;
      const id = cardEl ? cardEl.dataset.id : App.ui.kbOpen;

      if (act === 'open') openCard(id);
      if (act === 'close') closeCard();
      if (act === 'focus') {
        App.ui.kbFocus = btn.dataset.status;
        App.render();
      }
      if (act === 'filter') {
        App.ui.kbTag = btn.dataset.tag;
        App.render();
      }
      if (act === 'clear-filter') {
        App.ui.kbTag = null;
        App.render();
      }
      if (act === 'move' || act === 'status') {
        const to = btn.dataset.to || btn.dataset.status;
        const t = S.getTask(id);
        if (t.status === to) return;
        S.moveTask(id, to, null);
        if (act === 'move') App.toast(`“${t.title}” → ${COLS[idx(to)].name}.`);
      }
      if (act === 'clear') {
        const ids = S.tasks('done').map((t) => t.id);
        if (ids.includes(App.ui.kbOpen)) App.ui.kbOpen = null;
        const undo = S.removeTasks(ids);
        App.toast(`${ids.length} concluída${ids.length > 1 ? 's' : ''} removida${ids.length > 1 ? 's' : ''}.`, { label: 'Desfazer', run: undo });
      }
      if (act === 'delete') {
        const t = S.getTask(id);
        App.ui.kbOpen = null;
        const undo = S.removeTasks([id]);
        App.toast(`“${t.title}” excluída.`, { label: 'Desfazer', run: undo });
      }
      if (act === 'tag') {
        addTag(id, btn.dataset.tag);
        App.ui.focus = '#cp-tag';
        App.render();
      }
      if (act === 'untag') {
        S.editTask(id, (t) => (t.tags = t.tags.filter((g) => g !== btn.dataset.tag)));
        if (App.ui.kbTag && sameTag(App.ui.kbTag, btn.dataset.tag)) App.ui.kbTag = null;
      }
      if (act === 'add-checklist') {
        const cl = { id: App.uid(), title: 'Checklist', items: [] };
        S.editTask(id, (t) => t.checklists.push(cl));
        App.ui.focus = `#cl-new-${cl.id}`;
        App.render();
      }
      if (act === 'del-checklist') {
        const t = S.getTask(id);
        const i = t.checklists.findIndex((c) => c.id === btn.closest('[data-cl]').dataset.cl);
        const [cl] = t.checklists.splice(i, 1);
        S.editTask(id, () => {});
        App.toast(`Checklist “${cl.title}” excluída.`, { label: 'Desfazer', run: () => S.editTask(id, (x) => x.checklists.splice(i, 0, cl)) });
      }
      if (act === 'toggle-item') {
        S.editTask(id, (t) => {
          const it = findItem(findChecklist(t, btn), btn);
          it.done = !it.done;
        });
        App.ui.focus = `[data-item="${btn.closest('[data-item]').dataset.item}"] .mark`;
        App.render();
      }
      if (act === 'del-item') {
        S.editTask(id, (t) => {
          const cl = findChecklist(t, btn);
          cl.items = cl.items.filter((i) => i.id !== btn.closest('[data-item]').dataset.item);
        });
      }
      if (act === 'edit-comment') {
        editingComment = btn.closest('[data-c]').dataset.c;
        App.ui.focus = `#ce-${editingComment}`;
        App.render();
      }
      if (act === 'cancel-edit') {
        editingComment = null;
        App.render();
      }
      if (act === 'del-comment') {
        const t = S.getTask(id);
        const i = t.comments.findIndex((c) => c.id === btn.closest('[data-c]').dataset.c);
        const [c] = t.comments.splice(i, 1);
        S.editTask(id, () => {});
        App.toast('Atualização excluída.', { label: 'Desfazer', run: () => S.editTask(id, (x) => x.comments.splice(i, 0, c)) });
      }
    });

    /* Texto: salva a cada tecla sem redesenhar; o quadro é atualizado ao sair do campo. */
    root.addEventListener('input', (e) => {
      const el = e.target;
      const id = App.ui.kbOpen;
      if (el.id === 'cp-title') {
        fitTitle();
        const title = el.value.replace(/\s*\n\s*/g, ' ').trim();
        if (title) S.updateTask(id, { title }, { silent: true });
      }
      if (el.id === 'cp-note') S.updateTask(id, { note: el.value }, { silent: true });
      if (el.classList.contains('cl-title')) S.editTask(id, (t) => (findChecklist(t, el).title = el.value.trim() || 'Checklist'), { silent: true });
      if (el.classList.contains('cl-text') && el.value.trim()) {
        S.editTask(id, (t) => (findItem(findChecklist(t, el), el).text = el.value.trim()), { silent: true });
      }
    });
    root.addEventListener('change', (e) => {
      const el = e.target;
      if (el.name === 'cp-color') return S.updateTask(App.ui.kbOpen, { color: el.value });
      if (el.id === 'cp-title' && !el.value.trim()) el.value = S.getTask(App.ui.kbOpen).title;
      if (el.classList.contains('cl-text') && !el.value.trim()) el.value = findItem(findChecklist(S.getTask(App.ui.kbOpen), el), el).text;
      if (el.closest('.card-panel')) renderBoard();
    });

    root.addEventListener('keydown', (e) => {
      const el = e.target;
      if (el.id === 'cp-title' && e.key === 'Enter') {
        e.preventDefault();
        el.blur();
      }
      if (el.classList.contains('cl-text') && e.key === 'Enter') {
        e.preventDefault();
        el.closest('.checklist').querySelector('.cl-add input').focus();
      }
      if ((el.id === 'cp-comment' || el.closest('.comment-edit')) && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        el.form.requestSubmit();
      }
      if (e.key === 'Escape' && App.ui.kbOpen) {
        if (editingComment) {
          editingComment = null;
          App.render();
        } else closeCard();
      }
    });

    App.drag(root, {
      item: '.card',
      zone: '.col',
      sortable: true,
      onDrop: (ds, zone, beforeId) => S.moveTask(ds.id, zone.dataset.status, beforeId),
    });
  }

  App.views = App.views || {};
  App.views.kanban = { render, bind };
})();
