(function () {
  'use strict';

  const form = document.getElementById('split-form');
  const billInput = document.getElementById('total-bill');
  const peopleInput = document.getElementById('number-of-people');
  const billError = document.getElementById('total-bill-error');
  const peopleError = document.getElementById('number-of-people-error');
  const result = document.getElementById('result');
  const shareAmount = document.getElementById('share-amount');
  const currencyField = document.getElementById('currency-field');
  // Popular currencies are repeated so they appear more often than rare symbols.
  const popularSigns = ['₽', '$', '€', '£', '¥', '₹', '₩', '₺', '₴', '฿', '₱'];
  const rareSigns = ['₫', '₡', '₦', '₲', '₵', '₸', '₼', '₾', '₭', '₮', '₳', '₤'];
  const currencyFacts = {
    '₽': ['Рубль — одна из старейших национальных валют Европы.', 'Знак ₽ официально утвердили в России в 2013 году.'],
    '$': ['Знак $ используют более 20 стран мира.', 'Символ доллара появился задолго до создания современной валюты США.'],
    '€': ['Евро — официальная валюта 20 стран Европейского союза.', 'Банкноты евро имеют одинаковый дизайн во всех странах еврозоны.'],
    '£': ['Фунт стерлингов — одна из старейших валют, используемых сегодня.', 'Символ £ происходит от латинского слова libra — «весы».'],
    '¥': ['Один знак ¥ используется для японской иены и китайского юаня.', 'Иена стала национальной валютой Японии в 1871 году.'],
    '₹': ['Символ рупии сочетает латинскую букву R и деванагари.', 'Индийская рупия выпускается с изображением Ашоки на монетах.'],
    '₩': ['Вон — денежная единица Южной Кореи.', 'Современный символ ₩ объединяет букву W и две горизонтальные черты.'],
    '฿': ['Бат — валюта Таиланда.', 'Название бат связано с традиционной тайской единицей веса.'],
    '₱': ['Песо используют несколько стран, включая Филиппины и Мексику.', 'Знак песо произошёл от испанского символа валюты.'],
    '₺': ['Лира — национальная валюта Турции.', 'Символ турецкой лиры напоминает якорь и букву L.'],
    '₴': ['Гривна — денежная единица Украины.', 'Название гривна связано с древним украшением из драгоценного металла.'],
    '₫': ['Донг — валюта Вьетнама.', 'Слово dong происходит от вьетнамского слова «медь».'],
    '₦': ['Найра — валюта Нигерии.', 'Название найра образовано от слова Nigeria.'],
    '₸': ['Тенге — валюта Казахстана.', 'Название тенге связано со средневековыми тюркскими серебряными монетами.'],
    '₾': ['Лари — валюта Грузии.', 'Слово лари на грузинском связано с понятием «имущество».']
  };
  const currencyCount = 48;
  const SYMBOL_RADIUS = 22;
  const SAFE_MARGIN = 48;

  function showCurrencyFact(symbol, x, y) {
    const facts = currencyFacts[symbol] || ['У этой валюты есть своя история и множество интересных фактов.', 'Деньги отражают культуру и историю страны.'];
    const fact = facts[Math.floor(Math.random() * facts.length)];
    const bubble = document.createElement('div');
    bubble.className = 'currency-fact';
    bubble.textContent = fact;
    bubble.setAttribute('role', 'status');
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
    currencyField.appendChild(bubble);
    window.setTimeout(() => bubble.remove(), 4200);
  }

  function isOutsideCard(x, y, cardRect) {
    return x < cardRect.left - SAFE_MARGIN || x > cardRect.right + SAFE_MARGIN ||
      y < cardRect.top - SAFE_MARGIN || y > cardRect.bottom + SAFE_MARGIN;
  }

  function createCurrencyField() {
    const symbols = [];
    const card = document.querySelector('.calculator-card');
    const cardRect = card.getBoundingClientRect();
    const columns = Math.max(6, Math.ceil(Math.sqrt(currencyCount * (window.innerWidth / window.innerHeight))));
    const rows = Math.ceil(currencyCount / columns);
    const safePoints = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const x = ((column + 0.5) / columns) * window.innerWidth;
        const y = ((row + 0.5) / rows) * window.innerHeight;
        if (isOutsideCard(x, y, cardRect)) safePoints.push({ x, y });
      }
    }

    for (let i = 0; i < currencyCount; i += 1) {
      const symbol = document.createElement('span');
      const point = safePoints[i % safePoints.length];
      const isPopular = i < currencyCount / 2;
      const signSet = isPopular ? popularSigns : rareSigns;
      const sign = signSet[Math.floor(Math.random() * signSet.length)];
      const x = point.x + (Math.random() - 0.5) * Math.min(18, window.innerWidth / columns * 0.2);
      const y = point.y + (Math.random() - 0.5) * Math.min(18, window.innerHeight / rows * 0.2);

      symbol.className = 'currency-symbol' + (isPopular ? ' currency-symbol--popular' : '');
      symbol.textContent = sign;
      symbol.style.left = x + 'px';
      symbol.style.top = y + 'px';
      currencyField.appendChild(symbol);
      const item = {
        element: symbol,
        x,
        y,
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
        phase: Math.random() * Math.PI * 2,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.12
      };
      symbol.addEventListener('pointerdown', () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.16 + Math.random() * 0.1;
        item.vx = Math.cos(angle) * speed;
        item.vy = Math.sin(angle) * speed;
        item.rotationSpeed = (Math.random() - 0.5) * 0.3;
        showCurrencyFact(sign, item.x, item.y);
      });
      symbols.push(item);
    }

    function animate(now) {
      const currentCardRect = card.getBoundingClientRect();
      const width = window.innerWidth;
      const height = window.innerHeight;

      symbols.forEach((item) => {
        item.vx += Math.sin(now * 0.0003 + item.phase) * 0.0015;
        item.vy += Math.cos(now * 0.00025 + item.phase) * 0.0015;

        symbols.forEach((other) => {
          if (item === other) return;
          const dx = item.x - other.x;
          const dy = item.y - other.y;
          const distance = Math.hypot(dx, dy) || 0.01;
          const minimum = SYMBOL_RADIUS * 2;
          if (distance < minimum) {
            const force = (minimum - distance) / minimum * 0.035;
            item.vx += (dx / distance) * force;
            item.vy += (dy / distance) * force;
          }
        });

        item.vx *= 0.985;
        item.vy *= 0.985;
        item.x += item.vx;
        item.y += item.vy;

        if (item.x < SYMBOL_RADIUS || item.x > width - SYMBOL_RADIUS) item.vx *= -1;
        if (item.y < SYMBOL_RADIUS || item.y > height - SYMBOL_RADIUS) item.vy *= -1;
        item.x = Math.max(SYMBOL_RADIUS, Math.min(width - SYMBOL_RADIUS, item.x));
        item.y = Math.max(SYMBOL_RADIUS, Math.min(height - SYMBOL_RADIUS, item.y));

        if (!isOutsideCard(item.x, item.y, currentCardRect)) {
          const left = item.x - currentCardRect.left;
          const right = currentCardRect.right - item.x;
          const top = item.y - currentCardRect.top;
          const bottom = currentCardRect.bottom - item.y;
          const nearest = Math.min(left, right, top, bottom);
          if (nearest === left) item.x = currentCardRect.left - SAFE_MARGIN;
          else if (nearest === right) item.x = currentCardRect.right + SAFE_MARGIN;
          else if (nearest === top) item.y = currentCardRect.top - SAFE_MARGIN;
          else item.y = currentCardRect.bottom + SAFE_MARGIN;
          item.vx *= -1;
          item.vy *= -1;
        }

        item.rotation += item.rotationSpeed;
        item.element.style.transform = 'translate3d(-50%, -50%, 0) rotate(' + item.rotation + 'deg)';
        item.element.style.left = item.x + 'px';
        item.element.style.top = item.y + 'px';
      });
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }

  function setFieldError(input, messageElement, message) {
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    messageElement.textContent = message;
  }

  function validateBill(value) {
    if (!value) return 'Введите итоговую сумму.';

    const bill = Number(value.replace(',', '.'));
    if (!Number.isFinite(bill) || bill <= 0) return 'Введите сумму больше нуля.';

    return '';
  }

  function validatePeople(value) {
    if (!value) return 'Введите количество людей.';

    const people = Number(value);
    if (!Number.isInteger(people) || people <= 0) {
      return 'Введите целое число больше нуля.';
    }

    return '';
  }

  function calculate(event) {
    event.preventDefault();

    const billMessage = validateBill(billInput.value);
    const peopleMessage = validatePeople(peopleInput.value);
    setFieldError(billInput, billError, billMessage);
    setFieldError(peopleInput, peopleError, peopleMessage);

    if (billMessage || peopleMessage) {
      result.hidden = true;
      return;
    }

    const share = Number(billInput.value.replace(',', '.')) / Number(peopleInput.value);
    if (!Number.isFinite(share)) {
      result.hidden = true;
      return;
    }

    shareAmount.textContent = share.toFixed(2).replace('.', ',');
    result.hidden = false;
  }

  window.BILL_SPLITTER = {
    calculate,
    version: '1.1.0'
  };

  createCurrencyField();
  form.addEventListener('submit', calculate);
})();
