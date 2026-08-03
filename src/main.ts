import './style.css';
import { Game } from './game/Game';
import { useGameStore } from './state/gameStore';

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('#app element missing');

const canvas = document.createElement('canvas');
app.appendChild(canvas);

app.insertAdjacentHTML('beforeend', `
  <div id="flash"></div>
  <div id="banner"></div>
  <div id="hud">
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
    <button id="restart">Play again</button>
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
  }
});

restartBtn.addEventListener('click', () => {
  gameoverEl.hidden = true;
  useGameStore.getState().reset();
  location.reload();
});

window.addEventListener('beforeunload', () => game.dispose());
