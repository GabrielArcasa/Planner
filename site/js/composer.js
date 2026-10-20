/* Peças compartilhadas pelo Calendário e pelo Planner:
   o formulário de agendar/editar e a "estação" (um dia da linha da semana). */
(function () {
  'use strict';

  const { dates: D, store: S, esc, icon, disc } = App;

  /* "seg, qua e sex", "segunda a sexta", "todos os dias"… */
  App.daysText = (days) => {
    const d = days.slice().sort();
    const s = d.join();
    if (s === '0,1,2,3,4,5,6') return 'todos os dias';
    if (s === '0,1,2,3,4') return 'de segunda a sexta';
    if (s === '5,6') return 'no fim de semana';
    if (d.length === 1) return `${d[0] > 4 ? 'todo' : 'toda'} ${D.DIAS_LONGOS[d[0]]}`;
    const names = d.map((i) => D.DIAS[i].toLowerCase());
    return names.slice(0, -1).join(', ') + ' e ' + names[names.length - 1];
  };

  /* ---------- Formulário ---------- */

  function linePicker(prefix, current) {
    const cur = App.line(current);
    return `
      <fieldset class="line-pick">
        <legend>Linha <output class="line-name" id="${prefix}-line">${cur.num} · ${esc(cur.name)}</output></legend>
        <div class="line-opts">
          ${App.LINES.map(
            (l) => `
            <label class="line-opt" title="${esc(l.name)}">
              <input type="radio" name="line" value="${l.id}" ${l.id === cur.id ? 'checked' : ''}>
              ${disc(l.id)}<span class="sr-only">Linha ${l.num}, ${esc(l.name)}</span>
            </label>`
          ).join('')}
        </div>
      </fieldset>`;
  }

  function daysPicker(prefix, days, hidden) {
    return `
      <fieldset class="days-pick" ${hidden ? 'hidden' : ''}>
        <legend>Repete em</legend>
        <div class="day-opts">
          ${D.DIAS.map(
            (d, i) => `
            <label class="day-opt">
              <input type="checkbox" name="days" value="${i}" ${days.includes(i) ? 'checked' : ''}>
              <span>${d}</span>
            </label>`
          ).join('')}
        </div>
      </fieldset>`;
  }

  /* c = { where: 'cal' | 'planner' | 'routine', date?, kind?: 'event' | 'routine', id? } */
  function html(c) {
    const editing = Boolean(c.id);
    const isRoutine = c.kind === 'routine' || c.where === 'routine';
    const item = editing ? (isRoutine ? S.getRoutine(c.id) : S.getEvent(c.id)) : null;
    if (editing && !item) return '';
    const p = `cmp-${c.where}`;
    const date = c.date ? D.parse(c.date) : null;
    const days = item && isRoutine ? item.days : date ? [D.wd(date)] : [];
    const submit = editing ? 'Salvar' : c.where === 'routine' ? 'Adicionar à rotina' : 'Agendar';

    return `
      <form class="composer ${editing ? 'is-edit' : ''}" novalidate
        data-where="${c.where}" data-kind="${isRoutine ? 'routine' : 'event'}"
        data-id="${editing ? item.id : ''}" data-date="${c.date || ''}">
        ${editing ? `<p class="composer-mode">${isRoutine ? icon('repeat') + 'Editando rotina' : icon('pencil') + 'Editando compromisso'}</p>` : ''}
        <div class="composer-main">
          <label class="sr-only" for="${p}-title">O que você vai fazer?</label>
          <input class="composer-title" id="${p}-title" name="title" type="text" value="${esc(item ? item.title : '')}"
            placeholder="${c.where === 'routine' ? 'Ex.: Academia' : 'O que vai fazer?'}" maxlength="120" autocomplete="off"
            aria-describedby="${p}-err" enterkeyhint="done">
          <label class="composer-time" title="Horário (opcional)">
            <span class="sr-only">Horário (opcional)</span>
            <input type="time" name="time" value="${item ? item.time : ''}">
          </label>
        </div>
        <p class="composer-err" id="${p}-err" hidden></p>
        ${editing && !isRoutine ? `<label class="field"><span>Dia</span><input type="date" name="date" value="${item.date}" required></label>` : ''}
        ${linePicker(p, item ? item.line : S.lastLine)}
        ${daysPicker(p, days, !isRoutine)}
        <div class="composer-actions">
          ${!editing && c.where !== 'routine' ? `<label class="check"><input type="checkbox" name="repeat"><span>Repetir toda semana</span></label>` : ''}
          <div class="composer-buttons">
            ${editing ? `<button type="button" class="btn btn-danger" data-act="delete">${icon('trash')}Excluir</button>` : ''}
            <button type="button" class="btn btn-ghost" data-act="cancel">Cancelar</button>
            <button type="submit" class="btn btn-primary">${submit}</button>
          </div>
        </div>
      </form>`;
  }

  function fail(form, msg, field) {
    const err = form.querySelector('.composer-err');
    err.textContent = msg;
    err.hidden = false;
    const el = field || form.querySelector('.composer-title');
    el.setAttribute('aria-invalid', 'true');
    el.focus();
  }

  function submit(form) {
    const fd = new FormData(form);
    const { where, kind, id, date } = form.dataset;
    const title = String(fd.get('title') || '').trim();
    const time = fd.get('time') || '';
    const line = fd.get('line') || S.lastLine;
    const days = fd.getAll('days').map(Number);
    const repeat = kind === 'routine' || fd.get('repeat') === 'on';

    if (!title) return fail(form, 'Escreva o que vai fazer.');
    if (repeat && !days.length) return fail(form, 'Escolha pelo menos um dia para repetir.', form.querySelector('.day-opt input'));

    if (id && kind === 'event') {
      const newDate = fd.get('date') || date;
      S.updateEvent(id, { title, time, line, date: newDate });
      App.ui.composer = null;
      if (newDate !== date) App.ui.selected = newDate;
      App.ui.month = App.ui.selected.slice(0, 7);
    } else if (id) {
      S.updateRoutine(id, { title, time, line, days });
      App.ui.composer = null;
    } else if (repeat) {
      S.addRoutine({ title, time, line, days });
      App.toast(`Rotina criada: ${title}, ${App.daysText(days)}.`);
      App.ui.focus = `#cmp-${where}-title`;
    } else {
      S.addEvent({ title, date, time, line });
      App.ui.focus = `#cmp-${where}-title`;
    }
    if (where !== 'cal' && !id && !App.ui.focus) App.ui.composer = null;
    App.render();
  }

  function remove(form) {
    const { kind, id } = form.dataset;
    const item = kind === 'routine' ? S.getRoutine(id) : S.getEvent(id);
    const undo = kind === 'routine' ? S.removeRoutine(id) : S.removeEvent(id);
    App.ui.composer = null;
    App.render();
    if (undo) App.toast(`“${item.title}” excluído.`, { label: 'Desfazer', run: undo });
  }

  /* Liga os eventos dos formulários dentro de uma aba (delegação). */
  function bind(root) {
    root.addEventListener('submit', (e) => {
      const form = e.target.closest('form.composer');
      if (!form) return;
      e.preventDefault();
      submit(form);
    });
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('form.composer [data-act]');
      if (!btn) return;
      const form = btn.closest('form');
      if (btn.dataset.act === 'cancel') {
        App.ui.composer = null;
        App.render();
      }
      if (btn.dataset.act === 'delete') remove(form);
    });
    root.addEventListener('change', (e) => {
      const form = e.target.closest('form.composer');
      if (!form) return;
      if (e.target.name === 'line') {
        const l = App.line(e.target.value);
        form.querySelector('.line-name').textContent = `${l.num} · ${l.name}`;
      }
      if (e.target.name === 'repeat') {
        form.querySelector('.days-pick').hidden = !e.target.checked;
        form.querySelector('[type=submit]').textContent = e.target.checked ? 'Criar rotina' : 'Agendar';
      }
    });
    root.addEventListener('input', (e) => {
      const form = e.target.closest('form.composer');
      if (!form || !form.querySelector('.composer-err:not([hidden])')) return;
      form.querySelector('.composer-err').hidden = true;
      form.querySelectorAll('[aria-invalid]').forEach((n) => n.removeAttribute('aria-invalid'));
    });
    root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && e.target.closest('form.composer') && App.ui.composer) {
        App.ui.composer = null;
        App.render();
      }
    });
  }

  App.composer = { html, bind };

  /* ---------- Estação: um dia da semana com seus itens ---------- */

  function itemRow(it, k) {
    const time = it.time ? esc(it.time) : '<span class="sr-only">sem horário</span>';
    return `
      <li class="item kind-${it.kind} ${it.done ? 'is-done' : ''}" data-id="${it.id}" data-kind="${it.kind}" data-date="${k}">
        <button class="mark" type="button" data-act="toggle" aria-pressed="${it.done}"
          aria-label="${it.done ? 'Desmarcar' : 'Marcar como feito'}: ${esc(it.title)}">${icon('check')}</button>
        <span class="item-time">${time}</span>
        ${disc(it.line, 'disc-sm', true)}
        <button class="item-title" type="button" data-act="edit">
          <span>${esc(it.title)}</span>${it.kind === 'routine' ? icon('repeat', 'rep') + '<span class="sr-only">(rotina)</span>' : ''}
        </button>
      </li>`;
  }

  /* opts = { where, selected, composer: html | '', addButton } */
  App.station = (d, opts) => {
    const k = D.key(d);
    const i = D.wd(d);
    const today = k === D.today();
    const hol = D.holiday(k);
    const items = S.itemsOn(k);
    const label = `${D.long(d)}${today ? ', hoje' : ''}${hol ? ', ' + hol.name : ''}`;
    return `
      <li class="station ${today ? 'is-today' : ''} ${opts.selected ? 'is-selected' : ''} ${opts.arriving ? 'is-arriving' : ''} ${opts.addInline && !opts.composer ? 'has-inline' : ''} ${i > 4 ? 'is-weekend' : ''} ${hol && hol.off ? 'is-holiday' : ''}" data-date="${k}">
        <button class="station-head" type="button" data-act="select" data-date="${k}" aria-label="${label}" ${opts.selected ? 'aria-current="date"' : ''}>
          <span class="stop" aria-hidden="true"></span>
          <span class="station-name">${D.DIAS[i]}</span>
          <span class="station-date">${d.getDate()}${today ? ' · hoje' : ''}</span>
          ${hol ? `<span class="station-hol">${esc(hol.name)}</span>` : ''}
        </button>
        ${items.length ? `<ul class="items">${items.map((it) => itemRow(it, k)).join('')}</ul>` : opts.composer ? '' : '<p class="items-empty">Livre</p>'}
        ${opts.composer || ''}
        ${!opts.composer && opts.addButton ? `<button class="add-btn" type="button" data-act="compose" data-date="${k}">${icon('plus')}Adicionar</button>` : ''}
        ${!opts.composer && opts.addInline ? `<button class="add-inline btn btn-primary btn-sm" type="button" data-act="compose" data-date="${k}">${icon('plus')}Agendar</button>` : ''}
      </li>`;
  };

  /* Ações sobre itens de uma estação (marcar como feito, editar). */
  App.bindItems = (root, where) => {
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('.item [data-act]');
      if (!btn) return;
      const row = btn.closest('.item');
      const { id, kind, date } = row.dataset;
      if (btn.dataset.act === 'toggle') S.toggleDone(kind, id, date);
      if (btn.dataset.act === 'edit') {
        App.ui.selected = date;
        App.ui.composer = { where, date, kind, id };
        App.ui.focus = `#cmp-${where}-title`;
        App.render();
      }
    });
  };

  /* Soltar um compromisso em outro dia. */
  App.moveEventTo = (id, k) => {
    const ev = S.getEvent(id);
    if (!ev || ev.date === k) return;
    const from = ev.date;
    S.updateEvent(id, { date: k });
    App.toast(`“${ev.title}” foi para ${D.long(D.parse(k))}.`, {
      label: 'Desfazer',
      run: () => S.updateEvent(id, { date: from }),
    });
  };
})();
