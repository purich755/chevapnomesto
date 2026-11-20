<?php
/**
 * Задать или сменить пароль админки:
 *   php admin/tools/set-password.php "новый пароль"
 * Пишет хэш в admin/config.php (остальные настройки сохраняются).
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$pass = $argv[1] ?? '';
if (mb_strlen($pass) < 8) {
    fwrite(STDERR, "Пароль — не короче 8 символов.\nПример: php admin/tools/set-password.php \"Длинный-пароль-2026\"\n");
    exit(1);
}

$file = dirname(__DIR__) . '/config.php';
$cfg = is_file($file) ? (array) (require $file) : (array) (require dirname(__DIR__) . '/config.example.php');
$cfg['password_hash'] = password_hash($pass, PASSWORD_DEFAULT);
$cfg += ['store_dir' => null];

$php = "<?php\n// Настройки админки. Не публиковать и не класть в git.\n// Пароль меняется командой: php admin/tools/set-password.php \"пароль\"\nreturn " . var_export($cfg, true) . ";\n";
if (file_put_contents($file, $php, LOCK_EX) === false) {
    fwrite(STDERR, "Не получилось записать $file — проверьте права.\n");
    exit(1);
}
@chmod($file, 0640);
echo "Готово: пароль сохранён в admin/config.php\n";
