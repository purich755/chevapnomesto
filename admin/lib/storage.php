<?php
/**
 * Хранилище: JSON-файлы в data/, атомарная запись, блокировка, резервные копии.
 */
declare(strict_types=1);

/** Ошибка, текст которой можно показать сотруднику кафе. */
final class AppError extends RuntimeException
{
    public int $http;
    public function __construct(string $message, int $http = 400)
    {
        parent::__construct($message);
        $this->http = $http;
    }
}

const SECTIONS = [
    'main' => ['file' => 'data/main.json', 'title' => 'Основное меню'],
    'prosek' => ['file' => 'data/prosek.json', 'title' => '5-я Просека'],
    'lunch' => ['file' => 'data/lunch.json', 'title' => 'Ланчи'],
];
const BACKUPS_KEEP = 30;

function section_path(string $section): string
{
    if (!isset(SECTIONS[$section])) throw new AppError('Неизвестный раздел.');
    return SITE_ROOT . '/' . SECTIONS[$section]['file'];
}

function read_json(string $path): array
{
    if (!is_file($path)) throw new AppError('Не найден файл ' . basename($path) . '.', 500);
    $raw = file_get_contents($path);
    if ($raw === false) throw new AppError('Не получилось прочитать ' . basename($path) . '.', 500);
    $data = json_decode($raw, true);
    if (!is_array($data)) throw new AppError('Файл ' . basename($path) . ' повреждён (ошибка в JSON). Восстановите его из «Истории».', 500);
    return $data;
}

function json_text(array $data): string
{
    return json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n";
}

/** Версия файла — чтобы не затереть свежие данные из старой вкладки. */
function file_rev(string $path): string
{
    return is_file($path) ? sha1_file($path) : '';
}

/** Запись через временный файл и rename: файл никогда не бывает «наполовину записан». */
function atomic_write(string $path, string $content): void
{
    $dir = dirname($path);
    if (!is_dir($dir) || !is_writable($dir)) {
        throw new AppError('Нет прав на запись в папку ' . basename($dir) . '/. Попросите разработчика выставить права (см. ADMIN_SETUP.md).', 500);
    }
    if (is_file($path) && !is_writable($path)) {
        throw new AppError('Нет прав на запись в файл ' . basename($path) . '. Попросите разработчика выставить права (см. ADMIN_SETUP.md).', 500);
    }
    $tmp = $dir . '/.' . basename($path) . '.' . bin2hex(random_bytes(4)) . '.tmp';
    $fh = @fopen($tmp, 'wb');
    if (!$fh) throw new AppError('Не получилось создать временный файл в ' . basename($dir) . '/.', 500);
    $ok = fwrite($fh, $content) === strlen($content);
    $ok = fflush($fh) && $ok;
    fclose($fh);
    if (!$ok) {
        @unlink($tmp);
        throw new AppError('Не хватило места или прав, файл не записан. Данные на сайте не изменились.', 500);
    }
    @chmod($tmp, 0664);
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        throw new AppError('Не получилось заменить ' . basename($path) . '. Данные на сайте не изменились.', 500);
    }
}

/** Всё, что меняет файлы, идёт по одному: эксклюзивная блокировка на время работы. */
function with_lock(callable $fn)
{
    $lock = store_dir() . '/.write.lock';
    $fh = @fopen($lock, 'c');
    if (!$fh) throw new AppError('Нет прав на запись в папку резервных копий. Попросите разработчика выставить права (см. ADMIN_SETUP.md).', 500);
    try {
        if (!flock($fh, LOCK_EX)) throw new AppError('Файлы сейчас заняты, попробуйте ещё раз через минуту.', 503);
        return $fn();
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

/** Копия текущего файла раздела в папку резервных копий. */
function backup_section(string $section): ?string
{
    $src = section_path($section);
    if (!is_file($src)) return null;
    $name = sprintf('%s-%s-%s.json', $section, date('Ymd-His'), bin2hex(random_bytes(2)));
    $dst = store_dir() . '/' . $name;
    if (!@copy($src, $dst)) {
        throw new AppError('Не получилось сделать резервную копию — сохранение отменено, данные на сайте не изменились.', 500);
    }
    prune_backups($section);
    return $name;
}

function prune_backups(string $section): void
{
    $list = array_values(array_filter(list_backups(), fn($b) => $b['section'] === $section));
    foreach (array_slice($list, BACKUPS_KEEP) as $b) @unlink(store_dir() . '/' . $b['file']);
}

const BACKUP_RE = '/^(main|prosek|lunch)-(\d{8})-(\d{6})-[0-9a-f]{4}\.json$/';

/** Список копий, новые сверху. */
function list_backups(): array
{
    $out = [];
    foreach ((array) @scandir(store_dir()) as $f) {
        if (!is_string($f) || !preg_match(BACKUP_RE, $f, $m)) continue;
        $ts = DateTime::createFromFormat('Ymd His', $m[2] . ' ' . $m[3]);
        $out[] = [
            'file' => $f,
            'section' => $m[1],
            'title' => SECTIONS[$m[1]]['title'],
            'time' => $ts ? $ts->getTimestamp() : 0,
            'size' => (int) @filesize(store_dir() . '/' . $f),
        ];
    }
    usort($out, fn($a, $b) => [$b['time'], $b['file']] <=> [$a['time'], $a['file']]);
    return $out;
}

function backup_path(string $file): string
{
    if (!preg_match(BACKUP_RE, $file)) throw new AppError('Такой копии нет.', 404);
    $p = store_dir() . '/' . $file;
    if (!is_file($p)) throw new AppError('Такой копии нет.', 404);
    return $p;
}
