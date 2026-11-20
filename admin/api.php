<?php
/**
 * API админки. Все запросы — только после входа.
 * Всё, что меняет данные, — только POST с CSRF-токеном в заголовке X-CSRF-Token.
 *
 *   GET  ?action=load            — все разделы сразу (+ версии файлов)
 *   POST ?action=save            — {section, data, rev}
 *   POST ?action=upload          — multipart: photo, kind
 *   GET  ?action=backups         — список резервных копий
 *   POST ?action=restore         — {file}
 */
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

send_security_headers();
header('Content-Type: application/json; charset=utf-8');
start_session();

function out(array $data, int $code = 200): never
{
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function body_json(): array
{
    $raw = file_get_contents('php://input', false, null, 0, 4 * 1024 * 1024 + 1);
    if ($raw === false || strlen($raw) > 4 * 1024 * 1024) throw new AppError('Слишком большой запрос.', 413);
    $d = json_decode($raw, true);
    if (!is_array($d)) throw new AppError('Данные не получены. Обновите страницу.');
    return $d;
}

function load_all(): array
{
    $out = [];
    foreach (SECTIONS as $s => $_) {
        $p = section_path($s);
        $out[$s] = ['data' => read_json($p), 'rev' => file_rev($p)];
    }
    return $out;
}

try {
    if (!is_logged_in()) throw new AppError('Время сессии истекло — войдите заново.', 401);
    $action = (string) ($_GET['action'] ?? '');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

    if ($method === 'POST' && !csrf_ok($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null)) {
        throw new AppError('Страница устарела — обновите её и повторите действие.', 403);
    }

    switch ("$method $action") {
        case 'GET load':
            out(['ok' => true, 'sections' => load_all(), 'webp' => function_exists('imagewebp')]);

        case 'POST save':
            $in = body_json();
            $section = (string) ($in['section'] ?? '');
            $path = section_path($section);
            $result = with_lock(function () use ($in, $section, $path) {
                $current = read_json($path);
                if (($in['rev'] ?? '') !== file_rev($path)) {
                    throw new AppError('Эти данные уже изменили в другой вкладке или на другом устройстве. Обновите страницу, чтобы не затереть чужие правки.', 409);
                }
                $clean = validate_section($section, $in['data'] ?? null, $current);
                $oldContent = (string) @file_get_contents(SITE_ROOT . '/js/content.js');
                $backup = backup_section($section);
                try {
                    atomic_write($path, json_text($clean));
                    write_content();
                } catch (Throwable $e) {
                    // Откат: возвращаем файл раздела и content.js как было
                    if ($backup) @copy(store_dir() . '/' . $backup, $path);
                    if ($oldContent !== '') @file_put_contents(SITE_ROOT . '/js/content.js', $oldContent, LOCK_EX);
                    throw $e;
                }
                gc_uploads();
                return ['data' => $clean, 'rev' => file_rev($path)];
            });
            out(['ok' => true] + $result);

        case 'POST upload':
            if (empty($_FILES['photo'])) {
                // Файл больше post_max_size — PHP молча выбрасывает всё тело запроса
                throw new AppError('Фото слишком большое — до 10 МБ.', 413);
            }
            $path = process_upload($_FILES['photo'], (string) ($_POST['kind'] ?? 'dish'));
            out(['ok' => true, 'path' => $path]);

        case 'GET backups':
            out(['ok' => true, 'backups' => list_backups()]);

        case 'POST restore':
            $in = body_json();
            $file = (string) ($in['file'] ?? '');
            $result = with_lock(function () use ($file) {
                $src = backup_path($file);
                $section = preg_replace('/-.*/', '', $file);
                $data = read_json($src);
                $path = section_path($section);
                $oldContent = (string) @file_get_contents(SITE_ROOT . '/js/content.js');
                $backup = backup_section($section); // текущую версию тоже сохраняем — восстановление можно отменить
                try {
                    atomic_write($path, json_text($data));
                    write_content();
                } catch (Throwable $e) {
                    if ($backup) @copy(store_dir() . '/' . $backup, $path);
                    if ($oldContent !== '') @file_put_contents(SITE_ROOT . '/js/content.js', $oldContent, LOCK_EX);
                    throw $e;
                }
                return ['section' => $section];
            });
            out(['ok' => true, 'sections' => load_all()] + $result);

        default:
            throw new AppError('Неизвестное действие.', 404);
    }
} catch (AppError $e) {
    out(['ok' => false, 'error' => $e->getMessage()], $e->http);
} catch (Throwable $e) {
    error_log('[chevapno-admin] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    out(['ok' => false, 'error' => 'Что-то пошло не так на сервере. Данные на сайте не изменились. Попробуйте ещё раз или сообщите разработчику.'], 500);
}
