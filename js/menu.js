/* ═══════════════════════════════════════════════════════════════
   ЧЕВАПНО МЕСТО · меню точки на 5-й Просеке
   Данные — data/prosek.json (правится через admin.html).
   С ?preview страница показывает неопубликованный черновик админки.
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { num, fmtW, tel } = MenuData;

  // Текст приходит из админки — экранируем всё, что попадает в разметку
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const PEPPER = '<img class="hot" src="assets/img/el-pepper-red.webp" alt="остро" width="14" height="14">';
  const hot = (on) => (on ? PEPPER : '');
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');
  // Картинка — путь в репозитории или data:-URL из черновика админки
  const safeSrc = (src) => (/^(assets\/|data:image\/)/.test(src || '') ? src : '');
  const optLabel = (o) => [o.label, fmtW(o.w)].filter(Boolean).map(esc).join(' · ');

  let DATA = null;
  let CATS = [];

  /* ─────────────────────────────── Рендер */

  const media = (src, alt, cls) =>
    safeSrc(src)
      ? `<img src="${esc(src)}" alt="${esc(alt)}" width="680" height="680" loading="lazy" decoding="async">`
      : `<span class="${cls}__ph" aria-hidden="true"><img src="assets/img/el-loc-white.webp" alt="" width="60" height="76"></span>`;

  function itemCard(c, it, i) {
    const opts = it.opts && it.opts.length
      ? `<ul class="it__opts">${it.opts.map((o) => `<li>${hot(o.hot)}${optLabel(o)} <b>${num(o.p)} ₽</b></li>`).join('')}</ul>`
      : '';
    const q = norm([it.name, it.sub, it.d, c.title, (it.opts || []).map((o) => o.label).join(' ')].join(' '));
    const hasOpts = it.opts && it.opts.length;
    return `
      <article class="it is-pre" data-cat="${esc(c.id)}" data-i="${i}" data-q="${esc(q)}">
        <div class="it__media">${media(it.img, it.name, 'it')}</div>
        <div class="it__body">
          <h3 class="it__name"><button class="it__btn" type="button">${hot(it.hot)}${esc(it.name)}</button></h3>
          ${it.sub ? `<p class="it__sub">${esc(it.sub)}</p>` : ''}
          ${it.d ? `<p class="it__d">${esc(it.d)}</p>` : ''}
          ${opts}
          <p class="it__nums">
            <span class="it__w">${hasOpts ? 'от' : esc(fmtW(it.w))}</span>
            <span class="it__p">${num(it.p)} ₽</span>
          </p>
        </div>
      </article>`;
  }

  function plainRow(c, it) {
    return `
      <div class="plain__row" data-q="${esc(norm(it.name + ' ' + c.title))}">
        <span>${hot(it.hot)}${esc(it.name)}</span>
        <span class="plain__dots" aria-hidden="true"></span>
        <span class="plain__w">${esc(fmtW(it.w))}</span>
        <span class="plain__p">${num(it.p)} ₽</span>
      </div>`;
  }

  function catIntro(c) {
    let out = '';
    if (c.intro) out += `<p class="lunchnote"><b>Входит:</b> ${esc(c.intro)}</p>`;
    if (c.sides && c.sides.length) {
      out += `<div class="sides" aria-label="Гарнир на выбор">${c.sides.map((s) => `
        <div class="side">
          ${safeSrc(s.img) ? `<img src="${esc(s.img)}" alt="${esc(s.name)}" width="680" height="680" loading="lazy" decoding="async">` : ''}
          <b>${esc(s.name)}</b><span>${esc(s.sub)}</span>
        </div>`).join('')}</div>`;
    }
    return out;
  }

  function render() {
    const P = DATA.place || {};
    $$('[data-city]').forEach((el) => (el.textContent = P.city || ''));
    $$('[data-address]').forEach((el) => (el.textContent = P.address || ''));
    $$('[data-phone]').forEach((el) => (el.textContent = P.phone || ''));
    $$('[data-phone-label]').forEach((el) => (el.textContent = P.phoneLabel || ''));
    $$('[data-tel]').forEach((el) => (el.href = tel(P.phone)));

    // Цифры в шапке считаются из данных, чтобы не разъезжались с меню
    const dishes = CATS.reduce((n, c) => n + c.items.length, 0);
    const stats = [[dishes, '', 'позиций'], [CATS.length, '', 'разделов']];
    const grill = CATS.find((c) => c.id === 'grill');
    const lunch = CATS.find((c) => c.id === 'lunch');
    const minP = (c) => Math.min(...c.items.map((i) => +i.p || Infinity));
    if (grill && grill.items.length) stats.push([minP(grill), '₽', 'мангал от']);
    else if (lunch && lunch.items.length) stats.push([minP(lunch), '₽', 'ланч от']);
    $('#stats').innerHTML = stats
      .map(([n, u, l]) => `<li><p class="stat__n">${num(n)}${u ? `<small>${u}</small>` : ''}</p><p class="stat__l">${l}</p></li>`)
      .join('');

    // Бегущая строка — названия разделов
    const run = CATS.map((c) => `<span class="band__item">${esc(c.title)}<img src="assets/img/el-loc-dark.webp" alt="" width="12" height="15"></span>`).join('');
    $('#band').innerHTML = `<div class="band__inner">${run.repeat(4)}</div>`;

    $('#catsScroll').innerHTML = CATS.map(
      (c) => `<a class="chip" href="#c-${esc(c.id)}" data-cat="${esc(c.id)}">${esc(c.short || c.title)} <i>${c.items.length}</i></a>`
    ).join('');

    $('#sections').innerHTML = CATS.map((c, ci) => {
      const head = `
        <header class="cat__head">
          <span class="cat__num">${String(ci + 1).padStart(2, '0')}</span>
          <h2 class="h" id="h-${esc(c.id)}">${esc(c.title)}</h2>
          ${c.note ? `<p class="cat__note">${esc(c.note)}</p>` : ''}
        </header>`;
      let body;
      if (c.type === 'list') {
        body = `<div class="plain">${c.items.map((it) => plainRow(c, it)).join('')}</div>`;
      } else {
        body = catIntro(c) + `<div class="grid">${c.items.map((it, i) => itemCard(c, it, i)).join('')}</div>`;
      }
      return `<section class="cat" id="c-${esc(c.id)}" data-cat="${esc(c.id)}" aria-labelledby="h-${esc(c.id)}">${head}${body}</section>`;
    }).join('') + (P.footNote ? `<p class="drinks"><b>${esc(P.footNote)}</b></p>` : '');
  }

  /* ─────────────────────────────── Появление карточек */

  function initReveal() {
    const cards = $$('.it.is-pre');
    if (REDUCED || !('IntersectionObserver' in window)) {
      cards.forEach((c) => c.classList.remove('is-pre'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        let k = 0;
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.style.transitionDelay = `${Math.min(k++, 6) * 45}ms`;
          e.target.classList.remove('is-pre');
          io.unobserve(e.target);
        });
      },
      { rootMargin: '0px 0px -6% 0px' }
    );
    cards.forEach((c) => io.observe(c));
  }

  /* ─────────────────────────────── Панель разделов */

  function initCats() {
    const bar = $('#cats');
    const scroller = $('#catsScroll');
    const chips = $$('.chip', scroller);
    let current = null;

    const barH = () => bar.getBoundingClientRect().height;

    function setActive(id) {
      if (id === current) return;
      current = id;
      chips.forEach((c) => {
        const on = c.dataset.cat === id;
        c.classList.toggle('is-on', on);
        if (on) {
          c.setAttribute('aria-current', 'true');
          // активный раздел держим в поле зрения ленты, не трогая прокрутку страницы
          const left = c.offsetLeft - (scroller.clientWidth - c.offsetWidth) / 2;
          scroller.scrollTo({ left, behavior: REDUCED ? 'auto' : 'smooth' });
        } else {
          c.removeAttribute('aria-current');
        }
      });
    }

    function spy() {
      const line = barH() + 24;
      let id = null;
      $$('.cat').forEach((s) => {
        if (s.hidden) return;
        if (s.getBoundingClientRect().top <= line) id = s.dataset.cat;
      });
      if (!id) {
        const first = $$('.cat').find((s) => !s.hidden);
        id = first && first.dataset.cat;
      }
      setActive(id);
    }

    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { spy(); ticking = false; });
    }, { passive: true });
    addEventListener('resize', spy);

    scroller.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      e.preventDefault();
      const sec = $(`#c-${chip.dataset.cat}`);
      const top = sec.getBoundingClientRect().top + scrollY - barH() + 2;
      scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
      history.replaceState(null, '', `#c-${chip.dataset.cat}`);
    });

    spy();
    // переход по ссылке вида menu.html#c-lunch
    if (location.hash) {
      const sec = document.getElementById(location.hash.slice(1));
      if (sec) requestAnimationFrame(() => scrollTo({ top: sec.getBoundingClientRect().top + scrollY - barH() + 2 }));
    }
    return spy;
  }

  /* ─────────────────────────────── Поиск */

  function initSearch(spy) {
    const input = $('#q');
    const clear = $('#qClear');
    const empty = $('#empty');

    function apply() {
      const q = norm(input.value.trim());
      clear.hidden = !q;
      let total = 0;
      $$('.cat').forEach((sec) => {
        let shown = 0;
        $$('[data-q]', sec).forEach((el) => {
          const ok = !q || el.dataset.q.includes(q);
          el.hidden = !ok;
          if (ok) {
            shown++;
            el.classList.remove('is-pre');
          }
        });
        sec.hidden = shown === 0;
        // гарниры и пояснение ланча нужны только вместе с ланчами
        $$('.sides, .lunchnote', sec).forEach((x) => (x.hidden = !!q));
        const chip = $(`.chip[data-cat="${sec.dataset.cat}"]`);
        if (chip) {
          chip.hidden = shown === 0;
          chip.querySelector('i').textContent = shown;
        }
        total += shown;
      });
      empty.hidden = total > 0;
      const drinks = $('.drinks');
      if (drinks) drinks.hidden = !!q;
      $('#emptyQ').textContent = input.value.trim();
      spy();
    }

    input.addEventListener('input', apply);
    // Enter прячет клавиатуру на телефоне и показывает результаты
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      input.blur();
      const first = $$('.cat').find((s) => !s.hidden);
      if (first) scrollTo({ top: first.getBoundingClientRect().top + scrollY - $('#cats').offsetHeight, behavior: REDUCED ? 'auto' : 'smooth' });
    });
    const reset = () => { input.value = ''; apply(); input.focus(); };
    clear.addEventListener('click', reset);
    $('#emptyReset').addEventListener('click', reset);
  }

  /* ─────────────────────────────── Карточка блюда */

  function initSheet() {
    const sheet = $('#sheet');
    const panel = $('#sheetPanel');
    let list = [];
    let idx = 0;
    let cat = null;

    function fill() {
      const it = list[idx];
      const img = $('#sheetImg');
      const src = safeSrc(it.img);
      $('#sheetMedia').classList.toggle('is-empty', !src);
      img.hidden = !src;
      if (src) { img.src = src; img.alt = it.name; }
      $('#sheetCat').innerHTML = `<b>${esc(cat.title)}</b>`;
      $('#sheetName').textContent = it.name;
      $('#sheetSub').textContent = it.sub || '';

      const hasOpts = it.opts && it.opts.length;
      let price;
      if (hasOpts) {
        price = `<ul class="sheet__opts">${it.opts
          .map((o) => `<li>${hot(o.hot)}<span>${optLabel(o)}</span><b>${num(o.p)} ₽</b></li>`)
          .join('')}</ul>`;
      } else {
        price = `<p class="sheet__price"><b>${num(it.p)} ₽</b><span>${esc(fmtW(it.w))}</span></p>`;
      }
      const isHot = it.hot || (hasOpts && it.opts.some((o) => o.hot));
      $('#sheetPrice').innerHTML =
        price + (isHot ? `<p class="sheet__hot"><img src="assets/img/el-pepper-red.webp" alt="" width="13" height="13">${hasOpts && !it.hot ? 'есть острый вариант' : 'остро'}</p>` : '');

      let body = '';
      if (it.d) body += `<p class="sheet__h">Состав</p><p class="sheet__d">${esc(it.d)}</p>`;
      if (cat.intro) body += `<p class="sheet__h">Входит</p><p class="sheet__d">${esc(cat.intro)}</p>`;
      if (cat.sides && cat.sides.length) {
        body += `<p class="sheet__h">Гарнир на выбор</p><p class="sheet__d">${cat.sides.map((x) => esc(`${x.name} (${x.sub})`)).join(', ')}</p>`;
      }
      $('#sheetBody').innerHTML = body;

      const P = DATA.place || {};
      $('#sheetOrder').innerHTML = P.phone
        ? `<a class="pill pill--red" href="${esc(tel(P.phone))}">Позвонить · ${esc(P.phone)}</a>`
        : '';
      $('#sheetCount').textContent = `${idx + 1} / ${list.length}`;
      panel.scrollTop = 0;
    }

    function open(catId, i) {
      cat = CATS.find((c) => c.id === catId);
      // листаем только видимые (с учётом поиска) блюда раздела
      const visible = $$(`.it[data-cat="${catId}"]`).filter((el) => !el.hidden).map((el) => +el.dataset.i);
      list = visible.map((k) => cat.items[k]);
      idx = Math.max(0, visible.indexOf(i));
      fill();
      if (!sheet.open) {
        sheet.showModal();
        document.documentElement.classList.add('is-sheet');
      }
    }

    function close() {
      if (!sheet.open || sheet.classList.contains('is-closing')) return;
      if (REDUCED) { sheet.close(); return; }
      sheet.classList.add('is-closing');
      setTimeout(() => { sheet.classList.remove('is-closing'); sheet.close(); }, 260);
    }

    const step = (d) => { idx = (idx + d + list.length) % list.length; fill(); };

    $('#sections').addEventListener('click', (e) => {
      const card = e.target.closest('.it');
      if (card) open(card.dataset.cat, +card.dataset.i);
    });
    $('#sheetClose').addEventListener('click', close);
    $('#sheetPrev').addEventListener('click', () => step(-1));
    $('#sheetNext').addEventListener('click', () => step(1));
    sheet.addEventListener('close', () => document.documentElement.classList.remove('is-sheet'));
    // клик по затемнению вокруг шторки
    sheet.addEventListener('click', (e) => { if (e.target === sheet) close(); });
    sheet.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    sheet.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });

    // Смахнуть шторку вниз на телефоне
    let y0 = null;
    let dy = 0;
    panel.addEventListener('touchstart', (e) => {
      y0 = panel.scrollTop <= 0 ? e.touches[0].clientY : null;
      dy = 0;
    }, { passive: true });
    panel.addEventListener('touchmove', (e) => {
      if (y0 === null) return;
      dy = Math.max(0, e.touches[0].clientY - y0);
      if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    panel.addEventListener('touchend', () => {
      if (y0 === null) return;
      sheet.style.transform = '';
      if (dy > 110) close();
      y0 = null;
    });
  }

  /* ─────────────────────────────── Плавающая кнопка заказа */

  // Появляется, когда кнопка в шапке ушла из виду, и прячется у блока заказа
  function initFab() {
    const fab = $('#fab');
    if (!('IntersectionObserver' in window)) { fab.classList.remove('is-off'); return; }
    let headerSeen = true;
    let orderSeen = false;
    const sync = () => fab.classList.toggle('is-off', headerSeen || orderSeen);
    new IntersectionObserver(([e]) => { headerSeen = e.isIntersecting; sync(); }).observe($('.mh'));
    new IntersectionObserver(([e]) => { orderSeen = e.isIntersecting; sync(); }, { threshold: .05 }).observe($('#order'));
  }

  const preview = new URLSearchParams(location.search).has('preview');
  MenuData.load({ preview })
    .then((data) => {
      DATA = data;
      CATS = (data.categories || []).filter((c) => c.items && c.items.length);
      if (preview && MenuData.readDraft()) $('#previewBar').hidden = false;
      render();
      initReveal();
      const spy = initCats();
      initSearch(spy);
      initSheet();
      initFab();
    })
    .catch(() => {
      $('#loadError').hidden = false;
      initFab();
    });
})();
