# -*- coding: utf-8 -*-
"""
Скриншоты сайта для самопроверки.

  python tools/shots.py                     # десктоп + мобайл, весь набор
  python tools/shots.py desktop hero menu   # только нужные кадры

Требуется запущенный сервер на localhost:8310 и playwright + chromium.
"""
import os
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', 'shots')
URL = os.environ.get('CHEVAPNO_URL', 'http://localhost:8310')

# имя -> (якорь | доля прокрутки страницы)
FRAMES = [
    ('hero', 0.0),
    ('about', '#about'),
    ('fire', '#fire'),
    ('showcase', '#showcase'),
    ('menu', '#menu'),
    ('lunch', '#lunch'),
    ('care', '#care'),
    ('delivery', '#delivery'),
    ('place', '#place'),
    ('footer', 1.0),
]

DEVICES = {
    'desktop': dict(width=1440, height=900, dsf=1),
    'mobile': dict(width=390, height=844, dsf=2, mobile=True),
}


def shoot(pw, dev_name, only):
    d = DEVICES[dev_name]
    browser = pw.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = browser.new_context(
        viewport={'width': d['width'], 'height': d['height']},
        device_scale_factor=d['dsf'],
        is_mobile=d.get('mobile', False),
        has_touch=d.get('mobile', False),
        locale='ru-RU',
    )
    page = ctx.new_page()
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    page.on('pageerror', lambda e: errors.append(str(e)))

    page.goto(URL, wait_until='networkidle')
    page.wait_for_timeout(5200)          # даём прелоадеру доиграть

    for name, where in FRAMES:
        if only and name not in only:
            continue
        if isinstance(where, str):
            page.evaluate(
                """(sel) => {
                     const el = document.querySelector(sel);
                     window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant' });
                   }""", where)
        else:
            page.evaluate(
                '(f) => window.scrollTo({ top: (document.body.scrollHeight - innerHeight) * f, behavior: "instant" })',
                where)
        page.wait_for_timeout(1500)
        page.screenshot(path=os.path.join(OUT, f'{dev_name}-{name}.png'))
        print(' ', f'{dev_name}-{name}.png')

    if errors:
        print('  ОШИБКИ КОНСОЛИ:')
        for e in dict.fromkeys(errors):
            print('   ·', e[:200])
    ctx.close()
    browser.close()


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    args = [a for a in sys.argv[1:]]
    devs = [a for a in args if a in DEVICES] or list(DEVICES)
    only = [a for a in args if a not in DEVICES]
    with sync_playwright() as pw:
        for dev in devs:
            print('▸', dev)
            shoot(pw, dev, only)
    print('готово ->', OUT)
