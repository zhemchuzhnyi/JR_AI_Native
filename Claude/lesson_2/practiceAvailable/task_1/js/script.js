(function () {
  'use strict';

  const TOTAL = 100;
  const LIMIT = 50;
  const COMPARISON_RUNS = 100;
  const els = {
    grid: document.getElementById('box-grid'),
    status: document.getElementById('status'),
    progress: document.getElementById('progress-label'),
    attempts: document.getElementById('attempt-label'),
    resultTitle: document.getElementById('result-title'),
    resultCopy: document.getElementById('result-copy'),
    success: document.getElementById('success-count'),
    totalAttempts: document.getElementById('total-attempts'),
    compareResult: document.getElementById('compare-result'),
    tournament: document.getElementById('tournament'),
    leaderboard: document.getElementById('leaderboard-body'),
    tournamentResult: document.getElementById('tournament-result'),
    newRun: document.getElementById('new-run'),
    nextStep: document.getElementById('next-step'),
    autoRun: document.getElementById('auto-run'),
    compare: document.getElementById('compare')
  };
  const BOT_RUNS = 100;
  const bots = [
    { id: 'random', name: 'Случайный перебор', pick: (prisoner, attempt, previous, opened) => randomBox(opened) },
    { id: 'sequential', name: 'Последовательный перебор', pick: (prisoner, attempt) => (prisoner + attempt) % TOTAL },
    { id: 'anchor', name: 'Старт со своего номера', pick: (prisoner, attempt, previous) => attempt === 0 ? prisoner : (previous + 1) % TOTAL },
    { id: 'cycle', name: 'Следование по циклу', pick: (prisoner, attempt, previous, opened, permutation) => attempt === 0 ? prisoner : permutation[previous] - 1 }
  ];
  const state = {
    permutation: [],
    boxes: [],
    prisoner: 0,
    successes: 0,
    totalAttempts: 0,
    opened: [],
    currentBox: null,
    foundBox: null,
    running: false,
    complete: false,
    auto: false,
    nextFrame: 0
  };

  function strategy() { return document.querySelector('input[name="strategy"]:checked').value; }
  function mode() { return document.querySelector('input[name="mode"]:checked').value; }
  function randomBox(opened) {
    const available = Array.from({ length: TOTAL }, (_, index) => index).filter((index) => !opened.includes(index));
    return available[Math.floor(Math.random() * available.length)];
  }

  // Fisher-Yates keeps every permutation equally likely.
  function shuffle() {
    const values = Array.from({ length: TOTAL }, (_, index) => index + 1);
    for (let index = values.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [values[index], values[swap]] = [values[swap], values[index]];
    }
    return values;
  }

  function createBoxes() {
    els.grid.innerHTML = '';
    state.boxes = Array.from({ length: TOTAL }, (_, index) => {
      const element = document.createElement('button');
      element.className = 'box';
      element.type = 'button';
      element.disabled = true;
      element.setAttribute('aria-label', 'Ящик ' + (index + 1));
      els.grid.appendChild(element);
      return element;
    });
  }

  function renderBoxes() {
    state.boxes.forEach((box, index) => {
      box.className = 'box';
      box.textContent = state.permutation[index];
      if (state.opened.includes(index)) box.classList.add('box--opened');
      if (index === state.currentBox) box.classList.add('box--current');
      if (index === state.foundBox) box.className = 'box box--found';
      box.setAttribute('aria-label', 'Ящик ' + (index + 1) + ', номер ' + state.permutation[index]);
    });
    els.progress.textContent = state.complete ? 'Забег завершён' : 'Заключённый ' + Math.min(state.prisoner + 1, TOTAL) + ' из ' + TOTAL;
    els.attempts.textContent = 'Открытий: ' + state.opened.length + ' / ' + LIMIT;
  }

  function setStatus(text, type) {
    els.status.textContent = text;
    els.status.className = 'status status--' + (type || 'neutral');
  }

  function updateButtons() {
    const active = state.running && !state.complete;
    els.nextStep.disabled = !active || state.auto;
    els.autoRun.disabled = !active || state.auto;
    els.newRun.disabled = state.auto;
    els.compare.disabled = state.auto;
  }

  function resetRun() {
    state.permutation = shuffle();
    state.prisoner = 0;
    state.successes = 0;
    state.totalAttempts = 0;
    state.opened = [];
    state.currentBox = null;
    state.foundBox = null;
    state.running = true;
    state.complete = false;
    state.auto = false;
    els.resultTitle.textContent = 'Забег идёт';
    els.resultCopy.textContent = 'Стратегия: ' + (strategy() === 'cycle' ? 'следование по циклу.' : 'случайный поиск.');
    els.success.textContent = '0';
    els.totalAttempts.textContent = '0';
    setStatus('Готово: первый заключённый ищет свой номер', 'neutral');
    renderBoxes();
    updateButtons();
  }

  function pickBox() {
    if (strategy() === 'cycle') {
      return state.opened.length === 0 ? state.prisoner : state.permutation[state.currentBox] - 1;
    }
    const available = Array.from({ length: TOTAL }, (_, index) => index).filter((index) => !state.opened.includes(index));
    return available[Math.floor(Math.random() * available.length)];
  }

  function finishPrisoner(found) {
    if (found) state.successes += 1;
    state.totalAttempts += state.opened.length;
    state.prisoner += 1;
    state.opened = [];
    state.currentBox = state.foundBox;
    if (!found) {
      state.running = false;
      state.complete = true;
      state.auto = false;
      els.resultTitle.textContent = 'Группа проиграла';
      els.resultCopy.textContent = 'Заключённый ' + state.prisoner + ' не нашёл свой номер за 50 открытий.';
      setStatus('Поражение: один заключённый не справился', 'fail');
    } else if (state.prisoner === TOTAL) {
      state.running = false;
      state.complete = true;
      state.auto = false;
      els.resultTitle.textContent = 'Все спасены!';
      els.resultCopy.textContent = 'Каждый из 100 заключённых нашёл свой номер.';
      setStatus('Успех: все заключённые спасены', 'success');
    } else {
      setStatus('Заключённый ' + state.prisoner + ' нашёл свой номер', 'success');
    }
  }

  function step() {
    if (!state.running || state.complete) return;
    const boxIndex = pickBox();
    state.currentBox = boxIndex;
    state.opened.push(boxIndex);
    const found = state.permutation[boxIndex] === state.prisoner + 1;
    state.foundBox = found ? boxIndex : null;
    renderBoxes();
    if (found || state.opened.length === LIMIT) finishPrisoner(found);
    els.success.textContent = state.successes;
    els.totalAttempts.textContent = state.totalAttempts;
    renderBoxes();
    updateButtons();
  }

  function loop(timestamp) {
    if (state.auto && state.running && !state.complete) {
      if (timestamp >= state.nextFrame) {
        step();
        state.nextFrame = timestamp + 24;
      }
      requestAnimationFrame(loop);
    }
  }

  function startAuto() {
    if (!state.running || state.complete) return;
    state.auto = true;
    setStatus('Автоматический режим: симуляция выполняется', 'neutral');
    updateButtons();
    state.nextFrame = 0;
    requestAnimationFrame(loop);
  }

  function simulate(strategyName, sharedPermutation) {
    const permutation = sharedPermutation || shuffle();
    const bot = bots.find((item) => item.id === strategyName) || bots[0];
    let successful = 0;
    let attempts = 0;
    for (let prisoner = 0; prisoner < TOTAL; prisoner += 1) {
      const opened = [];
      let previous = null;
      let found = false;
      for (let attempt = 0; attempt < LIMIT; attempt += 1) {
        const box = bot.pick(prisoner, attempt, previous, opened, permutation);
        opened.push(box);
        previous = box;
        attempts += 1;
        if (permutation[box] === prisoner + 1) { found = true; break; }
      }
      if (found) successful += 1;
      else break;
    }
    return { success: successful === TOTAL, successful, attempts };
  }

  function compareStrategies() {
    const totals = { cycle: { wins: 0, people: 0 }, random: { wins: 0, people: 0 } };
    for (let run = 0; run < COMPARISON_RUNS; run += 1) {
      const permutation = shuffle();
      ['cycle', 'random'].forEach((name) => {
        const result = simulate(name, permutation);
        if (result.success) totals[name].wins += 1;
        totals[name].people += result.successful;
      });
    }
    els.compareResult.textContent = 'За ' + COMPARISON_RUNS + ' одинаковых раскладок:\nЦиклы: ' + totals.cycle.wins + ' полных успехов; ' + Math.round(totals.cycle.people / COMPARISON_RUNS) + ' спасённых в среднем.\nСлучайный поиск: ' + totals.random.wins + ' полных успехов; ' + Math.round(totals.random.people / COMPARISON_RUNS) + ' спасённых в среднем.';
  }

  function runTournament() {
    const scores = bots.map((bot) => ({ id: bot.id, name: bot.name, wins: 0, people: 0, games: 0 }));
    for (let left = 0; left < bots.length; left += 1) {
      for (let right = left + 1; right < bots.length; right += 1) {
        for (let run = 0; run < BOT_RUNS; run += 1) {
          const permutation = shuffle();
          const leftResult = simulate(bots[left].id, permutation);
          const rightResult = simulate(bots[right].id, permutation);
          const leftScore = scores[left];
          const rightScore = scores[right];
          leftScore.games += 1; rightScore.games += 1;
          leftScore.people += leftResult.successful; rightScore.people += rightResult.successful;
          if (leftResult.success) leftScore.wins += 1;
          if (rightResult.success) rightScore.wins += 1;
        }
      }
    }
    scores.sort((a, b) => b.wins - a.wins || b.people - a.people);
    els.leaderboard.innerHTML = scores.map((score, index) => '<tr class="' + (index === 0 ? 'is-winner' : '') + '"><td>' + (index + 1) + '</td><td>' + score.name + '</td><td>' + score.wins + ' / ' + score.games + '</td><td>' + Math.round(score.people / score.games) + '</td></tr>').join('');
    els.tournamentResult.textContent = 'Лидер эксперимента: ' + scores[0].name + '. Рейтинг отсортирован по полным победам группы.';
  }

  window.PRISONERS_SIM = { resetRun, step, startAuto, compareStrategies, simulate, shuffle, state };
  createBoxes();
  els.newRun.addEventListener('click', resetRun);
  els.nextStep.addEventListener('click', step);
  els.autoRun.addEventListener('click', startAuto);
  els.compare.addEventListener('click', compareStrategies);
  els.tournament.addEventListener('click', runTournament);
  resetRun();
})();
