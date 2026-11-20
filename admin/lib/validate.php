<?php
/**
 * Проверка всего, что приходит из админки. На выходе — чистые данные
 * строго известной формы; лишние поля отбрасываются.
 * Ошибки — человеческим языком, с названием блюда.
 */
declare(strict_types=1);

const LIM = [
    'id' => 64, 'name' => 120, 'sub' => 120, 'd' => 1500, 'w' => 40, 'label' => 80,
    'title' => 80, 'short' => 40, 'note' => 160, 'intro' => 1500, 'foot' => 200,
    'tag' => 30, 'sauce' => 80, 'lunchNote' => 1500,
    'cats' => 40, 'items' => 200, 'opts' => 12, 'sides' => 12, 'showcase' => 24, 'price' => 1000000,
];

function v_text($v, int $max, string $label, string $where, bool $required = false, bool $multiline = false): string
{
    if ($v === null) $v = '';
    if (is_int($v) || is_float($v)) $v = (string) $v;
    if (!is_string($v)) throw new AppError("$where: поле «{$label}» заполнено неправильно.");
    // Убираем управляющие символы; переносы строк оставляем только там, где они уместны
    $v = $multiline ? preg_replace('/[^\P{C}\n]/u', '', str_replace("\r\n", "\n", $v)) : preg_replace('/\p{C}/u', ' ', $v);
    if ($v === null) throw new AppError("$where: в поле «{$label}» недопустимые символы.");
    $v = trim($multiline ? preg_replace("/\n{3,}/", "\n\n", $v) : preg_replace('/\s+/u', ' ', $v));
    if ($required && $v === '') throw new AppError("$where: заполните поле «{$label}».");
    if (mb_strlen($v) > $max) throw new AppError("$where: поле «{$label}» слишком длинное — до {$max} знаков.");
    return $v;
}

function v_price($v, string $where, string $label = 'Цена'): int
{
    if (is_string($v)) $v = str_replace([' ', "\u{00A0}", '₽'], '', trim($v));
    if ($v === '' || $v === null) throw new AppError("$where: укажите «{$label}».");
    if (!is_numeric($v)) throw new AppError("$where: «{$label}» — только число, например 490.");
    $n = (float) $v;
    if ($n < 0) throw new AppError("$where: «{$label}» не может быть меньше нуля.");
    if ($n > LIM['price']) throw new AppError("$where: «{$label}» слишком большая.");
    return (int) round($n);
}

function v_bool($v): bool
{
    return $v === true || $v === 1 || $v === '1' || $v === 'true';
}

function v_id($v, string $fallbackBase, array &$seen): string
{
    $id = is_string($v) ? strtolower(trim($v)) : '';
    if (!preg_match('/^[a-z0-9][a-z0-9-]{0,63}$/', $id) || isset($seen[$id])) {
        $base = preg_replace('/[^a-z0-9-]/', '', strtolower($fallbackBase)) ?: 'item';
        do { $id = substr($base, 0, 50) . '-' . bin2hex(random_bytes(3)); } while (isset($seen[$id]));
    }
    $seen[$id] = true;
    return $id;
}

/** Фото — только наши папки и только существующий файл. */
function v_img($v, string $where): string
{
    if ($v === null || $v === '') return '';
    if (!is_string($v) || !preg_match('#^assets/img/(dish|uploads)/[A-Za-z0-9._-]+\.(webp|jpe?g|png)$#', $v)) {
        throw new AppError("$where: неправильный адрес фото, загрузите фото заново.");
    }
    if (!is_file(SITE_ROOT . '/' . $v)) throw new AppError("$where: файл фото не найден, загрузите фото заново.");
    return $v;
}

function v_list($v, int $max, string $what): array
{
    if ($v === null) return [];
    if (!is_array($v) || !array_is_list($v)) throw new AppError("Список «{$what}» передан неправильно. Обновите страницу.");
    if (count($v) > $max) throw new AppError("В списке «{$what}» слишком много записей — до {$max}.");
    return $v;
}

/** Блюдо в меню (одинаково для основного меню и Просеки). */
function v_item($it, string $catTitle, array &$seen, bool $isList): array
{
    if (!is_array($it)) throw new AppError("Раздел «{$catTitle}»: блюдо передано неправильно.");
    $name = v_text($it['name'] ?? '', LIM['name'], 'Название', "Раздел «{$catTitle}»", true);
    $where = "Блюдо «{$name}»";
    $opts = [];
    foreach (v_list($it['opts'] ?? [], LIM['opts'], "варианты «{$name}»") as $o) {
        if (!is_array($o)) continue;
        $opts[] = [
            'label' => v_text($o['label'] ?? '', LIM['label'], 'Подпись варианта', $where),
            'w' => v_text($o['w'] ?? '', LIM['w'], 'Вес варианта', $where),
            'p' => v_price($o['p'] ?? '', $where, 'Цена варианта'),
            'hot' => v_bool($o['hot'] ?? false),
        ];
    }
    // Цена блюда с вариантами — самая низкая из вариантов, так на сайте и выводится «от …»
    $p = $opts ? min(array_column($opts, 'p')) : v_price($it['p'] ?? '', $where);
    $out = [
        'id' => v_id($it['id'] ?? '', 'dish', $seen),
        'name' => $name,
        'sub' => v_text($it['sub'] ?? '', LIM['sub'], 'Подзаголовок', $where),
        'd' => v_text($it['d'] ?? '', LIM['d'], 'Состав', $where, false, true),
        'w' => v_text($it['w'] ?? '', LIM['w'], 'Вес', $where),
        'p' => $p,
        'from' => v_bool($it['from'] ?? false),
        'opts' => $opts,
        'img' => $isList ? '' : v_img($it['img'] ?? '', $where),
        'hot' => v_bool($it['hot'] ?? false),
        'new' => v_bool($it['new'] ?? false),
        'hidden' => v_bool($it['hidden'] ?? false),
    ];
    return $out;
}

function v_category($c, array &$catSeen, array &$itemSeen, bool $prosek): array
{
    if (!is_array($c)) throw new AppError('Раздел меню передан неправильно. Обновите страницу.');
    $title = v_text($c['title'] ?? '', LIM['title'], 'Название раздела', 'Раздел меню', true);
    $where = "Раздел «{$title}»";
    $type = ($c['type'] ?? 'cards') === 'list' ? 'list' : 'cards';
    $items = [];
    foreach (v_list($c['items'] ?? [], LIM['items'], "блюда раздела «{$title}»") as $it) {
        $items[] = v_item($it, $title, $itemSeen, $type === 'list');
    }
    $out = [
        'id' => v_id($c['id'] ?? '', 'cat', $catSeen),
        'title' => $title,
        'short' => v_text($c['short'] ?? '', LIM['short'], 'Короткое название', $where),
        'note' => v_text($c['note'] ?? '', LIM['note'], 'Пометка', $where),
        'hidden' => v_bool($c['hidden'] ?? false),
        'type' => $type,
    ];
    if ($prosek) {
        // Ланчи на Просеке: что входит и гарниры на выбор
        $out['intro'] = v_text($c['intro'] ?? '', LIM['intro'], 'Что входит', $where, false, true);
        $sides = [];
        foreach (v_list($c['sides'] ?? [], LIM['sides'], "гарниры раздела «{$title}»") as $s) {
            if (!is_array($s)) continue;
            $sn = v_text($s['name'] ?? '', LIM['name'], 'Название гарнира', $where, true);
            $sides[] = [
                'name' => $sn,
                'sub' => v_text($s['sub'] ?? '', LIM['sub'], 'Вес гарнира', "Гарнир «{$sn}»"),
                'img' => v_img($s['img'] ?? '', "Гарнир «{$sn}»"),
            ];
        }
        $out['sides'] = $sides;
    }
    $out['items'] = $items;
    return $out;
}

function v_categories($cats, bool $prosek): array
{
    $catSeen = [];
    $itemSeen = [];
    $out = [];
    foreach (v_list($cats, LIM['cats'], 'разделы меню') as $c) $out[] = v_category($c, $catSeen, $itemSeen, $prosek);
    return $out;
}

/** Основное меню + витрина. Бегущие строки в админке не правятся — берём из файла. */
function validate_main(array $in, array $current): array
{
    $menu = is_array($in['menu'] ?? null) ? $in['menu'] : [];
    $cats = v_categories($menu['categories'] ?? [], false);

    // Витрина ссылается на блюда меню или ланчи
    $known = [];
    foreach ($cats as $c) foreach ($c['items'] as $it) if ($c['type'] === 'cards') $known[$it['id']] = $it['name'];
    try {
        foreach ((read_json(section_path('lunch'))['mains'] ?? []) as $m) $known[$m['id'] ?? ''] = $m['name'] ?? '';
    } catch (AppError $e) { /* ланчей нет — витрина только из меню */ }

    $show = [];
    foreach (v_list($in['showcase'] ?? [], LIM['showcase'], 'витрина') as $s) {
        if (!is_array($s)) continue;
        $ref = is_string($s['ref'] ?? null) ? $s['ref'] : '';
        $name = v_text($s['name'] ?? '', LIM['name'], 'Название в витрине', 'Витрина', true);
        if (!isset($known[$ref])) {
            throw new AppError("Витрина: карточка «{$name}» ссылается на блюдо, которого больше нет в меню. Выберите другое блюдо или уберите карточку.");
        }
        $show[] = [
            'ref' => $ref,
            'name' => $name,
            'sub' => v_text($s['sub'] ?? '', LIM['sub'], 'Подпись', "Витрина «{$name}»"),
            'tag' => v_text($s['tag'] ?? '', LIM['tag'], 'Ярлык', "Витрина «{$name}»"),
            'hidden' => v_bool($s['hidden'] ?? false),
        ];
    }

    return [
        'menu' => [
            'foot' => v_text($menu['foot'] ?? '', LIM['foot'], 'Подпись под меню', 'Основное меню'),
            'categories' => $cats,
        ],
        'showcase' => $show,
        'marquee' => $current['marquee'] ?? ['top' => [], 'bottom' => []],
    ];
}

/** Меню Просеки. Адрес и телефон точки в админке не правятся — берём из файла. */
function validate_prosek(array $in, array $current): array
{
    return [
        'updated' => gmdate('Y-m-d\TH:i:s\Z'),
        'place' => $current['place'] ?? [],
        'categories' => v_categories($in['categories'] ?? [], true),
    ];
}

function validate_lunch(array $in, array $current): array
{
    $seen = [];
    $sides = [];
    foreach (v_list($in['sides'] ?? [], LIM['sides'], 'гарниры') as $s) {
        if (!is_array($s)) continue;
        $n = v_text($s['name'] ?? '', LIM['name'], 'Название гарнира', 'Гарниры', true);
        $where = "Гарнир «{$n}»";
        $sides[] = [
            'id' => v_id($s['id'] ?? '', 'side', $seen),
            'name' => $n,
            'sub' => v_text($s['sub'] ?? '', LIM['sub'], 'Вес', $where),
            'img' => v_img($s['img'] ?? '', $where),
            'hidden' => v_bool($s['hidden'] ?? false),
        ];
    }
    $mains = [];
    foreach (v_list($in['mains'] ?? [], LIM['items'], 'ланчи') as $m) {
        if (!is_array($m)) continue;
        $n = v_text($m['name'] ?? '', LIM['name'], 'Название ланча', 'Ланчи', true);
        $where = "Ланч «{$n}»";
        $w = v_price($m['w'] ?? '', $where, 'Вес, гр');
        $mains[] = [
            'id' => v_id($m['id'] ?? '', 'lunch', $seen),
            'name' => $n,
            'sub' => v_text($m['sub'] ?? '', LIM['sub'], 'Подзаголовок', $where),
            'sauce' => v_text($m['sauce'] ?? '', LIM['sauce'], 'Соус', $where),
            'w' => $w,
            'p' => v_price($m['p'] ?? '', $where),
            'img' => v_img($m['img'] ?? '', $where),
            'hot' => v_bool($m['hot'] ?? false),
            'new' => v_bool($m['new'] ?? false),
            'hidden' => v_bool($m['hidden'] ?? false),
        ];
    }
    // Конструктору ланчей на сайте нужен хотя бы один гарнир и один ланч
    if (!array_filter($sides, fn($s) => !$s['hidden'])) throw new AppError('Оставьте на сайте хотя бы один гарнир — без него не работает конструктор ланча.');
    if (!array_filter($mains, fn($m) => !$m['hidden'])) throw new AppError('Оставьте на сайте хотя бы один ланч — без него не работает конструктор ланча.');
    return [
        'note' => v_text($in['note'] ?? '', LIM['lunchNote'], 'Что входит в ланч', 'Ланчи', false, true),
        'sides' => $sides,
        'mains' => $mains,
    ];
}

function validate_section(string $section, $in, array $current): array
{
    if (!is_array($in)) throw new AppError('Данные не получены. Обновите страницу и попробуйте ещё раз.');
    return match ($section) {
        'main' => validate_main($in, $current),
        'prosek' => validate_prosek($in, $current),
        'lunch' => validate_lunch($in, $current),
        default => throw new AppError('Неизвестный раздел.'),
    };
}
