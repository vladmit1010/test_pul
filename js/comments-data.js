/* Seeded PRNG + генератор 1000 комментариев (детерминированный результат) */
(function () {
  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry32(42);

  function pickWeighted(items) {
    const keys = Object.keys(items);
    const weights = keys.map((k) => items[k].weight);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    for (let i = 0; i < keys.length; i++) {
      r -= weights[i];
      if (r <= 0) return keys[i];
    }
    return keys[keys.length - 1];
  }

  const PERSONAS = {
    Студент: { names: ['Артём К.', 'Катя М.', 'Никита Л.', 'София Р.', 'Максим В.', 'Даша П.'], weight: 18 },
    Родитель: { names: ['Ольга С.', 'Андрей Н.', 'Елена К.', 'Сергей Б.', 'Наталья Г.', 'Павел Д.'], weight: 16 },
    'IT-специалист': { names: ['Денис Ч.', 'Алина Т.', 'Игорь Ф.', 'Виктория З.', 'Роман Е.', 'Юлия Х.'], weight: 14 },
    Пенсионер: { names: ['Валентина И.', 'Николай О.', 'Лидия А.', 'Борис У.', 'Галина Я.', 'Анатолий Ш.'], weight: 10 },
    Предприниматель: { names: ['Михаил Ж.', 'Татьяна Ц.', 'Алексей К.', 'Ирина В.', 'Константин М.', 'Светлана Л.'], weight: 12 },
    Домохозяйка: { names: ['Марина П.', 'Анна Б.', 'Екатерина С.', 'Любовь Р.', 'Оксана Н.', 'Вера Т.'], weight: 13 },
    Фрилансер: { names: ['Кирилл Д.', 'Полина А.', 'Егор С.', 'Алиса К.', 'Тимур Г.', 'Надежда О.'], weight: 9 },
    Менеджер: { names: ['Артур В.', 'Diana W.', 'Олег П.', 'Кристина М.', 'Владислав Н.', 'Яна Е.'], weight: 8 },
  };

  const TOPICS = {
    Доставка: {
      weight: 14,
      templates: {
        positive: ['Доставили за {h} часа, курьер позвонил заранее — очень удобно.', 'Заказ пришёл раньше срока, упаковка целая.', 'Курьер был вежлив, доставка точно в интервал.'],
        neutral: ['Доставка в пределах заявленного срока, без сюрпризов.', 'Привезли как обещали, но пришлось ждать до вечера.', 'Стандартная доставка — ни быстро, ни медленно.'],
        negative: ['Задержали на два дня, никто не предупредил.', 'Курьер не нашёл адрес и просто уехал.', 'Коробка приехала помятая.'],
      },
    },
    Цены: {
      weight: 12,
      templates: {
        positive: ['Цена ниже, чем в соседнем магазине.', 'Поймал акцию −30%, вышло очень выгодно.', 'Соотношение цена/качество отличное.'],
        neutral: ['Цены средние по рынку, без особых скидок.', 'Подорожало за полгода, но терпимо.', 'Нормальная цена с промокодом.'],
        negative: ['На сайте одна цена, в корзине другая.', 'Слишком дорого для такого качества.', 'Скрытые доплаты за доставку.'],
      },
    },
    'Качество товара': {
      weight: 16,
      templates: {
        positive: ['Товар полностью соответствует описанию.', 'Качество сборки на высоте.', 'Пользуюсь месяц — дефектов нет.'],
        neutral: ['Качество нормальное, ожидал чуть лучше по фото.', 'В целом неплохо, мелкие нюансы по швам.', 'Средний сегмент за свои деньги.'],
        negative: ['Пришёл брак — царапина на корпусе.', 'Качество хуже, чем на фото в каталоге.', 'Сломалось через неделю.'],
      },
    },
    'Служба поддержки': {
      weight: 11,
      templates: {
        positive: ['Поддержка ответила за 5 минут и решила вопрос.', 'Оператор помог подобрать альтернативу.', 'Чат работает быстро, без отписок.'],
        neutral: ['Ответили через пару часов, вопрос закрыли.', 'Помогли, но пришлось повторять проблему.', 'Решили формально.'],
        negative: ['Три дня ждал ответа, тикет закрыли.', 'Оператор не знал условий возврата.', 'Перекладывали ответственность между отделами.'],
      },
    },
    'Мобильное приложение': {
      weight: 10,
      templates: {
        positive: ['Приложение быстрое, push приходят вовремя.', 'Удобно отслеживать заказ.', 'Оплата в один клик.'],
        neutral: ['Иногда подтормаживает на старом телефоне.', 'Функционал базовый, но хватает.', 'Обновления редкие, багов нет.'],
        negative: ['После обновления вылетает при оплате.', 'Не сохраняет корзину.', 'Push приходят с задержкой.'],
      },
    },
    'Возврат и обмен': {
      weight: 9,
      templates: {
        positive: ['Возврат оформили за один день.', 'Обмен без лишних документов.', 'Курьер забрал товар и оформили замену.'],
        neutral: ['Возврат занял неделю, но деньги вернули.', 'Пришлось нести в пункт выдачи.', 'Обмен только через поддержку.'],
        negative: ['Отказали в возврате из-за царапины на упаковке.', 'Ждал возврат три недели.', 'Условия на сайте и в реальности различаются.'],
      },
    },
    Ассортимент: {
      weight: 8,
      templates: {
        positive: ['Нашёл редкую модель у конкурентов.', 'Широкий ассортимент — комплект в одном месте.', 'Постоянно новинки в нужной категории.'],
        neutral: ['Выбор достаточный, некоторых брендов не хватает.', 'Ассортимент стандартный.', 'Есть из чего выбрать.'],
        negative: ['Нужный размер постоянно нет в наличии.', 'Половина позиций под заказ.', 'Каталог устарел — битые ссылки.'],
      },
    },
    Упаковка: {
      weight: 7,
      templates: {
        positive: ['Упаковали аккуратно, много плёнки.', 'Эко-упаковка без лишнего пластика.', 'Коробка компактная.'],
        neutral: ['Упаковка обычная, без излишеств.', 'Коробка большая для маленького товара.', 'Стандартная фирменная коробка.'],
        negative: ['Товар болтался в коробке в три раза больше.', 'Упаковка порвалась при транспортировке.', 'Слишком много одноразового пластика.'],
      },
    },
    'Акции и скидки': {
      weight: 7,
      templates: {
        positive: ['Промокод сработал с первого раза.', 'Программа лояльности реально экономит.', 'Чёрная пятница — скидки честные.'],
        neutral: ['Скидки не на нужные категории.', 'Промокод только на часть корзины.', 'Акции периодические.'],
        negative: ['Сначала подняли цену, потом «скидка 20%».', 'Промокод не применился.', 'Бонусы сгорают слишком быстро.'],
      },
    },
    'Сайт и UX': {
      weight: 6,
      templates: {
        positive: ['Сайт быстрый, фильтры логичные.', 'Оформление заказа в три шага.', 'Поиск находит с первой попытки.'],
        neutral: ['Интерфейс привычный, дизайн мог бы быть свежее.', 'Сайт работает, вечером медленнее.', 'UX нормальный, мелкие неудобства в корзине.'],
        negative: ['Сайт зависает на этапе оплаты.', 'Фильтры сбрасываются при возврате назад.', 'На мобильной версии кнопки мелкие.'],
      },
    },
  };

  const SENTIMENT_WEIGHTS = { positive: 42, neutral: 33, negative: 25 };
  const START = new Date('2025-01-01T08:00:00');

  function pickSentiment() {
    const keys = Object.keys(SENTIMENT_WEIGHTS);
    const weights = keys.map((k) => SENTIMENT_WEIGHTS[k]);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = rand() * total;
    for (let i = 0; i < keys.length; i++) {
      r -= weights[i];
      if (r <= 0) return keys[i];
    }
    return 'neutral';
  }

  function formatDate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function generateComments(count) {
    const comments = [];
    for (let i = 0; i < count; i++) {
      const persona = pickWeighted(PERSONAS);
      const topic = pickWeighted(TOPICS);
      const sentiment = pickSentiment();
      const templates = TOPICS[topic].templates[sentiment];
      const text = templates[Math.floor(rand() * templates.length)].replace('{h}', String(2 + Math.floor(rand() * 46)));
      const names = PERSONAS[persona].names;
      const author = names[Math.floor(rand() * names.length)];
      const date = new Date(START.getTime() + rand() * 220 * 86400000 + rand() * 14 * 3600000);
      comments.push({ id: i + 1, author, persona, topic, sentiment, text, date: formatDate(date) });
    }
    return comments;
  }

  function buildSummary(comments) {
    const byPersona = {};
    const byTopic = {};
    const bySentiment = { positive: 0, neutral: 0, negative: 0 };
    const matrix = {};

    comments.forEach((c) => {
      byPersona[c.persona] = (byPersona[c.persona] || 0) + 1;
      byTopic[c.topic] = (byTopic[c.topic] || 0) + 1;
      bySentiment[c.sentiment]++;
      const key = `${c.persona}|${c.topic}`;
      matrix[key] = (matrix[key] || 0) + 1;
    });

    return { total: comments.length, byPersona, byTopic, bySentiment, matrix };
  }

  window.CommentsData = {
    comments: generateComments(1000),
    get summary() {
      return buildSummary(this.comments);
    },
    filter(fn) {
      return this.comments.filter(fn);
    },
  };
})();
