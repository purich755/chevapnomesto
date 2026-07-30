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
    if (it.p2) {
      return `<span class="mcard__p"><small>25 см</small>${it.p2[0]} ₽</span>
              <span class="mcard__p"><small>30 см</small>${it.p2[1]} ₽</span>`;
    }
    return `<span class="mcard__w">${it.w} гр</span><span class="mcard__p">${num(it.p)} ₽</span>`;
  }

  function buildMenu() {
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
          <p class="mcard__d">${it.d}</p>
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
      elSide.textContent = `Гарнир: ${s.name}, ${s.sub}`;
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

  function initPreloader(onDone) {
    const pre = $('#preloader');
    const video = $('#preloaderVideo');
    let finished = false;

    const reveal = () => {
      if (finished) return;
      finished = true;
      document.body.classList.remove('is-loading');

      const tl = gsap.timeline({
        onComplete: () => { pre.classList.add('is-done'); pre.style.display = 'none'; onDone(); },
      });

      // Шапку выводим CSS-переходом, а не тайфлайном: так её положение
      // не зависит от того, чем закончится анимация прелоадера
      const header = $('#header');
      setTimeout(() => header.classList.add('is-in'), REDUCED ? 0 : 380);

      if (REDUCED) {
        tl.to(pre, { opacity: 0, duration: .35 });
      } else {
        // Пламя расходится наружу — и этим же движением открывается первый экран
        pre.classList.add('is-opening');
        tl.to('.preloader__video, .preloader__fallback', {
            scale: 1.55, opacity: 0, duration: 1, ease: 'power2.in', transformOrigin: '50% 50%',
          })
          .to(pre, { opacity: 0, duration: .72, ease: 'power2.inOut' }, .22)
          .from('.hero__title .line > span', { yPercent: 108, duration: .9, ease: EASE, stagger: .08 }, .3)
          .from('.hero__photo', { opacity: 0, scale: 1.06, duration: 1.1, ease: EASE }, .3)
          .from('.hero__foot', { opacity: 0, duration: .7, ease: EASE }, .75);
      }
    };

    if (REDUCED) { setTimeout(reveal, 260); return; }

    // Ролик 7 с — ускоряем до ~2.6 с, как просит ритм прелоадера
    const play = () => {
      video.playbackRate = 2.6;
      const p = video.play();
      if (p && p.catch) p.catch(() => { pre.classList.add('no-video'); setTimeout(reveal, 1400); });
    };
    video.addEventListener('loadeddata', play, { once: true });
    video.addEventListener('ended', reveal, { once: true });
    video.addEventListener('error', () => { pre.classList.add('no-video'); setTimeout(reveal, 1400); }, { once: true });
    if (video.readyState >= 2) play();
    // Страховка: что бы ни случилось, экран не должен залипнуть
    setTimeout(reveal, 4200);
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
