<?php
/**
 * Образец настроек админки. Скопируйте в config.php (он не попадает в git)
 * или просто запустите:  php admin/tools/set-password.php "ваш пароль"
 */
return [
    // Хэш пароля от password_hash(). Сам пароль здесь не хранится.
    'password_hash' => '',

    // Папка для резервных копий и журнала попыток входа.
    // null — data/_backups внутри сайта (закрыта через .htaccess).
    // Надёжнее указать папку ВНЕ папки сайта, например:
    // 'store_dir' => '/var/www/u1234567/data/chevapno-private',
    'store_dir' => null,
];
