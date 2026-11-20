<?php
/**
 * Сборка js/content.js из data/main.json, data/lunch.json и data/points.json.
 * Имена констант те же, что читает js/main.js, — сайт и анимации не меняются,
 * данные доступны сразу, без fetch. Скрытые блюда и пустые разделы в файл не попадают.
 */
declare(strict_types=1);

function js_value($v): string
{
    // JSON — корректный JS. Экранируем <, >, & на всякий случай.
    return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_PRETTY_PRINT);
}

/** Блюдо в формате, который ждёт main.js. */
function gen_item(array $it): array
{
    $out = ['id' => $it['id'], 'name' => $it['name']];
    if (($it['sub'] ?? '') !== '') $out['sub'] = $it['sub'];
    $out['w'] = $it['w'] ?? '';
    $out['p'] = $it['p'];
    if (!empty($it['opts'])) {
        $out['opts'] = array_map(fn($o) => [$o['label'], $o['w'], $o['p'], (bool) $o['hot']], $it['opts']);
    }
    if (!empty($it['from'])) $out['from'] = true;
    if (!empty($it['hot'])) $out['hot'] = true;
    if (!empty($it['new'])) $out['new'] = true;
    if (($it['img'] ?? '') !== '') $out['img'] = $it['img'];
    if (($it['d'] ?? '') !== '') $out['d'] = $it['d'];
    return $out;
}

function build_content(): string
{
    $main = read_json(section_path('main'));
    $lunch = read_json(section_path('lunch'));
    $contacts = read_json(SITE_ROOT . '/data/points.json');
    unset($contacts['_readme']);

    $menu = [];
    $dishes = [];
    foreach ($main['menu']['categories'] ?? [] as $c) {
        $items = array_values(array_filter($c['items'] ?? [], fn($it) => empty($it['hidden'])));
        foreach ($items as $it) $dishes[$it['id']] = $it;
        // Скрытый или пустой раздел не показываем: вкладка без блюд сломала бы навигацию
        if (!empty($c['hidden']) || !$items) continue;
        $cat = ['id' => $c['id'], 'title' => $c['title']];
        if (($c['short'] ?? '') !== '') $cat['short'] = $c['short'];
        if (($c['note'] ?? '') !== '') $cat['note'] = $c['note'];
        if (($c['type'] ?? '') === 'list') $cat['plain'] = true;
        $cat['items'] = array_map('gen_item', $items);
        $menu[] = $cat;
    }

    $sides = [];
    foreach ($lunch['sides'] ?? [] as $s) {
        if (!empty($s['hidden'])) continue;
        $sides[] = ['id' => $s['id'], 'name' => $s['name'], 'sub' => $s['sub'] ?? '', 'img' => $s['img'] ?? ''];
    }
    $mains = [];
    foreach ($lunch['mains'] ?? [] as $m) {
        if (!empty($m['hidden'])) continue;
        $row = ['id' => $m['id'], 'name' => $m['name'], 'sub' => $m['sub'] ?? '', 'sauce' => $m['sauce'] ?? '',
            'w' => (int) $m['w'], 'p' => (int) $m['p']];
        if (!empty($m['hot'])) $row['hot'] = true;
        if (!empty($m['new'])) $row['new'] = true;
        $row['img'] = $m['img'] ?? '';
        $mains[] = $row;
        $dishes[$m['id']] = ['w' => (string) $m['w'], 'p' => $m['p'], 'hot' => !empty($m['hot']), 'img' => $m['img'] ?? '', 'opts' => []];
    }

    // Витрина: название и подпись свои, цена, вес, фото и «острое» — из самого блюда
    $showcase = [];
    foreach ($main['showcase'] ?? [] as $s) {
        if (!empty($s['hidden']) || !isset($dishes[$s['ref']])) continue;
        $d = $dishes[$s['ref']];
        $row = ['id' => $s['ref'], 'name' => $s['name'], 'sub' => $s['sub'] ?? '', 'w' => $d['w'] ?? '', 'p' => $d['p']];
        if (!empty($d['from']) || !empty($d['opts'])) $row['from'] = true;
        if (!empty($d['hot'])) $row['hot'] = true;
        if (($s['tag'] ?? '') !== '') $row['tag'] = $s['tag'];
        $row['img'] = $d['img'] ?? '';
        $showcase[] = $row;
    }

    $parts = [
        "/* ─────────────────────────────────────────────────────────────",
        "   ЧЕВАПНО МЕСТО · данные главной страницы",
        "   Файл генерируется админкой, не редактировать вручную.",
        "   Источник: data/main.json (меню, витрина, бегущие строки),",
        "   data/lunch.json (ланчи), data/points.json (точки и доставка).",
        "   Пересобрать вручную: php admin/tools/build-content.php",
        "   ───────────────────────────────────────────────────────────── */",
        '',
        'const CONTACTS = ' . js_value($contacts) . ';',
        '',
        'const MENU = ' . js_value($menu) . ';',
        '',
        'const MENU_FOOT = ' . js_value((string) ($main['menu']['foot'] ?? '')) . ';',
        '',
        'const SHOWCASE = ' . js_value($showcase) . ';',
        '',
        'const LUNCH_SIDES = ' . js_value($sides) . ';',
        '',
        'const LUNCH_MAINS = ' . js_value($mains) . ';',
        '',
        'const LUNCH_NOTE = ' . js_value((string) ($lunch['note'] ?? '')) . ';',
        '',
        'const MARQUEE_TOP = ' . js_value(array_values($main['marquee']['top'] ?? [])) . ';',
        'const MARQUEE_BOTTOM = ' . js_value(array_values($main['marquee']['bottom'] ?? [])) . ';',
        '',
    ];
    return implode("\n", $parts);
}

function write_content(): void
{
    atomic_write(SITE_ROOT . '/js/content.js', build_content());
}
