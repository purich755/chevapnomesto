/* ═══════════════════════════════════════════════════════════════
   ЧЕВАПНО МЕСТО · сборка страницы и анимации
   Анимируются только transform и opacity. Всё уважает
   prefers-reduced-motion. Данные — в js/content.js.
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  document.documentElement.classList.add('js');

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COARSE = matchMedia('(pointer: coarse)').matches;
  const NARROW = matchMedia('(max-width: 1180px)').matches;
  const EASE = 'power3.out';

  gsap.registerPlugin(ScrollTrigger);

  const dish = (id) => `assets/img/dish/${id}.webp`;
  const num = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const pepper = (on) =>
    on ? '<span class="hot" title="Остро"><img src="assets/img/el-pepper-red.webp" alt="остро" width="14" height="14"></span>' : '';
  // Внешние ссылки открываем в новой вкладке безопасно
  const extAttr = (href) => (/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '');

  /* ───────────────────────────────────── 1. Рендер контента */

  function fillCity() {
    $$('[data-city]').forEach((el) => (el.textContent = CONTACTS.city));
  }

  function buildMarquees() {
    const flame = 'assets/img/el-loc-dark.webp';
    const run = (words) =>
      words.map((w) => `<span class="marquee__item">${w}<img src="${flame}" alt="" width="14" height="18"></span>`).join('');
    // Дублируем ленту, чтобы шов был незаметен при бесконечной прокрутке
    $('#marqueeTop').innerHTML = run(MARQUEE_TOP).repeat(3);
    $('#marqueeBottom').innerHTML = run(MARQUEE_BOTTOM).repeat(3);
  }

  function buildRail() {
    const secs = $$('[data-section]');
    $('#railList').innerHTML = secs
      .map((s) => `<li data-for="${s.id}"><a href="#${s.id}" title="${s.dataset.name}">${s.dataset.section}</a></li>`)
      .join('');
  }

  function buildShowcase() {
    $('#showcaseTrack').innerHTML = SHOWCASE.map(
      (d) => `
      <article class="dishcard">
        ${d.tag ? `<span class="dishcard__tag">${d.tag}</span>` : ''}
        <div class="dishcard__media">
          <img src="${dish(d.id)}" alt="${d.name}" width="680" height="680" loading="lazy" decoding="async">
        </div>
        <h3 class="dishcard__name">${pepper(d.hot)}${d.name}</h3>
        <p class="dishcard__sub">${d.sub || ''}</p>
        <p class="dishcard__meta">
          ${d.w ? `<span class="dishcard__w">${d.w} гр</span>` : ''}
          <span class="dishcard__p" data-count="${d.p}">${d.p}<span> ₽</span></span>
        </p>
      </article>`
    ).join('');
  }

  function priceMarkup(it) {
    if (it.opts) return `<span class="mcard__w">от</span><span class="mcard__p">${num(it.p)} ₽</span>`;
    return `<span class="mcard__w">${it.w} гр</span><span class="mcard__p">${num(it.p)} ₽</span>`;
  }

  // Варианты одной позиции: «3 шт · 100 гр — 180 ₽»
  const optsMarkup = (it) =>
    it.opts
      ? `<ul class="mcard__opts">${it.opts
          .map(([l, w, p, hot]) => `<li>${pepper(hot)}${l ? `${l} · ` : ''}${w} гр <b>${num(p)} ₽</b></li>`)
          .join('')}</ul>`
      : '';

  function buildMenu() {
    $('#menuFoot').textContent = MENU_FOOT;
    $('#menuTabs').innerHTML = MENU.map(
      (c, i) =>
        `<button class="tab${i === 0 ? ' is-on' : ''}" role="tab" aria-selected="${i === 0}"
                 aria-controls="panel-${c.id}" id="tab-${c.id}" data-tab="${c.id}"
                 title="${c.title}">${c.short || c.title}</button>`
    ).join('');

    $('#menuPanels').innerHTML = MENU.map((c, i) => {
      const note = `<p class="panel__note">${c.title}${c.note ? ` · ${c.note}` : ''}</p>`;
      if (c.plain) {
        const rows = c.items
          .map(
            (it) => `
          <div class="plainrow">
            <span class="plainrow__name">${pepper(it.hot)}${it.name}</span>
            <span class="plainrow__dots"></span>
            <span class="plainrow__nums"><span>${it.w} гр</span><b>${it.p} ₽</b></span>
          </div>`
          )
          .join('');
        return `<div class="panel${i === 0 ? ' is-on' : ''}" id="panel-${c.id}" role="tabpanel"
                     aria-labelledby="tab-${c.id}">${note}<div class="plainlist">${rows}</div></div>`;
      }
      const cards = c.items
        .map(
          (it) => `
        <article class="mcard">
          <div class="mcard__media">
            <img src="${dish(it.id)}" alt="${it.name}" width="680" height="680" loading="lazy" decoding="async">
          </div>
          <h3 class="mcard__name">${pepper(it.hot)}${it.name}</h3>
          ${it.sub ? `<p class="mcard__sub">${it.sub}</p>` : ''}
          <p class="mcard__nums">${priceMarkup(it)}</p>
          ${optsMarkup(it)}
          ${it.d ? `<p class="mcard__d">${it.d}</p>` : ''}
        </article>`
        )
        .join('');
      return `<div class="panel${i === 0 ? ' is-on' : ''}" id="panel-${c.id}" role="tabpanel"
                   aria-labelledby="tab-${c.id}">${note}<div class="panel__grid">${cards}</div></div>`;
    }).join('');
  }

  function buildLunch() {
    $('#lunchNote').textContent = LUNCH_NOTE;
    $('#lunchSides').innerHTML = LUNCH_SIDES.map(
      (s, i) => `
      <button class="side${i === 0 ? ' is-on' : ''}" role="radio" aria-checked="${i === 0}" data-side="${i}">
        <span class="side__ring">
          <img src="${dish(s.id)}" alt="${s.name}" width="680" height="680" loading="lazy" decoding="async">
          <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" pathLength="1"/></svg>
        </span>
        <span class="side__name">${s.name}</span>
        <span class="side__sub">${s.sub}</span>
      </button>`
    ).join('');

    $('#lunchMains').innerHTML = LUNCH_MAINS.map(
      (m, i) => `
      <button class="main${i === 0 ? ' is-on' : ''}" role="radio" aria-checked="${i === 0}" data-main="${i}">
        <span class="main__media"><img src="${dish(m.id)}" alt="${m.name}" width="680" height="680" loading="lazy" decoding="async"></span>
        <span class="main__name">${pepper(m.hot)}${m.name}</span>
        <span class="main__sub">${m.sub}</span>
        <span class="main__nums"><span class="main__w">${m.w} гр</span><span class="main__p">${m.p} ₽</span></span>
      </button>`
    ).join('');
  }

  function buildDelivery() {
    const d = CONTACTS.delivery;
    $('#deliveryLinks').innerHTML = d.aggregators
      .map((a) => `<a class="btn btn--ghost" href="${a.href}"${extAttr(a.href)} data-magnetic>${a.label}</a>`)
      .join('') + `<a class="btn btn--red" href="${CONTACTS.phoneHref}" data-magnetic>${CONTACTS.phone}</a>`;

    $('#deliveryStats').innerHTML = [
      [d.time, d.timeUnit, d.timeLabel],
      [d.price, d.priceUnit, d.priceLabel],
      [d.days, d.daysUnit, d.daysLabel],
    ]
      .map(
        ([n, u, cap]) => `
      <li class="stat">
        <p class="stat__num"><span data-count="${n}">0</span><i>${u}</i></p>
        <p class="stat__cap">${cap}</p>
      </li>`
      )
      .join('');
  }

  function buildPlace() {
    const hours = CONTACTS.hours.map(([d, t]) => `<div><dt>${d}</dt><dd>${t}</dd></div>`).join('');
    const addrs = CONTACTS.addresses
      .map((a) => `<p class="infoblock__addr"><img src="assets/img/el-loc-red.webp" alt="" width="14" height="18">${CONTACTS.city}, ${a}</p>`)
      .join('');
    const n = CONTACTS.addresses.length;
    $('#placeInfo').innerHTML = `
      <div class="infoblock">
        <p class="infoblock__cap">Адреса · ${n} ${n === 1 ? 'точка' : 'точки'} в городе</p>
        ${addrs}
      </div>
      ${CONTACTS.branch ? `
      <div class="infoblock">
        <p class="infoblock__cap">${CONTACTS.city}, ${CONTACTS.branch.address}</p>
        <p class="infoblock__note">${CONTACTS.branch.note}. ${CONTACTS.branch.phoneLabel}:
          <a href="${CONTACTS.branch.phoneHref}">${CONTACTS.branch.phone}</a></p>
        <p class="sociallinks"><a class="btn btn--red" href="${CONTACTS.branch.href}" data-magnetic>Меню этой точки →</a></p>
      </div>` : ''}
      <div class="infoblock">
        <p class="infoblock__cap">Часы работы</p>
        <dl class="hours">${hours}</dl>
      </div>
      <div class="infoblock">
        <p class="infoblock__cap">Телефон</p>
        <p class="infoblock__val"><a href="${CONTACTS.phoneHref}">${CONTACTS.phone}</a></p>
      </div>
      <div class="infoblock">
        <p class="infoblock__cap">Мы в сети</p>
        <p class="sociallinks">${CONTACTS.socials
          .map((s) => `<a class="btn btn--ghost" href="${s.href}"${extAttr(s.href)} data-magnetic>${s.label}</a>`)
          .join('')}</p>
      </div>`;
    $('#mapCap').textContent = `${CONTACTS.city} · ${n} ${n === 1 ? 'точка' : 'точки'}`;
    $('#footerSocials').innerHTML = CONTACTS.socials
      .map((s) => `<a href="${s.href}"${extAttr(s.href)}>${s.label}</a>`)
      .join('');
  }

  function buildPaper() {
    // Крафт с паттерном из штампов: слегка разноповёрнутые печати
    const spots = [
      [4, 6, -12], [40, 2, 8], [74, 10, -5], [16, 44, 14], [52, 38, -9],
      [84, 48, 6], [2, 74, -7], [36, 70, 11], [70, 78, -14],
    ];
    $('#paperStamps').innerHTML = spots
      .map(([x, y, r]) => `<img src="assets/img/stamp-red.webp" alt="" style="left:${x}%;top:${y}%;transform:rotate(${r}deg)" width="180" height="180" loading="lazy">`)
      .join('');
  }

  /* ───────────────────────────────────── 2. Интерактив */

  function initMenuTabs() {
    const tabs = $$('#menuTabs .tab');
    const panels = $$('#menuPanels .panel');
    tabs.forEach((t) =>
      t.addEventListener('click', () => {
        if (t.classList.contains('is-on')) return;
        tabs.forEach((x) => {
          x.classList.toggle('is-on', x === t);
          x.setAttribute('aria-selected', x === t);
        });
        const target = $(`#panel-${t.dataset.tab}`);
        panels.forEach((p) => p.classList.toggle('is-on', p === target));
        if (!REDUCED) {
          gsap.fromTo(
            target.children,
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: .55, ease: EASE, stagger: .04, overwrite: true }
          );
        }
        ScrollTrigger.refresh();
      })
    );
  }

  function initLunchBuilder() {
    let side = 0;
    let main = 0;
    const elName = $('#totalName');
    const elNameSub = $('#totalNameSub');
    const elSide = $('#totalSide');
    const elW = $('#totalWeight');
    const elP = $('#totalPrice');
    const state = { w: 0, p: 0 };

    function render() {
      const m = LUNCH_MAINS[main];
      const s = LUNCH_SIDES[side];
      elName.textContent = m.name;
      elNameSub.textContent = m.sub || '';
      elSide.textContent = `Гарнир: ${s.name}, ${s.sub} · Соус: ${m.sauce}`;
      if (REDUCED) {
        elW.textContent = m.w;
        elP.textContent = num(m.p);
        return;
      }
      gsap.to(state, {
        w: m.w, p: m.p, duration: .8, ease: 'power2.out', overwrite: true,
        onUpdate() {
          elW.textContent = Math.round(state.w);
          elP.textContent = num(Math.round(state.p));
        },
      });
    }

    $('#lunchSides').addEventListener('click', (e) => {
      const b = e.target.closest('[data-side]');
      if (!b) return;
      side = +b.dataset.side;
      $$('#lunchSides .side').forEach((x, i) => {
        x.classList.toggle('is-on', i === side);
        x.setAttribute('aria-checked', i === side);
      });
      render();
    });

    $('#lunchMains').addEventListener('click', (e) => {
      const b = e.target.closest('[data-main]');
      if (!b) return;
      main = +b.dataset.main;
      $$('#lunchMains .main').forEach((x, i) => {
        x.classList.toggle('is-on', i === main);
        x.setAttribute('aria-checked', i === main);
      });
      render();
    });

    render();
  }

  function initHeader() {
    const header = $('#header');
    const burger = $('#burger');
    const nav = $('#mobilenav');

    ScrollTrigger.create({
      start: 'top -40',
      end: 99999,
      onUpdate: (self) => header.classList.toggle('is-stuck', self.scroll() > 40),
    });

    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') !== 'true';
      burger.setAttribute('aria-expanded', open);
      nav.classList.toggle('is-open', open);
      nav.setAttribute('aria-hidden', !open);
      document.body.classList.toggle('nav-open', open);
    });
    nav.addEventListener('click', (e) => {
      if (e.target.tagName !== 'A') return;
      burger.setAttribute('aria-expanded', 'false');
      nav.classList.remove('is-open');
      nav.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('nav-open');
    });
  }

  function initMagnetic() {
    if (COARSE || REDUCED) return;
    $$('[data-magnetic]').forEach((el) => {
      const qx = gsap.quickTo(el, 'x', { duration: .5, ease: 'power3' });
      const qy = gsap.quickTo(el, 'y', { duration: .5, ease: 'power3' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        qx(gsap.utils.clamp(-6, 6, (e.clientX - r.left - r.width / 2) * .3));
        qy(gsap.utils.clamp(-6, 6, (e.clientY - r.top - r.height / 2) * .3));
      });
      el.addEventListener('pointerleave', () => { qx(0); qy(0); });
    });
  }

  /* ───────────────────────────────────── 3. Сквозные эффекты */

  function initRail() {
    const rail = $('#rail');
    const label = $('#railLabel');
    const items = $$('#railList li');
    if (!items.length) return;
    rail.classList.add('is-on');

    $$('[data-section]').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => {
          if (!self.isActive) return;
          items.forEach((li) => li.classList.toggle('is-active', li.dataset.for === sec.id));
          label.textContent = sec.dataset.name;
        },
      });
    });

    // Секция ланчей светлая — сквозные элементы должны на ней читаться
    const light = $('#lunch');
    const fire = $('#fireProgress');
    if (light) {
      ScrollTrigger.create({
        trigger: light,
        start: 'top 60%',
        end: 'bottom 40%',
        onToggle: (self) => {
          rail.classList.toggle('on-light', self.isActive);
          fire.classList.toggle('on-light', self.isActive);
        },
      });
    }
  }

  function initFireProgress() {
    const wrap = $('#fireProgress');
    const fill = $('#fireFill');
    const numEl = $('#fireNum');
    wrap.classList.add('is-on');
    ScrollTrigger.create({
      start: 0,
      end: 'max',
      onUpdate: (self) => {
        const p = self.progress;
        fill.style.clipPath = `inset(${(1 - p) * 100}% 0 0 0)`;
        numEl.textContent = Math.round(p * 100);
      },
    });
  }

  function initReveals() {
    if (REDUCED) return;

    // Заголовки — по маске снизу, построчно
    $$('.reveal-mask').forEach((el) => {
      const split = new SplitText(el, { type: 'lines', linesClass: 'rline' });
      split.lines.forEach((l) => {
        const inner = document.createElement('span');
        inner.style.display = 'block';
        while (l.firstChild) inner.appendChild(l.firstChild);
        l.appendChild(inner);
      });
      gsap.from(
        split.lines.map((l) => l.firstChild),
        {
          yPercent: 108,
          duration: .7,
          ease: EASE,
          stagger: .08,
          scrollTrigger: { trigger: el, start: 'top 86%' },
        }
      );
    });

    $$('.reveal-up').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, duration: .7, ease: EASE,
        scrollTrigger: { trigger: el, start: 'top 90%' },
      });
    });

    // Каскад карточек
    [['.facts .fact', .07], ['.care__card', .08], ['.stat', .08], ['.infoblock', .06], ['.side', .07]].forEach(
      ([sel, stagger]) => {
        const els = $$(sel);
        if (!els.length) return;
        gsap.from(els, {
          opacity: 0, y: 40, duration: .7, ease: EASE, stagger,
          scrollTrigger: { trigger: els[0].parentElement, start: 'top 88%' },
        });
      }
    );
  }

  function initParallax() {
    if (REDUCED) return;
    $$('[data-parallax]').forEach((el) => {
      const k = parseFloat(el.dataset.parallax);
      gsap.fromTo(el, { yPercent: -k * 8 }, {
        yPercent: k * 8,
        ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  }

  function initMarquees() {
    if (REDUCED) return;
    $$('.marquee').forEach((m) => {
      const track = m.querySelector('.marquee__track');
      const rev = m.classList.contains('marquee--rev');
      const width = track.scrollWidth / 3; // лента продублирована трижды
      if (!width) return;
      let x = rev ? -width : 0;
      let speed = 0.32;
      let boost = 0;

      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: (self) => { boost = Math.min(Math.abs(self.getVelocity()) / 260, 5); },
      });

      gsap.ticker.add(() => {
        const step = (speed + boost * 0.28) * (rev ? 1 : -1);
        x += step;
        if (!rev && x <= -width) x += width;
        if (rev && x >= 0) x -= width;
        track.style.transform = `translate3d(${x}px,0,0)`;
        boost *= 0.94;
      });
    });
  }

  function initCounters() {
    if (REDUCED) {
      $$('[data-count]').forEach((el) => (el.textContent = num(+el.dataset.count)));
      return;
    }
    $$('[data-count]').forEach((el) => {
      const target = +el.dataset.count;
      const suffix = el.querySelector('span');
      const obj = { v: 0 };
      gsap.to(obj, {
        v: target, duration: .8, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 92%' },
        onUpdate() {
          el.firstChild.nodeValue = num(Math.round(obj.v));
          if (suffix) el.appendChild(suffix);
        },
      });
    });
  }

  function initStamp() {
    const stamp = $('#aboutStamp');
    if (!stamp || REDUCED) return;
    // Штамп — единственный элемент логотипа, которому гайд разрешает вращение.
    // Крутится сам по себе, медленно и непрерывно (не от прокрутки).
    gsap.to(stamp, { rotation: 360, duration: 30, ease: 'none', repeat: -1 });
  }

  function initAboutPhoto() {
    if (REDUCED) return;
    gsap.from('.about__photo img', {
      clipPath: 'inset(100% 0 0 0)',
      duration: 1.1,
      ease: EASE,
      scrollTrigger: { trigger: '.about__media', start: 'top 82%' },
    });
  }

  function initSeal() {
    const seal = $('#seal');
    if (!seal) return;
    const top = seal.querySelector('.seal__half--top');
    const bottom = seal.querySelector('.seal__half--bottom');
    const under = seal.querySelector('.seal__under');
    if (REDUCED) { under.style.opacity = 1; return; }
    gsap.timeline({ scrollTrigger: { trigger: '#sealCard', start: 'top 72%' } })
      .to(top, { yPercent: -14, xPercent: -3, rotation: -6, duration: .9, ease: EASE })
      .to(bottom, { yPercent: 14, xPercent: 3, rotation: 5, duration: .9, ease: EASE }, 0)
      .to(under, { opacity: 1, duration: .5, ease: EASE }, .3);
  }

  function initPaperParallax() {
    if (REDUCED) return;
    gsap.fromTo('#paperStamps', { yPercent: -7 }, {
      yPercent: 7, ease: 'none',
      scrollTrigger: { trigger: '.care__card--paper', start: 'top bottom', end: 'bottom top', scrub: true },
    });
  }

  function initLogoCarousel() {
    const imgs = $$('#logoCarousel img');
    if (imgs.length < 2 || REDUCED) return;
    let i = 0;
    setInterval(() => {
      imgs[i].classList.remove('is-on');
      i = (i + 1) % imgs.length;
      imgs[i].classList.add('is-on');
    }, 2600);
  }

  function initDeliveryArt() {
    if (REDUCED) return;
    gsap.from('#deliveryArt', {
      xPercent: -34, opacity: 0, duration: 1, ease: EASE,
      scrollTrigger: { trigger: '.delivery__inner', start: 'top 78%' },
    });
  }

  /* ───────────────────────────────────── 4. Секция 03 · живые угли */

  function initEmber() {
    const section = $('#fire');
    const canvas = $('#emberCanvas');
    const words = $$('.ember__word');

    // Слова по фазам прокрутки: blur → фокус → scale + fade. Один приём
    // для всех режимов (кроме reduced-motion, где слова просто видны).
    function phaseWords() {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: '#emberTrack', start: 'top top', end: 'bottom bottom', scrub: .6 },
      });
      words.forEach((w, i) => {
        const at = i / 3;
        tl.fromTo(w, { opacity: 0, filter: 'blur(26px)', scale: .94 },
          { opacity: 1, filter: 'blur(0px)', scale: 1, duration: .12, ease: 'power2.out' }, at + .02)
          .to(w, { opacity: 0, filter: 'blur(14px)', scale: 1.14, duration: .1, ease: 'power2.in' }, at + .245);
      });
    }

    if (REDUCED) {
      section.classList.add('is-static');
      words.forEach((w) => { w.style.opacity = 1; w.style.filter = 'none'; w.style.transform = 'none'; });
      return;
    }
    phaseWords();

    // ── Живой огонь: поле искр на канвасе, крутится само по себе (rAF),
    // независимо от прокрутки. Только два фирменных цвета — красный и белый.
    const ctx = canvas.getContext('2d');
    let dpr = Math.min(devicePixelRatio || 1, 2);
    let W = 1;
    let H = 1;

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.width = Math.max(1, Math.round(r.width * dpr));
      H = canvas.height = Math.max(1, Math.round(r.height * dpr));
    }
    resize();
    addEventListener('resize', gsap.utils.debounce ? gsap.utils.debounce(resize, 150) : resize);

    // Спрайт-искра: мягкое радиальное свечение (рисуем один раз, потом копируем)
    function sprite(rgb) {
      const S = 64;
      const c = document.createElement('canvas');
      c.width = c.height = S;
      const g = c.getContext('2d');
      const rad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      rad.addColorStop(0, `rgba(${rgb},1)`);
      rad.addColorStop(.35, `rgba(${rgb},.5)`);
      rad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = rad;
      g.fillRect(0, 0, S, S);
      return c;
    }
    const sRed = sprite('240,62,30');
    const sWhite = sprite('255,255,255');

    const N = COARSE ? 90 : 180;
    const P = [];
    function reset(p, seed) {
      p.x = Math.random() * W;
      p.y = seed ? Math.random() * H : H + Math.random() * 30 * dpr;
      p.vx = (Math.random() - .5) * .3 * dpr;
      p.vy = -(.35 + Math.random() * 1.2) * dpr;
      p.r = (.5 + Math.random() * 2.4) * dpr;
      p.life = seed ? Math.random() : 0;
      p.max = .6 + Math.random() * 1.1;      // время жизни искры, сек
      p.wob = Math.random() * 6.28;
      p.ws = .6 + Math.random();
      p.white = Math.random() < .16;
      return p;
    }
    for (let i = 0; i < N; i++) P.push(reset({}, true));

    // Прокрутка чуть подкручивает интенсивность — огонь «раздувается» к концу
    let intensity = 1;
    ScrollTrigger.create({
      trigger: '#emberTrack', start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { intensity = .8 + self.progress * 1; },
    });

    let last = performance.now();
    function frame() {
      const now = performance.now();
      let dt = (now - last) / 1000;
      last = now;
      if (dt > .05) dt = .05;            // защита от «прыжка» после вкладки в фоне

      // тёмный полупрозрачный слой — следы искр плавно гаснут
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(21,4,1,.22)';
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = 'lighter';   // аддитивное свечение
      for (const p of P) {
        p.life += dt / p.max;
        if (p.life >= 1 || p.y < -30) { reset(p, false); continue; }
        p.wob += dt * 3 * p.ws;
        p.x += (p.vx + Math.sin(p.wob) * .35 * dpr) * intensity * 60 * dt;
        p.y += p.vy * intensity * 60 * dt;
        const a = Math.sin(p.life * Math.PI) * .9;
        const rad = p.r * (1.6 - p.life);
        const d = rad * 6;
        ctx.globalAlpha = a;
        ctx.drawImage(p.white ? sWhite : sRed, p.x - d / 2, p.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    gsap.ticker.add(frame);
  }

  /* ───────────────────────────────────── 5. Секция 04 · pinned-горизонталь */

  function initShowcase() {
    const viewport = $('#showcaseViewport');
    const track = $('#showcaseTrack');
    if (REDUCED || NARROW) {
      viewport.style.overflowX = 'auto';
      viewport.style.scrollSnapType = 'x mandatory';
      $$('.dishcard', track).forEach((c) => (c.style.scrollSnapAlign = 'start'));
      $('.showcase__hint').textContent = 'листайте вбок →';
      return;
    }
    ScrollTrigger.create({
      trigger: '#showcase',
      start: 'top top',
      end: () => `+=${Math.max(track.scrollWidth - innerWidth, 1)}`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
      animation: gsap.to(track, {
        x: () => -(track.scrollWidth - innerWidth + 40),
        ease: 'none',
      }),
    });
  }

  /* ───────────────────────────────────── 6. Прелоадер */

  // «Розжиг»: искры, знак пламени заливается красным по мере загрузки,
  // затем проявляется логотип, по фирменной диагонали проходит красный рез
  // и экран расходится на две половины, открывая первый экран.
  function initPreloader(onDone) {
    const pre = $('#preloader');
    const fill = $('#plFill');
    const numEl = $('#plNum');
    const cap = $('#plCap');
    const glow = $('#plGlow');
    const cut = $('#plCut');
    const header = $('#header');

    // В рамках одной вкладки второй раз полную заставку не показываем
    let seen = false;
    try { seen = sessionStorage.getItem('chevapno-intro') === '1'; sessionStorage.setItem('chevapno-intro', '1'); } catch (e) {}
    const MIN = seen ? 650 : 1900;         // минимальная длительность, мс
    const STEPS = [[0, 'Разжигаем угли'], [34, 'Жарим плескавицу'], [68, 'Печём питу'], [100, 'Готово']];

    // Угол реза — ровно по линии, разделяющей половины: (0, 56%) → (100%, 44%)
    const setAngle = () => {
      const a = (-Math.atan2(innerHeight * .12, innerWidth) * 180) / Math.PI;
      gsap.set(cut, { rotation: a, scaleX: 0 });
    };
    setAngle();
    addEventListener('resize', setAngle);

    // ── Искры (свой лёгкий цикл; останавливается, когда заставка ушла)
    const canvas = $('#plEmbers');
    const ctx = canvas.getContext('2d');
    let W = 1, H = 1, dpr = 1, raf = 0, heat = .3;
    const size = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = canvas.width = Math.max(1, Math.round(innerWidth * dpr));
      H = canvas.height = Math.max(1, Math.round(innerHeight * dpr));
    };
    size();
    addEventListener('resize', size);
    const sprite = (rgb) => {
      const s = document.createElement('canvas');
      s.width = s.height = 48;
      const g = s.getContext('2d');
      const r = g.createRadialGradient(24, 24, 0, 24, 24, 24);
      r.addColorStop(0, `rgba(${rgb},1)`);
      r.addColorStop(.35, `rgba(${rgb},.5)`);
      r.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = r;
      g.fillRect(0, 0, 48, 48);
      return s;
    };
    const sR = sprite('240,62,30');
    const sW = sprite('255,255,255');
    const P = [];
    const spawn = (p, seed) => Object.assign(p, {
      x: W * (.15 + Math.random() * .7) + (Math.random() - .5) * W * .3,
      y: seed ? Math.random() * H : H + Math.random() * 40 * dpr,
      vx: (Math.random() - .5) * .4 * dpr,
      vy: -(.6 + Math.random() * 1.6) * dpr,
      r: (.6 + Math.random() * 2.2) * dpr,
      t: seed ? Math.random() : 0,
      life: .9 + Math.random() * 1.4,
      w: Math.random() * 6.28,
      white: Math.random() < .18,
    });
    for (let i = 0; i < (COARSE ? 70 : 130); i++) P.push(spawn({}, true));
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(.05, (now - last) / 1000);
      last = now;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of P) {
        p.t += dt / p.life;
        if (p.t >= 1) { spawn(p, false); continue; }
        p.w += dt * 3;
        const sp = (.6 + heat) * 60 * dt;
        p.x += (p.vx + Math.sin(p.w) * .4 * dpr) * sp;
        p.y += p.vy * sp;
        const d = p.r * (1.7 - p.t) * 6;
        ctx.globalAlpha = Math.sin(p.t * Math.PI) * (.35 + heat * .6);
        ctx.drawImage(p.white ? sW : sR, p.x - d / 2, p.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    if (!REDUCED) raf = requestAnimationFrame(tick);

    // ── Прогресс: время + реальная готовность шрифтов и первого экрана
    let ready = false;
    const gates = [document.fonts ? document.fonts.ready : Promise.resolve()];
    $$('.hero img').forEach((img) => {
      if (!img.complete) gates.push(new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); }));
    });
    Promise.all(gates).then(() => { ready = true; });

    const t0 = performance.now();
    const state = { p: 0 };
    let finished = false;
    let step = 0;

    const render = () => {
      const p = state.p;
      fill.style.clipPath = `inset(${100 - p}% 0 0 0)`;
      numEl.textContent = Math.round(p);
      glow.style.opacity = .25 + p / 100 * .75;
      heat = .3 + p / 100 * .9;
      while (step < STEPS.length - 1 && p >= STEPS[step + 1][0]) {
        step++;
        cap.textContent = STEPS[step][1];
      }
    };

    // Число бежит к цели плавно; цель — доля прошедшего минимального времени,
    // а последние проценты ждут реальной готовности страницы
    const progress = () => {
      if (finished) return;
      const byTime = Math.min(1, (performance.now() - t0) / MIN) * 100;
      const target = ready ? byTime : Math.min(byTime, 92);
      state.p += (target - state.p) * .12;
      if (target >= 100 && state.p > 99.4) state.p = 100;
      render();
      if (state.p >= 100) { finish(); return; }
      requestAnimationFrame(progress);
    };

    const reveal = () => {
      document.body.classList.remove('is-loading');
      setTimeout(() => header.classList.add('is-in'), REDUCED ? 0 : 500);
    };

    const done = () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', size);
      removeEventListener('resize', setAngle);
      pre.style.display = 'none';
      onDone();
    };

    function finish() {
      if (finished) return;
      finished = true;
      pre.classList.add('is-opening');

      if (REDUCED) {
        reveal();
        gsap.to(pre, { opacity: 0, duration: .35, onComplete: done });
        return;
      }

      const tl = gsap.timeline({ onComplete: done });
      if (!seen) {
        // знак пламени уступает место полному логотипу
        tl.to('#plMark', { scale: .82, opacity: 0, duration: .35, ease: 'power2.in' })
          .fromTo('#plLogo', { opacity: 0, y: 14, clipPath: 'inset(100% 0 0 0)' },
            { opacity: 1, y: 0, clipPath: 'inset(0% 0 0 0)', duration: .6, ease: EASE }, .18)
          .to('#plLogo', { opacity: 0, y: -10, duration: .28, ease: 'power2.in' }, 1);
      }
      tl.to('#plMark, .pl__foot, .pl__top, #plGlow, #plEmbers', { opacity: 0, duration: .28, ease: 'power2.in' }, seen ? 0 : '<')
        // красный рез по диагонали…
        .to(cut, { scaleX: 1, duration: .4, ease: 'power3.inOut' }, '>-.05')
        .add(reveal)
        // …и экран расходится на две половины
        .to('.pl__half--top', { yPercent: -62, duration: .9, ease: 'expo.inOut' }, '>-.02')
        .to('.pl__half--bottom', { yPercent: 62, duration: .9, ease: 'expo.inOut' }, '<')
        .to(cut, { opacity: 0, scaleY: 6, duration: .5, ease: 'power2.out' }, '<.1')
        .from('.hero__title .line > span', { yPercent: 108, duration: .9, ease: EASE, stagger: .08 }, '<.25')
        .from('.hero__photo', { opacity: 0, scale: 1.06, duration: 1.1, ease: EASE }, '<')
        .from('.hero__foot', { opacity: 0, duration: .7, ease: EASE }, '<.4');
    }

    if (REDUCED) { state.p = 100; render(); setTimeout(finish, 300); return; }
    requestAnimationFrame(progress);
    // Страховка: что бы ни случилось, экран не должен залипнуть
    setTimeout(() => { ready = true; }, 5000);
  }

  /* ───────────────────────────────────── Старт */

  function boot() {
    fillCity();
    buildMarquees();
    buildRail();
    buildShowcase();
    buildMenu();
    buildLunch();
    buildDelivery();
    buildPlace();
    buildPaper();

    initHeader();
    initMenuTabs();
    initLunchBuilder();

    initPreloader(() => {
      initReveals();
      initParallax();
      initMarquees();
      initCounters();
      initStamp();
      initAboutPhoto();
      initSeal();
      initPaperParallax();
      initLogoCarousel();
      initDeliveryArt();
      initEmber();
      initShowcase();
      initRail();
      initFireProgress();
      initMagnetic();
      ScrollTrigger.refresh();
    });

    // Пересчёт после подгрузки шрифтов — иначе строки заголовков «поедут»
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
