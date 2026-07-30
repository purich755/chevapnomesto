# -*- coding: utf-8 -*-
"""
Подготовка ассетов для сайта «Чевапно Место».

Источник  — папка «Элементы к сайту» из поставки клиента.
Результат — assets/img, assets/video, assets/fonts.

Запуск:  python tools/build_assets.py           (всё)
         python tools/build_assets.py fonts bg  (только выбранные шаги)

Шаги: fonts, bg, logo, elem, photo, dishes, video, frames

Требуется: pillow, numpy, scipy, fonttools[woff], ffmpeg в PATH.
"""
import os
import sys
import subprocess

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

Image.MAX_IMAGE_PIXELS = None

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get(
    'CHEVAPNO_SRC',
    r'G:\Чевапно место пос материалы\Элементы к сайту',
)
IMG = os.path.join(ROOT, 'assets', 'img')
VID = os.path.join(ROOT, 'assets', 'video')
FNT = os.path.join(ROOT, 'assets', 'fonts')

DARK = (33, 8, 3)


def ensure_dirs():
    for d in (IMG, VID, FNT, os.path.join(IMG, 'dish')):
        os.makedirs(d, exist_ok=True)


def src(name):
    p = os.path.join(SRC, name)
    if not os.path.exists(p):
        raise SystemExit('нет исходника: %s' % p)
    return p


def log(*a):
    print(' ', *a, flush=True)


def fit(im, longest):
    w, h = im.size
    if max(w, h) <= longest:
        return im
    k = longest / max(w, h)
    return im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)


def save_webp(im, name, q=80, lossless=False):
    p = os.path.join(IMG, name)
    im.save(p, 'WEBP', quality=q, method=6, lossless=lossless)
    return p


def save_jpg(im, name, q=82):
    p = os.path.join(IMG, name)
    if im.mode != 'RGB':
        bg = Image.new('RGB', im.size, DARK)
        bg.paste(im, mask=im.split()[-1] if im.mode in ('RGBA', 'LA') else None)
        im = bg
    im.save(p, 'JPEG', quality=q, optimize=True, progressive=True)
    return p


def save_png(im, name):
    p = os.path.join(IMG, name)
    im.save(p, 'PNG', optimize=True)
    return p


# ─────────────────────────────────────────────  шрифты

def step_fonts():
    from fontTools.ttLib import TTFont
    for srcname, out in (
        ('Arkhip-Regular.ttf', 'arkhip.woff2'),
        ('TikTokSans_24pt-SemiBold.ttf', 'tiktoksans-semibold.woff2'),
    ):
        f = TTFont(src(srcname))
        f.flavor = 'woff2'
        f.save(os.path.join(FNT, out))
        log(out, os.path.getsize(os.path.join(FNT, out)) // 1024, 'КБ')


# ─────────────────────────────────────────────  фоны / паттерны

BG_WIDTH = 1920


def step_bg():
    for i in range(1, 12):
        im = Image.open(src('Фон-%d.png' % i)).convert('RGBA')
        w, h = im.size
        k = BG_WIDTH / w
        im = im.resize((BG_WIDTH, round(h * k)), Image.LANCZOS)
        flat = Image.new('RGB', im.size, DARK)
        flat.paste(im, mask=im.split()[3])
        save_webp(flat, 'bg-%d.webp' % i, q=80)
        log('bg-%d.webp' % i, im.size)

    # квадратные «зерновые» плитки для мелких подложек
    for i, out, base in ((6, 'grain-dark.webp', DARK), (8, 'grain-light.webp', (255, 255, 255)),
                         (7, 'grain-red.webp', (240, 62, 30))):
        im = Image.open(src('Фон-%d.png' % i)).convert('RGBA')
        flat = Image.new('RGB', im.size, base)
        flat.paste(im, mask=im.split()[3])
        w, h = flat.size
        s = min(w, h)
        flat = flat.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2)).resize((1000, 1000), Image.LANCZOS)
        save_webp(flat, out, q=78)
        log(out)

    # Светлое зерно на всю секцию идёт слишком «грязным» — отдаём его
    # полупрозрачным слоем, чтобы на сайте класть поверх белого с низкой альфой
    im = Image.open(src('Фон-8.png')).convert('RGBA')
    a = np.asarray(im.split()[3]).astype(np.float32)
    soft = Image.new('RGBA', im.size, DARK + (0,))
    soft.putalpha(Image.fromarray(np.clip(a * 0.5, 0, 255).astype(np.uint8), 'L'))
    soft = fit(soft, 1400)
    save_webp(soft, 'grain-soft.webp', q=76)
    log('grain-soft.webp', soft.size)


# ─────────────────────────────────────────────  логотипы

LOGOS = {
    'ЧевапноМесто-Горизонтальная версия-Белый@4x.png': 'logo-h-white',
    'ЧевапноМесто-Горизонтальная версия-Темно-Коричневый@4x.png': 'logo-h-dark',
    'ЧевапноМесто-Основная версия-Белый@4x.png': 'logo-main-white',
    'ЧевапноМесто-Логотип слева-Белый@4x.png': 'logo-left-white',
    'ЧевапноМесто-Штамп-Белый@4x.png': 'stamp-white',
    'ЧевапноМесто-Штамп-Красный@4x.png': 'stamp-red',
    'ЧевапноМесто-Штамп-Темно-коричневый@4x.png': 'stamp-dark',
    'ЧевапноМесто-Стикер-Красно-коричневый@4x.png': 'sticker-red',
    'ЧевапноМесто-Стикер-Бело-коричневый@4x.png': 'sticker-white',
}


def trim_alpha(im, thr=6):
    a = np.asarray(im.split()[3])
    ys, xs = np.where(a > thr)
    if len(xs) == 0:
        return im
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def step_logo():
    for name, out in LOGOS.items():
        im = trim_alpha(Image.open(src(name)).convert('RGBA'))
        im = fit(im, 1600)
        save_webp(im, out + '.webp', q=92)
        save_png(fit(im, 900), out + '.png')
        log(out, im.size)


# ─────────────────────────────────────────────  графические элементы

ELEMS = {
    'Графический элемент-Локация-Белый@4x.png': 'el-loc-white',
    'Графический элемент-Локация-Красный@4x.png': 'el-loc-red',
    'Графический элемент-Локация-Темно-Коричневый@4x.png': 'el-loc-dark',
    'Графический элемент-На гриле-Белый@4x.png': 'el-grill-white',
    'Графический элемент-На гриле-Красный@4x.png': 'el-grill-red',
    'Графический элемент-На гриле-Темно-коричневый@4x.png': 'el-grill-dark',
    'Графический элемент-Перец-Белый@4x.png': 'el-pepper-white',
    'Графический элемент-Перец-Красный@4x.png': 'el-pepper-red',
    'Графический элемент-Доставки-Белый@4x.png': 'el-delivery-white',
    'Графический элемент-Доставки-Красный@4x.png': 'el-delivery-red',
    'Графический элемент-Доставки-Темно-Коричневый@4x.png': 'el-delivery-dark',
    'Графический элемент-Огонь-Белый@4x.png': 'el-fire-white',
    'Графический элемент-Огонь-Красный@4x.png': 'el-fire-red',
}


BRAND = {'red': (240, 62, 30), 'white': (255, 255, 255), 'dark': (33, 8, 3)}


def recolor(im, rgb):
    """Графэлементы клиента экспортированы в чужом профиле (красный уехал
    в 210,57,47). Гайд задаёт ровно три цвета — приводим к ним, фактура
    элементов живёт в альфе и не страдает."""
    a = im.split()[3]
    flat = Image.new('RGBA', im.size, rgb + (255,))
    flat.putalpha(a)
    return flat


def step_elem():
    for name, out in ELEMS.items():
        im = trim_alpha(Image.open(src(name)).convert('RGBA'))
        big = 1600 if 'Огонь' in name else 1200
        im = fit(im, big)
        tone = out.rsplit('-', 1)[1]
        if tone in BRAND:
            im = recolor(im, BRAND[tone])
        save_webp(im, out + '.webp', q=90)
        save_png(fit(im, 640), out + '.png')
        log(out, im.size, tone)


# ─────────────────────────────────────────────  фотографии клиента

PHOTOS = {
    '33.jpg': ('photo-plesk-macro', 2000),      # макро плескавицы
    '1.jpg': ('photo-plesk-three', 2000),       # три плескавицы
    '15.jpg': ('photo-chevapi-spat', 2000),     # чевапи на лопатке
    '71.jpg': ('photo-steak-box', 2000),        # стейк-ланч в контейнере
    '73.jpg': ('photo-lunch-top', 2000),        # ланч сверху
    '78-1.jpg': ('photo-burger', 2000),         # бургер целиком
    '83.jpg': ('photo-burger-macro', 2000),     # макро бургера
    '182.jpg': ('photo-pizza', 2000),           # пицца 4 сыра
    'Generated_Image_November_20_2025_-_4_20PM.png': ('photo-chevapdog', 1400),
}


# Съёмка на белом. Гайд требует изображения на чёрном фоне — снимаем белый
# в прозрачность, дальше на сайте они ложатся на фирменное зерно.
# Сюда попадают только те кадры, где предмет уверенно отделяется от задника.
# Светлая пицца на светлом фоне и чёрный лоток по краям кадра выходят рваными —
# для них берём готовые кропы с меню-бордов.
CUTOUTS = {
    'photo-plesk-three': 'cut-plesk-three',
    'photo-chevapi-spat': 'cut-chevapi-spat',
    'photo-burger': 'cut-burger',
    'photo-chevapdog': 'cut-chevapdog',
    'photo-lunch-top': 'cut-lunch-top',
}


def white_matte(im, thr=4.6, keep=0.04):
    """Студийный фон гладкий, еда — нет: та же логика, что и на меню-бордах.
    Порог по яркости тут не работает — задник снят с градиентом, а не белым."""
    w, h = im.size
    k = max(3, round(min(w, h) / 260) | 1)
    g = np.asarray(im.convert('L')).astype(np.float32)
    m = ndimage.uniform_filter(g, k)
    tex = np.sqrt(np.clip(ndimage.uniform_filter(g * g, k) - m * m, 0, None))
    mask = tex > thr
    r = max(5, round(min(w, h) / 150) | 1)
    mask = ndimage.binary_closing(mask, np.ones((r, r)))
    mask = ndimage.binary_fill_holes(mask)
    lab, n = ndimage.label(mask)
    if n:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        mask = np.isin(lab, np.where(sizes > sizes.max() * keep)[0] + 1)
        mask = ndimage.binary_fill_holes(mask)
    mask = ndimage.binary_erosion(mask, np.ones((3, 3)))
    alpha = ndimage.gaussian_filter(mask.astype(np.float32), max(1.2, min(w, h) / 900))
    out = im.convert('RGBA')
    out.putalpha(Image.fromarray((np.clip(alpha, 0, 1) * 255).astype(np.uint8), 'L'))
    return out


def step_photo():
    made = {}
    for name, (out, longest) in PHOTOS.items():
        im = Image.open(src(name))
        if im.mode == 'RGBA':
            bg = Image.new('RGB', im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[3])
            im = bg
        im = fit(im.convert('RGB'), longest)
        save_webp(im, out + '.webp', q=82)
        save_jpg(im, out + '.jpg', q=80)
        made[out] = im
        log(out, im.size)

    for key, out in CUTOUTS.items():
        cut = trim_alpha(white_matte(made[key]), thr=8)
        save_webp(fit(cut, 1500), out + '.webp', q=86)
        log(out, cut.size, '(вырезано с белого)')


# ─────────────────────────────────────────────  нарезка блюд с меню-бордов
#
# Борды — CMYK TIFF 6000 px. Для каждого блюда задан щедрый ROI (только колонка
# с фото, без текста); точная рамка внутри ROI ищется по «текстурности»
# (фон борда гладкий, еда — нет). Затем кроп расширяется до квадрата и по краям
# растворяется в прозрачность — карточка на сайте подкладывает фирменное зерно,
# как требует гайд («изображения на чёрном фоне»).

BOARD1 = '01_ЧИПИ САМАРА_NEW Q.tif'
BOARD2 = '02_ЧИПИ САМАРА_NEW Q.tif'
BOARD3 = 'Дизайн без названия (33).png'

# ключ -> (борд, x0, y0, x1, y1[, 'fixed'])
# 'fixed' — брать ROI как есть: там, где посуда чёрная на чёрном фоне борда
# (мясная чорба) или блюдо лежит на фирменном пламени (нижние пиццы),
# автопоиск рамки цепляет не то.
DISHES = {
    # ── борд 1 · бургеры и чевапи-дог
    'burger-govyadina':   (1, 300, 700, 800, 1090),
    'burger-classic':     (1, 1670, 700, 2130, 1090),
    'burger-spicy':       (1, 300, 1150, 800, 1530),
    'burger-chevapi':     (1, 1670, 1180, 2130, 1570),
    'burger-trake':       (1, 300, 1600, 800, 1990),
    'chevapi-dog':        (1, 1706, 1700, 2125, 1980),
    'burger-mini':        (1, 320, 2060, 780, 2390),
    # ── борд 1 · питы
    'pita-plesk':         (1, 250, 2520, 800, 2900),
    'pita-beef':          (1, 1800, 2520, 2360, 2900),
    'pita-piletina':      (1, 272, 3040, 760, 3390),
    'pita-gambori':       (1, 1800, 2980, 2350, 3410),
    'pita-chevapi':       (1, 240, 3410, 790, 3820),
    'pita-egg':           (1, 1810, 3400, 2340, 3810),
    # ── борд 1 · заверотоны
    'zav-classic':        (1, 3190, 150, 3860, 830),
    'zav-beef':           (1, 4540, 150, 5260, 830),
    'zav-cheese':         (1, 3190, 800, 3860, 1440),
    'zav-chevapi':        (1, 4460, 760, 5130, 1420),
    'zav-gambori':        (1, 3170, 1440, 3850, 2060),
    'zav-chevapster':     (1, 4450, 1420, 5140, 2030),
    # ── борд 1 · закуски
    'snack-trake':        (1, 3350, 2160, 3770, 2680),
    'snack-gambori':      (1, 3370, 2650, 3790, 3140),
    'snack-nuggets':      (1, 4610, 2010, 5000, 2470),
    'snack-fries':        (1, 4610, 2470, 5010, 2930),
    'snack-krompir':      (1, 4610, 2930, 5010, 3380),
    # ── борд 2 · гарниры
    'side-krompir':       (2, 640, 450, 1200, 1000),
    'side-rice':          (2, 1210, 470, 1750, 1010),
    'side-fries':         (2, 1830, 530, 2320, 1010),
    # ── борд 2 · ланчи
    'lunch-plesk-classic': (2, 220, 1200, 810, 1800),
    'lunch-plesk-spicy':   (2, 215, 1745, 825, 2360),
    'lunch-plesk-beef':    (2, 215, 2305, 825, 2935),
    'lunch-plesk-cheese':  (2, 210, 2850, 830, 3455),
    'lunch-chevapi':       (2, 205, 3415, 840, 4060),
    'lunch-steak-beef':    (2, 1760, 1160, 2350, 1800),
    'lunch-steak-chicken': (2, 1755, 1740, 2340, 2350),
    'lunch-steak-pork':    (2, 1735, 2290, 2340, 2910),
    'lunch-kebab-green':   (2, 1730, 2840, 2360, 3460),
    'lunch-kebab-cheese':  (2, 1730, 3410, 2370, 4045),
    'lunch-trake':         (2, 3145, 60, 3775, 690),
    'lunch-piletina':      (2, 4620, 65, 5240, 680),
    'lunch-kids':          (2, 3140, 750, 3770, 1250),
    'lunch-breakfast':     (2, 4630, 600, 5275, 1240),
    # ── борд 2 · чорбы
    'chorba-chicken':     (2, 3180, 1550, 3690, 2070),
    'chorba-meat':        (2, 3175, 2140, 3690, 2660, 'fixed'),
    'chorba-tomyam-c':    (2, 3120, 2650, 3690, 3220),
    'chorba-tomyam-s':    (2, 3105, 3200, 3690, 3790),
    # ── борд 2 · салаты
    'salad-shopski':      (2, 4515, 1490, 5100, 2070),
    'salad-fresh':        (2, 4520, 2060, 5100, 2645),
    'salad-caesar-c':     (2, 4520, 2650, 5090, 3230),
    'salad-caesar-s':     (2, 4515, 3210, 5090, 3795),
    # ── борд 3 · пиццы
    'pizza-4cheese':      (3, 120, 660, 650, 1175),
    'pizza-ham':          (3, 120, 1180, 670, 1700),
    'pizza-meat':         (3, 100, 1725, 670, 2260),
    'pizza-pepperoni':    (3, 95, 2285, 615, 2805, 'fixed'),
    'pizza-chicken':      (3, 110, 2830, 615, 3350, 'fixed'),
}

_board_cache = {}


def board(n):
    if n not in _board_cache:
        name = {1: BOARD1, 2: BOARD2, 3: BOARD3}[n]
        im = Image.open(src(name)).convert('RGB')
        _board_cache[n] = im
        log('загружен борд %d %s' % (n, im.size))
    return _board_cache[n]


def tight_box(crop):
    """Плотная рамка предмета внутри ROI: фон борда гладкий, еда — текстурная."""
    a = np.asarray(crop).astype(np.float32)
    g = a.mean(axis=2)
    k = 5
    m = ndimage.uniform_filter(g, k)
    tex = np.sqrt(np.clip(ndimage.uniform_filter(g * g, k) - m * m, 0, None))
    notbg = (a[..., 1] > 70) | (a[..., 2] > 70)
    mask = (tex > 9) | notbg
    mask = ndimage.binary_closing(mask, np.ones((9, 9)))
    mask = ndimage.binary_fill_holes(mask)
    lab, n = ndimage.label(mask)
    if n == 0:
        return None
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    keep = np.argmax(sizes) + 1
    ys, xs = np.where(lab == keep)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def food_matte(crop):
    """Альфа-маска самого блюда: фон борда гладкий, еда — нет.
    Так блюдо ложится на фирменную тёмную подложку сайта без «коробки»
    из куска борда — ровно то, чего требует гайд («изображения на чёрном»)."""
    a = np.asarray(crop).astype(np.float32)
    g = a.mean(axis=2)
    k = 5
    m = ndimage.uniform_filter(g, k)
    tex = np.sqrt(np.clip(ndimage.uniform_filter(g * g, k) - m * m, 0, None))
    notbg = (a[..., 1] > 62) | (a[..., 2] > 62)
    mask = (tex > 6.5) | notbg
    mask = ndimage.binary_closing(mask, np.ones((11, 11)))
    mask = ndimage.binary_fill_holes(mask)
    lab, n = ndimage.label(mask)
    if n:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        mask = lab == (np.argmax(sizes) + 1)
        mask = ndimage.binary_fill_holes(mask)
    # чуть ужимаем, чтобы не тащить кайму фона борда по контуру
    mask = ndimage.binary_erosion(mask, np.ones((3, 3)))
    return mask


def cut_square(crop, mask, out_size=680, fill=0.86):
    """Блюдо по маске, по центру квадрата, с мягкой кромкой."""
    a = (mask.astype(np.float32) * 255).astype(np.uint8)
    rgba = crop.convert('RGBA')
    rgba.putalpha(Image.fromarray(a, 'L').filter(ImageFilter.GaussianBlur(1.2)))
    w, h = rgba.size
    s = round(max(w, h) / fill)
    sq = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    sq.paste(rgba, ((s - w) // 2, (s - h) // 2))
    return sq.resize((out_size, out_size), Image.LANCZOS)


def step_dishes():
    outdir = os.path.join(IMG, 'dish')
    made = 0
    for key, spec in DISHES.items():
        bn, x0, y0, x1, y1 = spec[:5]
        mode = spec[5] if len(spec) > 5 else 'auto'
        roi = board(bn).crop((x0, y0, x1, y1))
        bb = tight_box(roi) if mode == 'auto' else (0, 0, roi.size[0], roi.size[1])
        if bb is None:
            log('!! пусто:', key)
            continue
        pad = round(max(bb[2] - bb[0], bb[3] - bb[1]) * 0.04)
        cx0 = max(0, bb[0] - pad)
        cy0 = max(0, bb[1] - pad)
        cx1 = min(roi.size[0], bb[2] + pad)
        cy1 = min(roi.size[1], bb[3] + pad)
        piece = roi.crop((cx0, cy0, cx1, cy1))
        sq = cut_square(piece, food_matte(piece))
        sq.save(os.path.join(outdir, key + '.webp'), 'WEBP', quality=86, method=6)
        made += 1
    log('нарезано блюд:', made)


def step_contact():
    """Контрольный лист нарезки — чтобы глазами проверить все кропы."""
    outdir = os.path.join(IMG, 'dish')
    files = sorted(f for f in os.listdir(outdir) if f.endswith('.webp'))
    cols, cell = 8, 190
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cell, rows * (cell + 18)), DARK)
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        im = Image.open(os.path.join(outdir, f)).convert('RGBA').resize((cell, cell), Image.LANCZOS)
        bg = Image.new('RGB', (cell, cell), DARK)
        bg.paste(im, mask=im.split()[3])
        x, y = (i % cols) * cell, (i // cols) * (cell + 18)
        sheet.paste(bg, (x, y))
        d.text((x + 3, y + cell + 3), f[:-5], fill=(240, 62, 30))
    p = os.path.join(ROOT, 'tools', 'dish-contact.jpg')
    sheet.save(p, quality=86)
    log('контрольный лист:', p)


# ─────────────────────────────────────────────  видео

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
    if r.returncode != 0:
        print(r.stderr[-3000:])
        raise SystemExit('ffmpeg упал: %s' % ' '.join(cmd[:6]))


VIDEO = 'анимация 1.mp4'


def step_video():
    """Исходник в HEVC — Chrome/Firefox его не проиграют. Перекодируем."""
    s = src(VIDEO)
    mp4 = os.path.join(VID, 'intro.mp4')
    webm = os.path.join(VID, 'intro.webm')
    poster = os.path.join(VID, 'intro-poster.jpg')

    run(['ffmpeg', '-y', '-v', 'error', '-i', s,
         '-an', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
         '-crf', '22', '-preset', 'slow',
         '-g', '15', '-keyint_min', '15', '-sc_threshold', '0',
         '-movflags', '+faststart', mp4])
    run(['ffmpeg', '-y', '-v', 'error', '-i', s,
         '-an', '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0',
         '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2', '-g', '15', webm])
    run(['ffmpeg', '-y', '-v', 'error', '-i', s, '-vf', 'select=eq(n\\,95)',
         '-frames:v', '1', '-q:v', '3', poster])
    for p in (mp4, webm, poster):
        log(os.path.basename(p), os.path.getsize(p) // 1024, 'КБ')

    # Ролик нужен только прелоадеру. Секция 03 теперь — процедурные искры
    # на канвасе (см. initEmber в js/main.js), покадровая секвенция больше
    # не нужна, поэтому старую папку с кадрами подчищаем.
    frames_dir = os.path.join(VID, 'frames')
    if os.path.isdir(frames_dir):
        for f in os.listdir(frames_dir):
            os.remove(os.path.join(frames_dir, f))
        os.rmdir(frames_dir)
        log('удалена неиспользуемая папка frames/')


STEPS = {
    'fonts': step_fonts,
    'bg': step_bg,
    'logo': step_logo,
    'elem': step_elem,
    'photo': step_photo,
    'dishes': step_dishes,
    'contact': step_contact,
    'video': step_video,
}

if __name__ == '__main__':
    ensure_dirs()
    want = sys.argv[1:] or list(STEPS)
    for name in want:
        if name not in STEPS:
            raise SystemExit('неизвестный шаг: %s (есть: %s)' % (name, ', '.join(STEPS)))
        print('▸', name, flush=True)
        STEPS[name]()
    print('готово')
