import './style.css';
import { Game } from './game/Game';
import { useGameStore } from './state/gameStore';
import { fetchScores, qualifies, submitScore, type ScoreEntry } from './state/scoreboard';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app element missing');

const canvas = document.createElement('canvas');
app.appendChild(canvas);

app.insertAdjacentHTML('beforeend', `
  <div id="flash"></div>
  <div id="banner"></div>
  <div id="hud">
    <button id="pause-btn" aria-label="Pause">&#10074;&#10074;</button>
    <div class="hud-top">
      <div class="hud-health">
        <span class="label">HP</span>
        <div class="bar"><div id="hp-fill"></div></div>
        <span id="hp-text" class="text">100</span>
      </div>
      <div id="wave" class="hud-item">Wave 0</div>
      <div id="score" class="hud-item">Score 0</div>
      <div id="bombs" class="hud-item">Bombs ●●●</div>
    </div>
    <div id="fps"></div>
  </div>
  <div id="gameover" hidden>
    <h1>kebaboom</h1>
    <p>You survived <span id="final-wave">0</span> waves</p>
    <p class="score">Score <span id="final-score">0</span></p>
    <div id="score-form" hidden>
      <p class="qualified">You made the leaderboard! Enter your initials:</p>
      <input id="initials" maxlength="3" autocomplete="off" spellcheck="false" placeholder="AAA" aria-label="Your initials">
      <button id="submit-score" disabled>Save score</button>
    </div>
    <div id="boards" hidden>
      <div class="board">
        <h2>Today</h2>
        <ol id="today-board"></ol>
      </div>
      <div class="board">
        <h2>All Time</h2>
        <ol id="all-board"></ol>
      </div>
    </div>
    <button id="restart">Play again</button>
  </div>
  <div id="pause" hidden>
    <h1>Paused</h1>
    <div class="controls">
      <div><span>WASD</span> Move</div>
      <div><span>Shift</span> Sprint</div>
      <div><span>Space</span> Jump</div>
      <div><span>Left Click</span> Throw bomb</div>
      <div><span>Right Click</span> Dash</div>
      <div><span>Esc</span> Pause / Resume</div>
    </div>
    <div id="pause-boards" hidden>
      <div class="board">
        <h2>Today</h2>
        <ol id="pause-today-board"></ol>
      </div>
      <div class="board">
        <h2>All Time</h2>
        <ol id="pause-all-board"></ol>
      </div>
    </div>
    <div class="pause-buttons">
      <button id="resume">Resume</button>
      <button id="highscores">High Scores</button>
      <button id="pause-restart" class="ghost">Restart</button>
    </div>
  </div>
`);

const game = new Game(canvas);
game.start();

const hpFill = document.getElementById('hp-fill')!;
const hpText = document.getElementById('hp-text')!;
const waveEl = document.getElementById('wave')!;
const scoreEl = document.getElementById('score')!;
const bombsEl = document.getElementById('bombs')!;
const fpsEl = document.getElementById('fps')!;
const gameoverEl = document.getElementById('gameover')!;
const finalWaveEl = document.getElementById('final-wave')!;
const finalScoreEl = document.getElementById('final-score')!;
const restartBtn = document.getElementById('restart')!;
const pauseEl = document.getElementById('pause')!;
const pauseBtn = document.getElementById('pause-btn')!;
const resumeBtn = document.getElementById('resume')!;
const pauseRestartBtn = document.getElementById('pause-restart')!;
const highscoresBtn = document.getElementById('highscores') as HTMLButtonElement;
const pauseBoardsEl = document.getElementById('pause-boards')!;
const pauseTodayBoardEl = document.getElementById('pause-today-board')!;
const pauseAllBoardEl = document.getElementById('pause-all-board')!;
const scoreFormEl = document.getElementById('score-form')!;
const initialsEl = document.getElementById('initials') as HTMLInputElement;
const submitBtn = document.getElementById('submit-score') as HTMLButtonElement;
const boardsEl = document.getElementById('boards')!;
const todayBoardEl = document.getElementById('today-board')!;
const allBoardEl = document.getElementById('all-board')!;

function renderBoard(el: HTMLElement, entries: ScoreEntry[], highlightId?: number) {
  el.innerHTML =
    entries.length === 0
      ? '<li class="empty">No scores yet</li>'
      : entries
          .map(
            (e, i) =>
              `<li${e.id === highlightId ? ' class="me"' : ''}><span class="rank">${i + 1}</span><span class="name">${e.initials}</span><span class="pts">${e.score.toLocaleString()}</span></li>`,
          )
          .join('');
}

async function showGameOver() {
  const score = useGameStore.getState().score;
  try {
    const [today, all] = await Promise.all([fetchScores('today'), fetchScores('all')]);
    renderBoard(todayBoardEl, today);
    renderBoard(allBoardEl, all);
    boardsEl.hidden = false;
    if (qualifies(today, score) || qualifies(all, score)) {
      scoreFormEl.hidden = false;
      initialsEl.focus();
    }
  } catch {
    boardsEl.hidden = true;
  }
}

initialsEl.addEventListener('input', () => {
  initialsEl.value = initialsEl.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  submitBtn.disabled = initialsEl.value.length < 1;
});

submitBtn.addEventListener('click', async () => {
  const initials = initialsEl.value;
  const score = useGameStore.getState().score;
  submitBtn.disabled = true;
  try {
    const submitted = await submitScore(initials, score);
    scoreFormEl.hidden = true;
    const [today, all] = await Promise.all([fetchScores('today'), fetchScores('all')]);
    renderBoard(todayBoardEl, today, submitted.id);
    renderBoard(allBoardEl, all, submitted.id);
  } catch {
    submitBtn.disabled = initialsEl.value.length < 1;
  }
});

useGameStore.subscribe((state, prev) => {
  if (state.health !== prev.health) {
    const pct = (state.health / state.maxHealth) * 100;
    hpFill.style.width = `${pct}%`;
    hpFill.style.background = pct > 50 ? '#4cd964' : pct > 25 ? '#ffd60a' : '#ff4d6d';
    hpText.textContent = String(state.health);
  }
  if (state.wave !== prev.wave) {
    waveEl.textContent = `Wave ${state.wave}`;
  }
  if (state.score !== prev.score) {
    scoreEl.textContent = `Score ${state.score}`;
  }
  if (state.bombs !== prev.bombs) {
    bombsEl.textContent = `Bombs ${'●'.repeat(Math.max(0, state.bombs))}${'○'.repeat(Math.max(0, 3 - state.bombs))}`;
  }
  if (state.fps !== prev.fps) {
    fpsEl.textContent = `${state.fps} fps`;
  }
  if (state.phase !== prev.phase && state.phase === 'gameover') {
    finalWaveEl.textContent = String(state.wave);
    finalScoreEl.textContent = String(state.score);
    gameoverEl.hidden = false;
    pauseEl.hidden = true;
    void showGameOver();
  }
  if (state.phase !== prev.phase) {
    pauseEl.hidden = state.phase !== 'paused';
    if (state.phase === 'paused') pauseBoardsEl.hidden = true;
  }
});

pauseBtn.addEventListener('click', () => game.togglePause());
resumeBtn.addEventListener('click', () => game.togglePause());
highscoresBtn.addEventListener('click', async () => {
  if (!pauseBoardsEl.hidden) {
    pauseBoardsEl.hidden = true;
    return;
  }
  highscoresBtn.disabled = true;
  try {
    const [today, all] = await Promise.all([fetchScores('today'), fetchScores('all')]);
    renderBoard(pauseTodayBoardEl, today);
    renderBoard(pauseAllBoardEl, all);
  } catch {
    pauseTodayBoardEl.innerHTML = '<li class="empty">Leaderboard unavailable</li>';
    pauseAllBoardEl.innerHTML = '';
  } finally {
    pauseBoardsEl.hidden = false;
    highscoresBtn.disabled = false;
  }
});
pauseRestartBtn.addEventListener('click', () => {
  pauseEl.hidden = true;
  useGameStore.getState().reset();
  location.reload();
});

restartBtn.addEventListener('click', () => {
  gameoverEl.hidden = true;
  useGameStore.getState().reset();
  location.reload();
});

window.addEventListener('beforeunload', () => game.dispose());
