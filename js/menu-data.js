/* ═══════════════════════════════════════════════════════════════
   ЧЕВАПНО МЕСТО · данные меню точки на 5-й Просеке
   Источник — data/prosek.json, его правит admin.html.
   Общие помощники для страницы меню и админки.
   ═══════════════════════════════════════════════════════════════ */
window.MenuData = (() => {
  'use strict';

  const URL_JSON = 'data/prosek.json';
  // Черновик админки лежит в браузере, пока его не опубликовали
  const DRAFT_KEY = 'chevapno-prosek-draft';

  const num = (n) => String(n ?? '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // «330» → «330 гр»; «7 шт / 150 гр», «2 шт» и т. п. показываем как есть
  const fmtW = (w) => {
    const s = String(w ?? '').trim();
    if (!s) return '';
    return /^\d+([.,]\d+)?$/.test(s) ? `${s} гр` : s;
  };

  const tel = (phone) => 'tel:' + String(phone || '').replace(/[^\d+]/g, '').replace(/^8(?=\d{10}$)/, '+7');

  function readDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw).data : null;
    } catch (e) {
      return null;
    }
  }

  async function load({ preview = false } = {}) {
    if (preview) {
      const d = readDraft();
      if (d) return d;
    }
    const res = await fetch(URL_JSON, { cache: 'no-cache' });
    if (!res.ok) throw new Error('menu ' + res.status);
    return res.json();
  }

  return { URL_JSON, DRAFT_KEY, num, fmtW, tel, readDraft, load };
})();
