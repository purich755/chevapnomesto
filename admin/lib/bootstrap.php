<?php
/**
 * Чевапно Место · админка — общий старт для всех страниц.
 * Подключает настройки, открывает сессию, даёт мелкие помощники.
 */
declare(strict_types=1);

const ADMIN_DIR = __DIR__ . '/..';
define('SITE_ROOT', realpath(__DIR__ . '/../..') ?: dirname(__DIR__, 2));

mb_internal_encoding('UTF-8');
date_default_timezone_set('Europe/Samara');
ini_set('display_errors', '0');

require_once __DIR__ . '/storage.php';
require_once __DIR__ . '/validate.php';
require_once __DIR__ . '/generate.php';
require_once __DIR__ . '/images.php';
require_once __DIR__ . '/auth.php';

/** Настройки из admin/config.php (его нет в git — см. config.example.php). */
function cfg(?string $key = null, $default = null)
{
    static $cfg = null;
    if ($cfg === null) {
        $file = ADMIN_DIR . '/config.php';
        $cfg = is_file($file) ? (array) (require $file) : [];
    }
    if ($key === null) return $cfg;
    return $cfg[$key] ?? $default;
}

/** Папка для резервных копий и журнала входов. По умолчанию data/_backups. */
function store_dir(): string
{
    $dir = cfg('store_dir') ?: SITE_ROOT . '/data/_backups';
    if (!is_dir($dir)) @mkdir($dir, 0775, true);
    return rtrim($dir, '/\\');
}

function is_https(): bool
{
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (($_SERVER['SERVER_PORT'] ?? '') === '443');
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('chevapno_admin');
    // Кука живёт только в папке админки
    $path = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/admin/index.php')), '/') . '/';
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => $path,
        'secure' => is_https(),
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}

function csrf_ok(?string $token): bool
{
    return is_string($token) && !empty($_SESSION['csrf']) && hash_equals($_SESSION['csrf'], $token);
}

function h(?string $s): string
{
    return htmlspecialchars((string) $s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Заголовки, общие для всех ответов админки. */
function send_security_headers(): void
{
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('Referrer-Policy: same-origin');
    header('Cache-Control: no-store');
    header("Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
}
