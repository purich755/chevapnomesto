/* ─────────────────────────────────────────────────────────────
   ЧЕВАПНО МЕСТО · данные главной страницы
   Файл генерируется админкой, не редактировать вручную.
   Источник: data/main.json (меню, витрина, бегущие строки),
   data/lunch.json (ланчи), data/points.json (точки и доставка).
   Пересобрать вручную: php admin/tools/build-content.php
   ───────────────────────────────────────────────────────────── */

const CONTACTS = {
    "city": "Самара",
    "points": [
        {
            "address": "ул. Спортивная, 3-5",
            "phone": "+7 (987) 169-59-73",
            "phoneHref": "tel:+79871695973",
            "hours": [
                [
                    "Пн — Вс",
                    "10:00 — 00:00"
                ]
            ]
        },
        {
            "address": "ул. Красноармейская, 10",
            "phone": "+7 (987) 169-59-75",
            "phoneHref": "tel:+79871695975",
            "hours": [
                [
                    "Пн — Вс",
                    "10:00 — 22:00"
                ]
            ]
        },
        {
            "address": "ул. Свободы, 1",
            "phone": "+7 (987) 169-59-77",
            "phoneHref": "tel:+79871695977",
            "hours": [
                [
                    "Пн — Вс",
                    "10:00 — 22:00"
                ]
            ]
        },
        {
            "address": "ул. Победы, 94",
            "phone": "+7 (987) 450-23-23",
            "phoneHref": "tel:+79874502323",
            "hours": [
                [
                    "Вс — Чт",
                    "10:00 — 22:00"
                ],
                [
                    "Пт — Сб",
                    "10:00 — 00:00"
                ]
            ]
        },
        {
            "address": "5-я Просека, 95а",
            "note": "Своё меню: мангал, пицца и основное",
            "phoneLabel": "Самовывоз и доставка",
            "phone": "+7 (987) 939-30-13",
            "phoneHref": "tel:+79879393013",
            "hours": [
                [
                    "Вс — Чт",
                    "12:00 — 00:00"
                ],
                [
                    "Пт — Сб",
                    "12:00 — 02:00"
                ]
            ],
            "menu": "menu.html",
            "delivery": true
        }
    ],
    "socials": [
        {
            "label": "Telegram",
            "href": "https://t.me/chipi_grill"
        },
        {
            "label": "ВКонтакте",
            "href": "https://vk.ru/chevapno_mesto"
        }
    ],
    "delivery": {
        "stats": [
            [
                "30–40",
                "мин",
                "время доставки"
            ],
            [
                "200",
                "₽",
                "стоимость доставки"
            ],
            [
                "1000",
                "₽",
                "от этой суммы — бесплатно"
            ]
        ],
        "terms": "Доставка 200 ₽, от 1000 ₽ — бесплатно. Минимальной суммы заказа нет.",
        "aggregators": [
            {
                "label": "Яндекс Еда · Центр",
                "href": "https://eda.yandex.ru/r/civapi_gril?placeSlug=chipi"
            },
            {
                "label": "Яндекс Еда · Советский район",
                "href": "https://eda.yandex.ru/r/civapi_gril?placeSlug=chivapi_gril"
            }
        ]
    }
};

const MENU = [
    {
        "id": "burgers",
        "title": "Бургеры и чевапи-дог",
        "short": "Бургеры",
        "items": [
            {
                "id": "burger-govyadina",
                "name": "С плескавицей из говядины",
                "w": "460",
                "p": 650,
                "img": "assets/img/dish/burger-govyadina.webp",
                "d": "булочка из печи, плескавица из говядины, сыр Чеддер, солёный огурец, помидор, лук красный, айсберг, соусы фирменные Бургер и Красный"
            },
            {
                "id": "burger-classic",
                "name": "С плескавицей классика",
                "w": "410",
                "p": 570,
                "img": "assets/img/dish/burger-classic.webp",
                "d": "булочка из печи, плескавица из говядины и свинины, сыр Чеддер, помидор, айсберг, соусы фирменные Бургер и Барбекю"
            },
            {
                "id": "burger-spicy",
                "name": "С плескавицей спайси",
                "w": "450",
                "p": 580,
                "hot": true,
                "img": "assets/img/dish/burger-spicy.webp",
                "d": "булочка из печи, плескавица из говядины и свинины спайси, сыр Чеддер, помидор, лук красный, айсберг, соус фирменный Сливочно-перечный"
            },
            {
                "id": "burger-piletina",
                "name": "Пилетина-бургер",
                "w": "400",
                "p": 500,
                "img": "assets/img/dish/burger-piletina.webp",
                "d": "булочка из печи, стейк из курицы, сыр Чеддер, помидор, айсберг, соусы фирменный и Сырный"
            },
            {
                "id": "burger-mini",
                "name": "Мини-бургер",
                "w": "160",
                "p": 110,
                "img": "assets/img/dish/burger-mini.webp",
                "d": "булочка, котлета куриная в панировке, айсберг, соус фирменный"
            },
            {
                "id": "chevapi-dog",
                "name": "Чевапи-дог",
                "w": "160",
                "p": 230,
                "img": "assets/img/dish/chevapi-dog.webp",
                "d": "булочка (хот-дог), колбаски чевапи, морковь по-корейски, лук кранч, горчица, соус фирменный Красный, соус фирменный Белый"
            }
        ]
    },
    {
        "id": "zaverotony",
        "title": "Завертоны",
        "short": "Завертоны",
        "items": [
            {
                "id": "zav-classic",
                "name": "Классика",
                "w": "270",
                "p": 270,
                "img": "assets/img/dish/zav-classic.webp",
                "d": "тесто фило, курица-гриль на мангале, помидор, огурец, коул-слоу, морковь по-корейски, соус фирменный Красный, соус фирменный Белый"
            },
            {
                "id": "zav-beef",
                "name": "С говядиной из печи",
                "w": "310",
                "p": 490,
                "img": "assets/img/dish/zav-beef.webp",
                "d": "тесто фило, говядина из печи, огурец, помидор, лук красный, салат коул-слоу, айсберг, соус фирменный белый, соус Сеульский"
            },
            {
                "id": "zav-cheese",
                "name": "Сырный",
                "w": "315",
                "p": 450,
                "img": "assets/img/dish/zav-cheese.webp",
                "d": "тесто фило, курица-гриль на мангале, помидор, айсберг, сыр Чеддер, сыр Сулугуни, соус фирменный Сырный"
            },
            {
                "id": "zav-chevapi",
                "name": "Чевапи",
                "w": "240",
                "p": 270,
                "img": "assets/img/dish/zav-chevapi.webp",
                "d": "тесто фило, колбаски чевапи, кромпир фри, огурец, айсберг, соус Бургер, соус фирменный Красный"
            },
            {
                "id": "zav-gambori",
                "name": "С Гамбори",
                "w": "240",
                "p": 390,
                "img": "assets/img/dish/zav-gambori.webp",
                "d": "тесто фило, креветки в панировке, помидор, айсберг, соус фирменный Сладкий и Терияки"
            },
            {
                "id": "zav-chevapster",
                "name": "Чевапстер",
                "sub": "двойной чевапи",
                "w": "365",
                "p": 440,
                "img": "assets/img/dish/zav-chevapster.webp",
                "d": "тесто фило, колбаски чевапи, кромпир фри, огурец, айсберг, соус Бургер, соус фирменный Красный"
            }
        ]
    },
    {
        "id": "pity",
        "title": "Питы",
        "short": "Питы",
        "items": [
            {
                "id": "pita-plesk",
                "name": "Плескавица в пите",
                "w": "360",
                "p": 490,
                "opts": [
                    [
                        "свинина-говядина",
                        "360",
                        490,
                        false
                    ],
                    [
                        "свинина-говядина спайси",
                        "360",
                        510,
                        true
                    ],
                    [
                        "говядина",
                        "360",
                        590,
                        false
                    ]
                ],
                "img": "assets/img/dish/pita-plesk.webp",
                "d": "балканская пита, плескавица на выбор, айсберг, лук, помидор, соус фирменный, сыр Чеддер"
            },
            {
                "id": "pita-beef",
                "name": "С говядиной из печи",
                "w": "275",
                "p": 490,
                "img": "assets/img/dish/pita-beef.webp",
                "d": "балканская пита, говядина из печи, помидор, огурец, лук красный, айсберг, соус сливочный хрен, фирменный Наршараб"
            },
            {
                "id": "pita-piletina",
                "name": "Пилетина-гриль",
                "w": "270",
                "p": 230,
                "img": "assets/img/dish/pita-piletina.webp",
                "d": "балканская пита, курица-гриль на мангале, огурец, помидор, морковь по-корейски, айсберг, соус фирменный Белый и Сеульский"
            },
            {
                "id": "pita-gambori",
                "name": "Гамбори-пита",
                "w": "186",
                "p": 370,
                "img": "assets/img/dish/pita-gambori.webp",
                "d": "балканская пита, креветки в панировке, помидор, айсберг, соус фирменный Унаги"
            },
            {
                "id": "pita-chevapi",
                "name": "Чевапи-гриль",
                "w": "210",
                "p": 300,
                "img": "assets/img/dish/pita-chevapi.webp",
                "d": "балканская пита, колбаски чевапи, помидор, айсберг, лук, солёный огурец, сыр Чеддер, соус Бургер"
            },
            {
                "id": "pita-egg",
                "name": "Пита с яичницей",
                "w": "170",
                "p": 200,
                "img": "assets/img/dish/pita-egg.webp",
                "d": "балканская пита, яйцо, помидор, айсберг, коул-слоу, соус Сырный, соус Сладкий Чили"
            }
        ]
    },
    {
        "id": "chorby",
        "title": "Чорбы",
        "short": "Чорбы",
        "note": "балканские супы",
        "items": [
            {
                "id": "chorba-chicken",
                "name": "Куриная чорба",
                "w": "420",
                "p": 265,
                "img": "assets/img/dish/chorba-chicken.webp",
                "d": "филе куриное, бульон куриный, картофель, морковь, лапша домашняя, лук репчатый"
            },
            {
                "id": "chorba-meat",
                "name": "Мясная чорба",
                "w": "400",
                "p": 320,
                "img": "assets/img/dish/chorba-meat.webp",
                "d": "сосиска рубленая говяжья, грудка куриная копчёная, бульон куриный, картофель, лук репчатый, перец болгарский, морковь, фасоль, томаты в собственном соку"
            },
            {
                "id": "chorba-tomyam-c",
                "name": "Том-ям с пилетиной",
                "w": "470",
                "p": 370,
                "img": "assets/img/dish/chorba-tomyam-c.webp",
                "d": "филе куриное, грибы, кокосовое молоко, сливки, паста Том-Ям, соус Соевый, лимон, специи, имбирь, рис"
            },
            {
                "id": "chorba-tomyam-s",
                "name": "Том-ям с гамбори",
                "w": "420",
                "p": 480,
                "img": "assets/img/dish/chorba-tomyam-s.webp",
                "d": "креветки, грибы, кокосовое молоко, сливки, паста Том-Ям, соус Соевый, лимон, специи, имбирь, рис"
            }
        ]
    },
    {
        "id": "salaty",
        "title": "Салаты",
        "short": "Салаты",
        "items": [
            {
                "id": "salad-shopski",
                "name": "Шопский",
                "w": "200",
                "p": 250,
                "img": "assets/img/dish/salad-shopski.webp",
                "d": "помидоры, огурцы, перец болгарский, лук, айсберг, маслины, сыр Фетакса, соус из свежей зелени"
            },
            {
                "id": "salad-fresh",
                "name": "Фреш-Кромпир",
                "w": "240",
                "p": 300,
                "img": "assets/img/dish/salad-fresh.webp",
                "d": "курица-гриль на мангале, огурец, помидор, морковь по-корейски, картофель-пай, соус белый фирменный, айсберг"
            },
            {
                "id": "salad-caesar-c",
                "name": "Цезарь с пилетиной",
                "w": "200",
                "p": 340,
                "img": "assets/img/dish/salad-caesar-c.webp",
                "d": "курица-гриль на мангале, айсберг, томаты черри, маслины, сыр Пармезан, сухарики, соус Цезарь"
            },
            {
                "id": "salad-caesar-s",
                "name": "Цезарь с гамбори",
                "w": "230",
                "p": 450,
                "img": "assets/img/dish/salad-caesar-s.webp",
                "d": "креветки в панировке, айсберг, томаты черри, маслины, сыр Пармезан, сухарики, соус Цезарь, лимон"
            }
        ]
    },
    {
        "id": "zakuski",
        "title": "Закуски",
        "short": "Закуски",
        "items": [
            {
                "id": "snack-trake",
                "name": "Траке",
                "sub": "куриные стрипсы",
                "w": "100",
                "p": 180,
                "opts": [
                    [
                        "3 шт",
                        "100",
                        180,
                        false
                    ],
                    [
                        "5 шт",
                        "150",
                        270,
                        false
                    ]
                ],
                "img": "assets/img/dish/snack-trake.webp"
            },
            {
                "id": "snack-gambori",
                "name": "Гамбори в панировке",
                "sub": "креветки",
                "w": "80",
                "p": 350,
                "opts": [
                    [
                        "5 шт",
                        "80",
                        350,
                        false
                    ],
                    [
                        "9 шт",
                        "140",
                        600,
                        false
                    ]
                ],
                "img": "assets/img/dish/snack-gambori.webp"
            },
            {
                "id": "snack-nuggets",
                "name": "Наггетсы куриные 6 шт",
                "w": "100",
                "p": 190,
                "img": "assets/img/dish/snack-nuggets.webp"
            },
            {
                "id": "snack-fries",
                "name": "Кромпир фри",
                "w": "100",
                "p": 100,
                "opts": [
                    [
                        "",
                        "100",
                        100,
                        false
                    ],
                    [
                        "",
                        "150",
                        210,
                        false
                    ]
                ],
                "img": "assets/img/dish/snack-fries.webp"
            },
            {
                "id": "snack-krompir",
                "name": "Кромпир 2 шт",
                "w": "100",
                "p": 120,
                "img": "assets/img/dish/snack-krompir.webp"
            }
        ]
    },
    {
        "id": "dobavki",
        "title": "Добавь по вкусу",
        "short": "Добавки",
        "plain": true,
        "items": [
            {
                "id": "dobavki-1",
                "name": "Халапеньо",
                "w": "15",
                "p": 20,
                "hot": true
            },
            {
                "id": "dobavki-2",
                "name": "Колбаски чевапи 2 шт",
                "w": "80",
                "p": 120
            },
            {
                "id": "dobavki-3",
                "name": "Солёный огурец",
                "w": "30",
                "p": 20
            },
            {
                "id": "dobavki-4",
                "name": "Кромпир 1 шт",
                "w": "20",
                "p": 50
            },
            {
                "id": "dobavki-5",
                "name": "Соус: кисло-сладкий, кетчуп, сырный",
                "w": "25",
                "p": 30
            },
            {
                "id": "dobavki-6",
                "name": "Соус: красный, розовый, тар-тар",
                "w": "75",
                "p": 55
            },
            {
                "id": "dobavki-7",
                "name": "Лук фри",
                "w": "5",
                "p": 10
            },
            {
                "id": "dobavki-8",
                "name": "Сыр Чеддер 1 шт",
                "w": "12",
                "p": 20
            },
            {
                "id": "dobavki-9",
                "name": "Соус Супер Чили",
                "w": "3",
                "p": 20,
                "hot": true
            },
            {
                "id": "dobavki-10",
                "name": "Айвар",
                "w": "50",
                "p": 50
            },
            {
                "id": "dobavki-11",
                "name": "Соус чесночный",
                "w": "30",
                "p": 40
            },
            {
                "id": "dobavki-12",
                "name": "Соус барбекю",
                "w": "25",
                "p": 30
            }
        ]
    }
];

const MENU_FOOT = "Напитки в ассортименте";

const SHOWCASE = [
    {
        "id": "burger-govyadina",
        "name": "Плескавица-бургер",
        "sub": "из говядины",
        "w": "460",
        "p": 650,
        "img": "assets/img/dish/burger-govyadina.webp"
    },
    {
        "id": "burger-spicy",
        "name": "Плескавица спайси",
        "sub": "свинина-говядина",
        "w": "450",
        "p": 580,
        "hot": true,
        "img": "assets/img/dish/burger-spicy.webp"
    },
    {
        "id": "chevapi-dog",
        "name": "Чевапи-дог",
        "sub": "колбаски чевапи",
        "w": "160",
        "p": 230,
        "img": "assets/img/dish/chevapi-dog.webp"
    },
    {
        "id": "zav-chevapster",
        "name": "Чевапстер",
        "sub": "двойной чевапи",
        "w": "365",
        "p": 440,
        "tag": "Двойной",
        "img": "assets/img/dish/zav-chevapster.webp"
    },
    {
        "id": "pita-plesk",
        "name": "Плескавица в пите",
        "sub": "балканская пита",
        "w": "360",
        "p": 490,
        "from": true,
        "img": "assets/img/dish/pita-plesk.webp"
    },
    {
        "id": "lunch-chevapi",
        "name": "Чевапи-ланч",
        "sub": "гарнир на выбор",
        "w": "440",
        "p": 550,
        "tag": "Ланч",
        "img": "assets/img/dish/lunch-chevapi.webp"
    },
    {
        "id": "chorba-tomyam-s",
        "name": "Том-ям",
        "sub": "с гамбори",
        "w": "420",
        "p": 480,
        "img": "assets/img/dish/chorba-tomyam-s.webp"
    },
    {
        "id": "burger-piletina",
        "name": "Пилетина-бургер",
        "sub": "стейк из курицы",
        "w": "400",
        "p": 500,
        "img": "assets/img/dish/burger-piletina.webp"
    }
];

const LUNCH_SIDES = [
    {
        "id": "side-krompir",
        "name": "Кромпир",
        "sub": "2 шт / 100 гр",
        "img": "assets/img/dish/side-krompir.webp"
    },
    {
        "id": "side-rice",
        "name": "Рис",
        "sub": "90 гр",
        "img": "assets/img/dish/side-rice.webp"
    },
    {
        "id": "side-fries",
        "name": "Кромпир-фри",
        "sub": "70 гр",
        "img": "assets/img/dish/side-fries.webp"
    }
];

const LUNCH_MAINS = [
    {
        "id": "lunch-plesk-classic",
        "name": "Плескавица-Ланч Классика",
        "sub": "свинина-говядина",
        "sauce": "томатный",
        "w": 410,
        "p": 560,
        "img": "assets/img/dish/lunch-plesk-classic.webp"
    },
    {
        "id": "lunch-plesk-spicy",
        "name": "Плескавица-Ланч спайси",
        "sub": "свинина-говядина",
        "sauce": "томатный",
        "w": 410,
        "p": 580,
        "hot": true,
        "img": "assets/img/dish/lunch-plesk-spicy.webp"
    },
    {
        "id": "lunch-plesk-beef",
        "name": "Плескавица-Ланч",
        "sub": "говядина",
        "sauce": "томатный",
        "w": 430,
        "p": 650,
        "img": "assets/img/dish/lunch-plesk-beef.webp"
    },
    {
        "id": "lunch-plesk-cheese",
        "name": "Плескавица-Ланч сырная",
        "sub": "свинина-говядина с сыром",
        "sauce": "томатный",
        "w": 410,
        "p": 600,
        "img": "assets/img/dish/lunch-plesk-cheese.webp"
    },
    {
        "id": "lunch-chevapi",
        "name": "Чевапи-Ланч",
        "sub": "колбаски чевапи",
        "sauce": "томатный",
        "w": 440,
        "p": 550,
        "img": "assets/img/dish/lunch-chevapi.webp"
    },
    {
        "id": "lunch-steak-beef",
        "name": "Стейк-Ланч",
        "sub": "говядина",
        "sauce": "томатный",
        "w": 425,
        "p": 810,
        "img": "assets/img/dish/lunch-steak-beef.webp"
    },
    {
        "id": "lunch-steak-chicken",
        "name": "Стейк-Ланч",
        "sub": "курица",
        "sauce": "томатный",
        "w": 400,
        "p": 490,
        "img": "assets/img/dish/lunch-steak-chicken.webp"
    },
    {
        "id": "lunch-steak-pork",
        "name": "Стейк-Ланч",
        "sub": "свинина",
        "sauce": "томатный",
        "w": 430,
        "p": 530,
        "img": "assets/img/dish/lunch-steak-pork.webp"
    },
    {
        "id": "lunch-kebab-green",
        "name": "Кебаб-ланч с зеленью",
        "sub": "говядина-курица",
        "sauce": "томатный",
        "w": 435,
        "p": 650,
        "img": "assets/img/dish/lunch-kebab-green.webp"
    },
    {
        "id": "lunch-kebab-cheese",
        "name": "Кебаб-ланч с сыром",
        "sub": "говядина-курица",
        "sauce": "томатный",
        "w": 435,
        "p": 610,
        "img": "assets/img/dish/lunch-kebab-cheese.webp"
    },
    {
        "id": "lunch-trake",
        "name": "Траке-Ланч",
        "sub": "стрипсы куриные",
        "sauce": "сырный, кетчуп",
        "w": 390,
        "p": 550,
        "img": "assets/img/dish/lunch-trake.webp"
    },
    {
        "id": "lunch-kids",
        "name": "Детский ланч",
        "sub": "куриные наггетсы",
        "sauce": "сырный, кетчуп",
        "w": 280,
        "p": 360,
        "img": "assets/img/dish/lunch-kids.webp"
    },
    {
        "id": "lunch-breakfast",
        "name": "Завтрак-Ланч",
        "sub": "2 яйца",
        "sauce": "кетчуп",
        "w": 260,
        "p": 270,
        "img": "assets/img/dish/lunch-breakfast.webp"
    }
];

const LUNCH_NOTE = "В каждом ланче: гарнир на выбор, салат коул-слоу (кроме Детского и Завтрака), помидор, огурец, айсберг, балканская пита (кроме Детского ланча), соус, лук маринованный к мясу.";

const MARQUEE_TOP = [
    "Чевапи",
    "Плескавица",
    "Завертоны",
    "Чорбы",
    "Питы",
    "На живом огне",
    "Самара"
];
const MARQUEE_BOTTOM = [
    "Добро пожаловать",
    "Чевапно место",
    "Сербское бистро",
    "Мясо, огонь и ничего лишнего"
];
