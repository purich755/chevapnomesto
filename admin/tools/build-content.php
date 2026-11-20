<?php
/**
 * Пересобрать js/content.js из data/*.json без админки:
 *   php admin/tools/build-content.php
 * Нужно после ручной правки data/points.json (точки, часы, доставка).
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require dirname(__DIR__) . '/lib/bootstrap.php';

try {
    write_content();
    echo "Готово: js/content.js пересобран.\n";
} catch (AppError $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
