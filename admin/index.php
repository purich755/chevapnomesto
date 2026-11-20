<?php
/** Оболочка админки. Само содержимое строит assets/admin.js. */
declare(strict_types=1);
require __DIR__ . '/lib/bootstrap.php';

send_security_headers();
start_session();
if (!is_logged_in()) {
    header('Location: login.php');
    exit;
}
$v = (string) @filemtime(__DIR__ . '/assets/admin.js') . (string) @filemtime(__DIR__ . '/assets/admin.css');
?><!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="csrf" content="<?= h(csrf_token()) ?>">
<title>Админка — «Чевапно Место»</title>
<link rel="icon" href="../assets/img/el-loc-red.png" type="image/png">
<link rel="stylesheet" href="assets/admin.css?v=<?= h($v) ?>">
</head>
<body>
<header class="top">
  <a class="top__logo" href="./" aria-label="Админка — в начало">
    <img src="../assets/img/el-loc-red.webp" alt="" width="20" height="25"><span>Админка</span>
  </a>
  <nav class="tabs" id="tabs" aria-label="Разделы">
    <button class="tab" type="button" data-tab="main">Меню</button>
    <button class="tab" type="button" data-tab="prosek">5-я Просека</button>
    <button class="tab" type="button" data-tab="lunch">Ланчи</button>
    <button class="tab" type="button" data-tab="history">История</button>
  </nav>
  <div class="top__right">
    <a class="btn btn--ghost btn--sm" href="../" target="_blank" rel="noopener">Открыть сайт</a>
    <form method="post" action="login.php" class="top__out">
      <input type="hidden" name="csrf" value="<?= h(csrf_token()) ?>">
      <input type="hidden" name="action" value="logout">
      <button class="btn btn--ghost btn--sm" type="submit" id="logoutBtn">Выйти</button>
    </form>
  </div>
</header>

<main class="page" id="page" aria-live="polite">
  <p class="loading">Загружаем данные…</p>
</main>

<div class="savebar" id="savebar" hidden>
  <p class="savebar__text" id="savebarText">Есть несохранённые изменения</p>
  <button class="btn btn--ghost" type="button" id="discardBtn">Отменить</button>
  <button class="btn btn--red" type="button" id="saveBtn">Сохранить</button>
</div>

<div class="toast" id="toast" role="status" hidden></div>

<div class="modal" id="modal" hidden>
  <div class="modal__box" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <h2 class="modal__title" id="modalTitle"></h2>
    <div class="modal__text" id="modalText"></div>
    <div class="modal__btns">
      <button class="btn btn--ghost" type="button" id="modalNo">Отмена</button>
      <button class="btn btn--red" type="button" id="modalYes">Да</button>
    </div>
  </div>
</div>

<script src="assets/admin.js?v=<?= h($v) ?>"></script>
</body>
</html>
