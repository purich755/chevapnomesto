/* ═══════════════════════════════════════════════════════════════
   ЧЕВАПНО МЕСТО · страница меню
   Данные те же, что на главной: js/content.js.
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const dish = (id) => `assets/img/dish/${id}.webp`;
  const PEPPER = '<img class="hot" src="assets/img/el-pepper-red.webp" alt="остро" width="14" height="14">';
  const hot = (on) => (on ? PEPPER : '');
  const ext = (href) => (/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '');
  const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е');

  /* ── Разделы в порядке страницы. Ланчи — отдельным разделом после пит. */
  const byId = Object.fromEntries(MENU.map((c) => [c.id, c]));
  const LUNCH = {
    id: 'lunch',
    title: 'Ланчи',
    short: 'Ланчи',
    note: 'гарнир на выбор',
    lunch: true,
    items: LUNCH_MAINS.map((m) => ({ ...m, d: `Соус ${m.sauce}` })),
  };
  const CATS = ['burgers', 'zaverotony', 'pity', LUNCH, 'chorby', 'salaty', 'zakuski', 'dobavki']
    .map((c) => (typeof c === 'string' ? byId[c] : c))
    .filter(Boolean);

  /* ─────────────────────────────── Рендер */

  function itemCard(c, it, i) {
    const opts = it.opts
      ? `<ul class="it__opts">${it.opts
          .map(([l, w, p, h]) => `<li>${hot(h)}${l ? `${l} · ` : ''}${w} гр <b>${num(p)} ₽</b></li>`)
          .join('')}</ul>`
      : '';
    const q = norm([it.name, it.sub, it.d, c.title, (it.opts || []).map((o) => o[0]).join(' ')].join(' '));
    return `
      <article class="it is-pre" data-cat="${c.id}" data-i="${i}" data-q="${q}">
        <div class="it__media">
          <img src="${dish(it.id)}" alt="${it.name}" width="680" height="680" loading="lazy" decoding="async">
        </div>
        <div class="it__body">
          <h3 class="it__name"><button class="it__btn" type="button">${hot(it.hot)}${it.name}</button></h3>
          ${it.sub ? `<p class="it__sub">${it.sub}</p>` : ''}
          ${it.d && !c.lunch ? `<p class="it__d">${it.d}</p>` : ''}
          ${opts}
          <p class="it__nums">
            <span class="it__w">${it.opts ? 'от' : `${it.w} гр`}</span>
            <span class="it__p">${num(it.p)} ₽</span>
          </p>
        </div>
      </article>`;
  }

  function plainRow(c, it) {
    return `
      <div class="plain__row" data-q="${norm(it.name + ' ' + c.title)}">
        <span>${hot(it.hot)}${it.name}</span>
        <span class="plain__dots" aria-hidden="true"></span>
        <span class="plain__w">${it.w} гр</span>
        <span class="plain__p">${num(it.p)} ₽</span>
      </div>`;
  }

  function lunchIntro() {
    const sides = LUNCH_SIDES.map(
      (s) => `
      <div class="side">
        <img src="${dish(s.id)}" alt="${s.name}" width="680" height="680" loading="lazy" decoding="async">
        <b>${s.name}</b><span>${s.sub}</span>
      </div>`
    ).join('');
    return `
      <p class="lunchnote"><b>В каждом ланче:</b> ${LUNCH_NOTE.replace(/^В каждом ланче:\s*/, '')}</p>
      <div class="sides" aria-label="Гарнир на выбор">${sides}</div>`;
  }

  function render() {
    $$('[data-city]').forEach((el) => (el.textContent = CONTACTS.city));

    // Цифры в шапке считаются из данных, чтобы не разъезжались с меню
    const dishes = CATS.reduce((n, c) => n + c.items.length, 0);
    const lunchFrom = Math.min(...LUNCH_MAINS.map((m) => m.p));
    $('#stats').innerHTML = [
      [dishes, '', 'позиций'],
      [CATS.length, '', 'разделов'],
      [lunchFrom, '₽', 'ланч с гарниром от'],
    ]
      .map(([n, u, l]) => `<li><p class="stat__n">${num(n)}${u ? `<small>${u}</small>` : ''}</p><p class="stat__l">${l}</p></li>`)
      .join('');

    // Бегущая строка — названия разделов
    const run = CATS.map((c) => `<span class="band__item">${c.title}<img src="assets/img/el-loc-dark.webp" alt="" width="12" height="15"></span>`).join('');
    $('#band').innerHTML = `<div class="band__inner">${run.repeat(4)}</div>`;

    $('#catsScroll').innerHTML = CATS.map(
      (c) => `<a class="chip" href="#c-${c.id}" data-cat="${c.id}">${c.short || c.title} <i>${c.items.length}</i></a>`
    ).join('');

    $('#sections').innerHTML = CATS.map((c, ci) => {
      const head = `
        <header class="cat__head">
          <span class="cat__num">${String(ci + 1).padStart(2, '0')}</span>
          <h2 class="h">${c.title}</h2>
          ${c.note ? `<p class="cat__note">${c.note}</p>` : ''}
        </header>`;
      let body;
      if (c.plain) {
        body = `<div class="plain">${c.items.map((it) => plainRow(c, it)).join('')}</div>
          <p class="drinks"><b>${MENU_FOOT}</b></p>`;
      } else {
        body = (c.lunch ? lunchIntro() : '') + `<div class="grid">${c.items.map((it, i) => itemCard(c, it, i)).join('')}</div>`;
      }
      return `<section class="cat" id="c-${c.id}" data-cat="${c.id}" aria-labelledby="h-${c.id}">${head.replace('<h2 class="h">', `<h2 class="h" id="h-${c.id}">`)}${body}</section>`;
    }).join('');

    // Заказ
    const d = CONTACTS.delivery;
    $('#orderLinks').innerHTML =
      d.aggregators.map((a) => `<a class="pill pill--dark" href="${a.href}"${ext(a.href)}>${a.label}</a>`).join('') +
      `<a class="pill pill--ghost" href="${CONTACTS.phoneHref}">${CONTACTS.phone}</a>`;
    const n = CONTACTS.addresses.length;
    $('#addrCap').textContent = `Адреса · ${n} ${n === 1 ? 'точка' : 'точки'} в городе`;
    $('#addrList').innerHTML = CONTACTS.addresses
      .map((a) => `<li><img src="assets/img/el-loc-white.webp" alt="" width="14" height="18">${a}</li>`)
      .join('');
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
        $$('.sides, .lunchnote, .drinks', sec).forEach((x) => (x.hidden = !!q));
        const chip = $(`.chip[data-cat="${sec.dataset.cat}"]`);
        if (chip) {
          chip.hidden = shown === 0;
          chip.querySelector('i').textContent = shown;
        }
        total += shown;
      });
      empty.hidden = total > 0;
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
      $('#sheetImg').src = dish(it.id);
      $('#sheetImg').alt = it.name;
      $('#sheetCat').innerHTML = `<b>${cat.title}</b>`;
      $('#sheetName').textContent = it.name;
      $('#sheetSub').textContent = it.sub || '';

      let price = '';
      if (it.opts) {
        price = `<ul class="sheet__opts">${it.opts
          .map(([l, w, p, h]) => `<li>${hot(h)}<span>${l ? `${l} · ` : ''}${w} гр</span><b>${num(p)} ₽</b></li>`)
          .join('')}</ul>`;
      } else {
        price = `<p class="sheet__price"><b>${num(it.p)} ₽</b><span>${it.w} гр</span></p>`;
      }
      const isHot = it.hot || (it.opts && it.opts.some((o) => o[3]));
      $('#sheetPrice').innerHTML =
        price + (isHot ? `<p class="sheet__hot"><img src="assets/img/el-pepper-red.webp" alt="" width="13" height="13">${it.opts ? 'есть острый вариант' : 'остро'}</p>` : '');

      let body = '';
      if (cat.lunch) {
        body = `<p class="sheet__h">Соус</p><p class="sheet__d">${it.sauce}</p>
          <p class="sheet__h">В ланче</p><p class="sheet__d">${LUNCH_NOTE.replace(/^В каждом ланче:\s*/, '')}</p>
          <p class="sheet__h">Гарнир на выбор</p><p class="sheet__d">${LUNCH_SIDES.map((s) => `${s.name} (${s.sub})`).join(', ')}</p>`;
      } else if (it.d) {
        body = `<p class="sheet__h">Состав</p><p class="sheet__d">${it.d}</p>`;
      }
      $('#sheetBody').innerHTML = body;

      $('#sheetOrder').innerHTML = CONTACTS.delivery.aggregators
        .map((a) => `<a class="pill pill--red" href="${a.href}"${ext(a.href)}>${a.label}</a>`)
        .join('');
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

  render();
  initReveal();
  const spy = initCats();
  initSearch(spy);
  initSheet();
  initFab();
})();
