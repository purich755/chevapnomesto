<?php
/**
 * Фото: проверка по содержимому, поворот по EXIF, пережатие через GD
 * (WebP, если GD умеет, иначе JPEG), имя файла генерируем сами.
 * Пережатие заодно выбрасывает EXIF и всё постороннее из файла.
 */
declare(strict_types=1);

const UPLOAD_DIR = 'assets/img/uploads';
const UPLOAD_MAX = 10 * 1024 * 1024;
const UPLOAD_WIDTH = 1200;
const UPLOAD_QUALITY = 80;

function upload_error_text(int $code): string
{
    return match ($code) {
        UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE => 'Фото слишком большое — до 10 МБ.',
        UPLOAD_ERR_PARTIAL => 'Фото загрузилось не до конца. Попробуйте ещё раз.',
        UPLOAD_ERR_NO_FILE => 'Выберите фото.',
        default => 'Не получилось загрузить фото. Попробуйте ещё раз.',
    };
}

function process_upload(array $file, string $kind): string
{
    if (!extension_loaded('gd')) throw new AppError('На хостинге не включена обработка изображений (GD). Сообщите разработчику.', 500);
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new AppError(upload_error_text((int) ($file['error'] ?? 4)));
    $tmp = $file['tmp_name'] ?? '';
    if (!is_uploaded_file($tmp) && PHP_SAPI !== 'cli') throw new AppError('Не получилось загрузить фото.');
    if (filesize($tmp) > UPLOAD_MAX) throw new AppError('Фото слишком большое — до 10 МБ.');

    // Тип — по содержимому файла, расширение и имя не смотрим
    $info = @getimagesize($tmp);
    $type = $info[2] ?? 0;
    if (!in_array($type, [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
        throw new AppError('Это не фото в формате JPG, PNG или WebP.');
    }
    [$w, $h] = $info;
    if ($w < 1 || $h < 1 || $w * $h > 50_000_000) throw new AppError('Фото слишком большого размера в пикселях.');

    $img = match ($type) {
        IMAGETYPE_JPEG => @imagecreatefromjpeg($tmp),
        IMAGETYPE_PNG => @imagecreatefrompng($tmp),
        IMAGETYPE_WEBP => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($tmp) : false,
    };
    if (!$img) throw new AppError('Не получилось открыть фото — возможно, файл повреждён.');

    // Фото с телефона часто «лежат на боку»: поворачиваем по EXIF
    if ($type === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
        $exif = @exif_read_data($tmp);
        $o = (int) ($exif['Orientation'] ?? 1);
        $rot = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
        if ($rot) {
            $r = imagerotate($img, $rot, 0);
            if ($r) { imagedestroy($img); $img = $r; }
        }
    }

    $w = imagesx($img);
    $h = imagesy($img);
    $nw = min($w, UPLOAD_WIDTH);
    $nh = (int) max(1, round($h * $nw / $w));
    $out = imagecreatetruecolor($nw, $nh);
    $webp = function_exists('imagewebp');
    if ($webp) {
        // Прозрачность сохраняем (вырезанные блюда на прозрачном фоне)
        imagealphablending($out, false);
        imagesavealpha($out, true);
        imagefill($out, 0, 0, imagecolorallocatealpha($out, 0, 0, 0, 127));
    } else {
        // В JPEG прозрачности нет — подкладываем фирменный тёмный фон
        imagefill($out, 0, 0, imagecolorallocate($out, 0x21, 0x08, 0x03));
        imagealphablending($out, true);
    }
    imagecopyresampled($out, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
    imagedestroy($img);

    $dir = SITE_ROOT . '/' . UPLOAD_DIR;
    if (!is_dir($dir) && !@mkdir($dir, 0775, true)) throw new AppError('Нет папки для фото ' . UPLOAD_DIR . '/. Сообщите разработчику.', 500);
    if (!is_writable($dir)) throw new AppError('Нет прав на запись в папку ' . UPLOAD_DIR . '/. Сообщите разработчику.', 500);

    $kind = preg_replace('/[^a-z]/', '', $kind) ?: 'dish';
    $name = sprintf('%s-%s-%s.%s', $kind, date('YmdHis'), bin2hex(random_bytes(3)), $webp ? 'webp' : 'jpg');
    $path = $dir . '/' . $name;
    $ok = $webp ? imagewebp($out, $path, UPLOAD_QUALITY) : imagejpeg($out, $path, UPLOAD_QUALITY);
    imagedestroy($out);
    if (!$ok) { @unlink($path); throw new AppError('Не получилось сохранить фото.', 500); }
    @chmod($path, 0664);
    return UPLOAD_DIR . '/' . $name;
}

/**
 * Удаляем загруженные фото, на которые больше никто не ссылается —
 * ни текущие данные, ни резервные копии (иначе «Восстановить» вернёт пустые картинки).
 * Свежие файлы (меньше суток) не трогаем: их могли загрузить, но ещё не сохранить.
 */
function gc_uploads(): int
{
    $dir = SITE_ROOT . '/' . UPLOAD_DIR;
    if (!is_dir($dir)) return 0;
    $refs = '';
    foreach (SECTIONS as $s => $_) $refs .= (string) @file_get_contents(section_path($s));
    foreach (list_backups() as $b) $refs .= (string) @file_get_contents(store_dir() . '/' . $b['file']);
    $n = 0;
    foreach ((array) @scandir($dir) as $f) {
        if (!is_string($f) || !preg_match('/^[a-z]+-\d{14}-[0-9a-f]{6}\.(webp|jpg)$/', $f)) continue;
        if (str_contains($refs, UPLOAD_DIR . '/' . $f)) continue;
        if (time() - (int) @filemtime("$dir/$f") < 86400) continue;
        if (@unlink("$dir/$f")) $n++;
    }
    return $n;
}
