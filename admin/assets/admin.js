/* ═══════════════════════════════════════════════════════════════
   Админка «Чевапно Место» — интерфейс.
   Все данные держим в памяти, на сервер уходят по кнопке «Сохранить».
   Тексты в разметку — только через esc().
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const CSRF = document.querySelector('meta[name="csrf"]').content;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  const uid = (p) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const fmtW = (w) => { const v = String(w ?? '').trim(); return /^\d+([.,]\d+)?$/.test(v) ? `${v} гр` : v; };
  const num = (n) => String(n ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const TITLES = { main: 'Меню', prosek: '5-я Просека', lunch: 'Ланчи', history: 'История' };
  const SAVE_ORDER = ['lunch', 'prosek', 'main']; // ланчи раньше меню: витрина может ссылаться на новый ланч

  const page = $('#page');
  const S = {
    tab: 'main',
    sec: {},        // {main: {data, rev}, ...}
    saved: {},      // снимок сохранённой версии, строкой
    open: new Set(),
    q: '',
    backups: null,
    histFilter: 'all',
    webp: true,
  };

  /* ─────────────────────────── сеть */

  async function api(action, { body, form, method } = {}) {
    const opt = { method: method || (body || form ? 'POST' : 'GET'), headers: { 'X-CSRF-Token': CSRF }, credentials: 'same-origin' };
    if (body) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    if (form) opt.body = form;
    let res, data;
    try {
      res = await fetch(`api.php?action=${encodeURIComponent(action)}`, opt);
    } catch (e) {
      throw new Error('Нет связи с сервером. Проверьте интернет и попробуйте ещё раз — изменения на экране не пропали.');
    }
    try { data = await res.json(); } catch (e) { data = null; }
    if (res.status === 401) {
      await modal({ title: 'Нужно войти заново', text: 'Время входа истекло. Несохранённые изменения на этой странице пропадут.', yes: 'Войти', no: null });
      S.leaving = true;
      location.href = 'login.php';
      throw new Error('auth');
    }
    if (!data || !data.ok) {
      const err = new Error((data && data.error) || `Сервер ответил ошибкой (${res.status}). Попробуйте ещё раз.`);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ─────────────────────────── модальное окно и уведомления */

  function modal({ title, text = '', yes = 'Да', no = 'Отмена', danger = false }) {
    const m = $('#modal');
    $('#modalTitle').textContent = title;
    $('#modalText').innerHTML = Array.isArray(text) ? text.map((t) => `<p>${esc(t)}</p>`).join('') : `<p>${esc(text)}</p>`;
    const by = $('#modalYes'), bn = $('#modalNo');
    by.textContent = yes;
    by.className = `btn ${danger ? 'btn--red' : 'btn--red'}`;
    bn.hidden = !no;
    if (no) bn.textContent = no;
    m.hidden = false;
    const prev = document.activeElement;
    (no ? bn : by).focus();
    return new Promise((resolve) => {
      const done = (v) => {
        m.hidden = true;
        by.onclick = bn.onclick = m.onclick = null;
        document.removeEventListener('keydown', key);
        if (prev && prev.focus) prev.focus();
        resolve(v);
      };
      const key = (e) => { if (e.key === 'Escape') done(false); };
      by.onclick = () => done(true);
      bn.onclick = () => done(false);
      m.onclick = (e) => { if (e.target === m) done(false); };
      document.addEventListener('keydown', key);
    });
  }
  const showError = (msg) => modal({ title: 'Не получилось', text: msg, yes: 'Понятно', no: null });

  let toastT;
  function toast(msg, kind = 'ok') {
    const t = $('#toast');
    t.textContent = msg;
    t.className = `toast toast--${kind}`;
    t.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.hidden = true; }, 4200);
  }

  /* ─────────────────────────── данные, пути, «изменено» */

  const data = (sec = S.tab) => S.sec[sec].data;
  function getPath(obj, path) {
    return path === '' ? obj : path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }
  function setPath(obj, path, val) {
    const ks = path.split('.');
    const last = ks.pop();
    getPath(obj, ks.join('.'))[last] = val;
  }
  const isDirty = (sec) => S.sec[sec] && JSON.stringify(S.sec[sec].data) !== S.saved[sec];
  const dirtyList = () => SAVE_ORDER.filter(isDirty);

  function updateDirty() {
    const list = dirtyList();
    $$('.tab').forEach((t) => t.classList.toggle('is-dirty', list.includes(t.dataset.tab)));
    $('#savebar').hidden = !list.length;
    $('#savebarText').textContent = list.length
      ? `Есть несохранённые изменения: ${list.map((s) => TITLES[s]).join(', ')}`
      : '';
  }

  function setSection(sec, payload) {
    S.sec[sec] = { data: payload.data, rev: payload.rev };
    S.saved[sec] = JSON.stringify(payload.data);
  }

  /* ─────────────────────────── общие кусочки разметки */

  const field = (label, path, value, { kind = 'text', hint = '', ph = '', multiline = false, inputmode = '', disabled = false, max = 0 } = {}) => `
    <label class="field">
      <span class="field__label">${esc(label)}</span>
      ${multiline
        ? `<textarea class="textarea" data-bind="${esc(path)}" data-kind="${kind}" placeholder="${esc(ph)}"${max ? ` maxlength="${max}"` : ''}>${esc(value)}</textarea>`
        : `<input class="input" data-bind="${esc(path)}" data-kind="${kind}" value="${esc(value)}" placeholder="${esc(ph)}"${inputmode ? ` inputmode="${inputmode}"` : ''}${disabled ? ' disabled' : ''}${max ? ` maxlength="${max}"` : ''} autocomplete="off">`}
      ${hint ? `<span class="field__hint">${esc(hint)}</span>` : ''}
    </label>`;

  const check = (label, path, on) => `
    <label class="check"><input type="checkbox" data-bind="${esc(path)}" data-kind="bool"${on ? ' checked' : ''}>${esc(label)}</label>`;

  const moveBtns = (list, i, len, cls = '') => `
    <button class="icon-btn ${cls}" type="button" data-act="move" data-list="${esc(list)}" data-i="${i}" data-dir="-1" aria-label="Выше"${i === 0 ? ' disabled' : ''}>↑</button>
    <button class="icon-btn ${cls}" type="button" data-act="move" data-list="${esc(list)}" data-i="${i}" data-dir="1" aria-label="Ниже"${i === len - 1 ? ' disabled' : ''}>↓</button>`;

  const dragBtn = () => `<span class="icon-btn drag" data-drag aria-label="Перетащить" title="Перетащите, чтобы поменять порядок">⠿</span>`;

  const thumb = (img, cls = 'dish__thumb') => img
    ? `<img class="${cls}" src="../${esc(img)}" alt="" loading="lazy">`
    : `<span class="${cls} ${cls}--empty">нет<br>фото</span>`;

  function photoBlock(path, img, kind) {
    return `
      <div class="field">
        <span class="field__label">Фото</span>
        <div class="photo">
          ${img ? `<img class="photo__img" src="../${esc(img)}" alt="">` : '<span class="photo__img photo__img--empty">Фото нет</span>'}
          <div class="photo__btns">
            <button class="btn btn--ghost btn--sm" type="button" data-act="photo-pick" data-path="${esc(path)}" data-kind="${kind}">${img ? 'Заменить фото' : 'Загрузить фото'}</button>
            ${img ? `<button class="btn btn--ghost btn--sm" type="button" data-act="photo-clear" data-path="${esc(path)}">Убрать фото</button>` : ''}
          </div>
        </div>
        <span class="field__hint">JPG, PNG или WebP до 10 МБ. Можно прямо с камеры телефона — мы сами уменьшим.</span>
      </div>`;
  }

  /* ─────────────────────────── меню (основное и Просека) */

  function catsPath(sec) { return sec === 'main' ? 'menu.categories' : 'categories'; }

  function showcaseHas(id) { return S.sec.main && data('main').showcase.some((s) => s.ref === id); }

  function dishPrice(it) {
    const opts = it.opts || [];
    const p = opts.length ? Math.min(...opts.map((o) => +o.p || 0)) : it.p;
    return `${it.from || opts.length ? 'от ' : ''}${num(p)} ₽`;
  }

  function dishSummary(sec, it, isList) {
    const badges = [];
    if (it.hidden) badges.push('<span class="badge badge--off">Скрыто</span>');
    if (it.hot) badges.push('<span class="badge">Острое</span>');
    if (it.new) badges.push('<span class="badge badge--red">Новинка</span>');
    if (sec === 'main' && !isList && showcaseHas(it.id)) badges.push('<span class="badge">В витрине</span>');
    const w = it.opts && it.opts.length ? `${it.opts.length} вар.` : fmtW(it.w);
    // Подзаголовок в строке — чтобы различать «Стейк-Ланч · говядина» и «Стейк-Ланч · курица»
    return `${it.sub ? `${esc(it.sub)} · ` : ''}${esc(dishPrice(it))}${w ? ` · ${esc(w)}` : ''} ${badges.join('')}`;
  }

  function dishRow(sec, listPath, it, i, len, isList) {
    const key = `${sec}:${listPath}:${it.id}`;
    const open = S.open.has(key);
    return `
      <div class="dish${open ? ' is-open' : ''}${it.hidden ? ' is-off' : ''}" data-i="${i}" data-key="${esc(key)}" data-q="${esc(norm(it.name + ' ' + (it.sub || '')))}">
        <div class="dish__row">
          ${dragBtn()}
          ${isList ? '' : thumb(it.img)}
          <button class="dish__main" type="button" data-act="toggle" data-key="${esc(key)}" aria-expanded="${open}">
            <span class="dish__name">${esc(it.name || 'Без названия')}</span>
            <span class="dish__meta">${dishSummary(sec, it, isList)}</span>
          </button>
          <span class="dish__btns">
            ${moveBtns(listPath, i, len, 'icon-btn--move')}
            <button class="icon-btn" type="button" data-act="toggle" data-key="${esc(key)}" aria-label="${open ? 'Свернуть' : 'Изменить'}"><span class="dish-chevron">▾</span></button>
          </span>
        </div>
        ${open ? dishEditor(sec, `${listPath}.${i}`, it, i, len, listPath, isList) : ''}
      </div>`;
  }

  function dishEditor(sec, p, it, i, len, listPath, isList) {
    const opts = it.opts || [];
    const hasOpts = opts.length > 0;
    return `
      <div class="dish__edit">
        ${isList ? '' : photoBlock(`${p}.img`, it.img, 'dish')}
        ${field('Название', `${p}.name`, it.name, { max: 120 })}
        <div class="grid2">
          ${field('Подзаголовок', `${p}.sub`, it.sub, { hint: 'Необязательно. Например: «свинина-говядина»', max: 120 })}
          ${field('Вес', `${p}.w`, it.w, { hint: 'Например: 460 или «2 шт / 100 гр». К числу сами допишем «гр».', max: 40 })}
        </div>
        ${isList ? '' : field('Состав', `${p}.d`, it.d, { multiline: true, hint: 'Если оставить пустым, на сайте состав не показывается.', max: 1500 })}
        <div class="price-row">
          ${field('Цена, ₽', `${p}.p`, hasOpts ? Math.min(...opts.map((o) => +o.p || 0)) : it.p, { kind: 'int', inputmode: 'numeric', disabled: hasOpts, hint: hasOpts ? 'Берётся из вариантов — самая низкая.' : '' })}
          ${hasOpts ? '' : check('«от»', `${p}.from`, it.from)}
        </div>
        ${isList ? '' : `
        <div class="field">
          <span class="field__label">Варианты</span>
          <span class="field__hint">Если у блюда несколько размеров или видов (например, 25 и 30 см). На сайте будет «от …» и список вариантов.</span>
          <div class="opts">
            ${opts.map((o, oi) => `
              <div class="opt">
                ${field('Подпись', `${p}.opts.${oi}.label`, o.label, { ph: 'например, 30 см', max: 80 })}
                ${field('Вес', `${p}.opts.${oi}.w`, o.w, { max: 40 })}
                ${field('Цена, ₽', `${p}.opts.${oi}.p`, o.p, { kind: 'int', inputmode: 'numeric' })}
                ${check('Острое', `${p}.opts.${oi}.hot`, o.hot)}
                <button class="icon-btn" type="button" data-act="del-opt" data-path="${esc(p)}.opts" data-i="${oi}" aria-label="Удалить вариант">✕</button>
              </div>`).join('')}
          </div>
          <button class="btn btn--ghost btn--sm add-btn" type="button" data-act="add-opt" data-path="${esc(p)}.opts">+ Добавить вариант</button>
        </div>`}
        <div class="checks">
          ${check('Острое', `${p}.hot`, it.hot)}
          ${check('Новинка', `${p}.new`, it.new)}
          ${check('Скрыть с сайта', `${p}.hidden`, it.hidden)}
          ${sec === 'main' && !isList ? `<label class="check"><input type="checkbox" data-act="showcase-toggle" data-id="${esc(it.id)}"${showcaseHas(it.id) ? ' checked' : ''}>В витрине на главной</label>` : ''}
        </div>
        <div class="dish__actions">
          ${moveBtns(listPath, i, len)}
          <button class="btn btn--ghost btn--sm" type="button" data-act="dup" data-list="${esc(listPath)}" data-i="${i}">Дублировать</button>
          <button class="btn btn--danger btn--sm" type="button" data-act="del-dish" data-list="${esc(listPath)}" data-i="${i}">Удалить блюдо</button>
        </div>
      </div>`;
  }

  function catBlock(sec, c, ci, len) {
    const cp = `${catsPath(sec)}.${ci}`;
    const key = `${sec}:cat:${c.id}`;
    const open = S.open.has(key);
    const isList = c.type === 'list';
    const n = c.items.length;
    const lunchLike = sec === 'prosek' && (c.intro || (c.sides && c.sides.length) || c.id === 'lunch');
    const info = [`${n} ${plural(n, ['позиция', 'позиции', 'позиций'])}`];
    if (c.note) info.push(c.note);
    return `
      <section class="block${c.hidden ? ' is-hidden-cat' : ''}" data-i="${ci}" data-cat="${esc(c.id)}">
        <header class="block__head">
          ${dragBtn()}
          <h2 class="block__title">${esc(c.title || 'Без названия')} ${c.hidden ? '<span class="badge badge--off">Скрыт с сайта</span>' : ''}<small>${esc(info.join(' · '))}</small></h2>
          ${moveBtns(catsPath(sec), ci, len)}
          <button class="btn btn--ghost btn--sm" type="button" data-act="toggle" data-key="${esc(key)}">${open ? 'Готово' : 'Настроить'}</button>
        </header>
        ${open ? `
        <div class="block__settings">
          <div class="grid2">
            ${field('Название раздела', `${cp}.title`, c.title, { max: 80 })}
            ${field('Короткое название', `${cp}.short`, c.short, { hint: 'Для кнопки раздела. Можно не заполнять.', max: 40 })}
          </div>
          ${field('Пометка раздела', `${cp}.note`, c.note, { hint: 'Необязательно. Например: «только на Спортивной».', max: 160 })}
          <label class="field">
            <span class="field__label">Как показывать</span>
            <select class="select" data-bind="${esc(cp)}.type" data-kind="text">
              <option value="cards"${!isList ? ' selected' : ''}>Карточки с фото</option>
              <option value="list"${isList ? ' selected' : ''}>Список без фото (как «Добавки»)</option>
            </select>
          </label>
          ${lunchLike ? `
            ${field('Что входит (текст над ланчами)', `${cp}.intro`, c.intro || '', { multiline: true, max: 1500 })}
            <div class="field">
              <span class="field__label">Гарниры на выбор</span>
              <div class="sortable" data-list="${esc(cp)}.sides">
                ${(c.sides || []).map((s, si) => sideRow(sec, `${cp}.sides`, s, si, c.sides.length)).join('')}
              </div>
              <button class="btn btn--ghost btn--sm add-btn" type="button" data-act="add-side" data-list="${esc(cp)}.sides">+ Добавить гарнир</button>
            </div>` : ''}
          <div class="checks">${check('Скрыть раздел с сайта', `${cp}.hidden`, c.hidden)}</div>
          <div class="dish__actions">
            <button class="btn btn--danger btn--sm" type="button" data-act="del-cat" data-i="${ci}">Удалить раздел</button>
          </div>
        </div>` : ''}
        <div class="block__body">
          <div class="sortable" data-list="${esc(cp)}.items">
            ${c.items.map((it, i) => dishRow(sec, `${cp}.items`, it, i, n, isList)).join('')}
          </div>
          ${n ? '' : '<p class="empty-note">В разделе пока нет блюд. Пустой раздел на сайте не показывается.</p>'}
          <button class="btn btn--ghost add-btn" type="button" data-act="add-dish" data-list="${esc(cp)}.items">+ Добавить блюдо в «${esc(c.short || c.title)}»</button>
        </div>
      </section>`;
  }

  // Гарнир: Просека (внутри раздела) и вкладка «Ланчи»
  function sideRow(sec, listPath, s, i, len) {
    const key = `${sec}:${listPath}:${s.id || '#' + i}`;
    const open = S.open.has(key);
    const p = `${listPath}.${i}`;
    return `
      <div class="dish${open ? ' is-open' : ''}${s.hidden ? ' is-off' : ''}" data-i="${i}" data-key="${esc(key)}" data-q="${esc(norm(s.name))}">
        <div class="dish__row">
          ${dragBtn()}
          ${thumb(s.img)}
          <button class="dish__main" type="button" data-act="toggle" data-key="${esc(key)}">
            <span class="dish__name">${esc(s.name || 'Без названия')}</span>
            <span class="dish__meta">${esc(s.sub || '')} ${s.hidden ? '<span class="badge badge--off">Скрыто</span>' : ''}</span>
          </button>
          <span class="dish__btns">
            ${moveBtns(listPath, i, len, 'icon-btn--move')}
            <button class="icon-btn" type="button" data-act="toggle" data-key="${esc(key)}" aria-label="Изменить"><span class="dish-chevron">▾</span></button>
          </span>
        </div>
        ${open ? `
        <div class="dish__edit">
          ${photoBlock(`${p}.img`, s.img, 'side')}
          <div class="grid2">
            ${field('Название', `${p}.name`, s.name, { max: 120 })}
            ${field('Вес / порция', `${p}.sub`, s.sub, { hint: 'Например: «2 шт / 100 гр»', max: 120 })}
          </div>
          ${'hidden' in s ? `<div class="checks">${check('Скрыть с сайта', `${p}.hidden`, s.hidden)}</div>` : ''}
          <div class="dish__actions">
            ${moveBtns(listPath, i, len)}
            <button class="btn btn--danger btn--sm" type="button" data-act="del-row" data-list="${esc(listPath)}" data-i="${i}" data-what="гарнир">Удалить гарнир</button>
          </div>
        </div>` : ''}
      </div>`;
  }

  function plural(n, [one, few, many]) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }

  /* ─────────────────────────── витрина (главная) */

  function allDishesForShowcase() {
    const groups = [];
    for (const c of data('main').menu.categories) {
      if (c.type === 'list') continue;
      groups.push({ title: c.title, items: c.items.map((it) => ({ id: it.id, name: it.name, it })) });
    }
    if (S.sec.lunch) groups.push({ title: 'Ланчи', items: data('lunch').mains.map((m) => ({ id: m.id, name: m.name, it: m })) });
    return groups;
  }
  function findDish(id) {
    for (const g of allDishesForShowcase()) for (const x of g.items) if (x.id === id) return x.it;
    return null;
  }

  function showcaseBlock() {
    const list = data('main').showcase;
    const key = 'main:showcase';
    const open = S.open.has(key);
    const groups = allDishesForShowcase();
    return `
      <section class="block" data-block="showcase">
        <header class="block__head">
          <h2 class="block__title">Витрина на главной<small>Лента «Идём вдоль прилавка» · ${list.length} ${plural(list.length, ['карточка', 'карточки', 'карточек'])}</small></h2>
          <button class="btn btn--ghost btn--sm" type="button" data-act="toggle" data-key="${key}">${open ? 'Свернуть' : 'Открыть'}</button>
        </header>
        ${open ? `
        <div class="block__body">
          <p class="note note--info">Цена, вес и фото берутся из самого блюда — поменяли цену в меню, она поменяется и здесь. Название и подпись в витрине можно сделать своими.</p>
          <div class="sortable" data-list="showcase">
            ${list.map((s, i) => {
              const d = findDish(s.ref);
              // Ключ — по месту карточки: при выборе другого блюда редактор не должен сворачиваться
              const k = `main:show:#${i}`;
              const op = S.open.has(k);
              return `
              <div class="dish${op ? ' is-open' : ''}${s.hidden ? ' is-off' : ''}" data-i="${i}">
                <div class="dish__row">
                  ${dragBtn()}
                  ${thumb(d && d.img)}
                  <button class="dish__main" type="button" data-act="toggle" data-key="${esc(k)}">
                    <span class="dish__name">${esc(s.name || 'Без названия')}</span>
                    <span class="dish__meta">${d ? esc(dishPrice(d)) : '<b>блюдо удалено — выберите другое</b>'} ${s.tag ? `<span class="badge badge--red">${esc(s.tag)}</span>` : ''} ${s.hidden ? '<span class="badge badge--off">Скрыто</span>' : ''}</span>
                  </button>
                  <span class="dish__btns">
                    ${moveBtns('showcase', i, list.length, 'icon-btn--move')}
                    <button class="icon-btn" type="button" data-act="toggle" data-key="${esc(k)}" aria-label="Изменить"><span class="dish-chevron">▾</span></button>
                  </span>
                </div>
                ${op ? `
                <div class="dish__edit">
                  <label class="field">
                    <span class="field__label">Какое блюдо</span>
                    <select class="select" data-bind="showcase.${i}.ref" data-kind="text">
                      ${d ? '' : '<option value="" selected>— выберите блюдо —</option>'}
                      ${groups.map((g) => `<optgroup label="${esc(g.title)}">${g.items.map((x) => `<option value="${esc(x.id)}"${x.id === s.ref ? ' selected' : ''}>${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}
                    </select>
                  </label>
                  <div class="grid2">
                    ${field('Название в витрине', `showcase.${i}.name`, s.name, { max: 120 })}
                    ${field('Подпись', `showcase.${i}.sub`, s.sub, { hint: 'Мелкий текст под названием', max: 120 })}
                  </div>
                  ${field('Ярлык', `showcase.${i}.tag`, s.tag, { hint: 'Красная плашка на фото, например «Двойной». Можно пусто.', max: 30 })}
                  <div class="checks">${check('Скрыть с сайта', `showcase.${i}.hidden`, s.hidden)}</div>
                  <div class="dish__actions">
                    ${moveBtns('showcase', i, list.length)}
                    <button class="btn btn--danger btn--sm" type="button" data-act="del-row" data-list="showcase" data-i="${i}" data-what="карточку из витрины">Убрать из витрины</button>
                  </div>
                </div>` : ''}
              </div>`;
            }).join('')}
          </div>
          <button class="btn btn--ghost add-btn" type="button" data-act="add-show">+ Добавить карточку в витрину</button>
        </div>` : ''}
      </section>`;
  }

  function renderMenu(sec) {
    const d = data(sec);
    const cats = sec === 'main' ? d.menu.categories : d.categories;
    page.innerHTML = `
      <h1 class="h1">${sec === 'main' ? 'Основное меню' : 'Меню 5-й Просеки'}</h1>
      <p class="lead">${sec === 'main'
        ? 'Меню на главной странице сайта. Нажмите на блюдо, чтобы изменить цену, состав или фото. В конце — кнопка «Сохранить».'
        : 'Отдельная страница меню точки на 5-й Просеке, 95а. Нажмите на блюдо, чтобы изменить его.'}</p>
      <div class="toolbar">
        <label class="search"><input class="input" type="search" id="q" placeholder="Найти блюдо по названию" value="${esc(S.q)}" autocomplete="off" aria-label="Найти блюдо"></label>
        <button class="btn btn--ghost" type="button" data-act="add-cat">+ Новый раздел</button>
      </div>
      ${sec === 'main' ? showcaseBlock() : ''}
      <div class="sortable" data-list="${catsPath(sec)}">
        ${cats.map((c, i) => catBlock(sec, c, i, cats.length)).join('')}
      </div>
      <p class="empty-note" id="noResults" hidden>Ничего не нашли. Проверьте название.</p>
      ${sec === 'main' ? `<div class="block"><div class="block__body">${field('Подпись под меню', 'menu.foot', d.menu.foot, { hint: 'Например: «Напитки в ассортименте»', max: 200 })}</div></div>` : ''}`;
    applySearch();
  }

  function applySearch() {
    const q = norm(S.q).trim();
    let any = false;
    $$('.block[data-cat]').forEach((b) => {
      let shown = 0;
      $$('.dish[data-q]', b).forEach((el) => {
        const ok = !q || el.dataset.q.includes(q);
        el.hidden = !ok;
        if (ok) shown++;
      });
      b.hidden = !!q && shown === 0;
      if (!b.hidden) any = true;
    });
    const sc = $('[data-block="showcase"]');
    if (sc) sc.hidden = !!q;
    const nr = $('#noResults');
    if (nr) nr.hidden = !q || any;
  }

  /* ─────────────────────────── ланчи */

  function renderLunch() {
    const d = data('lunch');
    page.innerHTML = `
      <h1 class="h1">Ланчи</h1>
      <p class="lead">Конструктор ланча на главной: гость выбирает гарнир и ланч. Нажмите на позицию, чтобы изменить её.</p>
      <section class="block">
        <header class="block__head"><h2 class="block__title">Что входит в каждый ланч</h2></header>
        <div class="block__body">${field('Текст под конструктором', 'note', d.note, { multiline: true, max: 1500 })}</div>
      </section>
      <section class="block">
        <header class="block__head"><h2 class="block__title">Шаг 1 · Гарниры<small>${d.sides.length} ${plural(d.sides.length, ['гарнир', 'гарнира', 'гарниров'])}</small></h2></header>
        <div class="block__body">
          <div class="sortable" data-list="sides">${d.sides.map((s, i) => sideRow('lunch', 'sides', s, i, d.sides.length)).join('')}</div>
          <button class="btn btn--ghost add-btn" type="button" data-act="add-side" data-list="sides">+ Добавить гарнир</button>
        </div>
      </section>
      <section class="block">
        <header class="block__head"><h2 class="block__title">Шаг 2 · Ланчи<small>${d.mains.length} ${plural(d.mains.length, ['ланч', 'ланча', 'ланчей'])}</small></h2></header>
        <div class="block__body">
          <div class="sortable" data-list="mains">${d.mains.map((m, i) => lunchRow(m, i, d.mains.length)).join('')}</div>
          <button class="btn btn--ghost add-btn" type="button" data-act="add-lunch">+ Добавить ланч</button>
        </div>
      </section>`;
  }

  function lunchRow(m, i, len) {
    const key = `lunch:mains:${m.id}`;
    const open = S.open.has(key);
    const p = `mains.${i}`;
    const badges = [];
    if (m.hidden) badges.push('<span class="badge badge--off">Скрыто</span>');
    if (m.hot) badges.push('<span class="badge">Острое</span>');
    if (m.new) badges.push('<span class="badge badge--red">Новинка</span>');
    return `
      <div class="dish${open ? ' is-open' : ''}${m.hidden ? ' is-off' : ''}" data-i="${i}" data-key="${esc(key)}">
        <div class="dish__row">
          ${dragBtn()}
          ${thumb(m.img)}
          <button class="dish__main" type="button" data-act="toggle" data-key="${esc(key)}">
            <span class="dish__name">${esc(m.name || 'Без названия')}${m.sub ? ` <span style="font-weight:400;color:var(--mute)">· ${esc(m.sub)}</span>` : ''}</span>
            <span class="dish__meta">${num(m.p)} ₽ · ${esc(m.w)} гр ${badges.join('')}</span>
          </button>
          <span class="dish__btns">
            ${moveBtns('mains', i, len, 'icon-btn--move')}
            <button class="icon-btn" type="button" data-act="toggle" data-key="${esc(key)}" aria-label="Изменить"><span class="dish-chevron">▾</span></button>
          </span>
        </div>
        ${open ? `
        <div class="dish__edit">
          ${photoBlock(`${p}.img`, m.img, 'lunch')}
          <div class="grid2">
            ${field('Название', `${p}.name`, m.name, { max: 120 })}
            ${field('Подзаголовок', `${p}.sub`, m.sub, { hint: 'Например: «свинина-говядина»', max: 120 })}
          </div>
          <div class="grid2">
            ${field('Соус', `${p}.sauce`, m.sauce, { hint: 'Например: «томатный»', max: 80 })}
            ${field('Вес, гр', `${p}.w`, m.w, { kind: 'int', inputmode: 'numeric', hint: 'Только число' })}
            ${field('Цена, ₽', `${p}.p`, m.p, { kind: 'int', inputmode: 'numeric' })}
          </div>
          <div class="checks">
            ${check('Острое', `${p}.hot`, m.hot)}
            ${check('Новинка', `${p}.new`, m.new)}
            ${check('Скрыть с сайта', `${p}.hidden`, m.hidden)}
          </div>
          <div class="dish__actions">
            ${moveBtns('mains', i, len)}
            <button class="btn btn--ghost btn--sm" type="button" data-act="dup" data-list="mains" data-i="${i}">Дублировать</button>
            <button class="btn btn--danger btn--sm" type="button" data-act="del-dish" data-list="mains" data-i="${i}">Удалить ланч</button>
          </div>
        </div>` : ''}
      </div>`;
  }

  /* ─────────────────────────── история */

  const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const dayLabel = (d) => {
    const today = new Date(); const y = new Date(Date.now() - 864e5);
    const same = (a, b) => a.toDateString() === b.toDateString();
    if (same(d, today)) return 'Сегодня';
    if (same(d, y)) return 'Вчера';
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };
  const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  async function renderHistory() {
    page.innerHTML = `
      <h1 class="h1">История</h1>
      <p class="lead">Перед каждым сохранением мы делаем копию. Если что-то пошло не так — верните прошлую версию кнопкой «Восстановить». Хранятся последние 30 копий каждого раздела.</p>
      <div id="hist"><p class="loading">Загружаем историю…</p></div>`;
    try {
      const r = await api('backups');
      S.backups = r.backups;
    } catch (e) {
      if (e.message !== 'auth') $('#hist').innerHTML = `<p class="note note--err">${esc(e.message)}</p>`;
      return;
    }
    drawHistory();
  }

  function drawHistory() {
    const box = $('#hist');
    if (!box) return;
    const list = S.backups.filter((b) => S.histFilter === 'all' || b.section === S.histFilter);
    let html = `<div class="filter">${['all', 'main', 'prosek', 'lunch'].map((f) =>
      `<button class="tab${S.histFilter === f ? ' is-on' : ''}" type="button" data-act="hist-filter" data-f="${f}">${f === 'all' ? 'Все' : TITLES[f]}</button>`).join('')}</div>`;
    if (!list.length) {
      box.innerHTML = html + '<p class="empty-note">Копий пока нет — они появятся после первого сохранения.</p>';
      return;
    }
    let day = '';
    html += '<div class="hist">';
    for (const b of list) {
      const d = new Date(b.time * 1000);
      const dl = dayLabel(d);
      if (dl !== day) { day = dl; html += `<p class="hist__day">${esc(dl)}</p>`; }
      html += `
        <div class="hist__row">
          <div class="hist__what"><b>${esc(b.title)}</b><span>версия до сохранения в ${hhmm(d)}</span></div>
          <button class="btn btn--ghost btn--sm" type="button" data-act="restore" data-file="${esc(b.file)}" data-title="${esc(b.title)}" data-when="${esc(dl + ', ' + hhmm(d))}">Восстановить</button>
        </div>`;
    }
    box.innerHTML = html + '</div>';
  }

  /* ─────────────────────────── отрисовка вкладки */

  function render() {
    $$('#tabs .tab').forEach((t) => t.classList.toggle('is-on', t.dataset.tab === S.tab));
    if (S.tab === 'history') renderHistory();
    else if (S.tab === 'lunch') renderLunch();
    else renderMenu(S.tab);
    updateDirty();
  }

  // Перерисовка без потери места на странице
  function rerender(focusSel) {
    const y = scrollY;
    render();
    scrollTo(0, y);
    if (focusSel) { const el = $(focusSel); if (el) { el.focus(); el.scrollIntoView({ block: 'center' }); } }
  }

  /* ─────────────────────────── ввод в поля */

  page.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'q') { S.q = el.value; applySearch(); return; }
    const path = el.dataset.bind;
    if (!path || S.tab === 'history') return;
    let v;
    if (el.dataset.kind === 'bool') v = el.checked;
    else if (el.dataset.kind === 'int') {
      const raw = el.value.replace(/\s/g, '');
      v = /^\d+$/.test(raw) ? Number(raw) : el.value;
      el.classList.toggle('is-bad', !/^\d+$/.test(raw));
    } else v = el.value;
    // Выбрали другое блюдо в витрине: название и подпись меняем вместе с ним,
    // если их не переписывали вручную (они совпадали с прежним блюдом)
    if (/^showcase\.\d+\.ref$/.test(path)) {
      const card = getPath(data(), path.replace(/\.ref$/, ''));
      const was = findDish(card.ref), now = findDish(v);
      if (now && (!card.name || card.name === 'Новая карточка' || (was && card.name === was.name))) card.name = now.name;
      if (now && (!card.sub || (was && card.sub === (was.sub || '')))) card.sub = now.sub || '';
    }
    setPath(data(), path, v);
    refreshRow(el);
    updateDirty();
  });

  page.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.act === 'showcase-toggle') return toggleShowcase(el.dataset.id, el.checked);
    if (el.tagName === 'SELECT' || el.dataset.kind === 'bool') {
      rerender();
    }
  });

  // Обновляем строку-заголовок блюда, пока человек печатает
  function refreshRow(el) {
    const row = el.closest('.dish');
    if (!row) return;
    const nameEl = $('.dish__name', row);
    const path = el.dataset.bind;
    if (/\.name$/.test(path) && nameEl && !/showcase/.test(path)) nameEl.textContent = el.value || 'Без названия';
    if (/^showcase\.\d+\.name$/.test(path) && nameEl) nameEl.textContent = el.value || 'Без названия';
  }

  /* ─────────────────────────── кнопки */

  page.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.tagName === 'INPUT') return;
    const act = b.dataset.act;
    const d = S.tab === 'history' ? null : data();
    const list = b.dataset.list ? getPath(d, b.dataset.list) : null;
    const i = +b.dataset.i;

    switch (act) {
      case 'toggle': {
        const k = b.dataset.key;
        S.open.has(k) ? S.open.delete(k) : S.open.add(k);
        rerender();
        break;
      }
      case 'move': {
        const j = i + +b.dataset.dir;
        if (j < 0 || j >= list.length) return;
        [list[i], list[j]] = [list[j], list[i]];
        rerender();
        break;
      }
      case 'add-dish': {
        const it = { id: uid('dish'), name: 'Новое блюдо', sub: '', d: '', w: '', p: 0, from: false, opts: [], img: '', hot: false, new: false, hidden: false };
        list.push(it);
        const key = `${S.tab}:${b.dataset.list}:${it.id}`;
        S.open.add(key);
        S.q = '';
        rerender(`[data-key="${CSS.escape(key)}"] [data-bind$=".name"]`);
        break;
      }
      case 'add-lunch': {
        const m = { id: uid('lunch'), name: 'Новый ланч', sub: '', sauce: '', w: 0, p: 0, img: '', hot: false, new: false, hidden: false };
        d.mains.push(m);
        const key = `lunch:mains:${m.id}`;
        S.open.add(key);
        rerender(`[data-key="${CSS.escape(key)}"] [data-bind$=".name"]`);
        break;
      }
      case 'add-side': {
        const s = S.tab === 'lunch' ? { id: uid('side'), name: 'Новый гарнир', sub: '', img: '', hidden: false } : { name: 'Новый гарнир', sub: '', img: '' };
        if (!list) setPath(d, b.dataset.list, []);
        const arr = getPath(d, b.dataset.list);
        arr.push(s);
        const key = `${S.tab}:${b.dataset.list}:${s.id || '#' + (arr.length - 1)}`;
        S.open.add(key);
        rerender(`[data-key="${CSS.escape(key)}"] [data-bind$=".name"]`);
        break;
      }
      case 'dup': {
        const copy = clone(list[i]);
        copy.id = uid(S.tab === 'lunch' ? 'lunch' : 'dish');
        copy.name = `${copy.name} (копия)`;
        list.splice(i + 1, 0, copy);
        const key = `${S.tab}:${b.dataset.list}:${copy.id}`;
        S.open.add(key);
        rerender(`[data-key="${CSS.escape(key)}"] [data-bind$=".name"]`);
        toast('Копия добавлена ниже — поменяйте название');
        break;
      }
      case 'del-dish': {
        const it = list[i];
        const inShow = S.sec.main && data('main').showcase.some((s) => s.ref === it.id);
        const ok = await modal({
          title: `Удалить «${it.name}»?`,
          text: [
            inShow ? 'Это блюдо есть в витрине на главной — оттуда оно тоже пропадёт.' : '',
            'Если блюдо просто закончилось, лучше поставить галочку «Скрыть с сайта» — тогда его легко вернуть.',
          ].filter(Boolean),
          yes: 'Удалить', danger: true,
        });
        if (!ok) return;
        list.splice(i, 1);
        if (inShow) data('main').showcase = data('main').showcase.filter((s) => s.ref !== it.id);
        rerender();
        break;
      }
      case 'del-row': {
        const ok = await modal({ title: `Удалить ${b.dataset.what}?`, text: `«${list[i].name}» пропадёт с сайта после сохранения.`, yes: 'Удалить', danger: true });
        if (!ok) return;
        list.splice(i, 1);
        rerender();
        break;
      }
      case 'add-cat': {
        const c = { id: uid('cat'), title: 'Новый раздел', short: '', note: '', hidden: false, type: 'cards', items: [] };
        if (S.tab === 'prosek') { c.intro = ''; c.sides = []; }
        const cats = getPath(d, catsPath(S.tab));
        cats.push(c);
        S.open.add(`${S.tab}:cat:${c.id}`);
        S.q = '';
        rerender(`.block[data-cat="${CSS.escape(c.id)}"] [data-bind$=".title"]`);
        break;
      }
      case 'del-cat': {
        const cats = getPath(d, catsPath(S.tab));
        const c = cats[i];
        const ok = await modal({
          title: `Удалить раздел «${c.title}»?`,
          text: c.items.length
            ? [`Вместе с ним удалятся все блюда раздела: ${c.items.length}.`, 'Если раздел нужен позже, лучше поставить «Скрыть раздел с сайта».']
            : 'Раздел пустой.',
          yes: 'Удалить раздел', danger: true,
        });
        if (!ok) return;
        const ids = new Set(c.items.map((x) => x.id));
        cats.splice(i, 1);
        if (S.tab === 'main') data('main').showcase = data('main').showcase.filter((s) => !ids.has(s.ref));
        rerender();
        break;
      }
      case 'add-opt': {
        const arr = getPath(d, b.dataset.path);
        const owner = getPath(d, b.dataset.path.replace(/\.opts$/, ''));
        // Первый вариант — из текущих веса и цены блюда, чтобы не вводить заново
        arr.push(arr.length ? { label: '', w: '', p: 0, hot: false } : { label: '', w: owner.w || '', p: +owner.p || 0, hot: false });
        rerender();
        break;
      }
      case 'del-opt': {
        const arr = getPath(d, b.dataset.path);
        const owner = getPath(d, b.dataset.path.replace(/\.opts$/, ''));
        const [o] = arr.splice(i, 1);
        if (!arr.length && o) { owner.p = +o.p || 0; if (o.w) owner.w = o.w; }
        rerender();
        break;
      }
      case 'add-show': {
        const first = allDishesForShowcase().flatMap((g) => g.items)[0];
        d.showcase.push({ ref: first ? first.id : '', name: first ? first.name : 'Новая карточка', sub: first && first.it.sub ? first.it.sub : '', tag: '', hidden: false });
        const k = `main:show:#${d.showcase.length - 1}`;
        S.open.add(k);
        rerender();
        break;
      }
      case 'photo-pick': return pickPhoto(b.dataset.path, b.dataset.kind);
      case 'photo-clear': {
        setPath(d, b.dataset.path, '');
        rerender();
        break;
      }
      case 'hist-filter': {
        S.histFilter = b.dataset.f;
        drawHistory();
        return;
      }
      case 'restore': return restore(b.dataset.file, b.dataset.title, b.dataset.when);
      default: return;
    }
    updateDirty();
  });

  function toggleShowcase(id, on) {
    const d = data('main');
    if (on && !d.showcase.some((s) => s.ref === id)) {
      const it = findDish(id);
      d.showcase.push({ ref: id, name: it ? it.name : '', sub: it && it.sub ? it.sub : '', tag: '', hidden: false });
      toast('Добавили в конец витрины. Порядок — в блоке «Витрина на главной».');
    } else if (!on) {
      d.showcase = d.showcase.filter((s) => s.ref !== id);
    }
    rerender();
  }

  /* ─────────────────────────── фото */

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/jpeg,image/png,image/webp';
  fileInput.className = 'photo__file';
  document.body.appendChild(fileInput);
  let pick = null;

  function pickPhoto(path, kind) {
    pick = { path, kind, tab: S.tab };
    fileInput.value = '';
    fileInput.click();
  }

  // Большие фото с телефона уменьшаем ещё в браузере — на хостинге бывают лимиты на размер загрузки
  async function shrink(file) {
    if (file.type !== 'image/jpeg' || file.size < 3.5 * 1024 * 1024 || !window.createImageBitmap) return file;
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const k = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas');
      c.width = Math.round(bmp.width * k);
      c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
      return blob && blob.size < file.size ? new File([blob], 'photo.jpg', { type: 'image/jpeg' }) : file;
    } catch (e) {
      return file;
    }
  }

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files[0];
    if (!f || !pick) return;
    const { path, kind, tab } = pick;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) && !/\.(jpe?g|png|webp)$/i.test(f.name)) {
      return showError('Подходят только фото в формате JPG, PNG или WebP.');
    }
    if (f.size > 25 * 1024 * 1024) return showError('Фото слишком большое. Выберите файл поменьше (до 10 МБ).');
    const btn = $(`[data-act="photo-pick"][data-path="${CSS.escape(path)}"]`);
    if (btn) { btn.disabled = true; btn.textContent = 'Загружаем…'; }
    try {
      const small = await shrink(f);
      if (small.size > 10 * 1024 * 1024) throw new Error('Фото слишком большое — до 10 МБ.');
      const form = new FormData();
      form.append('photo', small, small.name || 'photo.jpg');
      form.append('kind', kind || 'dish');
      const r = await api('upload', { form });
      setPath(data(tab), path, r.path);
      if (S.tab === tab) rerender();
      updateDirty();
      toast('Фото загружено. Не забудьте нажать «Сохранить».');
    } catch (e) {
      if (btn) { btn.disabled = false; btn.textContent = 'Загрузить фото'; }
      if (e.message !== 'auth') showError(e.message);
    }
  });

  /* ─────────────────────────── перетаскивание (мышь и палец) */

  let drag = null;
  page.addEventListener('pointerdown', (e) => {
    const h = e.target.closest('[data-drag]');
    if (!h) return;
    const item = h.closest('[data-i]');
    const box = item && item.parentElement;
    if (!box || !box.matches('.sortable')) return;
    e.preventDefault();
    h.setPointerCapture(e.pointerId);
    item.classList.add('is-dragging');
    drag = { h, item, box, id: e.pointerId, y: e.clientY };
  });
  // Движение и отпускание слушаем на всём окне: перестановка элемента в DOM снимает
  // захват указателя, и на телефоне «отпустил палец» может прийти на шапку страницы
  addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const y = e.clientY;
    const sibs = [...drag.box.children].filter((x) => x !== drag.item && x.matches('[data-i]'));
    const next = sibs.find((x) => { const r = x.getBoundingClientRect(); return y < r.top + r.height / 2; });
    if (next) { if (drag.item.nextElementSibling !== next) drag.box.insertBefore(drag.item, next); }
    else if (drag.box.lastElementChild !== drag.item) drag.box.appendChild(drag.item);
    // Автопрокрутка у краёв экрана
    if (y < 80) scrollBy(0, -12); else if (y > innerHeight - 120) scrollBy(0, 12);
  });
  const endDrag = (e) => {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    const { box, item } = drag;
    item.classList.remove('is-dragging');
    const order = [...box.children].filter((x) => x.matches('[data-i]')).map((x) => +x.dataset.i);
    drag = null;
    if (order.every((v, k) => v === k)) return;
    const arr = getPath(data(), box.dataset.list);
    const copy = order.map((k) => arr[k]);
    arr.splice(0, arr.length, ...copy);
    rerender();
  };
  addEventListener('pointerup', endDrag);
  addEventListener('pointercancel', endDrag);

  /* ─────────────────────────── сохранение, отмена, восстановление */

  async function saveAll() {
    const list = dirtyList();
    if (!list.length) return;
    const btn = $('#saveBtn');
    btn.disabled = true;
    btn.textContent = 'Сохраняем…';
    try {
      for (const sec of list) {
        const r = await api('save', { body: { section: sec, data: S.sec[sec].data, rev: S.sec[sec].rev } });
        setSection(sec, r);
      }
      rerender();
      toast('Сохранено, изменения уже на сайте');
    } catch (e) {
      if (e.message === 'auth') return;
      updateDirty();
      await modal({
        title: e.status === 409 ? 'Данные уже изменились' : 'Не получилось сохранить',
        text: [e.message, e.status === 409 ? 'Чтобы ничего не потерять, обновите страницу.' : 'Ваши изменения остались на экране — можно исправить и сохранить ещё раз.'],
        yes: 'Понятно', no: null,
      });
    } finally {
      btn.disabled = false;
      btn.textContent = 'Сохранить';
    }
  }

  $('#saveBtn').addEventListener('click', saveAll);

  $('#discardBtn').addEventListener('click', async () => {
    const ok = await modal({ title: 'Отменить все несохранённые изменения?', text: 'Вернётся то, что сейчас на сайте.', yes: 'Отменить изменения', no: 'Нет, оставить' });
    if (!ok) return;
    for (const sec of dirtyList()) S.sec[sec].data = JSON.parse(S.saved[sec]);
    rerender();
  });

  async function restore(file, title, when) {
    const sec = file.split('-')[0];
    const ok = await modal({
      title: `Вернуть «${title}» к версии ${when}?`,
      text: [isDirty(sec) ? 'Несохранённые изменения в этом разделе пропадут.' : '', 'Текущая версия тоже сохранится в истории — восстановление можно отменить.'].filter(Boolean),
      yes: 'Восстановить',
    });
    if (!ok) return;
    try {
      const r = await api('restore', { body: { file } });
      for (const [s, payload] of Object.entries(r.sections)) {
        if (s === r.section || !isDirty(s)) setSection(s, payload);
        else S.sec[s].rev = payload.rev;
      }
      toast('Версия восстановлена, изменения уже на сайте');
      renderHistory();
      updateDirty();
    } catch (e) {
      if (e.message !== 'auth') showError(e.message);
    }
  }

  /* ─────────────────────────── вкладки, уход со страницы */

  $('#tabs').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (!t || t.dataset.tab === S.tab) return;
    S.tab = t.dataset.tab;
    S.q = '';
    try { sessionStorage.setItem('admin-tab', S.tab); } catch (err) { /* без памяти вкладки */ }
    render();
    scrollTo(0, 0);
  });

  addEventListener('beforeunload', (e) => {
    if (!S.leaving && dirtyList().length) { e.preventDefault(); e.returnValue = ''; }
  });

  $('#logoutBtn').addEventListener('click', async (e) => {
    if (!dirtyList().length) return;
    e.preventDefault();
    const ok = await modal({ title: 'Выйти без сохранения?', text: 'Несохранённые изменения пропадут.', yes: 'Выйти', no: 'Остаться' });
    if (ok) { S.leaving = true; e.target.form.submit(); }
  });

  // Ctrl+S / ⌘S — сохранить
  addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveAll(); }
  });

  /* ─────────────────────────── старт */

  (async () => {
    try {
      const r = await api('load');
      for (const [s, payload] of Object.entries(r.sections)) setSection(s, payload);
      S.webp = r.webp;
      try { const t = sessionStorage.getItem('admin-tab'); if (t && TITLES[t]) S.tab = t; } catch (err) { /* ничего */ }
      render();
    } catch (e) {
      if (e.message !== 'auth') {
        page.innerHTML = `<p class="note note--err">${esc(e.message)}</p><button class="btn btn--red" type="button" id="reloadBtn">Обновить страницу</button>`;
        $('#reloadBtn').addEventListener('click', () => location.reload());
      }
    }
  })();
})();
