/* ═══════════════════════════════════════════════════════════════
   ЧЕВАПНО МЕСТО · зона доставки с 5-й Просеки
   Разметка: <div class="zone" data-zone></div> — всё внутри строит этот файл.
   Контур, телефон и ссылки — в data/zone.json.
   Leaflet грузится только когда блок подъезжает к экрану.
   Адрес ищем в OpenStreetMap (Nominatim, запасной — Photon), только по кнопке.
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const root = document.querySelector('[data-zone]');
  if (!root) return;

  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const VIEWBOX = '50.05,53.32,50.35,53.15';           // Самара, чтобы не уйти в другой город
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ext = (href) => (/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : '');

  /* ── разметка ── */
  root.innerHTML = `
    <div class="zone__map">
      <div class="zone__placeholder" aria-hidden="true">Загружаем карту…</div>
      <div class="zone__leaflet" id="zoneLeaflet" role="region" aria-label="Карта зоны доставки"></div>
      <p class="zone__hintbar" id="zoneHint">Чтобы приблизить, используйте кнопки + и −</p>
      <p class="zone__legend" aria-hidden="true">
        <span><i></i>Зона доставки</span>
        <span><img src="assets/img/el-loc-red.webp" alt="">Бистро</span>
      </p>
    </div>
    <div class="zone__panel">
      <p class="zone__eyebrow" id="zoneEyebrow"><b>●</b> Зона доставки</p>
      <h3 class="zone__title">Доставим&nbsp;ли к&nbsp;вам?</h3>
      <p class="zone__lead">Привозим внутри красного контура вокруг бистро: от Дачи Головкина до Солнечной улицы. Введите адрес — проверим за секунду. Или просто нажмите на карту.</p>
      <form class="zone__form" id="zoneForm" autocomplete="off">
        <label class="zone__label" for="zoneQ">Ваш адрес</label>
        <div class="zone__field">
          <input class="zone__input" id="zoneQ" type="text" placeholder="Например: Солнечная, 13" enterkeyhint="search">
          <button class="zone__go" id="zoneGo" type="submit">Проверить</button>
        </div>
      </form>
      <div class="zone__alt">
        <button class="zone__geo" id="zoneGeo" type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/></svg>
          Я здесь
        </button>
      </div>
      <div class="zone__result" id="zoneResult" aria-live="polite"></div>
      <div class="zone__call" id="zoneCall"></div>
    </div>`;

  const $ = (id) => document.getElementById(id);
  const result = $('zoneResult');
  let DATA = null, map = null, L = null, dot = null, busy = false, lastAsk = 0;

  /* ── геометрия: попадание в контур и расстояние до края, в метрах ── */
  const KX = 111320 * Math.cos(53.24 * Math.PI / 180), KY = 111320;
  function inside([lat, lon], poly) {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [yi, xi] = poly[i], [yj, xj] = poly[j];
      if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  }
  function edgeDist([lat, lon], poly) {
    let best = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const ax = (poly[j][1] - lon) * KX, ay = (poly[j][0] - lat) * KY;
      const bx = (poly[i][1] - lon) * KX, by = (poly[i][0] - lat) * KY;
      const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len));
      best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
    }
    return best;
  }

  /* ── ответ ── */
  function verdict(ll, label) {
    const z = DATA, s = z.store;
    const isIn = inside(ll, z.polygon);
    const near = !isIn && edgeDist(ll, z.polygon) <= (z.edgeMeters || 60);
    const kind = isIn ? 'in' : near ? 'edge' : 'out';
    const call = `<a class="zres__btn" href="${s.phoneHref}">Позвонить ${esc(s.phone)}</a>`;
    const aggs = (z.aggregators || []).map((a) => `<a class="zres__btn" href="${a.href}"${ext(a.href)}>${esc(a.label)}</a>`).join('');
    const where = label ? `<p class="zres__a">${esc(label)}</p>` : '';
    result.innerHTML = {
      in: `<div class="zres zres--in"><p class="zres__k">Есть доставка</p><p class="zres__t">Привезём!</p>${where}<div class="zres__btns">${call}</div></div>`,
      edge: `<div class="zres zres--edge"><p class="zres__k">На границе зоны</p><p class="zres__t">Уточните по телефону</p>${where}<div class="zres__btns">${call}</div></div>`,
      out: `<div class="zres zres--out"><p class="zres__k">Вне зоны 5-й Просеки</p><p class="zres__t">Сюда — через Яндекс Еду</p>${where}<div class="zres__btns">${aggs}</div></div>`,
    }[kind];
    if (map) {
      if (dot) dot.remove();
      dot = L.marker(ll, {
        icon: L.divIcon({ className: '', html: `<span class="zdot is-${kind === 'in' ? 'in' : 'out'}"><i></i></span>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
        keyboard: false,
      }).addTo(map);
      const b = L.latLngBounds(z.polygon).extend(ll);
      map.flyToBounds(b, { padding: [40, 40], duration: REDUCED ? 0 : .9, maxZoom: 16 });
    }
  }
  const say = (k, t, a) => {
    if (map) {
      if (dot) { dot.remove(); dot = null; }
      map.flyToBounds(L.latLngBounds(DATA.polygon), { padding: [36, 36], duration: REDUCED ? 0 : .8 });
    }
    result.innerHTML = `<div class="zres zres--err"><p class="zres__k">${esc(k)}</p><p class="zres__t">${esc(t)}</p>${a ? `<p class="zres__a">${esc(a)}</p>` : ''}</div>`;
  };

  /* ── поиск адреса ── */
  const short = (a, fallback) => {
    if (!a) return fallback;
    const road = a.road || a.pedestrian || a.street || '';
    const num = a.house_number || a.housenumber || '';
    return [road, num].filter(Boolean).join(', ') || fallback;
  };
  async function nominatim(q) {
    const u = 'https://nominatim.openstreetmap.org/search?' + new URLSearchParams({
      q: q + ', Самара', format: 'jsonv2', addressdetails: '1', limit: '1',
      countrycodes: 'ru', viewbox: VIEWBOX, bounded: '1', 'accept-language': 'ru',
    });
    const r = await fetch(u, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error('nominatim ' + r.status);
    const [hit] = await r.json();
    return hit ? { ll: [+hit.lat, +hit.lon], label: short(hit.address, hit.display_name) } : null;
  }
  async function photon(q) {
    const u = 'https://photon.komoot.io/api/?' + new URLSearchParams({ q: q + ' Самара', limit: '1', bbox: '50.05,53.15,50.35,53.32' });
    const r = await fetch(u);
    if (!r.ok) throw new Error('photon ' + r.status);
    const f = (await r.json()).features?.[0];
    return f ? { ll: [f.geometry.coordinates[1], f.geometry.coordinates[0]], label: short(f.properties, f.properties.name) } : null;
  }
  async function lookup(q) {
    try { return await nominatim(q); } catch (e) { /* сервис занят — пробуем второй */ }
    return photon(q);
  }

  $('zoneForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = $('zoneQ').value.trim();
    if (!q || busy || !DATA) return;
    busy = true;
    const go = $('zoneGo'); go.disabled = true; go.textContent = 'Ищем…';
    try {
      // OpenStreetMap просит не чаще раза в секунду
      const wait = 1100 - (Date.now() - lastAsk);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastAsk = Date.now();
      const hit = await lookup(q);
      if (hit) verdict(hit.ll, hit.label);
      else say('Не нашли адрес', 'Попробуйте иначе', 'Улица и дом, например: «5-я просека, 99». Или нажмите на карту.');
    } catch (err) {
      say('Поиск не ответил', 'Нажмите на карту', 'Отметьте свой дом на карте — проверим по нему.');
    } finally {
      busy = false; go.disabled = false; go.textContent = 'Проверить';
    }
  });

  $('zoneGeo').addEventListener('click', () => {
    if (!navigator.geolocation || !DATA) return say('Геолокация недоступна', 'Введите адрес');
    const btn = $('zoneGeo'); btn.disabled = true;
    navigator.geolocation.getCurrentPosition(
      (p) => { btn.disabled = false; verdict([p.coords.latitude, p.coords.longitude], 'Ваше местоположение'); },
      () => { btn.disabled = false; say('Не получилось определить', 'Введите адрес', 'Браузер не дал доступ к местоположению.'); },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  });

  /* ── карта ── */
  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'js/vendor/leaflet/leaflet.css';
    document.head.appendChild(css);
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/leaflet/leaflet.js';
      s.onload = () => res(window.L); s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function drawEdge(layer) {
    const path = layer.getElement && layer.getElement();
    if (!path || REDUCED) { root.classList.add('is-drawn'); return; }
    const len = path.getTotalLength();
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = `${len}`;
    path.getBoundingClientRect();
    path.style.transition = 'stroke-dashoffset 1.8s cubic-bezier(.65,0,.35,1)';
    path.style.strokeDashoffset = '0';
    setTimeout(() => { path.style.strokeDasharray = ''; path.style.transition = ''; root.classList.add('is-drawn'); }, 1900);
  }

  function build() {
    const z = DATA, s = z.store;
    const touch = matchMedia('(pointer: coarse)').matches;
    map = L.map('zoneLeaflet', {
      zoomControl: false,
      scrollWheelZoom: false,          // колесо крутит страницу, а не карту
      dragging: !touch,                // на телефоне палец листает страницу
      tap: false,
      attributionControl: true,
      zoomSnap: .25,
      minZoom: 12,
    });
    L.control.zoom({ position: 'topright', zoomInTitle: 'Приблизить', zoomOutTitle: 'Отдалить' }).addTo(map);
    map.attributionControl.setPrefix(false);
    // Обычные тайлы OpenStreetMap без ключа; в тёмный фирменный тон их переводит CSS-фильтр
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }).addTo(map);

    const poly = z.polygon;
    const bounds = L.latLngBounds(poly);
    map.fitBounds(bounds, { padding: [36, 36] });
    map.setMaxBounds(bounds.pad(1.6));

    // Всё вне зоны притушено: мир с вырезом по контуру
    L.polygon([[[54.5, 48.5], [54.5, 52], [52, 52], [52, 48.5]], poly], {
      stroke: false, fillColor: '#210803', fillOpacity: .5, interactive: false, className: 'zone-mask',
    }).addTo(map);
    const fill = L.polygon(poly, { stroke: false, fillColor: '#F03E1E', fillOpacity: .0, interactive: false, className: 'zone-fill' }).addTo(map);
    const edge = L.polygon(poly, { color: '#F03E1E', weight: 3.5, opacity: 1, fill: false, interactive: false, className: 'zone-edge' }).addTo(map);

    const pin = L.marker([s.lat, s.lon], {
      icon: L.divIcon({
        className: '',
        html: '<span class="zpin"><span class="zpin__pulse"></span><span class="zpin__pulse"></span><img src="assets/img/el-loc-red.webp" alt="" width="40" height="51"></span>',
        iconSize: [54, 66], iconAnchor: [27, 62],
      }),
      title: `${s.name} · ${s.address}`,
      keyboard: false,
    }).addTo(map);
    pin.bindTooltip(`<small>${esc(s.name)}</small>${esc(s.address)}`, { className: 'ztip', direction: 'top', offset: [0, -58], permanent: true, opacity: 1 });

    // Клик по карте — проверка этой точки
    map.on('click', (e) => verdict([e.latlng.lat, e.latlng.lng], 'Точка на карте'));

    // Колесо мыши: подсказываем про кнопки
    const hint = $('zoneHint');
    let ht;
    map.getContainer().addEventListener('wheel', () => {
      hint.classList.add('is-on'); clearTimeout(ht);
      ht = setTimeout(() => hint.classList.remove('is-on'), 1400);
    }, { passive: true });

    root.classList.add('is-ready');
    // Контур рисуется линией, затем проявляется заливка
    setTimeout(() => {
      drawEdge(edge);
      setTimeout(() => fill.setStyle({ fillOpacity: .12 }), REDUCED ? 0 : 900);
    }, REDUCED ? 0 : 350);
  }

  function renderStatic() {
    const s = DATA.store;
    $('zoneEyebrow').innerHTML = `<b>●</b> ${esc(DATA.title || 'Зона доставки')} · ${esc(s.address)}`;
    $('zoneCall').innerHTML = `<span>${esc(s.phoneLabel)}</span><a href="${s.phoneHref}">${esc(s.phone)}</a>`;
  }

  async function start() {
    try {
      L = await loadLeaflet();
      build();
    } catch (e) {
      root.querySelector('.zone__placeholder').textContent = 'Карта не загрузилась — проверьте адрес справа';
    }
  }

  fetch('data/zone.json', { cache: 'no-cache' })
    .then((r) => r.json())
    .then((d) => {
      DATA = d;
      renderStatic();
      // Карта и её тайлы — только когда блок рядом с экраном
      const io = new IntersectionObserver((es) => {
        if (es.some((e) => e.isIntersecting)) { io.disconnect(); start(); }
      }, { rootMargin: '300px 0px' });
      io.observe(root);
    })
    .catch(() => { root.querySelector('.zone__placeholder').textContent = 'Не удалось загрузить зону доставки'; });
})();
