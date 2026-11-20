<?php
/**
 * Вход по одному паролю и защита от перебора:
 * после 5 неудачных попыток с одного адреса — пауза 15 минут.
 * Счёт ведём по адресу, а не общий: иначе посторонний мог бы
 * заблокировать вход хозяину. IP в файле не храним — только хэш.
 */
declare(strict_types=1);

const LOGIN_MAX_FAILS = 5;
const LOGIN_LOCK_SEC = 15 * 60;
const SESSION_IDLE_SEC = 12 * 3600;

function attempts_file(): string
{
    return store_dir() . '/login-attempts.json';
}

function client_key(): string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'cli';
    return hash('sha256', $ip . '|' . (string) cfg('password_hash', ''));
}

/** Читаем и меняем журнал попыток под блокировкой файла. */
function attempts_update(callable $fn)
{
    $fh = @fopen(attempts_file(), 'c+');
    if (!$fh) return $fn([])[1];
    try {
        flock($fh, LOCK_EX);
        $raw = stream_get_contents($fh);
        $all = json_decode($raw ?: '[]', true) ?: [];
        // Старые записи выбрасываем
        $now = time();
        $all = array_filter($all, fn($r) => ($r['until'] ?? 0) > $now || ($now - ($r['last'] ?? 0)) < LOGIN_LOCK_SEC);
        [$all, $result] = $fn($all);
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, json_encode($all));
        fflush($fh);
        return $result;
    } finally {
        flock($fh, LOCK_UN);
        fclose($fh);
    }
}

/** Сколько секунд ещё ждать (0 — можно пробовать). */
function login_wait(): int
{
    $k = client_key();
    return attempts_update(function ($all) use ($k) {
        $until = (int) ($all[$k]['until'] ?? 0);
        return [$all, max(0, $until - time())];
    });
}

function login_fail(): int
{
    $k = client_key();
    return attempts_update(function ($all) use ($k) {
        $r = $all[$k] ?? ['fails' => 0, 'until' => 0, 'last' => 0];
        $r['fails']++;
        $r['last'] = time();
        if ($r['fails'] >= LOGIN_MAX_FAILS) {
            $r['until'] = time() + LOGIN_LOCK_SEC;
            $r['fails'] = 0;
        }
        $all[$k] = $r;
        return [$all, max(0, LOGIN_MAX_FAILS - $r['fails'])];
    });
}

function login_reset(): void
{
    $k = client_key();
    attempts_update(function ($all) use ($k) {
        unset($all[$k]);
        return [$all, null];
    });
}

function try_login(string $password): array
{
    $hash = (string) cfg('password_hash', '');
    if ($hash === '') return ['ok' => false, 'msg' => 'Пароль ещё не задан. Разработчику: см. ADMIN_SETUP.md, раздел «Пароль».'];
    $wait = login_wait();
    if ($wait > 0) return ['ok' => false, 'msg' => 'Слишком много попыток. Попробуйте через ' . max(1, (int) ceil($wait / 60)) . ' мин.'];
    if ($password !== '' && password_verify($password, $hash)) {
        login_reset();
        session_regenerate_id(true);
        $_SESSION['auth'] = true;
        $_SESSION['seen'] = time();
        unset($_SESSION['csrf']);
        return ['ok' => true];
    }
    usleep(400000); // лишняя пауза мешает перебору
    $left = login_fail();
    if ($left === LOGIN_MAX_FAILS) {
        return ['ok' => false, 'msg' => 'Слишком много попыток. Вход закрыт на 15 минут.'];
    }
    return ['ok' => false, 'msg' => 'Неверный пароль.' . ($left <= 2 ? " Осталось попыток: {$left}." : '')];
}

function is_logged_in(): bool
{
    if (empty($_SESSION['auth'])) return false;
    if (time() - (int) ($_SESSION['seen'] ?? 0) > SESSION_IDLE_SEC) {
        $_SESSION = [];
        return false;
    }
    $_SESSION['seen'] = time();
    return true;
}

function logout(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $p['path'], 'secure' => $p['secure'], 'httponly' => true, 'samesite' => 'Strict']);
    }
    session_destroy();
}
