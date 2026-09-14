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
    newRun: document.getElementById('new-run'),
    nextStep: document.getElementById('next-step'),
    autoRun: document.getElementById('auto-run'),
    compare: document.getElementById('compare')
  };
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
    state.currentBox = null;
    state.foundBox = null;
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

  function simulate(strategyName) {
    const permutation = shuffle();
    let successful = 0;
    let attempts = 0;
    for (let prisoner = 0; prisoner < TOTAL; prisoner += 1) {
      const opened = [];
      let box = prisoner;
      let found = false;
      for (let attempt = 0; attempt < LIMIT; attempt += 1) {
        if (strategyName === 'random') {
          const available = Array.from({ length: TOTAL }, (_, index) => index).filter((index) => !opened.includes(index));
          box = available[Math.floor(Math.random() * available.length)];
        } else if (attempt > 0) {
          box = permutation[box] - 1;
        }
        opened.push(box);
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
    ['cycle', 'random'].forEach((name) => {
      for (let run = 0; run < COMPARISON_RUNS; run += 1) {
        const result = simulate(name);
        if (result.success) totals[name].wins += 1;
        totals[name].people += result.successful;
      }
    });
    els.compareResult.textContent = 'За ' + COMPARISON_RUNS + ' забегов:\nЦиклы: ' + totals.cycle.wins + ' полных успехов; ' + totals.cycle.people + ' спасённых заключённых.\nСлучайный поиск: ' + totals.random.wins + ' полных успехов; ' + totals.random.people + ' спасённых заключённых.';
  }

  window.PRISONERS_SIM = { resetRun, step, startAuto, compareStrategies, simulate, shuffle, state };
  createBoxes();
  els.newRun.addEventListener('click', resetRun);
  els.nextStep.addEventListener('click', step);
  els.autoRun.addEventListener('click', startAuto);
  els.compare.addEventListener('click', compareStrategies);
  resetRun();
})();
