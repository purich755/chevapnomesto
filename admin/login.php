<?php
/** Вход в админку и выход. */
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

send_security_headers();
start_session();

$msg = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
    if (!csrf_ok($_POST['csrf'] ?? null)) {
        $msg = 'Страница устарела — попробуйте ещё раз.';
    } elseif (($_POST['action'] ?? '') === 'logout') {
        logout();
        header('Location: login.php?bye=1');
        exit;
    } else {
        $r = try_login((string) ($_POST['password'] ?? ''));
        if ($r['ok']) {
            header('Location: ./');
            exit;
        }
        $msg = $r['msg'];
    }
} elseif (is_logged_in()) {
    header('Location: ./');
    exit;
}
$bye = isset($_GET['bye']);
?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<title>Вход — админка «Чевапно Место»</title>
<link rel="icon" href="../assets/img/el-loc-red.png" type="image/png">
<link rel="stylesheet" href="assets/admin.css">
</head>
<body class="login">
<main class="login__box">
  <img class="login__logo" src="../assets/img/logo-main-white.webp" alt="Чевапно Место" width="180" height="136">
  <h1 class="login__title">Админка сайта</h1>
  <?php if ($bye && !$msg): ?><p class="note note--ok">Вы вышли из админки.</p><?php endif; ?>
  <?php if ($msg): ?><p class="note note--err" role="alert"><?= h($msg) ?></p><?php endif; ?>
  <form method="post" action="login.php" class="login__form">
    <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
    <label class="field">
      <span class="field__label">Пароль</span>
      <input class="input" type="password" name="password" autocomplete="current-password" required autofocus>
    </label>
    <button class="btn btn--red btn--wide" type="submit">Войти</button>
  </form>
  <p class="login__back"><a href="../">← На сайт</a></p>
</main>
</body>
</html>
