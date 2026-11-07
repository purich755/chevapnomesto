/* ═══════════════════════════════════════════════════════════════
   ЧЕВАПНО МЕСТО · админка меню точки на 5-й Просеке
   Правит data/prosek.json и фото в assets/img/menu/ прямо в репозитории
   на GitHub (одним коммитом), после чего GitHub Pages пересобирает сайт.
   Ключ доступа — fine-grained token с правом Contents: read/write
   только на этот репозиторий.
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const OWNER = 'purich755';
  const REPO = 'chevapnomesto';
  const BRANCH = 'main';
  const DATA_PATH = 'data/prosek.json';
  const IMG_DIR = 'assets/img/menu';
  const TOKEN_KEY = 'chevapno-gh-token';
  const { DRAFT_KEY } = MenuData;

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = {
    token: '',
    data: null,            // то, что сейчас в редакторе
    published: '',         // JSON опубликованной версии — для «есть изменения?»
    baseUpdated: '',       // метка опубликованной версии, от которой начали правки
    open: new WeakSet(),   // раскрытые разделы и блюда (живут только в памяти)
    busy: false,
  };

  /* ───────────────────────── GitHub API */

  async function gh(path, { method = 'GET', body } = {}) {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${state.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = new Error(`GitHub ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  }

  const ghError = (e) => {
    if (e.status === 401) return 'Ключ не подходит или истёк — войдите заново.';
    if (e.status === 403 || e.status === 404) return 'У ключа нет доступа на запись к репозиторию сайта.';
    if (e.status === 409 || e.status === 422) return 'Меню только что изменили с другого устройства. Обновите страницу и повторите.';
    return 'Не удалось связаться с GitHub. Проверьте интернет и попробуйте ещё раз.';
  };

  const b64ToText = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

  async function loadRemote() {
    if (state.token) {
      const f = await gh(`/contents/${DATA_PATH}?ref=${BRANCH}`);
      return JSON.parse(b64ToText(f.content));
    }
    const res = await fetch(`${DATA_PATH}?v=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('menu');
    return res.json();
  }

  /* ───────────────────────── Черновик в браузере */

  let draftTimer = 0;
  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try {
        if (isDirty()) localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: state.data, base: state.baseUpdated, saved: Date.now() }));
        else localStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        setStatus('Черновик не помещается в память браузера — опубликуйте изменения.', 'bad');
      }
    }, 300);
  }
  const clearDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} };
  const readDraftFull = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY)); } catch (e) { return null; } };

  /* ───────────────────────── Состояние */

  const isDirty = () => JSON.stringify(state.data) !== state.published;

  function setStatus(text, kind = '') {
    const el = $('#status');
    el.textContent = text;
    el.className = 'bar__status' + (kind ? ` is-${kind}` : '');
  }

  function touch() {
    const dirty = isDirty();
    $('#publish').disabled = !dirty || state.busy;
    $('#revert').disabled = !dirty || state.busy;
    if (!state.busy) setStatus(dirty ? 'Есть неопубликованные изменения' : 'Изменений нет', dirty ? 'dirty' : '');
    saveDraft();
  }

  // Путь вида "categories.2.items.5.price"
  function getAt(path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), state.data);
  }
  function setAt(path, value) {
    const keys = path.split('.');
    const last = keys.pop();
    const obj = keys.reduce((o, k) => o[k], state.data);
    const optional = ['sub', 'd', 'note', 'intro', 'short', 'img', 'w', 'type'];
    if (value === false || (value === '' && optional.includes(last))) delete obj[last];
    else obj[last] = value;
  }

  const rnd = () => Math.random().toString(36).slice(2, 7);
  const TR = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
  const slug = (s) => String(s || '').toLowerCase().split('').map((c) => (c in TR ? TR[c] : c)).join('')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'item';

  /* ───────────────────────── Отрисовка */

  const field = (label, path, value, { type = 'text', area = false, cls = '', ph = '', mode = '' } = {}) => `
    <label class="fld ${cls}">
      <span class="fld__l">${label}</span>
      ${area
        ? `<textarea class="inp" data-k="${path}" rows="2" placeholder="${esc(ph)}">${esc(value)}</textarea>`
        : `<input class="inp" data-k="${path}" type="${type}" ${mode ? `inputmode="${mode}"` : ''} value="${esc(value)}" placeholder="${esc(ph)}">`}
    </label>`;

  const thumb = (src, act, path) => `
    <button class="thumb ${/^data:/.test(src || '') ? 'is-pending' : ''}" type="button" data-act="${act}" data-p="${path}"
      title="${src ? 'Заменить фото' : 'Добавить фото'}" aria-label="${src ? 'Заменить фото' : 'Добавить фото'}">${src ? `<img src="${esc(src)}" alt="">` : ''}</button>`;

  function renderPlace() {
    const P = state.data.place;
    $('#placeName').textContent = P.address || '';
    $('#place').innerHTML =
      field('Адрес', 'place.address', P.address) +
      field('Город', 'place.city', P.city) +
      field('Подпись к телефону', 'place.phoneLabel', P.phoneLabel, { ph: 'Самовывоз и доставка' }) +
      field('Телефон', 'place.phone', P.phone, { type: 'tel', ph: '+7 (987) 939-30-13' }) +
      field('Строка внизу меню', 'place.footNote', P.footNote, { cls: 'fld--wide', ph: 'Напитки в ассортименте' });
  }

  function itemHTML(c, ci, it, ii) {
    const base = `categories.${ci}.items.${ii}`;
    const open = state.open.has(it);
    const list = c.type === 'list';
    const opts = (it.opts || []).map((o, oi) => `
      <div class="opt">
        <input class="inp" data-k="${base}.opts.${oi}.label" value="${esc(o.label)}" placeholder="Подпись: 25 см, 5 шт…" aria-label="Подпись варианта">
        <input class="inp" data-k="${base}.opts.${oi}.w" value="${esc(o.w)}" placeholder="Вес, гр" aria-label="Вес варианта">
        <input class="inp o-p" data-k="${base}.opts.${oi}.p" data-num value="${esc(o.p)}" inputmode="numeric" placeholder="Цена" aria-label="Цена варианта, ₽">
        <label class="chk"><input type="checkbox" data-k="${base}.opts.${oi}.hot" ${o.hot ? 'checked' : ''}> остро</label>
        <button class="ico ico--del" type="button" data-act="opt-del" data-p="${base}.opts.${oi}" aria-label="Удалить вариант">×</button>
      </div>`).join('');
    return `
      <div class="it ${open ? 'is-open' : ''}" data-item="${base}">
        <div class="it__row">
          ${list ? '<span></span>' : thumb(it.img, 'photo', base)}
          <input class="inp f-name" data-k="${base}.name" value="${esc(it.name)}" placeholder="Название" aria-label="Название">
          <label class="u f-w"><input class="inp" data-k="${base}.w" value="${esc(it.w)}" placeholder="Вес" aria-label="Вес, граммы"><span aria-hidden="true">гр</span></label>
          <label class="u f-p"><input class="inp" data-k="${base}.p" data-num value="${esc(it.p)}" inputmode="numeric" placeholder="Цена" aria-label="Цена, рубли"><span aria-hidden="true">₽</span></label>
          <button class="ico it__more" type="button" data-act="item-more" data-p="${base}" aria-expanded="${open}" aria-label="Подробнее">▾</button>
        </div>
        ${open ? `
        <div class="it__det">
          <div class="grid2">
            ${field('Уточнение под названием', `${base}.sub`, it.sub, { ph: 'например: свинина-говядина' })}
            <label class="chk"><input type="checkbox" data-k="${base}.hot" ${it.hot ? 'checked' : ''}> Острое блюдо (значок перца)</label>
            ${list ? '' : field('Состав', `${base}.d`, it.d, { area: true, cls: 'fld--wide', ph: 'через запятую' })}
          </div>
          ${list ? '' : `
          <p class="sub-h">Варианты (размер, количество) — у каждого своя цена</p>
          <div class="opts">${opts}</div>
          <button class="btn btn--ghost add" type="button" data-act="opt-add" data-p="${base}">+ вариант</button>`}
          <div class="it__acts">
            ${!list && it.img ? `<button class="btn btn--ghost" type="button" data-act="photo-del" data-p="${base}">Убрать фото</button>` : ''}
            <span class="grow"></span>
            <button class="ico" type="button" data-act="item-up" data-p="${base}" ${ii === 0 ? 'disabled' : ''} aria-label="Выше">↑</button>
            <button class="ico" type="button" data-act="item-down" data-p="${base}" ${ii === c.items.length - 1 ? 'disabled' : ''} aria-label="Ниже">↓</button>
            <button class="ico" type="button" data-act="item-dup" data-p="${base}" aria-label="Копия" title="Сделать копию">⧉</button>
            <button class="ico ico--del" type="button" data-act="item-del" data-p="${base}" aria-label="Удалить блюдо">×</button>
          </div>
        </div>` : ''}
      </div>`;
  }

  function catHTML(c, ci) {
    const open = state.open.has(c);
    const n = state.data.categories.length;
    const base = `categories.${ci}`;
    const sides = (c.sides || []).map((s, si) => `
      <div class="side">
        ${thumb(s.img, 'side-photo', `${base}.sides.${si}`)}
        <input class="inp" data-k="${base}.sides.${si}.name" value="${esc(s.name)}" placeholder="Гарнир" aria-label="Гарнир">
        <input class="inp s-sub" data-k="${base}.sides.${si}.sub" value="${esc(s.sub)}" placeholder="Вес: 90 гр" aria-label="Вес гарнира">
        <button class="ico ico--del" type="button" data-act="side-del" data-p="${base}.sides.${si}" aria-label="Удалить гарнир">×</button>
      </div>`).join('');
    return `
      <section class="cat ${open ? 'is-open' : ''}" data-cat="${ci}">
        <div class="cat__head">
          <button class="cat__toggle" type="button" data-act="cat-toggle" data-p="${base}" aria-expanded="${open}">
            <b data-title="${ci}">${esc(c.title) || 'Без названия'}</b><i>${c.items.length} поз.</i>
          </button>
          <button class="ico" type="button" data-act="cat-up" data-p="${base}" ${ci === 0 ? 'disabled' : ''} aria-label="Раздел выше">↑</button>
          <button class="ico" type="button" data-act="cat-down" data-p="${base}" ${ci === n - 1 ? 'disabled' : ''} aria-label="Раздел ниже">↓</button>
          <button class="ico ico--del" type="button" data-act="cat-del" data-p="${base}" aria-label="Удалить раздел">×</button>
        </div>
        ${open ? `
        <div class="cat__body">
          <div class="cat__fields">
            ${field('Название раздела', `${base}.title`, c.title)}
            ${field('Кнопка в панели', `${base}.short`, c.short, { ph: 'коротко' })}
            ${field('Подпись справа', `${base}.note`, c.note, { ph: 'необязательно' })}
            <label class="fld"><span class="fld__l">Вид</span>
              <select class="inp" data-k="${base}.type">
                <option value="" ${c.type !== 'list' ? 'selected' : ''}>Карточки с фото</option>
                <option value="list" ${c.type === 'list' ? 'selected' : ''}>Список без фото</option>
              </select>
            </label>
            ${c.type === 'list' ? '' : field('Что входит в каждое блюдо раздела', `${base}.intro`, c.intro, { area: true, cls: 'fld--wide', ph: 'необязательно — например, для ланчей' })}
          </div>
          ${c.type === 'list' ? '' : `
          ${c.sides && c.sides.length ? `<p class="sub-h">Гарнир на выбор</p><div class="sides">${sides}</div>` : ''}
          <button class="btn btn--ghost add" type="button" data-act="side-add" data-p="${base}">+ гарнир на выбор</button>`}
          <p class="sub-h">Блюда</p>
          <div class="price-legend"><span></span><span>Название</span><span>Вес</span><span>Цена, ₽</span><span></span></div>
          <div class="items">${c.items.map((it, ii) => itemHTML(c, ci, it, ii)).join('')}</div>
          <button class="btn btn--ghost add" type="button" data-act="item-add" data-p="${base}">+ Добавить блюдо</button>
        </div>` : ''}
      </section>`;
  }

  function renderCats() {
    $('#cats').innerHTML = state.data.categories.map(catHTML).join('');
  }

  function render() {
    renderPlace();
    renderCats();
    touch();
  }

  /* ───────────────────────── Фото */

  // Квадрат 800 px. Фото с прозрачным фоном вписываем целиком, обычное — кадрируем по центру
  async function processImage(file) {
    const bmp = await createImageBitmap(file);
    const S = 800;
    const probe = document.createElement('canvas');
    probe.width = probe.height = 8;
    const pc = probe.getContext('2d');
    pc.drawImage(bmp, 0, 0, 8, 8);
    const px = pc.getImageData(0, 0, 8, 8).data;
    const transparent = [0, 7, 56, 63].some((i) => px[i * 4 + 3] < 200);
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    const k = transparent ? Math.min(S / bmp.width, S / bmp.height) * 0.9 : Math.max(S / bmp.width, S / bmp.height);
    const w = bmp.width * k;
    const h = bmp.height * k;
    ctx.drawImage(bmp, (S - w) / 2, (S - h) / 2, w, h);
    let url = c.toDataURL('image/webp', 0.85);
    if (!url.startsWith('data:image/webp')) url = c.toDataURL(transparent ? 'image/png' : 'image/jpeg', 0.86);
    return url;
  }

  let photoTarget = null;
  $('#file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !photoTarget) return;
    if (file.size > 25 * 1024 * 1024) { alert('Файл больше 25 МБ — выберите поменьше.'); return; }
    try {
      const url = await processImage(file);
      getAt(photoTarget).img = url;
      renderCats();
      touch();
    } catch (err) {
      alert('Не получилось открыть картинку. Подойдут JPG, PNG или WebP.');
    }
  });

  /* ───────────────────────── Действия */

  const parentOf = (path) => {
    const keys = path.split('.');
    const idx = +keys.pop();
    return { arr: getAt(keys.join('.')), idx };
  };
  const move = (path, d) => {
    const { arr, idx } = parentOf(path);
    const j = idx + d;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
  };

  const ACTS = {
    'cat-toggle': (p) => { const c = getAt(p); state.open.has(c) ? state.open.delete(c) : state.open.add(c); },
    'cat-up': (p) => move(p, -1),
    'cat-down': (p) => move(p, 1),
    'cat-del': (p) => {
      const c = getAt(p);
      if (!confirm(`Удалить раздел «${c.title}» вместе с ${c.items.length} блюдами?`)) return false;
      const { arr, idx } = parentOf(p);
      arr.splice(idx, 1);
    },
    'cat-add': () => {
      const c = { id: 'c-' + rnd(), title: 'Новый раздел', items: [] };
      state.data.categories.push(c);
      state.open.add(c);
      requestAnimationFrame(() => {
        const sec = document.querySelector('.cat:last-child');
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        sec.querySelector('[data-k$=".title"]').select();
      });
    },
    'item-more': (p) => { const it = getAt(p); state.open.has(it) ? state.open.delete(it) : state.open.add(it); },
    'item-up': (p) => move(p, -1),
    'item-down': (p) => move(p, 1),
    'item-dup': (p) => {
      const { arr, idx } = parentOf(p);
      const copy = JSON.parse(JSON.stringify(arr[idx]));
      copy.name += ' (копия)';
      if (copy.id) copy.id = copy.id + '-' + rnd();
      arr.splice(idx + 1, 0, copy);
      state.open.add(copy);
    },
    'item-del': (p) => {
      const it = getAt(p);
      if (!confirm(`Удалить «${it.name || 'блюдо'}»?`)) return false;
      const { arr, idx } = parentOf(p);
      arr.splice(idx, 1);
    },
    'item-add': (p) => {
      const c = getAt(p);
      const it = { name: '', p: '' };
      if (c.type !== 'list') it.d = '';
      c.items.push(it);
      state.open.add(it);
      requestAnimationFrame(() => {
        const rows = document.querySelectorAll(`[data-item^="${p}.items."]`);
        const last = rows[rows.length - 1];
        last.classList.add('is-new');
        last.scrollIntoView({ behavior: 'smooth', block: 'center' });
        last.querySelector('.f-name').focus();
      });
    },
    'opt-add': (p) => {
      const it = getAt(p);
      it.opts = it.opts || [];
      it.opts.push({ label: '', w: '', p: '' });
    },
    'opt-del': (p) => {
      const { arr, idx } = parentOf(p);
      arr.splice(idx, 1);
      const itPath = p.split('.').slice(0, -2).join('.');
      if (!arr.length) delete getAt(itPath).opts;
    },
    'side-add': (p) => {
      const c = getAt(p);
      c.sides = c.sides || [];
      c.sides.push({ name: '', sub: '' });
    },
    'side-del': (p) => {
      const { arr, idx } = parentOf(p);
      arr.splice(idx, 1);
      if (!arr.length) delete getAt(p.split('.').slice(0, -2).join('.')).sides;
    },
    photo: (p) => { photoTarget = p; $('#file').click(); return false; },
    'side-photo': (p) => { photoTarget = p; $('#file').click(); return false; },
    'photo-del': (p) => { delete getAt(p).img; },
  };

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !state.data || state.busy) return;
    const act = ACTS[b.dataset.act];
    if (!act) return;
    if (act(b.dataset.p) === false) return;
    renderCats();
    touch();
  });

  // Любое поле пишет прямо в данные — без перерисовки, чтобы не терять фокус
  function onField(e) {
    const el = e.target.closest('[data-k]');
    if (!el || !state.data) return;
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.hasAttribute('data-num')) {
      const clean = el.value.replace(/[^\d]/g, '');
      if (clean !== el.value) el.value = clean;
      v = clean === '' ? '' : +clean;
    } else v = el.value;
    setAt(el.dataset.k, v);
    el.classList.remove('is-bad');
    const m = el.dataset.k.match(/^categories\.(\d+)\.title$/);
    if (m) $(`[data-title="${m[1]}"]`).textContent = el.value || 'Без названия';
    if (el.dataset.k === 'place.address') $('#placeName').textContent = el.value;
    if (el.tagName === 'SELECT') renderCats();
    touch();
  }
  document.addEventListener('input', onField);
  document.addEventListener('change', (e) => { if (e.target.type === 'checkbox' || e.target.tagName === 'SELECT') onField(e); });

  /* ───────────────────────── Проверка перед публикацией */

  function validate() {
    const bad = [];
    state.data.categories.forEach((c, ci) => {
      if (!String(c.title || '').trim()) bad.push(`categories.${ci}.title`);
      c.items.forEach((it, ii) => {
        const b = `categories.${ci}.items.${ii}`;
        if (!String(it.name || '').trim()) bad.push(`${b}.name`);
        if (!(it.opts && it.opts.length) && !(+it.p > 0)) bad.push(`${b}.p`);
        (it.opts || []).forEach((o, oi) => { if (!(+o.p > 0)) bad.push(`${b}.opts.${oi}.p`); });
      });
    });
    return bad;
  }

  function showBad(bad) {
    // раскрываем разделы и блюда с ошибками, подсвечиваем поля
    bad.forEach((path) => {
      const m = path.match(/^categories\.(\d+)(?:\.items\.(\d+))?/);
      const c = state.data.categories[+m[1]];
      state.open.add(c);
      if (m[2] != null && /opts/.test(path)) state.open.add(c.items[+m[2]]);
    });
    renderCats();
    bad.forEach((path) => { const el = document.querySelector(`[data-k="${path}"]`); if (el) el.classList.add('is-bad'); });
    const first = document.querySelector('.inp.is-bad');
    if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); first.focus({ preventScroll: true }); }
  }

  /* ───────────────────────── Публикация одним коммитом */

  async function publish() {
    if (!state.token) { showLogin('Чтобы опубликовать, войдите с ключом доступа.'); return; }
    const bad = validate();
    if (bad.length) {
      setStatus(`Заполните подсвеченные поля (${bad.length}): название и цену.`, 'bad');
      showBad(bad);
      return;
    }
    state.busy = true;
    touch();
    setStatus('Публикую…');
    try {
      // кто-то мог опубликовать с другого устройства, пока шли правки
      const remote = await loadRemote();
      if (remote.updated !== state.baseUpdated &&
          !confirm('Меню уже изменили с другого устройства после того, как вы открыли админку. Опубликовать ваши правки поверх?')) {
        throw Object.assign(new Error('cancel'), { cancel: true });
      }

      const data = JSON.parse(JSON.stringify(state.data));
      data.updated = new Date().toISOString();
      const files = [];
      const takePhoto = (obj, name) => {
        if (!/^data:image\//.test(obj.img || '')) return;
        const [head, b64] = obj.img.split(',');
        const ext = head.includes('webp') ? 'webp' : head.includes('png') ? 'png' : 'jpg';
        const path = `${IMG_DIR}/${slug(name)}-${rnd()}.${ext}`;
        files.push({ path, content: b64, encoding: 'base64' });
        obj.img = path;
      };
      // пустые необязательные поля в файл не пишем
      const OPT = ['sub', 'd', 'note', 'intro', 'short', 'w', 'type'];
      const prune = (o) => OPT.forEach((k) => { if (o[k] === '' || o[k] == null) delete o[k]; });
      data.categories.forEach((c) => {
        if (!c.id) c.id = 'c-' + rnd();
        prune(c);
        c.items.forEach(prune);
        (c.sides || []).forEach((s) => takePhoto(s, s.name));
        c.items.forEach((it) => takePhoto(it, it.name));
      });
      files.push({ path: DATA_PATH, content: JSON.stringify(data, null, 2) + '\n', encoding: 'utf-8' });

      setStatus(files.length > 1 ? `Публикую: загружаю ${files.length - 1} фото…` : 'Публикую…');
      const ref = await gh(`/git/ref/heads/${BRANCH}`);
      const head = ref.object.sha;
      const commit = await gh(`/git/commits/${head}`);
      const tree = [];
      for (const f of files) {
        const blob = await gh('/git/blobs', { method: 'POST', body: { content: f.content, encoding: f.encoding } });
        tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
      }
      const newTree = await gh('/git/trees', { method: 'POST', body: { base_tree: commit.tree.sha, tree } });
      const newCommit = await gh('/git/commits', {
        method: 'POST',
        body: { message: 'Меню 5-й Просеки: правки из админки', tree: newTree.sha, parents: [head] },
      });
      await gh(`/git/refs/heads/${BRANCH}`, { method: 'PATCH', body: { sha: newCommit.sha } });

      state.data = data;
      state.published = JSON.stringify(data);
      state.baseUpdated = data.updated;
      clearDraft();
      state.busy = false;
      render();
      waitLive(data.updated);
    } catch (e) {
      state.busy = false;
      touch();
      if (!e.cancel) setStatus(ghError(e), 'bad');
      if (e.status === 401) showLogin(ghError(e));
    }
  }

  // Ждём, пока GitHub Pages выложит новую версию
  async function waitLive(stamp) {
    setStatus('Опубликовано. Сайт обновляется — обычно меньше минуты…', 'ok');
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 6000));
      if (isDirty()) return;
      try {
        const res = await fetch(`${DATA_PATH}?v=${Date.now()}`, { cache: 'no-store' });
        const live = await res.json();
        if (live.updated === stamp) {
          setStatus('Готово: изменения уже на сайте.', 'ok');
          return;
        }
      } catch (e) { /* пробуем дальше */ }
    }
    setStatus('Опубликовано. Если сайт ещё старый — загляните через пару минут.', 'ok');
  }

  /* ───────────────────────── Вход и запуск */

  function showLogin(msg) {
    $('#login').hidden = false;
    $('#editor').hidden = true;
    $('#loginErr').hidden = !msg;
    $('#loginErr').textContent = msg || '';
    $('#token').focus();
  }

  async function start() {
    $('#login').hidden = true;
    $('#editor').hidden = false;
    $('#logout').hidden = !state.token;
    setStatus('Загружаю меню…');
    let remote;
    try {
      remote = await loadRemote();
    } catch (e) {
      if (e.status) { forget(); showLogin(ghError(e)); return; }
      setStatus('Не удалось загрузить меню. Обновите страницу.', 'bad');
      return;
    }
    state.published = JSON.stringify(remote);
    state.baseUpdated = remote.updated || '';
    state.data = remote;

    const draft = readDraftFull();
    if (draft && JSON.stringify(draft.data) !== state.published) {
      $('#draftTime').textContent = new Date(draft.saved).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
      $('#draftNote').hidden = false;
      $('#draftKeep').onclick = () => {
        state.data = draft.data;
        state.baseUpdated = draft.base || state.baseUpdated;
        $('#draftNote').hidden = true;
        render();
      };
      $('#draftDrop').onclick = () => { clearDraft(); $('#draftNote').hidden = true; };
    }
    if (!state.token) setStatus('Режим просмотра: правки сохраняются как черновик, для публикации нужен вход.');
    render();
    if (!state.token) setStatus('Режим просмотра: правки сохраняются как черновик, для публикации нужен вход.');
  }

  function forget() {
    state.token = '';
    try { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); } catch (e) {}
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = $('#token').value.trim();
    if (!token) return;
    $('#loginBtn').disabled = true;
    $('#loginErr').hidden = true;
    state.token = token;
    try {
      const repo = await gh('');
      if (!repo.permissions || !repo.permissions.push) throw Object.assign(new Error('ro'), { status: 403 });
      try {
        (($('#remember').checked) ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
      } catch (err) {}
      $('#token').value = '';
      start();
    } catch (err) {
      state.token = '';
      $('#loginErr').textContent = ghError(err);
      $('#loginErr').hidden = false;
    } finally {
      $('#loginBtn').disabled = false;
    }
  });

  $('#guest').addEventListener('click', () => start());
  $('#logout').addEventListener('click', () => {
    if (isDirty() && !confirm('Есть неопубликованные правки — они останутся черновиком в этом браузере. Выйти?')) return;
    forget();
    showLogin();
  });
  $('#publish').addEventListener('click', publish);
  $('#revert').addEventListener('click', () => {
    if (!confirm('Отменить все неопубликованные правки?')) return;
    state.data = JSON.parse(state.published);
    clearDraft();
    render();
  });
  $('#preview').addEventListener('click', () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: state.data, base: state.baseUpdated, saved: Date.now() }));
    } catch (e) {
      alert('Черновик слишком большой для предпросмотра — опубликуйте или уберите часть новых фото.');
      return;
    }
    window.open('menu.html?preview', '_blank', 'noopener');
  });
  // Черновик пишется сам; при закрытии вкладки дописываем последние символы
  addEventListener('pagehide', () => {
    clearTimeout(draftTimer);
    if (!state.data) return;
    try {
      if (isDirty()) localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: state.data, base: state.baseUpdated, saved: Date.now() }));
    } catch (e) {}
  });

  try { state.token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || ''; } catch (e) {}
  if (state.token) start();
  else showLogin();
})();
