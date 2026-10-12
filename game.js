/**
 * Block Blast - Ultimate Game Engine with Meteors, Ultimate Ability, Scratch Card, & Trophy Room
 */
// Ensure daily rewards state integrity: when streak resets to 1, claimed cannot remain >= 7
try {
  if (typeof localStorage !== 'undefined' && localStorage.setItem) {
    const _origSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(k, v) {
      _origSetItem(k, v);
      if (k === 'blockblast_daily_streak' && String(v) === '1') {
        const cl = parseInt(localStorage.getItem('blockblast_daily_claimed') || '0', 10);
        if (cl >= 7) {
          _origSetItem('blockblast_daily_claimed', '0');
        }
      } else if (k === 'blockblast_daily_claimed' && parseInt(v, 10) >= 7) {
        const st = parseInt(localStorage.getItem('blockblast_daily_streak') || '1', 10);
        if (st === 1) {
          _origSetItem('blockblast_daily_claimed', '0');
        }
      }
    };
  }
} catch (e) {}

class BlockBlastGame {
  constructor() {
    this.difficulty = localStorage.getItem('blockblast_difficulty') || 'normal';
    this.GRID_SIZE = this.difficulty === 'hard' ? 9 : 8;
    this.grid = Array(this.GRID_SIZE).fill(null).map(() => Array(this.GRID_SIZE).fill(null));
    this.previousGridState = null;

    this.score = 0;
    this.bestScore = 0;
    const parsedCoins = parseInt(localStorage.getItem('blockblast_coins'), 10);
    this.coins = (!isNaN(parsedCoins) && parsedCoins >= 0) ? parsedCoins : 100;

    const parsedTickets = parseInt(localStorage.getItem('blockblast_scratch_tickets'), 10);
    this.scratchTickets = (!isNaN(parsedTickets) && parsedTickets >= 0) ? parsedTickets : 1;

    this.streak = 0;

    this.hasPlayedRecordFanfare = false;

    this.mode = 'classic'; // 'classic', 'levels', 'duel', 'bomb', 'time'
    const parsedLevel = parseInt(localStorage.getItem('blockblast_active_level_num'), 10);
    this.currentLevelNumber = (!isNaN(parsedLevel) && parsedLevel >= 1) ? parsedLevel : 1;

    const parsedMaxLevel = parseInt(localStorage.getItem('blockblast_max_unlocked_level'), 10);
    this.maxUnlockedLevel = (!isNaN(parsedMaxLevel) && parsedMaxLevel >= 1) ? parsedMaxLevel : 1;
    this.levelProgress = { linesCleared: 0, bombsDefused: 0 };

    this.timeRemaining = 120;
    this.timerInterval = null;

    // Bot Duel State
    this.botHP = 100;
    this.botInterval = null;
    this.botIntervalMs = 2800;
    this.reviveClearLines = 3;

    // Ultimate Ability Energy (0 to 100%)
    this.ultimateEnergy = 0;

    // Meteors Background Particles
    this.meteors = [];
    this.initMeteors();

    this.boosters = {
      undo: parseInt(localStorage.getItem('blockblast_b_undo') || '2', 10),
      hammer: parseInt(localStorage.getItem('blockblast_b_hammer') || '2', 10),
      bomb: parseInt(localStorage.getItem('blockblast_b_bomb') || '1', 10),
      shuffle: parseInt(localStorage.getItem('blockblast_b_shuffle') || '2', 10)
    };
    this.activeBooster = null;

    this.quests = [
      { id: 'lines_5', reward: '+100 🪙', target: 5, current: 0, claimed: false },
      { id: 'score_500', reward: '+1 🔨', target: 500, current: 0, claimed: false },
      { id: 'combo_2', reward: '+1 💣', target: 2, current: 0, claimed: false }
    ];
    this.loadQuestsState();

    this.tray = [null, null, null];
    this.holdShape = null;
    this.canHold = true;

    this.activeDrag = null;
    this.particles = [];
    this.trailParticles = [];
    this.shockwaves = [];
    this.laserBeams = [];
    this.popups = [];

    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.scoreEl = document.getElementById('score');
    this.bestScoreEl = document.getElementById('best-score');
    this.coinsEl = document.getElementById('coins-val');
    this.comboBanner = document.getElementById('combo-banner');
    this.noMovesBanner = document.getElementById('no-moves-banner');
    this.comboTag = document.getElementById('combo-multiplier-tag');
    this.mascotEl = document.getElementById('mascot-emote');
    this.rankBadgeEl = document.getElementById('rank-badge');
    this.levelGoalBar = document.getElementById('level-goal-bar');
    this.levelGoalTxt = document.getElementById('level-goal-txt');
    this.botStatusBar = document.getElementById('bot-status-bar');
    this.botStatusTxt = document.getElementById('bot-status-txt');
    this.botHpFill = document.getElementById('bot-hp-fill');
    this.modalGameOver = document.getElementById('modal-gameover');
    this.finalScoreEl = document.getElementById('final-score');
    this.finalBestEl = document.getElementById('final-best');
    this.modalLeaderboard = document.getElementById('modal-leaderboard');
    this.modalShop = document.getElementById('modal-shop');
    this.modalWheel = document.getElementById('modal-wheel');
    this.modalQuests = document.getElementById('modal-quests');
    this.modalLevels = document.getElementById('modal-levels');
    this.modalDaily = document.getElementById('modal-daily-reward');
    this.modalScratch = document.getElementById('modal-scratch');
    this.modalTrophies = document.getElementById('modal-trophies');
    this.modalSettings = document.getElementById('modal-settings');
    this.screenMainMenu = document.getElementById('screen-main-menu');
    this.isPaused = true;
    this.currentChapterId = 1;
    this.selectedLevelNumber = 1;
    this.selectedMenuMode = 'classic';
    this.holdSlotEl = document.getElementById('hold-slot');
    this.timerBarContainer = document.getElementById('timer-bar-container');
    this.timerBarFill = document.getElementById('timer-bar-fill');
    this.timerText = document.getElementById('timer-text');
    this.btnUltimate = document.getElementById('btn-ultimate');
    this.ultimateFill = document.getElementById('ultimate-fill');

    this.slotEls = [
      document.getElementById('slot-0'),
      document.getElementById('slot-1'),
      document.getElementById('slot-2')
    ];

    this.cellSize = 44;
    this.gridPadding = 12;
    this.canvasWidth = 360;
    this.canvasHeight = 360;

    this.isGameOver = false;
    this.reviveUsed = false;
    this.isSpinning = false;
  }

  async init() {
    await window.vkSDK.init();

    // Sync cloud progress with local storage
    try {
      const cloud = await window.vkSDK.loadCloudData();
      if (cloud && typeof cloud === 'object') {
        if (cloud.bestScore !== undefined) {
          this.bestScore = Math.max(this.bestScore, parseInt(cloud.bestScore, 10) || 0);
          localStorage.setItem('blockblast_best_score', this.bestScore.toString());
        }
        if (cloud.coins !== undefined) {
          this.coins = Math.max(this.coins, parseInt(cloud.coins, 10) || 0);
          localStorage.setItem('blockblast_coins', this.coins.toString());
        }
        if (cloud.maxUnlockedLevel !== undefined) {
          this.maxUnlockedLevel = Math.max(this.maxUnlockedLevel, parseInt(cloud.maxUnlockedLevel, 10) || 1);
          localStorage.setItem('blockblast_max_unlocked_level', this.maxUnlockedLevel.toString());
        }
        if (cloud.scratchTickets !== undefined) {
          this.scratchTickets = Math.max(this.scratchTickets, parseInt(cloud.scratchTickets, 10) || 0);
          localStorage.setItem('blockblast_scratch_tickets', this.scratchTickets.toString());
        }
        if (cloud.boosters && typeof cloud.boosters === 'object') {
          ['undo', 'hammer', 'bomb', 'shuffle'].forEach(b => {
            if (cloud.boosters[b] !== undefined) {
              this.boosters[b] = Math.max(this.boosters[b], parseInt(cloud.boosters[b], 10) || 0);
              localStorage.setItem(`blockblast_b_${b}`, this.boosters[b].toString());
            }
          });
        }
      }
    } catch (e) {
      console.warn('Cloud data load/merge warning:', e);
    }

    this.bestScore = Math.max(this.bestScore, window.vkSDK.getBestScore());
    this.updateScoreUI();
    this.updateCoinsUI();
    this.updateBoosterUI();
    this.updateRankUI();
    this.updateSoundUI();

    window.ShapeFactory.setActiveBackground(window.ShapeFactory.activeBg);

    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.diff === this.difficulty);
    });

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resizeCanvas(), 120));

    this.bindEvents();
    this.updateMainMenuUI();

    if (!this.loadGameState()) {
      this.startNewGame();
    } else {
      this.renderTray();
      this.renderHoldSlot();
      if (this.mode === 'time') {
        this.timerBarContainer.classList.remove('hidden');
        this.levelGoalBar.classList.add('hidden');
        this.botStatusBar.classList.add('hidden');
        this.startTimer();
      } else if (this.mode === 'levels') {
        this.timerBarContainer.classList.add('hidden');
        this.levelGoalBar.classList.remove('hidden');
        this.botStatusBar.classList.add('hidden');
        if (this.movesRemaining === undefined) {
          const lvlConfig = window.ProceduralLevelGenerator.getLevelConfig(this.currentLevelNumber);
          this.movesRemaining = lvlConfig ? (lvlConfig.movesLimit || 25) : 25;
        }
        this.updateLevelGoalUI();
      } else if (this.mode === 'duel') {
        this.timerBarContainer.classList.add('hidden');
        this.levelGoalBar.classList.add('hidden');
        this.botStatusBar.classList.remove('hidden');
        this.startBotDuel();
      } else {
        this.timerBarContainer.classList.add('hidden');
        this.levelGoalBar.classList.add('hidden');
        this.botStatusBar.classList.add('hidden');
      }
    }

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame((t) => this.gameLoop(t));
    }

    if (window.vkSDK && typeof window.vkSDK.ready === 'function') {
      window.vkSDK.ready();
    }
  }

  initMeteors() {
    this.meteors = [];
    for (let i = 0; i < 12; i++) {
      this.meteors.push({
        x: Math.random() * 400,
        y: Math.random() * 400,
        length: 15 + Math.random() * 25,
        speed: 1.5 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.5
      });
    }
  }

  updateAndDrawMeteors() {
    this.ctx.save();
    this.meteors.forEach(m => {
      m.x += m.speed;
      m.y += m.speed * 0.8;
      if (m.x > this.canvasWidth || m.y > this.canvasHeight) {
        m.x = -20;
        m.y = Math.random() * (this.canvasHeight / 2);
      }

      this.ctx.strokeStyle = `rgba(0, 242, 255, ${m.alpha})`;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(m.x, m.y);
      this.ctx.lineTo(m.x - m.length, m.y - m.length * 0.8);
      this.ctx.stroke();
    });
    this.ctx.restore();
  }

  resizeCanvas() {
    const windowH = window.innerHeight;
    const windowW = window.innerWidth;

    if (windowW > 768) {
      // Desktop / Tablet Landscape
      const maxH = windowH - 240;
      const maxWByScreen = windowW - 220;
      let side = Math.min(maxWByScreen, maxH, 440);
      side = Math.max(220, Math.floor(side));
      this.canvasWidth = side;
      this.canvasHeight = side;
    } else {
      // Mobile Portrait: Dynamically calculate available height
      // Reserve 75px for bottom banner on mobile
      const bottomBannerReserve = 75;
      
      const hudH = document.querySelector('.hud')?.offsetHeight || 42;
      const modeH = document.querySelector('.mode-bar')?.offsetHeight || 28;
      const diffH = document.querySelector('.difficulty-bar')?.offsetHeight || 26;
      const botH = (this.botStatusBar && !this.botStatusBar.classList.contains('hidden')) ? (this.botStatusBar.offsetHeight || 28) : 0;
      const levelH = (this.levelGoalBar && !this.levelGoalBar.classList.contains('hidden')) ? (this.levelGoalBar.offsetHeight || 24) : 0;
      const timerH = (this.timerBarContainer && !this.timerBarContainer.classList.contains('hidden')) ? (this.timerBarContainer.offsetHeight || 18) : 0;
      const ctrlH = document.querySelector('.controls-bar')?.offsetHeight || 30;
      const boostH = document.querySelector('.boosters-bar')?.offsetHeight || 30;
      const holdH = document.querySelector('.hold-panel')?.offsetHeight || 44;
      const trayH = document.querySelector('.shapes-tray-container')?.offsetHeight || 80;

      const totalUIHeight = hudH + modeH + diffH + botH + levelH + timerH + ctrlH + boostH + holdH + trayH + bottomBannerReserve + 14;
      const availableH = Math.max(160, windowH - totalUIHeight);
      const availableW = Math.max(160, windowW - 14);

      let side = Math.min(availableW, availableH, 380);
      side = Math.max(160, Math.floor(side));
      this.canvasWidth = side;
      this.canvasHeight = side;
    }

    this.cellSize = (this.canvasWidth - this.gridPadding * 2) / this.GRID_SIZE;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvasWidth * dpr;
    this.canvas.height = this.canvasHeight * dpr;
    this.canvas.style.width = `${this.canvasWidth}px`;
    this.canvas.style.height = `${this.canvasHeight}px`;

    this.ctx.scale(dpr, dpr);
  }

  setMascot(emote, resetMs = 2500) {
    if (this.mascotEl) {
      this.mascotEl.textContent = emote;
      if (resetMs > 0) {
        setTimeout(() => {
          if (!this.isGameOver) this.mascotEl.textContent = '🤖';
        }, resetMs);
      }
    }
  }

  updateRankUI() {
    if (!this.rankBadgeEl) return;
    let rankKey = 'rankBronze';
    if (this.bestScore >= 6000) rankKey = 'rankLegend';
    else if (this.bestScore >= 3000) rankKey = 'rankDiamond';
    else if (this.bestScore >= 1500) rankKey = 'rankGold';
    else if (this.bestScore >= 500) rankKey = 'rankSilver';

    this.rankBadgeEl.textContent = window.vkSDK ? window.vkSDK.t(rankKey) : rankKey;
  }

  startNewGame() {
    this.grid = Array(this.GRID_SIZE).fill(null).map(() => Array(this.GRID_SIZE).fill(null));
    this.previousGridState = null;
    this.score = 0;
    this.streak = 0;
    this.hasPlayedRecordFanfare = false;
    this.levelProgress = { linesCleared: 0, bombsDefused: 0 };
    this.holdShape = null;
    this.canHold = true;
    this.isGameOver = false;
    this.reviveUsed = false;
    this.activeBooster = null;

    this.updateScoreUI();
    this.updateComboTag();
    this.renderHoldSlot();
    this.setMascot('🤖', 0);
    this.noMovesBanner.classList.add('hidden');
    this.modalGameOver.classList.add('hidden');

    const isMainMenuOpen = this.screenMainMenu && !this.screenMainMenu.classList.contains('hidden');
    this.isPaused = isMainMenuOpen;
    if (window.vkSDK && typeof window.vkSDK._notifyGameplay === 'function') {
      window.vkSDK._notifyGameplay(!isMainMenuOpen);
    }

    this.slotEls.forEach(s => s.classList.remove('disabled'));

    this.stopTimer();
    this.stopBotDuel();

    if (this.mode === 'time') {
      this.timeRemaining = 120;
      this.startTimer();
      this.timerBarContainer.classList.remove('hidden');
      this.levelGoalBar.classList.add('hidden');
      this.botStatusBar.classList.add('hidden');
    } else if (this.mode === 'levels') {
      this.timerBarContainer.classList.add('hidden');
      this.levelGoalBar.classList.remove('hidden');
      this.botStatusBar.classList.add('hidden');
      const lvlConfig = window.ProceduralLevelGenerator.getLevelConfig(this.currentLevelNumber);
      this.movesRemaining = lvlConfig ? (lvlConfig.movesLimit || 25) : 25;
      this.isLevelCompleted = false;
      this.updateLevelGoalUI();
    } else if (this.mode === 'duel') {
      this.timerBarContainer.classList.add('hidden');
      this.levelGoalBar.classList.add('hidden');
      this.botStatusBar.classList.remove('hidden');
      this.startBotDuel();
    } else {
      this.timerBarContainer.classList.add('hidden');
      this.levelGoalBar.classList.add('hidden');
      this.botStatusBar.classList.add('hidden');
    }

    this.spawnSpecialBlocks();
    this.fillTray();
    this.updateLevelGoalUI();
    this.saveGameState();
  }

  updateLevelGoalUI() {
    if (this.mode !== 'levels' || !this.levelGoalBar || !this.levelGoalTxt) return;

    const lvlConfig = window.ProceduralLevelGenerator.getLevelConfig(this.currentLevelNumber);
    if (!lvlConfig) return;

    const t = (k, def) => (window.vkSDK && typeof window.vkSDK.t === 'function' ? window.vkSDK.t(k) : def);
    const lvlWord = t('lvlTitle', 'Уровень {lvl}').replace('{lvl}', this.currentLevelNumber);
    const movesWord = t('movesLimit', 'Ходы');
    const movesTxt = (this.movesRemaining !== undefined) ? ` • 👣 ${movesWord}: ${this.movesRemaining}` : '';

    if (lvlConfig.isBoss) {
      this.levelGoalTxt.textContent = `👑 ${lvlWord}: ${this.score}/${lvlConfig.targetScore} • 💥 ${this.levelProgress.linesCleared}/${lvlConfig.targetLines}${movesTxt}`;
    } else if (lvlConfig.targetBombs) {
      this.levelGoalTxt.textContent = `💣 ${lvlWord}: ${this.levelProgress.bombsDefused}/${lvlConfig.targetBombs}${movesTxt}`;
    } else if (lvlConfig.targetLines) {
      this.levelGoalTxt.textContent = `💥 ${lvlWord}: ${this.levelProgress.linesCleared}/${lvlConfig.targetLines}${movesTxt}`;
    } else if (lvlConfig.targetScore) {
      this.levelGoalTxt.textContent = `🎯 ${lvlWord}: ${this.score}/${lvlConfig.targetScore}${movesTxt}`;
    } else if (lvlConfig.targetStreak) {
      this.levelGoalTxt.textContent = `🔥 ${lvlWord}: x${this.streak}/x${lvlConfig.targetStreak}${movesTxt}`;
    } else {
      this.levelGoalTxt.textContent = `${lvlWord}: ${lvlConfig.desc}${movesTxt}`;
    }
  }

  spawnSpecialBlocks() {
    const ir = Math.floor(Math.random() * this.GRID_SIZE);
    const ic = Math.floor(Math.random() * this.GRID_SIZE);
    this.grid[ir][ic] = { type: 'ice', hp: 2, colorIdx: 0 };

    const dr = Math.floor(Math.random() * this.GRID_SIZE);
    const dc = Math.floor(Math.random() * this.GRID_SIZE);
    if (this.grid[dr][dc] === null) {
      this.grid[dr][dc] = { type: 'diamond', colorIdx: 1 };
    }

    // Если играем в режиме бомб или на уровне с бомбами — сразу спавним 1 бомбу со старта!
    const lvlConfig = (this.mode === 'levels') ? window.ProceduralLevelGenerator.getLevelConfig(this.currentLevelNumber) : null;
    if (this.mode === 'bomb' || (lvlConfig && lvlConfig.targetBombs)) {
      this.spawnBombCell();
    }
  }

  setDifficulty(newDiff) {
    if (this.difficulty === newDiff) return;
    this.difficulty = newDiff;
    localStorage.setItem('blockblast_difficulty', newDiff);
    this.GRID_SIZE = newDiff === 'hard' ? 9 : 8;

    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.diff === newDiff);
    });

    this.resizeCanvas();
    this.startNewGame();
  }

  setMode(newMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === newMode);
    });

    this.startNewGame();
  }

  fillTray() {
    // Check if active bombs exist on the grid
    let hasActiveBombs = false;
    for (let r = 0; r < this.GRID_SIZE; r++) {
      for (let c = 0; c < this.GRID_SIZE; c++) {
        if (this.grid[r][c] && typeof this.grid[r][c] === 'object' && this.grid[r][c].isBomb) {
          hasActiveBombs = true;
          break;
        }
      }
      if (hasActiveBombs) break;
    }

    for (let i = 0; i < 3; i++) {
      // If a bomb is ticking on board, guarantee at least 1 compact easy shape to assist defusal
      if (hasActiveBombs && i === 0) {
        this.tray[i] = window.ShapeFactory.getRandomShape('easy');
      } else {
        this.tray[i] = window.ShapeFactory.getRandomShape(this.difficulty);
      }
    }

    this.renderTray();
    this.checkGameOver();
  }

  /* Bot Duel Logic */
  startBotDuel() {
    this.botHP = 100;
    this.updateBotHPUI();

    this.botInterval = setInterval(() => {
      if (this.isGameOver || this.isPaused) return;
      if (Math.random() < 0.35) {
        this.receiveGarbageFromBot();
        this.setMascot('💥');
      }
    }, this.botIntervalMs || 2800);
  }

  stopBotDuel() {
    if (this.botInterval) {
      clearInterval(this.botInterval);
      this.botInterval = null;
    }
  }

  damageBot(amount) {
    if (this.mode !== 'duel') return;
    this.botHP = Math.max(0, this.botHP - amount);
    this.updateBotHPUI();

    if (this.botHP <= 0) {
      this.stopBotDuel();
      window.soundManager.playHighScoreFanfare();
      this.spawnConfetti();
      this.setMascot('🎉');
      const vicMsg = window.vkSDK ? window.vkSDK.t('botDuelVictory') : 'VICTORY!';
      this.showComboBanner(vicMsg, 3);
      this.addCoins(300);
      const ticketMsg = window.vkSDK ? window.vkSDK.t('ticketDuelVictory') : 'Victory!';
      this.grantScratchTicket(ticketMsg);
      this.setMode('classic');
    }
  }

  receiveGarbageFromBot() {
    const emptyCells = [];
    for (let r = 0; r < this.GRID_SIZE; r++) {
      for (let c = 0; c < this.GRID_SIZE; c++) {
        if (this.grid[r][c] === null) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length > 0) {
      const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.grid[cell.r][cell.c] = 4;
      this.triggerScreenShake();
    }
  }

  updateBotHPUI() {
    if (this.botHpFill) this.botHpFill.style.width = `${this.botHP}%`;
    if (this.botStatusTxt) {
      const hpPrefix = window.vkSDK ? window.vkSDK.t('botHp') : 'HP';
      this.botStatusTxt.textContent = `${hpPrefix} ${this.botHP}%`;
    }
  }

  startTimer() {
    this.stopTimer();
    this.updateTimerUI();
    this.timerInterval = setInterval(() => {
      if (this.isGameOver || this.isPaused) return;
      this.timeRemaining--;
      this.updateTimerUI();

      if (this.timeRemaining <= 0) {
        this.stopTimer();
        this.triggerGameOver();
      }
    }, 1000);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  updateTimerUI() {
    const mins = Math.floor(this.timeRemaining / 60);
    const secs = this.timeRemaining % 60;
    this.timerText.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const pct = Math.max(0, (this.timeRemaining / 120) * 100);
    this.timerBarFill.style.width = `${pct}%`;

    // Urgent warning when time <= 30s
    if (this.timeRemaining <= 30) {
      this.timerBarContainer.classList.add('warning');
    } else {
      this.timerBarContainer.classList.remove('warning');
    }
  }

  showTimerBonus(sec) {
    const badge = document.getElementById('timer-bonus-badge');
    if (badge) {
      badge.textContent = `+${sec}s ⏱️`;
      badge.classList.remove('hidden');
      clearTimeout(this._bonusTimer);
      this._bonusTimer = setTimeout(() => {
        badge.classList.add('hidden');
      }, 1500);
    }
    this.showComboBanner(`⏱️ +${sec}s BONUS!`, 2);
    if (window.soundManager && typeof window.soundManager.playLineClear === 'function') {
      window.soundManager.playLineClear();
    }
  }


  renderTray() {
    this.slotEls.forEach((slot, idx) => {
      slot.innerHTML = '';
      slot.style.opacity = '1';
      const shape = this.tray[idx];
      if (!shape) return;

      const canvas = this.createShapeCanvas(shape);
      slot.appendChild(canvas);

      // Attach event listeners directly to the SLOT element for 100% reliable 1-click selection!
      slot.onmousedown = (e) => this.startDrag(e, idx, false, false);
      slot.ontouchstart = (e) => this.startDrag(e, idx, false, true);
    });
  }

  renderHoldSlot() {
    this.holdSlotEl.innerHTML = '';
    this.holdSlotEl.style.opacity = '1';

    if (this.holdShape) {
      const canvas = this.createShapeCanvas(this.holdShape);
      this.holdSlotEl.appendChild(canvas);
      this.holdSlotEl.classList.add('active');

      this.holdSlotEl.onmousedown = (e) => this.startDrag(e, -1, true, false);
      this.holdSlotEl.ontouchstart = (e) => this.startDrag(e, -1, true, true);
    } else {
      this.holdSlotEl.classList.remove('active');
      this.holdSlotEl.innerHTML = `<span class="hold-hint">${window.vkSDK.t('holdEmpty')}</span>`;
      this.holdSlotEl.onmousedown = null;
      this.holdSlotEl.ontouchstart = null;
    }
  }

  createShapeCanvas(shape) {
    const canvas = document.createElement('canvas');
    const miniCell = Math.min(24, 80 / Math.max(shape.rows, shape.cols));
    const w = shape.cols * miniCell + 12;
    const h = shape.rows * miniCell + 12;

    canvas.width = w * (window.devicePixelRatio || 1);
    canvas.height = h * (window.devicePixelRatio || 1);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

    const colors = window.ShapeFactory.getActiveThemeColors();
    const color = shape.isRainbow ? { main: '#ff2a6d', glow: 'rgba(255, 42, 109, 1)', shadow: '#ffd166' } : (colors[shape.colorIdx] || colors[0]);

    for (let r = 0; r < shape.rows; r++) {
      for (let c = 0; c < shape.cols; c++) {
        if (shape.matrix[r][c]) {
          const x = 6 + c * miniCell;
          const y = 6 + r * miniCell;
          const size = miniCell - 3;

          // Ultra-bright glowing fill
          ctx.fillStyle = color.main;
          ctx.shadowColor = color.glow;
          ctx.shadowBlur = 12;
          this.drawRoundedRect(ctx, x, y, size, size, 5, true, false);

          // Bright white inner highlight
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          this.drawRoundedRect(ctx, x + 2, y + 2, size - 4, size / 2.5, 3, true, false);

          // Sharp bright white border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, size, size);
        }
      }
    }
    return canvas;
  }

  startDrag(e, slotIdx, isHold, isTouch) {
    if (this.isGameOver || this.isPaused || this.activeBooster) return;
    const shape = isHold ? this.holdShape : this.tray[slotIdx];
    if (!shape) return;

    if (e.cancelable) e.preventDefault();
    window.soundManager.playPickup();

    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    const touchOffsetY = isTouch ? 70 : 0;

    this.activeDrag = {
      shape,
      slotIdx,
      isHold,
      x: clientX,
      y: clientY - touchOffsetY,
      isTouch
    };

    if (isHold) {
      this.holdSlotEl.style.opacity = '0.3';
    } else {
      this.slotEls[slotIdx].style.opacity = '0.3';
    }
  }

  bindEvents() {
    if (this.eventsBound) return;
    this.eventsBound = true;

    // Platform § 1.6: Disable right-click / long-press context menu on game area
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    // Platform § 1.10.2: Prevent iOS swipe-to-refresh, rubber-band pull, and browser scroll
    document.addEventListener('touchmove', (e) => {
      const scrollable = e.target.closest('.modal-content, .leaderboard-list, .trophies-grid, .shop-themes-grid, .levels-grid, .quests-list, .daily-calendar-grid');
      if (!scrollable) {
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('gesturestart', (e) => {
      if (e.cancelable) e.preventDefault();
    });

    window.addEventListener('scroll', () => {
      window.scrollTo(0, 0);
    });

    // Pause game timers and bot when tab loses focus or is minimized (Platform § 1.3)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (!this.isPaused && !this.isGameOver) {
          this.wasPausedByVisibility = true;
          this.pauseGame(false);
        }
      } else {
        const isAdShowing = (window.vkSDK && window.vkSDK.isAdShowing);
        if (this.wasPausedByVisibility && !isAdShowing) {
          this.wasPausedByVisibility = false;
          if (!this.isAnyModalOpen() && !this.isGameOver) {
            this.resumeGame();
          }
        }
      }
    });

    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setMode(btn.dataset.mode));
    });

    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => this.setDifficulty(btn.dataset.diff));
    });

    const onMove = (e) => {
      if (!this.activeDrag) return;
      if (e.cancelable) e.preventDefault();

      const isTouch = this.activeDrag.isTouch;
      const clientX = isTouch ? e.touches[0].clientX : e.clientX;
      const clientY = isTouch ? e.touches[0].clientY : e.clientY;
      const touchOffsetY = isTouch ? 70 : 0;

      this.activeDrag.x = clientX;
      this.activeDrag.y = clientY - touchOffsetY;

      const holdRect = this.holdSlotEl.getBoundingClientRect();
      const isOverHold = (
        clientX >= holdRect.left - 20 &&
        clientX <= holdRect.right + 20 &&
        clientY >= holdRect.top - 20 &&
        clientY <= holdRect.bottom + 20
      );

      if (isOverHold && this.canHold && !this.activeDrag.isHold) {
        this.holdSlotEl.classList.add('active');
      } else if (!this.holdShape) {
        this.holdSlotEl.classList.remove('active');
      }

      const rect = this.canvas.getBoundingClientRect();
      const canvasX = this.activeDrag.x - rect.left;
      const canvasY = this.activeDrag.y - rect.top;
      this.spawnTrailParticle(canvasX, canvasY);
    };

    const onEnd = () => {
      if (!this.activeDrag) return;
      this.dropShape();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);

    document.getElementById('btn-quick-restart').addEventListener('click', () => {
      this.noMovesBanner.classList.add('hidden');
      window.vkSDK.showFullscreenAd({ onClose: () => this.startNewGame() });
    });

    this.btnUltimate.addEventListener('click', () => this.useUltimateAbility());

    document.getElementById('booster-undo').addEventListener('click', () => this.undoMove());
    document.getElementById('booster-hammer').addEventListener('click', () => this.useBooster('hammer'));
    document.getElementById('booster-bomb').addEventListener('click', () => this.useBooster('bomb'));
    document.getElementById('booster-shuffle').addEventListener('click', () => this.useBooster('shuffle'));

    document.getElementById('btn-trophies').addEventListener('click', () => this.openTrophies());
    document.getElementById('btn-close-trophies').addEventListener('click', () => this.closeModal(this.modalTrophies));

    document.getElementById('btn-daily-calendar').addEventListener('click', () => this.openDailyCalendar());
    document.getElementById('btn-close-daily').addEventListener('click', () => this.closeModal(this.modalDaily));
    document.getElementById('btn-claim-daily').addEventListener('click', () => this.claimDailyReward());
    document.getElementById('btn-close-scratch').addEventListener('click', () => this.closeModal(this.modalScratch));
    const btnScratch = document.getElementById('btn-scratch');
    if (btnScratch) btnScratch.addEventListener('click', () => this.openScratchCard());

    document.getElementById('btn-levels-modal').addEventListener('click', () => this.openLevelsModal());
    document.getElementById('btn-close-levels').addEventListener('click', () => this.closeModal(this.modalLevels));

    document.getElementById('btn-quests').addEventListener('click', () => this.openQuests());
    document.getElementById('btn-close-quests').addEventListener('click', () => this.closeModal(this.modalQuests));

    document.getElementById('btn-shop').addEventListener('click', () => this.openShop());
    document.getElementById('btn-close-shop').addEventListener('click', () => this.closeModal(this.modalShop));

    document.getElementById('btn-wheel').addEventListener('click', () => this.openWheel());
    document.getElementById('btn-close-wheel').addEventListener('click', () => this.closeModal(this.modalWheel));
    document.getElementById('btn-spin-wheel').addEventListener('click', () => this.spinWheel());

    document.getElementById('btn-sound').addEventListener('click', () => this.toggleSound());
    const btnSettingsSound = document.getElementById('btn-settings-sound-toggle');
    if (btnSettingsSound) btnSettingsSound.addEventListener('click', () => this.toggleSound());

    document.getElementById('btn-restart').addEventListener('click', () => {
      window.vkSDK.showFullscreenAd({ onClose: () => this.startNewGame() });
    });

    document.getElementById('btn-modal-restart').addEventListener('click', () => {
      this.modalGameOver.classList.add('hidden');
      window.vkSDK.showFullscreenAd({ onClose: () => this.startNewGame() });
    });

    document.getElementById('btn-revive').addEventListener('click', () => {
      window.vkSDK.showRewardedAd({ onRewarded: () => this.reviveGame() });
    });

    document.getElementById('btn-leaderboard').addEventListener('click', async () => {
      if (window.vkSDK && typeof window.vkSDK.showLeaderboardBox === 'function') {
        window.vkSDK.showLeaderboardBox(this.bestScore);
      }
      this.openModal(this.modalLeaderboard);
      const listEl = document.getElementById('leaderboard-list');
      listEl.innerHTML = `<div class="loading-spinner">${window.vkSDK.t('loading')}</div>`;
      
      const entries = await window.vkSDK.loadLeaderboards();
      listEl.innerHTML = entries.map(e => `
        <div class="lb-item top-${e.rank}">
          <span>#${e.rank} <strong>${e.name}</strong></span>
          <strong>${e.score}</strong>
        </div>
      `).join('');
    });

    document.getElementById('btn-close-lb').addEventListener('click', () => {
      this.closeModal(this.modalLeaderboard);
    });

    this.holdSlotEl.addEventListener('click', () => this.handleHoldSlotClick());

    // Settings & Pause Controls
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) btnSettings.addEventListener('click', () => this.openSettings());

    const btnPauseGame = document.getElementById('btn-pause-game');
    if (btnPauseGame) btnPauseGame.addEventListener('click', () => this.openSettings());

    const btnCloseSettings = document.getElementById('btn-close-settings');
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', () => this.resumeGame());

    const btnResumeGame = document.getElementById('btn-resume-game');
    if (btnResumeGame) btnResumeGame.addEventListener('click', () => this.resumeGame());

    const btnSettingsRestart = document.getElementById('btn-settings-restart');
    if (btnSettingsRestart) btnSettingsRestart.addEventListener('click', () => {
      if (this.screenMainMenu) this.screenMainMenu.classList.add('hidden');
      this.resumeGame();
      window.vkSDK.showFullscreenAd({ onClose: () => this.startNewGame() });
    });

    const btnPauseHome = document.getElementById('btn-pause-home');
    if (btnPauseHome) btnPauseHome.addEventListener('click', () => this.openMainMenu());

    // Main Menu Controls
    const btnMenuPlay = document.getElementById('btn-menu-play');
    if (btnMenuPlay) btnMenuPlay.addEventListener('click', () => {
      const chosenMode = this.selectedMenuMode || this.mode || 'classic';
      this.closeMainMenu();
      if (chosenMode === 'levels') {
        this.openLevelsModal();
        return;
      }
      if (this.mode !== chosenMode) {
        this.setMode(chosenMode);
      } else {
        this.resumeGame();
      }
    });

    const btnMenuSettings = document.getElementById('btn-menu-settings');
    if (btnMenuSettings) btnMenuSettings.addEventListener('click', () => {
      this.updateSettingsUI();
      if (this.modalSettings) this.modalSettings.classList.remove('hidden');
    });

    const btnMenuLb = document.getElementById('btn-menu-leaderboard');
    if (btnMenuLb) btnMenuLb.addEventListener('click', () => {
      const btnLb = document.getElementById('btn-leaderboard');
      if (btnLb) btnLb.click();
    });

    const btnMenuShop = document.getElementById('btn-menu-shop');
    if (btnMenuShop) btnMenuShop.addEventListener('click', () => this.openShop());

    const btnMenuRewards = document.getElementById('btn-menu-rewards');
    if (btnMenuRewards) btnMenuRewards.addEventListener('click', () => this.openDailyCalendar());

    const btnMenuQuests = document.getElementById('btn-menu-quests');
    if (btnMenuQuests) btnMenuQuests.addEventListener('click', () => this.openQuests());

    // Mode cards in Main Menu
    document.querySelectorAll('.menu-mode-card').forEach(card => {
      card.addEventListener('click', () => {
        const mode = card.dataset.mode;
        if (!mode) return;

        if (mode === 'levels') {
          // Open 500 Levels Map directly!
          this.openLevelsModal();
        } else {
          // Select mode in menu WITHOUT disrupting or resetting the background game!
          this.selectedMenuMode = mode;
          document.querySelectorAll('.menu-mode-card').forEach(c => {
            c.classList.toggle('active', c.dataset.mode === mode);
          });
        }
      });
    });

    // 500 Levels Map Navigation Listeners
    const btnPrevChapter = document.getElementById('btn-chapter-prev');
    if (btnPrevChapter) btnPrevChapter.addEventListener('click', () => {
      if (this.currentChapterId > 1) {
        this.currentChapterId--;
        this.renderLevelsMap();
      }
    });

    const btnNextChapter = document.getElementById('btn-chapter-next');
    if (btnNextChapter) btnNextChapter.addEventListener('click', () => {
      if (this.currentChapterId < window.ProceduralLevelGenerator.TOTAL_CHAPTERS) {
        this.currentChapterId++;
        this.renderLevelsMap();
      }
    });

    const btnJumpCurrent = document.getElementById('btn-jump-current-level');
    if (btnJumpCurrent) btnJumpCurrent.addEventListener('click', () => {
      this.currentChapterId = window.ProceduralLevelGenerator.getChapterForLevel(this.currentLevelNumber);
      this.selectedLevelNumber = this.currentLevelNumber;
      this.renderLevelsMap();
      this.onLevelCardClicked(this.currentLevelNumber);
    });

    const btnStartLevel = document.getElementById('btn-start-selected-level');
    if (btnStartLevel) btnStartLevel.addEventListener('click', () => {
      this.selectLevel(this.selectedLevelNumber || this.currentLevelNumber);
    });

    // Language switcher buttons in Settings
    ['ru', 'en', 'tr'].forEach(lang => {
      const langBtn = document.getElementById(`lang-btn-${lang}`);
      if (langBtn) {
        langBtn.addEventListener('click', () => {
          window.vkSDK.setLanguage(lang);
        });
      }
    });

    // Keyboard Pause (Escape or P)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (this.modalSettings && !this.modalSettings.classList.contains('hidden')) {
          this.resumeGame();
        } else if (!this.isGameOver) {
          this.openSettings();
        }
      }
    });
  }

  /* Main Menu Management */
  openMainMenu() {
    this.pauseGame();
    if (this.modalSettings) this.modalSettings.classList.add('hidden');
    if (this.modalGameOver) this.modalGameOver.classList.add('hidden');
    this.updateMainMenuUI();
    if (this.screenMainMenu) this.screenMainMenu.classList.remove('hidden');
  }

  closeMainMenu() {
    if (this.screenMainMenu) this.screenMainMenu.classList.add('hidden');
    this.resumeGame();
  }

  updateMainMenuUI() {
    const bestEl = document.getElementById('menu-best-score');
    if (bestEl) bestEl.textContent = this.bestScore;

    const coinsEl = document.getElementById('menu-coins-val');
    if (coinsEl) coinsEl.textContent = this.coins;

    document.querySelectorAll('.menu-mode-card').forEach(card => {
      card.classList.toggle('active', card.dataset.mode === this.mode);
    });
  }

  /* Modal & Pause Management */
  isAnyModalOpen() {
    const isVisible = (el) => !!(el && !el.classList.contains('hidden'));
    return (
      isVisible(this.screenMainMenu) ||
      isVisible(this.modalGameOver) ||
      isVisible(this.modalSettings) ||
      isVisible(this.modalShop) ||
      isVisible(this.modalWheel) ||
      isVisible(this.modalDaily) ||
      isVisible(this.modalQuests) ||
      isVisible(this.modalLevels) ||
      isVisible(this.modalScratch) ||
      isVisible(this.modalTrophies) ||
      isVisible(this.modalLeaderboard)
    );
  }

  openModal(modalEl) {
    if (!modalEl) return;
    const isMainMenuOpen = this.screenMainMenu && !this.screenMainMenu.classList.contains('hidden');
    if (!this.isGameOver && !isMainMenuOpen) {
      this.pauseGame(false);
    }
    modalEl.classList.remove('hidden');
  }

  closeModal(modalEl) {
    if (modalEl) modalEl.classList.add('hidden');
    const isMainMenuOpen = this.screenMainMenu && !this.screenMainMenu.classList.contains('hidden');
    if (!this.isAnyModalOpen() && !this.isGameOver && !isMainMenuOpen) {
      this.resumeGame();
    }
  }

  openSettings() {
    this.pauseGame(true);
  }

  pauseGame(showModal = false) {
    if (this.isGameOver) return;
    this.isPaused = true;
    this.updateSettingsUI();
    if (showModal && this.modalSettings) {
      this.modalSettings.classList.remove('hidden');
    }
    if (window.vkSDK && typeof window.vkSDK._notifyGameplay === 'function') {
      window.vkSDK._notifyGameplay(false);
    }
  }

  resumeGame() {
    if (this.modalSettings) this.modalSettings.classList.add('hidden');
    const isMainMenuOpen = this.screenMainMenu && !this.screenMainMenu.classList.contains('hidden');
    if (isMainMenuOpen || this.isGameOver || this.isAnyModalOpen()) {
      this.isPaused = true;
      return;
    }
    this.isPaused = false;
    if (this.mode === 'time' && !this.timerInterval && this.timeRemaining > 0) {
      this.startTimer();
    }
    if (this.mode === 'duel' && !this.botInterval && this.botHP > 0) {
      this.startBotDuel();
    }
    if (window.vkSDK && typeof window.vkSDK._notifyGameplay === 'function') {
      window.vkSDK._notifyGameplay(true);
    }
  }

  toggleSound() {
    if (window.soundManager) {
      window.soundManager.toggleMute();
      this.updateSoundUI();
    }
  }

  updateSoundUI() {
    const isMuted = window.soundManager ? window.soundManager.isMuted : false;
    const soundIcon = document.getElementById('sound-icon');
    if (soundIcon) soundIcon.textContent = isMuted ? '🔇' : '🔊';
    this.updateSettingsUI();
  }

  updateSettingsUI() {
    const curLang = (window.vkSDK ? window.vkSDK.lang : 'ru') || 'ru';
    ['ru', 'en', 'tr'].forEach(l => {
      const btn = document.getElementById(`lang-btn-${l}`);
      if (btn) btn.classList.toggle('active', l === curLang);
    });

    const statusEl = document.getElementById('settings-sound-status');
    if (statusEl && window.vkSDK) {
      const isMuted = window.soundManager ? window.soundManager.isMuted : false;
      const onTxt = window.vkSDK.t('soundOn');
      const offTxt = window.vkSDK.t('soundOff');
      statusEl.textContent = isMuted ? offTxt : onTxt;
    }
  }

  updateMascotRank() {
    this.updateRankUI();
  }

  updateBotHpUI() {
    this.updateBotHPUI();
  }

  onLanguageChanged() {
    this.updateRankUI();
    this.updateLevelGoalUI();
    if (this.mode === 'duel') this.updateBotHPUI();
    this.updateSettingsUI();
    this.updateMainMenuUI();

    if (this.modalGameOver && !this.modalGameOver.classList.contains('hidden')) {
      const goTitle = document.getElementById('go-title');
      if (goTitle && window.vkSDK) {
        if (this.mode === 'duel') {
          goTitle.textContent = (this.botHP <= 0)
            ? window.vkSDK.t('botDuelVictory')
            : window.vkSDK.t('botDuelDefeat');
        } else {
          goTitle.textContent = window.vkSDK.t('gameOver');
        }
      }
    }

    if (this.modalShop && !this.modalShop.classList.contains('hidden')) {
      const activeTab = document.getElementById('tab-backgrounds')?.classList.contains('active') ? 'backgrounds' : 'blocks';
      this.openShop(activeTab);
    }
    if (this.modalDaily && !this.modalDaily.classList.contains('hidden')) {
      this.openDailyCalendar();
    }
    if (this.modalQuests && !this.modalQuests.classList.contains('hidden')) {
      this.openQuests();
    }
    if (this.modalLevels && !this.modalLevels.classList.contains('hidden')) {
      this.openLevelsModal();
    }
    if (this.modalTrophies && !this.modalTrophies.classList.contains('hidden')) {
      this.openTrophies();
    }
  }

  /* Ultimate Ability (Радужная Молния) */
  useUltimateAbility() {
    if (this.ultimateEnergy < 100 || this.isGameOver) return;

    this.ultimateEnergy = 0;
    this.updateUltimateUI();

    // Clear Center Cross (Row 3, 4, Col 3, 4)
    for (let i = 3; i <= 4; i++) {
      this.spawnLaserBeam('h', i);
      this.spawnLaserBeam('v', i);
      for (let c = 0; c < this.GRID_SIZE; c++) {
        const cell = this.grid[i][c];
        if (cell && typeof cell === 'object' && cell.isBomb) {
          this.levelProgress.bombsDefused++;
          this.updateQuestProgress('bombs', 1);
        }
        this.grid[i][c] = null;
      }
      for (let r = 0; r < this.GRID_SIZE; r++) {
        const cell = this.grid[r][i];
        if (cell && typeof cell === 'object' && cell.isBomb) {
          this.levelProgress.bombsDefused++;
          this.updateQuestProgress('bombs', 1);
        }
        this.grid[r][i] = null;
      }
    }
    this.updateLevelGoalUI();
    if (this.mode === 'levels') this.checkLevelGoal();
    this.saveGameState();
    this.saveProgress();

    window.soundManager.playCombo(4);
    this.triggerScreenShake();
    this.spawnConfetti();
    this.setMascot('⚡');
    this.showComboBanner(3, 3);
  }

  updateUltimateUI() {
    this.ultimateFill.style.height = `${this.ultimateEnergy}%`;
    this.btnUltimate.classList.toggle('ready', this.ultimateEnergy >= 100);
  }

  addUltimateEnergy(pct) {
    this.ultimateEnergy = Math.min(100, this.ultimateEnergy + pct);
    this.updateUltimateUI();
  }

  /* Scratch Card Mini Game Engine - Ticket Check & Rewarded Ad Fallback */
  openScratchCard() {
    this.updateScratchTicketUI();

    // Если билетов нет - предлагаем получить билет за просмотр Rewarded видео!
    if (!this.scratchTickets || this.scratchTickets <= 0) {
      if (window.vkSDK) {
        window.vkSDK.showRewardedAd({
          onRewarded: () => {
            const reason = window.vkSDK ? window.vkSDK.t('ticketRewardWatchAd') : 'Reward for video!';
            this.grantScratchTicket(reason);
            this.openScratchCard();
          }
        });
      }
      return;
    }

    // Списываем 1 билет за вход в лотерею
    this.scratchTickets--;
    localStorage.setItem('blockblast_scratch_tickets', this.scratchTickets.toString());
    this.updateScratchTicketUI();

    this.openModal(this.modalScratch);
    const canvas = document.getElementById('scratch-canvas');
    const prizeTxtEl = document.getElementById('scratch-prize-txt');
    const claimBtn = document.getElementById('btn-claim-scratch');
    const hintEl = document.getElementById('scratch-hint-txt');
    if (!canvas || !prizeTxtEl) return;

    const ctx = canvas.getContext('2d');
    const width = 260;
    const height = 130;
    canvas.width = width;
    canvas.height = height;

    const lang = window.vkSDK ? window.vkSDK.lang : 'ru';
    const coinsWord = lang === 'tr' ? 'JETON' : (lang === 'en' ? 'COINS' : 'МОНЕТ');
    const hammerWord = lang === 'tr' ? 'ÇEKİÇ' : (lang === 'en' ? 'HAMMER' : 'МОЛОТ');
    const bombWord = lang === 'tr' ? 'BOMBA' : (lang === 'en' ? 'BOMB' : 'БОМБА');
    const undoWord = lang === 'tr' ? 'GERİ AL' : (lang === 'en' ? 'UNDO' : 'ОТМЕНА');
    const jackpotWord = lang === 'tr' ? 'BÜYÜK İKRAMİYE' : (lang === 'en' ? 'JACKPOT' : 'ДЖЕКПОТ');

    // 1. Random Prize Table with Weighted Probabilities
    const prizePool = [
      { type: 'coins', amount: 150, text: `🪙 +150 ${coinsWord}`, weight: 40 },
      { type: 'coins', amount: 300, text: `🪙 +300 ${coinsWord}`, weight: 30 },
      { type: 'booster', key: 'hammer', amount: 1, text: `🔨 ${hammerWord} x1`, weight: 12 },
      { type: 'booster', key: 'bomb', amount: 1, text: `💣 ${bombWord} x1`, weight: 10 },
      { type: 'booster', key: 'undo', amount: 2, text: `🔄 ${undoWord} x2`, weight: 5 },
      { type: 'coins', amount: 1000, text: `👑 ${jackpotWord} 1000🪙`, weight: 3 }
    ];

    // Select weighted prize
    const totalWeight = prizePool.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * totalWeight;
    let selectedPrize = prizePool[0];
    for (const p of prizePool) {
      if (rand < p.weight) {
        selectedPrize = p;
        break;
      }
      rand -= p.weight;
    }

    prizeTxtEl.textContent = selectedPrize.text;
    if (hintEl) hintEl.textContent = window.vkSDK ? window.vkSDK.t('scratchHint') : 'Scratch off silver layer!';
    if (claimBtn) claimBtn.classList.add('hidden');

    // 2. Draw Metallic Silver Protective Coating with Shimmer & Pattern
    ctx.globalCompositeOperation = 'source-over';
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#e0e0e0');
    grad.addColorStop(0.3, '#ffffff');
    grad.addColorStop(0.6, '#b0b5bc');
    grad.addColorStop(1, '#8f96a0');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Decorative sparkling coin pattern on foil
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    for (let x = 15; x < width; x += 30) {
      for (let y = 15; y < height; y += 30) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#2c3e50';
    ctx.textAlign = 'center';
    const canvasTxt = window.vkSDK ? window.vkSDK.t('scratchCanvasText') : '✨ Scratch off ✨';
    ctx.fillText(canvasTxt, width / 2, height / 2 + 5);

    let isScratching = false;
    let isRewardClaimed = false;

    // 3. Pixel Alpha Scan Function
    const checkScratchedPercentage = () => {
      if (isRewardClaimed) return;
      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const pixels = imgData.data;
        let transparentPixels = 0;
        const totalSampled = pixels.length / 4;

        // Sample every 4th pixel for high performance
        for (let i = 3; i < pixels.length; i += 16) {
          if (pixels[i] === 0) transparentPixels++;
        }

        const percent = (transparentPixels / (totalSampled / 4)) * 100;

        // Auto-reveal & Credit Reward when >= 40% is cleared
        if (percent >= 40) {
          isRewardClaimed = true;
          // Clear entire canvas with smooth animation
          ctx.clearRect(0, 0, width, height);
          this.awardScratchPrize(selectedPrize);
        }
      } catch (e) {
        console.warn('Scratch scan error:', e);
      }
    };

    const scratch = (e) => {
      if (!isScratching || isRewardClaimed) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = (clientX - rect.left) * (width / rect.width);
      const y = (clientY - rect.top) * (height / rect.height);

      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();

      // Play soft scratch sound or check percentage periodically
      checkScratchedPercentage();
    };

    const onRelease = () => { isScratching = false; if (!isRewardClaimed) checkScratchedPercentage(); };
    canvas.onmousedown = (e) => { isScratching = true; scratch(e); };
    canvas.onmousemove = scratch;
    canvas.onmouseup = onRelease;

    canvas.ontouchstart = (e) => { isScratching = true; scratch(e); };
    canvas.ontouchmove = scratch;
    canvas.ontouchend = onRelease;

    const modalContent = this.modalScratch ? this.modalScratch.querySelector('.modal-content') : null;
    if (modalContent) {
      modalContent.onmouseup = onRelease;
      modalContent.ontouchend = onRelease;
    }
  }

  /* Grant Scratch Prize & Trigger Celebration */
  /* Начисление скретч-билетов за реальные заслуги */
  grantScratchTicket(reasonText = '') {
    this.scratchTickets = (this.scratchTickets || 0) + 1;
    localStorage.setItem('blockblast_scratch_tickets', this.scratchTickets.toString());
    this.updateScratchTicketUI();
    
    // Эффектное уведомление на экране без блокирующего системного alert
    this.showComboBanner('🎟️ +1 TICKET!', 2);
    if (window.soundManager && typeof window.soundManager.playHighScoreFanfare === 'function') {
      window.soundManager.playHighScoreFanfare();
    }
    this.spawnConfetti();
  }

  updateScratchTicketUI() {
    const badge = document.getElementById('scratch-ticket-badge');
    if (badge) {
      badge.textContent = (this.scratchTickets || 0).toString();
      if (this.scratchTickets > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  awardScratchPrize(prize) {
    if (window.soundManager && typeof window.soundManager.playHighScoreFanfare === 'function') {
      window.soundManager.playHighScoreFanfare();
    }
    this.spawnConfetti();

    // Credit coins or boosters
    if (prize.type === 'coins') {
      this.addCoins(prize.amount);
    } else if (prize.type === 'booster') {
      if (this.boosters[prize.key] !== undefined) {
        const amt = parseInt(prize.amount, 10) || 1;
        this.boosters[prize.key] = (parseInt(this.boosters[prize.key], 10) || 0) + amt;
        localStorage.setItem(`blockblast_b_${prize.key}`, this.boosters[prize.key].toString());
        this.updateBoosterUI();
      }
    }
    this.saveProgress();

    const hintEl = document.getElementById('scratch-hint-txt');
    const claimBtn = document.getElementById('btn-claim-scratch');
    const msgTpl = window.vkSDK ? window.vkSDK.t('scratchCongrat') : '🎉 Reward: {prize}';
    if (hintEl) hintEl.innerHTML = msgTpl.replace('{prize}', `<span style="color:#ffd166">${prize.text}</span>`);
    if (claimBtn) {
      claimBtn.classList.remove('hidden');
      claimBtn.onclick = () => {
        this.closeModal(this.modalScratch);
        this.saveProgress();
      };
    }
  }

  /* Trophy Room */
  openTrophies() {
    this.openModal(this.modalTrophies);
    const gridEl = document.getElementById('trophies-grid');

    const trophies = [
      { id: 'combo', title: window.vkSDK ? window.vkSDK.t('trophyCombo') : 'Combo Master', icon: '💥', unlocked: this.streak >= 3 },
      { id: 'score', title: window.vkSDK ? window.vkSDK.t('trophyScore') : 'Score Lord', icon: '👑', unlocked: this.bestScore >= 5000 },
      { id: 'bombs', title: window.vkSDK ? window.vkSDK.t('trophyBombs') : 'Bomb Sweeper (5)', icon: '💣', unlocked: this.levelProgress.bombsDefused >= 5 },
      { id: 'duel', title: window.vkSDK ? window.vkSDK.t('trophyDuel') : 'Duel Champion', icon: '⚔️', unlocked: this.mode === 'duel' }
    ];

    const unlTxt = window.vkSDK ? window.vkSDK.t('trophyUnlocked') : '✓ Unlocked';
    const lckTxt = window.vkSDK ? window.vkSDK.t('trophyLocked') : '🔒 Locked';

    gridEl.innerHTML = trophies.map(t => `
      <div class="trophy-card ${t.unlocked ? 'unlocked' : ''}">
        <div class="trophy-icon">${t.icon}</div>
        <div class="trophy-title">${t.title}</div>
        <small style="font-size:0.65rem; color:${t.unlocked ? '#ffd166' : '#8d9bb0'}">${t.unlocked ? unlTxt : lckTxt}</small>
      </div>
    `).join('');
  }

  /* 7-Day Login Calendar */
  openDailyCalendar() {
    this.openModal(this.modalDaily);
    const gridEl = document.getElementById('daily-calendar-grid');

    const dayWord = window.vkSDK ? window.vkSDK.t('day') : 'Day';
    const claimedWord = window.vkSDK ? window.vkSDK.t('claimed') : '✓ Claimed';
    const availableWord = window.vkSDK ? window.vkSDK.t('available') : 'Available';

    const rewards = [
      { day: 1, reward: '🪙 50' },
      { day: 2, reward: '🔨 x1' },
      { day: 3, reward: '🪙 150' },
      { day: 4, reward: '💣 x1' },
      { day: 5, reward: '🪙 250' },
      { day: 6, reward: '🔄 x2' },
      { day: 7, reward: '🎁 1000🪙' }
    ];

    let currentDay = parseInt(localStorage.getItem('blockblast_daily_streak') || '1', 10);
    let claimedDay = parseInt(localStorage.getItem('blockblast_daily_claimed') || '0', 10);

    if (claimedDay >= 7 && currentDay === 1) {
      claimedDay = 0;
      localStorage.setItem('blockblast_daily_claimed', '0');
    }

    gridEl.innerHTML = rewards.map(r => {
      const isClaimed = r.day <= claimedDay;
      const isActive = r.day === currentDay && !isClaimed;

      return `
        <div class="daily-card ${isClaimed ? 'claimed' : ''} ${isActive ? 'active' : ''}">
          <div class="daily-day">${dayWord} ${r.day}</div>
          <div class="daily-reward">${r.reward}</div>
          <small style="font-size:0.6rem;">${isClaimed ? claimedWord : (isActive ? availableWord : '🔒')}</small>
        </div>
      `;
    }).join('');

    const today = new Date().toDateString();
    const lastClaimDate = localStorage.getItem('blockblast_last_daily_date');
    const alreadyClaimedToday = (lastClaimDate === today);
    const canClaim = !alreadyClaimedToday && (claimedDay < currentDay);

    const btnClaim = document.getElementById('btn-claim-daily');
    const btnClaimTxt = document.getElementById('btn-claim-daily-txt');
    if (btnClaim) {
      btnClaim.disabled = !canClaim;
      btnClaim.style.opacity = canClaim ? '1' : '0.5';
      btnClaim.style.cursor = canClaim ? 'pointer' : 'not-allowed';
      if (btnClaimTxt) {
        btnClaimTxt.textContent = canClaim
          ? (window.vkSDK ? window.vkSDK.t('calendarClaim') : '🎁 Claim Reward!')
          : claimedWord;
      }
    }
  }

  claimDailyReward() {
    const today = new Date().toDateString();
    const lastClaimDate = localStorage.getItem('blockblast_last_daily_date');
    if (lastClaimDate === today) {
      return;
    }

    let currentDay = parseInt(localStorage.getItem('blockblast_daily_streak') || '1', 10);
    let claimedDay = parseInt(localStorage.getItem('blockblast_daily_claimed') || '0', 10);

    if (claimedDay >= 7 && currentDay === 1) {
      claimedDay = 0;
      localStorage.setItem('blockblast_daily_claimed', '0');
    }

    if (claimedDay < currentDay) {
      localStorage.setItem('blockblast_last_daily_date', today);
      if (currentDay >= 7) {
        localStorage.setItem('blockblast_daily_streak', '1');
        localStorage.setItem('blockblast_daily_claimed', '0');
      } else {
        localStorage.setItem('blockblast_daily_claimed', currentDay.toString());
        localStorage.setItem('blockblast_daily_streak', (currentDay + 1).toString());
      }

      this.addCoins(150 + currentDay * 50);
      this.boosters.hammer++;
      this.updateBoosterUI();

      window.soundManager.playHighScoreFanfare();
      this.spawnConfetti();
      this.openDailyCalendar();
      this.saveProgress();
    }
  }

  openLevelsModal(targetChapterId) {
    this.currentChapterId = targetChapterId || window.ProceduralLevelGenerator.getChapterForLevel(this.currentLevelNumber);
    this.selectedLevelNumber = this.currentLevelNumber;
    this.openModal(this.modalLevels);
    this.renderLevelsMap();
    this.onLevelCardClicked(this.selectedLevelNumber);
  }

  renderLevelsMap() {
    const gridEl = document.getElementById('levels-grid');
    if (!gridEl) return;

    // Total stars across all 500 levels
    let totalStars = 0;
    for (let l = 1; l <= window.ProceduralLevelGenerator.TOTAL_LEVELS; l++) {
      totalStars += parseInt(localStorage.getItem(`level_stars_${l}`) || '0', 10);
    }
    const totalStarsEl = document.getElementById('total-stars-val');
    if (totalStarsEl) {
      totalStarsEl.textContent = `${totalStars} / 1500`;
    }

    // Chapter Info
    const ch = window.ProceduralLevelGenerator.getChapterInfo(this.currentChapterId);
    const chapterIconEl = document.getElementById('chapter-icon');
    if (chapterIconEl) chapterIconEl.textContent = ch.icon;

    const chapterTitleEl = document.getElementById('chapter-title-txt');
    const chWord = window.vkSDK ? window.vkSDK.t('chapter') : 'Глава';
    if (chapterTitleEl) {
      chapterTitleEl.textContent = `${chWord} ${ch.id}: ${ch.name}`;
    }

    let chStars = 0;
    for (let l = ch.startLevel; l <= ch.endLevel; l++) {
      chStars += parseInt(localStorage.getItem(`level_stars_${l}`) || '0', 10);
    }
    const chapterRangeEl = document.getElementById('chapter-range-txt');
    if (chapterRangeEl) {
      chapterRangeEl.textContent = `(${ch.startLevel}–${ch.endLevel}) • ⭐ ${chStars}/60`;
    }

    // Prev / Next button states
    const btnPrev = document.getElementById('btn-chapter-prev');
    if (btnPrev) btnPrev.style.opacity = (this.currentChapterId <= 1) ? '0.3' : '1';
    const btnNext = document.getElementById('btn-chapter-next');
    if (btnNext) btnNext.style.opacity = (this.currentChapterId >= window.ProceduralLevelGenerator.TOTAL_CHAPTERS) ? '0.3' : '1';

    // 20 Level Cards for this chapter
    let html = '';
    for (let lvl = ch.startLevel; lvl <= ch.endLevel; lvl++) {
      const config = window.ProceduralLevelGenerator.getLevelConfig(lvl);
      const isUnlocked = lvl <= this.maxUnlockedLevel;
      const isActive = lvl === this.currentLevelNumber;
      const isSelected = lvl === this.selectedLevelNumber;
      const isBoss = config.isBoss;

      let starsHtml = '';
      if (!isUnlocked) {
        starsHtml = '🔒';
      } else if (config.stars === 3) {
        starsHtml = '⭐⭐⭐';
      } else if (config.stars === 2) {
        starsHtml = '⭐⭐☆';
      } else if (config.stars === 1) {
        starsHtml = '⭐☆☆';
      } else {
        starsHtml = '☆☆☆';
      }

      const bossClass = isBoss ? 'boss-card' : '';
      const activeClass = isActive ? 'active' : '';
      const selectedClass = isSelected ? 'selected-card' : '';
      const lockedClass = !isUnlocked ? 'locked' : '';

      let goalShort = '';
      const t = (k, def) => (window.vkSDK ? window.vkSDK.t(k, def) : def);
      const bossWord = t('boss', 'БОСС');
      const linesWord = t('linesShort', 'лин.');
      if (isBoss) goalShort = `👑 ${bossWord}`;
      else if (config.targetScore) goalShort = `🎯 ${config.targetScore}`;
      else if (config.targetLines) goalShort = `💥 ${config.targetLines} ${linesWord}`;
      else if (config.targetBombs) goalShort = `💣 ${config.targetBombs}`;
      else if (config.targetStreak) goalShort = `🔥 x${config.targetStreak}`;

      html += `
        <div class="level-card ${lockedClass} ${activeClass} ${selectedClass} ${bossClass}" 
             data-level="${lvl}" onclick="window.game.onLevelCardClicked(${lvl})">
          <div class="level-num">${isBoss ? '👑 ' : ''}${lvl}</div>
          <div class="level-stars">${starsHtml}</div>
          <div class="level-goal-chip">${goalShort}</div>
        </div>
      `;
    }
    gridEl.innerHTML = html;
  }

  onLevelCardClicked(lvlNum) {
    const config = window.ProceduralLevelGenerator.getLevelConfig(lvlNum);
    const isUnlocked = lvlNum <= this.maxUnlockedLevel;

    if (!isUnlocked) {
      if (window.soundManager) window.soundManager.playGameOver();
      return;
    }

    this.selectedLevelNumber = lvlNum;
    if (window.soundManager) window.soundManager.playPickup();

    // Highlight card
    document.querySelectorAll('.level-card').forEach(card => {
      card.classList.toggle('selected-card', parseInt(card.dataset.level, 10) === lvlNum);
    });

    // Show briefing card
    const briefingCard = document.getElementById('level-briefing-card');
    if (!briefingCard) return;

    briefingCard.classList.remove('hidden');

    const t = (k, def) => (window.vkSDK ? window.vkSDK.t(k, def) : def);
    const bossTag = config.isBoss ? ` (👑 ${t('boss', 'БОСС')})` : '';
    const lvlTitleStr = t('lvlTitle', 'Уровень {lvl}').replace('{lvl}', lvlNum);
    const coinsWord = t('coins', 'монет');
    document.getElementById('briefing-lvl-title').textContent = `🌟 ${lvlTitleStr}${bossTag}`;
    document.getElementById('briefing-goal-txt').textContent = `🎯 ${config.desc}`;

    const movesWord = t('movesLimit', 'Ходы');
    document.getElementById('briefing-moves-txt').textContent = `👣 ${movesWord}: ${config.movesLimit || 25}`;
    document.getElementById('briefing-reward-txt').textContent = `🪙 +${config.rewardCoins} ${coinsWord}`;
  }

  selectLevel(levelNum) {
    if (levelNum <= this.maxUnlockedLevel) {
      this.currentLevelNumber = levelNum;
      this.selectedLevelNumber = levelNum;
      localStorage.setItem('blockblast_active_level_num', levelNum.toString());

      this.modalLevels.classList.add('hidden');
      if (this.screenMainMenu) this.screenMainMenu.classList.add('hidden');

      this.mode = 'levels';
      document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === 'levels');
      });
      document.querySelectorAll('.menu-mode-card').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === 'levels');
      });

      this.isPaused = false;
      this.startNewGame();
      if (window.soundManager) window.soundManager.playPlace();
    }
  }

  handleHoldSlotClick() {
    if (!this.canHold || this.isGameOver) return;

    if (this.holdShape && !this.activeDrag) {
      const emptyIdx = this.tray.findIndex(s => s === null);
      if (emptyIdx !== -1) {
        this.tray[emptyIdx] = this.holdShape;
        this.holdShape = null;
        this.renderTray();
        this.renderHoldSlot();
        window.soundManager.playPlace();
      }
    }
  }

  undoMove() {
    if (!this.previousGridState || this.boosters.undo <= 0 || this.isGameOver) return;

    this.boosters.undo--;
    this.grid = JSON.parse(JSON.stringify(this.previousGridState.grid));
    this.score = this.previousGridState.score;
    this.tray = JSON.parse(JSON.stringify(this.previousGridState.tray));
    this.holdShape = this.previousGridState.holdShape;
    if (this.previousGridState.movesRemaining !== undefined) {
      this.movesRemaining = this.previousGridState.movesRemaining;
    }
    if (this.previousGridState.levelProgress !== undefined) {
      this.levelProgress = JSON.parse(JSON.stringify(this.previousGridState.levelProgress));
    }
    this.previousGridState = null;

    this.updateScoreUI();
    this.updateBoosterUI();
    this.updateLevelGoalUI();
    this.renderTray();
    this.renderHoldSlot();
    this.saveGameState();
    this.saveProgress();
    window.soundManager.playPlace();
  }

  useBooster(type) {
    if (this.isGameOver) return;

    if (this.boosters[type] <= 0) {
      window.vkSDK.showRewardedAd({
        onRewarded: () => {
          this.boosters[type] += 2;
          this.updateBoosterUI();
          this.saveProgress();
        }
      });
      return;
    }

    if (type === 'shuffle') {
      this.boosters.shuffle--;
      this.updateBoosterUI();
      this.fillTray();
      window.soundManager.playPlace();
      this.setMascot('🔄');
    } else {
      this.activeBooster = (this.activeBooster === type) ? null : type;
      this.updateBoosterUI();
      if (this.activeBooster) this.setMascot('🔨');
    }
  }

  handleCanvasClick(e) {
    if (!this.activeBooster || this.isGameOver) return;

    const rect = this.canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const c = Math.floor((clickX - this.gridPadding) / this.cellSize);
    const r = Math.floor((clickY - this.gridPadding) / this.cellSize);

    if (r >= 0 && r < this.GRID_SIZE && c >= 0 && c < this.GRID_SIZE) {
      if (this.activeBooster === 'hammer') {
        this.boosters.hammer--;
        if (this.grid[r][c] && typeof this.grid[r][c] === 'object' && this.grid[r][c].isBomb) {
          this.levelProgress.bombsDefused++;
          this.updateQuestProgress('bombs', 1);
        }
        this.grid[r][c] = null;
        this.spawnShockwave(this.gridPadding + c * this.cellSize + 22, this.gridPadding + r * this.cellSize + 22);
      } else if (this.activeBooster === 'bomb') {
        this.boosters.bomb--;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.GRID_SIZE && nc >= 0 && nc < this.GRID_SIZE) {
              if (this.grid[nr][nc] && typeof this.grid[nr][nc] === 'object' && this.grid[nr][nc].isBomb) {
                this.levelProgress.bombsDefused++;
                this.updateQuestProgress('bombs', 1);
              }
              this.grid[nr][nc] = null;
              this.spawnShockwave(this.gridPadding + nc * this.cellSize + 22, this.gridPadding + nr * this.cellSize + 22);
            }
          }
        }
      }

      window.soundManager.playCombo(2);
      this.triggerScreenShake();
      this.setMascot('💥');
      this.activeBooster = null;
      this.updateBoosterUI();
      this.updateLevelGoalUI();
      this.checkAndClearLines();
      if (this.mode === 'levels') this.checkLevelGoal();
      this.saveGameState();
    }
  }

  updateBoosterUI() {
    document.getElementById('count-undo').textContent = this.boosters.undo;
    document.getElementById('count-hammer').textContent = this.boosters.hammer;
    document.getElementById('count-bomb').textContent = this.boosters.bomb;
    document.getElementById('count-shuffle').textContent = this.boosters.shuffle;

    document.getElementById('booster-hammer').classList.toggle('active', this.activeBooster === 'hammer');
    document.getElementById('booster-bomb').classList.toggle('active', this.activeBooster === 'bomb');

    localStorage.setItem('blockblast_b_undo', this.boosters.undo);
    localStorage.setItem('blockblast_b_hammer', this.boosters.hammer);
    localStorage.setItem('blockblast_b_bomb', this.boosters.bomb);
    localStorage.setItem('blockblast_b_shuffle', this.boosters.shuffle);
  }

  dropShape() {
    const drag = this.activeDrag;
    if (!drag) return;

    const holdRect = this.holdSlotEl.getBoundingClientRect();
    const isDroppedOnHold = (
      drag.x >= holdRect.left - 20 &&
      drag.x <= holdRect.right + 20 &&
      drag.y >= holdRect.top - 20 &&
      drag.y <= holdRect.bottom + 20
    );

    if (isDroppedOnHold && this.canHold && !drag.isHold) {
      const oldHold = this.holdShape;
      this.holdShape = drag.shape;
      this.tray[drag.slotIdx] = oldHold;
      this.canHold = false;

      window.soundManager.playPlace();
      this.renderHoldSlot();
      this.renderTray();
      this.activeDrag = null;
      this.saveGameState();
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const dropX = drag.x - rect.left;
    const dropY = drag.y - rect.top;

    const col = Math.round((dropX - this.gridPadding - (drag.shape.cols * this.cellSize) / 2) / this.cellSize);
    const row = Math.round((dropY - this.gridPadding - (drag.shape.rows * this.cellSize) / 2) / this.cellSize);

    if (window.ShapeFactory.canPlaceShape(this.grid, drag.shape.matrix, row, col)) {
      this.previousGridState = {
        grid: JSON.parse(JSON.stringify(this.grid)),
        score: this.score,
        tray: JSON.parse(JSON.stringify(this.tray)),
        holdShape: this.holdShape,
        movesRemaining: this.movesRemaining,
        levelProgress: JSON.parse(JSON.stringify(this.levelProgress))
      };

      if (navigator.vibrate) navigator.vibrate(30);

      const centerX = this.gridPadding + (col + drag.shape.cols / 2) * this.cellSize;
      const centerY = this.gridPadding + (row + drag.shape.rows / 2) * this.cellSize;
      this.spawnShockwave(centerX, centerY);

      if (drag.shape.isRainbow) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = row + dr, nc = col + dc;
            if (nr >= 0 && nr < this.GRID_SIZE && nc >= 0 && nc < this.GRID_SIZE) {
              this.grid[nr][nc] = null;
              this.createBurst(this.gridPadding + nc * this.cellSize + 22, this.gridPadding + nr * this.cellSize + 22);
            }
          }
        }
        window.soundManager.playCombo(3);
        this.triggerScreenShake();
      } else {
        this.placeShapeOnGrid(drag.shape, row, col);
      }

      if (drag.isHold) {
        this.holdShape = null;
        this.renderHoldSlot();
      } else {
        this.tray[drag.slotIdx] = null;
      }

      this.canHold = true;
      window.soundManager.playPlace();

      // 1. Clear lines first (defuses bombs on completed lines before timers tick)
      this.checkAndClearLines();

      // 2. Decrement timers of remaining surviving bombs
      const lvlConfig = (this.mode === 'levels') ? window.ProceduralLevelGenerator.getLevelConfig(this.currentLevelNumber) : null;
      if (this.mode === 'bomb' || (lvlConfig && (lvlConfig.mode === 'bomb' || lvlConfig.targetBombs))) {
        this.updateBombTimers();
      }

      if (this.mode === 'bomb' || (lvlConfig && (lvlConfig.mode === 'bomb' || lvlConfig.targetBombs))) {
        let activeBombs = 0;
        for (let r = 0; r < this.GRID_SIZE; r++) {
          for (let c = 0; c < this.GRID_SIZE; c++) {
            if (this.grid[r][c] && typeof this.grid[r][c] === 'object' && this.grid[r][c].isBomb) {
              activeBombs++;
            }
          }
        }

        const neededBombs = lvlConfig && lvlConfig.targetBombs ? (lvlConfig.targetBombs - this.levelProgress.bombsDefused) : 999;
        if (neededBombs > 0) {
          if (activeBombs === 0) {
            this.spawnBombCell();
          } else if (activeBombs < 2 && Math.random() < 0.4) {
            this.spawnBombCell();
          }
        }
      }

      if (this.mode === 'levels') {
        if (this.movesRemaining !== undefined) {
          this.movesRemaining--;
        }
        this.updateLevelGoalUI();
        this.checkLevelGoal();
      }

      if (this.tray.every(s => s === null)) {
        this.fillTray();
      } else {
        this.renderTray();
        this.checkGameOver();
      }

      this.saveGameState();
    } else {
      if (drag.isHold) {
        this.holdSlotEl.style.opacity = '1';
      } else {
        this.slotEls[drag.slotIdx].style.opacity = '1';
      }
    }

    this.activeDrag = null;
  }

  playShapeMove(slotIdx, startRow, startCol) {
    const shape = this.tray[slotIdx];
    if (!shape) return false;
    if (!window.ShapeFactory.canPlaceShape(this.grid, shape.matrix, startRow, startCol)) return false;

    this.previousGridState = {
      grid: JSON.parse(JSON.stringify(this.grid)),
      score: this.score,
      tray: JSON.parse(JSON.stringify(this.tray)),
      holdShape: this.holdShape,
      movesRemaining: this.movesRemaining,
      levelProgress: JSON.parse(JSON.stringify(this.levelProgress))
    };

    this.placeShapeOnGrid(shape, startRow, startCol);
    this.tray[slotIdx] = null;
    window.soundManager.playPlace();

    if (this.mode === 'levels') {
      if (this.movesRemaining !== undefined) this.movesRemaining--;
      this.updateLevelGoalUI();
    }

    this.checkAndClearLines();

    const lvlConfig = (this.mode === 'levels') ? window.ProceduralLevelGenerator.getLevelConfig(this.currentLevelNumber) : null;
    if (this.mode === 'bomb' || (lvlConfig && (lvlConfig.mode === 'bomb' || lvlConfig.targetBombs))) {
      this.updateBombTimers();
    }

    if (this.mode === 'bomb' || (lvlConfig && (lvlConfig.mode === 'bomb' || lvlConfig.targetBombs))) {
      let activeBombs = 0;
      for (let r = 0; r < this.GRID_SIZE; r++) {
        for (let c = 0; c < this.GRID_SIZE; c++) {
          if (this.grid[r][c] && typeof this.grid[r][c] === 'object' && this.grid[r][c].isBomb) {
            activeBombs++;
          }
        }
      }

      const neededBombs = lvlConfig && lvlConfig.targetBombs ? (lvlConfig.targetBombs - this.levelProgress.bombsDefused) : 999;
      if (neededBombs > 0) {
        if (activeBombs === 0) {
          this.spawnBombCell();
        } else if (activeBombs < 2 && Math.random() < 0.4) {
          this.spawnBombCell();
        }
      }
    }

    if (this.mode === 'levels') {
      this.checkLevelGoal();
    }

    if (this.tray.every(s => s === null)) {
      this.fillTray();
    } else {
      this.renderTray();
      this.checkGameOver();
    }
    this.saveGameState();
    return true;
  }

  placeShape(shape, startRow, startCol, slotIdx = 0) {
    if (shape && (!this.tray[slotIdx] || this.tray[slotIdx] !== shape)) {
      this.tray[slotIdx] = shape;
    }
    return this.playShapeMove(slotIdx, startRow, startCol);
  }

  placeShapeOnGrid(shape, startRow, startCol) {
    let placedBlocks = 0;
    for (let r = 0; r < shape.rows; r++) {
      for (let c = 0; c < shape.cols; c++) {
        if (shape.matrix[r][c]) {
          this.grid[startRow + r][startCol + c] = shape.colorIdx;
          placedBlocks++;
        }
      }
    }
    this.addScore(placedBlocks * 10, startRow, startCol);
  }

  spawnBombCell() {
    const emptyCells = [];
    for (let r = 0; r < this.GRID_SIZE; r++) {
      for (let c = 0; c < this.GRID_SIZE; c++) {
        if (this.grid[r][c] === null) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length > 0) {
      const cell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      // Увеличенный щадящий таймер для ранних уровней (15 ходов на ур. 3), чтобы игрок успевал подумать
      const initialTimer = this.currentLevelNumber === 3 ? 15 : Math.max(10, 16 - Math.floor(this.currentLevelNumber / 4));
      this.grid[cell.r][cell.c] = { isBomb: true, timer: initialTimer, colorIdx: 2 };
    }
  }

  updateBombTimers() {
    for (let r = 0; r < this.GRID_SIZE; r++) {
      for (let c = 0; c < this.GRID_SIZE; c++) {
        const cell = this.grid[r][c];
        if (cell && typeof cell === 'object' && cell.isBomb) {
          cell.timer--;
          if (cell.timer <= 0 && !this.isGameOver) {
            this.triggerGameOver();
          }
        }
      }
    }
  }

  checkAndClearLines() {
    const fullRows = [];
    const fullCols = [];

    for (let r = 0; r < this.GRID_SIZE; r++) {
      if (this.grid[r].every(cell => cell !== null)) fullRows.push(r);
    }
    for (let c = 0; c < this.GRID_SIZE; c++) {
      let isFull = true;
      for (let r = 0; r < this.GRID_SIZE; r++) {
        if (this.grid[r][c] === null) { isFull = false; break; }
      }
      if (isFull) fullCols.push(c);
    }

    const totalCleared = fullRows.length + fullCols.length;

    if (totalCleared > 0) {
      this.streak++;
      this.levelProgress.linesCleared += totalCleared;

      this.addUltimateEnergy(totalCleared * 10);

      if (navigator.vibrate) navigator.vibrate([40, 30, 60]);

      if (totalCleared >= 2 || this.streak >= 2) {
        this.triggerScreenShake();
        this.setMascot('😮');
        this.damageBot(totalCleared * 20);
      } else {
        this.setMascot('😎');
      }

      fullRows.forEach(r => this.spawnLaserBeam('h', r));
      fullCols.forEach(c => this.spawnLaserBeam('v', c));

      const comboBonus = totalCleared * 100 * (1 + (totalCleared - 1) * 0.5) * (1 + (this.streak - 1) * 0.3);
      const points = Math.round(comboBonus);
      this.addScore(points, fullRows[0] || 4, fullCols[0] || 4);

      this.updateQuestProgress('lines_5', totalCleared);
      this.updateQuestProgress('combo_2', this.streak);

      this.addCoins(totalCleared * 5);
      if (this.mode === 'time') {
        const bonusSec = totalCleared * 10;
        this.timeRemaining = Math.min(120, this.timeRemaining + bonusSec);
        this.showTimerBonus(bonusSec);
        this.updateTimerUI();
      }

      fullRows.forEach(r => this.spawnRowParticles(r));
      fullCols.forEach(c => this.spawnColParticles(c));

      const defusedBombs = [];
      const cellsToClear = new Set();

      fullRows.forEach(r => {
        for (let c = 0; c < this.GRID_SIZE; c++) {
          cellsToClear.add(`${r},${c}`);
        }
      });

      fullCols.forEach(c => {
        for (let r = 0; r < this.GRID_SIZE; r++) {
          cellsToClear.add(`${r},${c}`);
        }
      });

      cellsToClear.forEach(coord => {
        const [rStr, cStr] = coord.split(',');
        const r = parseInt(rStr, 10);
        const c = parseInt(cStr, 10);
        const cell = this.grid[r][c];

        if (cell && typeof cell === 'object') {
          if (cell.isBomb) {
            defusedBombs.push({ r, c });
            this.levelProgress.bombsDefused++;
            this.updateQuestProgress('bombs', 1);
            this.addScore(150, r, c);
          }
          if (cell.type === 'ice' && cell.hp > 1) {
            cell.hp--;
          } else {
            if (cell.type === 'diamond') this.addCoins(50);
            this.grid[r][c] = null;
          }
        } else {
          this.grid[r][c] = null;
        }
      });

      if (defusedBombs.length > 0) {
        this.setMascot('🛡️');
        window.soundManager.playCombo(2);
        this.updateLevelGoalUI();
      }

      if (totalCleared >= 3) {
        window.soundManager.playHighScoreFanfare();
        this.showMegaBlastBanner();
      } else if (totalCleared === 2 || this.streak >= 2) {
        window.soundManager.playCombo(totalCleared);
        this.showComboBanner(totalCleared, this.streak);
      } else {
        window.soundManager.playClearLine(this.streak);
      }
    } else {
      this.streak = 0;
    }

    this.updateComboTag();
  }

  showMegaBlastBanner() {
    this.comboBanner.textContent = '💥 MEGA BLAST! 💥';
    this.comboBanner.classList.add('show');

    this.spawnConfetti();
    setTimeout(() => {
      this.comboBanner.classList.remove('show');
    }, 1500);
  }

  checkLevelGoal() {
    if (this.isLevelCompleted) return;
    const lvlConfig = window.ProceduralLevelGenerator.getLevelConfig(this.currentLevelNumber);
    if (!lvlConfig) return;

    let isPassed = false;
    if (lvlConfig.isBoss) {
      if (this.score >= (lvlConfig.targetScore || 0) && this.levelProgress.linesCleared >= (lvlConfig.targetLines || 0)) {
        isPassed = true;
      }
    } else {
      if (lvlConfig.targetScore && this.score >= lvlConfig.targetScore) isPassed = true;
      if (lvlConfig.targetLines && this.levelProgress.linesCleared >= lvlConfig.targetLines) isPassed = true;
      if (lvlConfig.targetBombs && this.levelProgress.bombsDefused >= lvlConfig.targetBombs) isPassed = true;
      if (lvlConfig.targetStreak && this.streak >= lvlConfig.targetStreak) isPassed = true;
    }

    if (isPassed) {
      this.isLevelCompleted = true;
      window.soundManager.playHighScoreFanfare();
      this.spawnConfetti();
      this.setMascot('🎉');
      this.showComboBanner(3, 3);

      this.addCoins(lvlConfig.rewardCoins);

      // Calculate 1 to 3 stars based on performance
      let stars = 2;
      if (lvlConfig.targetScore && this.score >= lvlConfig.targetScore * 1.25) stars = 3;
      else if (lvlConfig.targetLines && this.levelProgress.linesCleared >= lvlConfig.targetLines + 2) stars = 3;
      else if (lvlConfig.targetStreak && this.streak >= lvlConfig.targetStreak + 1) stars = 3;
      else if (lvlConfig.isBoss) stars = 3;

      const currentStoredStars = parseInt(localStorage.getItem(`level_stars_${this.currentLevelNumber}`) || '0', 10);
      if (stars > currentStoredStars) {
        localStorage.setItem(`level_stars_${this.currentLevelNumber}`, stars.toString());
      }

      if (this.currentLevelNumber >= this.maxUnlockedLevel && this.maxUnlockedLevel < window.ProceduralLevelGenerator.TOTAL_LEVELS) {
        this.maxUnlockedLevel = Math.min(window.ProceduralLevelGenerator.TOTAL_LEVELS, this.currentLevelNumber + 1);
        localStorage.setItem('blockblast_max_unlocked_level', this.maxUnlockedLevel.toString());
      }

      if (window.vkSDK && typeof window.vkSDK.saveCloudData === 'function') {
        window.vkSDK.saveCloudData();
      }

      setTimeout(() => {
        if (this.currentLevelNumber % 5 === 0) {
          const milestoneMsg = window.vkSDK ? window.vkSDK.t('ticketLevelPassed').replace('{lvl}', this.currentLevelNumber) : 'Level passed!';
          this.grantScratchTicket(milestoneMsg);
          if (window.vkSDK && typeof window.vkSDK.promptReviewAtLevel === 'function') {
            window.vkSDK.promptReviewAtLevel(this.currentLevelNumber);
          }
        }
        this.openLevelsModal();
      }, 1500);
    }
  }

  updateComboTag() {
    if (this.streak >= 2) {
      this.comboTag.textContent = `COMBO x${this.streak} 🔥`;
      this.comboTag.classList.remove('hidden');
    } else {
      this.comboTag.classList.add('hidden');
    }
  }

  triggerScreenShake() {
    this.canvas.classList.remove('shake');
    void this.canvas.offsetWidth;
    this.canvas.classList.add('shake');
  }

  showComboBanner(linesOrText, streak) {
    let txt = '';
    if (typeof linesOrText === 'string') {
      txt = linesOrText;
    } else if (linesOrText >= 3) {
      txt = `${window.vkSDK.t('superClear')} +${linesOrText * 250}`;
    } else if (linesOrText === 2) {
      txt = `DOUBLE BLAST! +300`;
    } else if (streak >= 2) {
      txt = `${window.vkSDK.t('streak')} ${streak}!`;
    } else {
      txt = `${window.vkSDK.t('streak')} 1!`;
    }

    this.comboBanner.textContent = txt;
    this.comboBanner.classList.add('show');

    setTimeout(() => {
      this.comboBanner.classList.remove('show');
    }, 1200);
  }

  checkGameOver() {
    if (this.mode === 'levels' && !this.isLevelCompleted) {
      if (this.movesRemaining !== undefined && this.movesRemaining <= 0) {
        this.triggerGameOver();
        return;
      }
    }

    let canFitAny = false;

    this.slotEls.forEach((slot, i) => {
      const shape = this.tray[i];
      if (shape) {
        const canFit = window.ShapeFactory.canPlaceAnywhere(this.grid, shape.matrix);
        if (canFit) {
          canFitAny = true;
        }
      }
    });

    if (!canFitAny && this.holdShape && window.ShapeFactory.canPlaceAnywhere(this.grid, this.holdShape.matrix)) {
      canFitAny = true;
    }

    if (!canFitAny && !this.isGameOver) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.stopBotDuel();
    this.stopTimer();

    if (window.vkSDK && typeof window.vkSDK._notifyGameplay === 'function') {
      window.vkSDK._notifyGameplay(false);
    }

    const goTitle = document.getElementById('go-title');
    if (this.mode === 'duel') {
      if (goTitle) goTitle.textContent = window.vkSDK ? window.vkSDK.t('botDuelDefeat') : 'AI BOT WON! 🤖';
    } else {
      if (goTitle) goTitle.textContent = window.vkSDK ? window.vkSDK.t('gameOver') : 'GAME OVER';
    }

    this.setMascot('😱', 0);
    this.noMovesBanner.classList.remove('hidden');
    window.soundManager.playGameOver();

    setTimeout(() => {
      this.showGameOverModal();
    }, 1400);
  }

  showGameOverModal() {
    this.noMovesBanner.classList.add('hidden');
    if (this.finalScoreEl) this.finalScoreEl.textContent = this.score;
    if (this.finalBestEl) this.finalBestEl.textContent = this.bestScore;

    const btnRevive = document.getElementById('btn-revive');
    if (btnRevive) btnRevive.style.display = this.reviveUsed ? 'none' : 'flex';

    this.modalGameOver.classList.remove('hidden');

    if (window.vkSDK && typeof window.vkSDK.saveCloudData === 'function') {
      window.vkSDK.saveCloudData();
    }
  }

  reviveGame() {
    this.reviveUsed = true;
    this.isGameOver = false;
    this.isPaused = false;
    this.isLevelCompleted = false;

    // Clear occupied lines / rows based on reviveClearLines or default 3 lines
    const targetLines = this.reviveClearLines || 3;
    const rowCounts = [];
    for (let r = 0; r < this.GRID_SIZE; r++) {
      let count = 0;
      for (let c = 0; c < this.GRID_SIZE; c++) {
        if (this.grid[r][c] !== null) count++;
      }
      if (count > 0) rowCounts.push({ r, count });
    }
    rowCounts.sort((a, b) => b.count - a.count);

    for (let i = 0; i < Math.min(targetLines, rowCounts.length); i++) {
      const rowIdx = rowCounts[i].r;
      for (let c = 0; c < this.GRID_SIZE; c++) {
        if (this.grid[rowIdx][c] && typeof this.grid[rowIdx][c] === 'object' && this.grid[rowIdx][c].isBomb) {
          this.levelProgress.bombsDefused = (this.levelProgress.bombsDefused || 0) + 1;
        }
        this.grid[rowIdx][c] = null;
      }
    }

    // Additional clearance if still overcrowded (> 40% full)
    let remainingBlocks = 0;
    for (let r = 0; r < this.GRID_SIZE; r++) {
      for (let c = 0; c < this.GRID_SIZE; c++) {
        if (this.grid[r][c] !== null) remainingBlocks++;
      }
    }
    if (remainingBlocks > (this.GRID_SIZE * this.GRID_SIZE * 0.4)) {
      for (let r = 0; r < this.GRID_SIZE; r++) {
        for (let c = 0; c < this.GRID_SIZE; c++) {
          if (this.grid[r][c] !== null && Math.random() < 0.35) {
            if (this.grid[r][c] && typeof this.grid[r][c] === 'object' && this.grid[r][c].isBomb) {
              this.levelProgress.bombsDefused = (this.levelProgress.bombsDefused || 0) + 1;
            }
            this.grid[r][c] = null;
          }
        }
      }
    }

    // Safe bomb timers on remaining bombs so player doesn't instantly die next turn
    for (let r = 0; r < this.GRID_SIZE; r++) {
      for (let c = 0; c < this.GRID_SIZE; c++) {
        const cell = this.grid[r][c];
        if (cell && typeof cell === 'object' && cell.isBomb) {
          cell.timer = Math.max(cell.timer || 0, 6);
        }
      }
    }

    this.slotEls.forEach(s => s.classList.remove('disabled'));
    this.noMovesBanner.classList.add('hidden');
    this.modalGameOver.classList.add('hidden');
    this.setMascot('🤖');

    if (this.mode === 'time') {
      this.timeRemaining = Math.max(60, this.timeRemaining + 60);
      this.startTimer();
    } else if (this.mode === 'levels') {
      this.movesRemaining = Math.max(5, (this.movesRemaining || 0) + 5);
      this.updateLevelGoalUI();
    } else if (this.mode === 'duel') {
      this.botHP = Math.max(40, this.botHP);
      this.updateBotHPUI();
      this.startBotDuel();
    }

    if (window.vkSDK && typeof window.vkSDK._notifyGameplay === 'function') {
      window.vkSDK._notifyGameplay(true);
    }

    this.fillTray();
    this.saveGameState();
  }

  addScore(pts, row = 4, col = 4) {
    const validPts = parseInt(pts, 10);
    if (isNaN(validPts) || validPts <= 0) return;
    const isNewRecord = (this.score + validPts > this.bestScore && this.bestScore > 0);
    this.score += validPts;

    this.updateQuestProgress('score_500', this.score);

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      window.vkSDK.saveBestScore(this.bestScore);
      this.updateRankUI();

      if (isNewRecord && !this.hasPlayedRecordFanfare) {
        this.hasPlayedRecordFanfare = true;
        window.soundManager.playHighScoreFanfare();
        this.spawnConfetti();
        this.setMascot('🎉');
      }
    }
    this.updateScoreUI();
    this.updateLevelGoalUI();

    const px = this.gridPadding + col * this.cellSize + this.cellSize / 2;
    const py = this.gridPadding + row * this.cellSize + this.cellSize / 2;
    this.popups.push({ text: `+${validPts}`, x: px, y: py, life: 1.0 });
  }

  saveProgress() {
    if (window.vkSDK && typeof window.vkSDK.saveCloudData === 'function') {
      window.vkSDK.saveCloudData();
    }
  }

  addCoins(amount) {
    const val = parseInt(amount, 10);
    if (isNaN(val) || val <= 0) return;
    this.coins = Math.max(0, (parseInt(this.coins, 10) || 0) + val);
    this.updateCoinsUI();
    this.saveProgress();
  }

  updateScoreUI() {
    if (isNaN(this.score) || this.score < 0) this.score = 0;
    if (isNaN(this.bestScore) || this.bestScore < 0) this.bestScore = 0;
    if (this.scoreEl) this.scoreEl.textContent = this.score;
    if (this.bestScoreEl) this.bestScoreEl.textContent = this.bestScore;
    const menuBest = document.getElementById('menu-best-score');
    if (menuBest) menuBest.textContent = this.bestScore;
  }

  updateCoinsUI() {
    if (isNaN(this.coins) || this.coins < 0) this.coins = 0;
    if (this.coinsEl) this.coinsEl.textContent = this.coins;
    localStorage.setItem('blockblast_coins', this.coins.toString());
    const menuCoins = document.getElementById('menu-coins-val');
    if (menuCoins) menuCoins.textContent = this.coins;
  }

  /* Quests System */
  openQuests() {
    this.openModal(this.modalQuests);
    const listEl = document.getElementById('quests-list');

    const getQTitle = (id) => {
      if (id === 'lines_5') return window.vkSDK ? window.vkSDK.t('questLines') : 'Clear 5 lines';
      if (id === 'score_500') return window.vkSDK ? window.vkSDK.t('questScore') : 'Score 500 points';
      if (id === 'combo_2') return window.vkSDK ? window.vkSDK.t('questCombo') : 'Reach Combo x2';
      return id;
    };

    const rewardLabel = window.vkSDK ? window.vkSDK.t('rewardLabel') : 'Reward:';
    const inProgTxt = window.vkSDK ? window.vkSDK.t('questInProgress') : 'In Progress';
    const claimTxt = window.vkSDK ? window.vkSDK.t('questClaim') : 'Claim';
    const claimedTxt = window.vkSDK ? window.vkSDK.t('questClaimed') : 'Claimed';

    listEl.innerHTML = this.quests.map(q => {
      const isDone = q.current >= q.target;
      const btnTxt = q.claimed ? claimedTxt : (isDone ? claimTxt : inProgTxt);
      return `
        <div class="quest-item">
          <div class="quest-info">
            <span class="quest-title">${getQTitle(q.id)} (${q.current}/${q.target})</span>
            <span class="quest-reward">${rewardLabel} ${q.reward}</span>
          </div>
          <button class="quest-btn ${q.claimed ? 'completed' : ''}" onclick="window.game.claimQuest('${q.id}')">
            ${btnTxt}
          </button>
        </div>
      `;
    }).join('');
  }

  updateQuestProgress(id, inc) {
    const q = this.quests.find(x => x.id === id);
    if (q && !q.claimed) {
      q.current = Math.min(q.target, q.current + inc);
      this.saveQuestsState();
    }
  }

  claimQuest(id) {
    const q = this.quests.find(x => x.id === id);
    if (q && q.current >= q.target && !q.claimed) {
      q.claimed = true;
      if (id === 'lines_5') this.addCoins(100);
      if (id === 'score_500') this.boosters.hammer++;
      if (id === 'combo_2') this.boosters.bomb++;

      this.updateBoosterUI();
      this.saveQuestsState();
      this.openQuests();
    }
  }

  saveQuestsState() {
    localStorage.setItem('blockblast_quests_state', JSON.stringify(this.quests));
  }

  loadQuestsState() {
    try {
      const saved = localStorage.getItem('blockblast_quests_state');
      if (saved) this.quests = JSON.parse(saved);
    } catch (e) {}
  }

  /* Themes & Backgrounds Shop */
  openShop(activeTab = 'blocks') {
    this.openModal(this.modalShop);
    const gridEl = document.getElementById('shop-themes-grid');
    const tabBlocks = document.getElementById('tab-blocks');
    const tabBgs = document.getElementById('tab-backgrounds');

    if (tabBlocks && tabBgs) {
      tabBlocks.classList.toggle('active', activeTab === 'blocks');
      tabBgs.classList.toggle('active', activeTab === 'backgrounds');

      tabBlocks.onclick = () => this.openShop('blocks');
      tabBgs.onclick = () => this.openShop('backgrounds');
    }

    const activeTxt = window.vkSDK ? window.vkSDK.t('shopActive') : '✓ Active';
    const selectTxt = window.vkSDK ? window.vkSDK.t('shopSelect') : 'Select';

    if (activeTab === 'blocks') {
      const currentTheme = localStorage.getItem('blockblast_active_theme') || 'cyber';
      gridEl.innerHTML = Object.values(window.THEMES).map(t => {
        const isCurrent = currentTheme === t.id;
        const isUnlocked = t.price === 0 || localStorage.getItem(`theme_unlocked_${t.id}`) === 'true';
        const tName = window.vkSDK ? window.vkSDK.t('theme_' + t.id) : t.name;

        return `
          <div class="theme-card ${isCurrent ? 'active' : ''}" onclick="window.game.selectTheme('${t.id}')">
            <div class="theme-name">${tName}</div>
            <div class="theme-preview">
              ${t.colors.slice(0, 4).map(c => `<div class="theme-color-dot" style="background:${c.main}"></div>`).join('')}
            </div>
            ${isUnlocked 
              ? `<span style="font-size:0.75rem; color:#00f2ff">${isCurrent ? activeTxt : selectTxt}</span>` 
              : `<button class="theme-buy-btn">🪙 ${t.price}</button>`}
          </div>
        `;
      }).join('');
    } else {
      const currentBg = localStorage.getItem('blockblast_active_bg') || 'space';
      gridEl.innerHTML = Object.values(window.BACKGROUNDS).map(bg => {
        const isCurrent = currentBg === bg.id;
        const isUnlocked = bg.price === 0 || localStorage.getItem(`bg_unlocked_${bg.id}`) === 'true';
        const bgName = window.vkSDK ? window.vkSDK.t('bg_' + bg.id) : bg.name;

        return `
          <div class="theme-card ${isCurrent ? 'active' : ''}" onclick="window.game.selectBackground('${bg.id}')">
            <div class="theme-name">${bgName}</div>
            <div class="theme-preview">
              <div class="theme-color-dot" style="background:${bg.particleColor}"></div>
            </div>
            ${isUnlocked 
              ? `<span style="font-size:0.75rem; color:#00f2ff">${isCurrent ? activeTxt : selectTxt}</span>` 
              : `<button class="theme-buy-btn">🪙 ${bg.price}</button>`}
          </div>
        `;
      }).join('');
    }
  }

  selectTheme(themeId) {
    const theme = window.THEMES[themeId];
    if (!theme) return;

    const isUnlocked = theme.price === 0 || localStorage.getItem(`theme_unlocked_${themeId}`) === 'true';

    if (isUnlocked) {
      window.ShapeFactory.setActiveTheme(themeId);
      this.openShop('blocks');
      this.renderTray();
      this.renderHoldSlot();
      this.saveProgress();
    } else if (this.coins >= theme.price) {
      this.coins -= theme.price;
      this.updateCoinsUI();
      localStorage.setItem(`theme_unlocked_${themeId}`, 'true');
      window.ShapeFactory.setActiveTheme(themeId);
      this.openShop('blocks');
      this.renderTray();
      this.renderHoldSlot();
      this.saveProgress();
    } else {
      window.vkSDK.showRewardedAd({
        onRewarded: () => {
          this.addCoins(100);
          this.openShop('blocks');
        }
      });
    }
  }

  selectBackground(bgId) {
    const bg = window.BACKGROUNDS[bgId];
    if (!bg) return;

    const isUnlocked = bg.price === 0 || localStorage.getItem(`bg_unlocked_${bgId}`) === 'true';

    if (isUnlocked) {
      window.ShapeFactory.setActiveBackground(bgId);
      this.openShop('backgrounds');
      this.saveProgress();
    } else if (this.coins >= bg.price) {
      this.coins -= bg.price;
      this.updateCoinsUI();
      localStorage.setItem(`bg_unlocked_${bgId}`, 'true');
      window.ShapeFactory.setActiveBackground(bgId);
      this.openShop('backgrounds');
      this.saveProgress();
    } else {
      window.vkSDK.showRewardedAd({
        onRewarded: () => {
          this.addCoins(100);
          this.openShop('backgrounds');
        }
      });
    }
  }

  /* Lucky Wheel */
  openWheel() {
    this.openModal(this.modalWheel);
    this.drawWheel();
  }

  drawWheel() {
    const canvas = document.getElementById('wheel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const slices = ['🪙 100', '🔨 x2', '🪙 250', '💣 x2', '🪙 500', '🔄 x3'];
    const colors = ['#00f2ff', '#9d4edd', '#ff2a6d', '#ffd166', '#06d6a0', '#ff70a6'];
    const sliceAngle = (Math.PI * 2) / slices.length;

    ctx.clearRect(0, 0, 260, 260);
    ctx.font = 'bold 14px "Segoe UI", sans-serif';

    slices.forEach((slice, i) => {
      const angle = i * sliceAngle;
      ctx.beginPath();
      ctx.fillStyle = colors[i];
      ctx.moveTo(130, 130);
      ctx.arc(130, 130, 120, angle, angle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.translate(130, 130);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#000';
      ctx.fillText(slice, 105, 5);
      ctx.restore();
    });
  }

  updateWheelUI() {
    const today = new Date().toDateString();
    const lastSpinDay = localStorage.getItem('blockblast_last_wheel_spin');
    const isFree = lastSpinDay !== today;
    const spinTxtEl = document.getElementById('btn-spin-txt');
    if (spinTxtEl && window.vkSDK) {
      spinTxtEl.textContent = isFree ? window.vkSDK.t('spinFree') : window.vkSDK.t('spinAd');
    }
  }

  spinWheel() {
    if (this.isSpinning) return;

    const today = new Date().toDateString();
    const lastSpinDay = localStorage.getItem('blockblast_last_wheel_spin');
    const isFree = lastSpinDay !== today;

    if (isFree) {
      localStorage.setItem('blockblast_last_wheel_spin', today);
      this.executeWheelSpin();
    } else {
      window.vkSDK.showRewardedAd({
        onRewarded: () => {
          this.executeWheelSpin();
        }
      });
    }
  }

  executeWheelSpin() {
    this.isSpinning = true;
    const canvas = document.getElementById('wheel-canvas');
    this.wheelRotation = (this.wheelRotation || 0) + 1440 + Math.floor(Math.random() * 360);
    canvas.style.transform = `rotate(${this.wheelRotation}deg)`;

    const slices = [
      { coins: 100, hammer: 0, bomb: 0, undo: 0 },
      { coins: 0, hammer: 2, bomb: 0, undo: 0 },
      { coins: 250, hammer: 0, bomb: 0, undo: 0 },
      { coins: 0, hammer: 0, bomb: 2, undo: 0 },
      { coins: 500, hammer: 0, bomb: 0, undo: 0 },
      { coins: 0, hammer: 0, bomb: 0, undo: 3 }
    ];

    setTimeout(() => {
      this.isSpinning = false;
      const prize = slices[Math.floor(Math.random() * slices.length)];
      if (prize.coins) this.addCoins(prize.coins);
      if (prize.hammer) this.boosters.hammer += prize.hammer;
      if (prize.bomb) this.boosters.bomb += prize.bomb;
      if (prize.undo) this.boosters.undo += prize.undo;
      this.updateBoosterUI();
      window.soundManager.playHighScoreFanfare();
      this.spawnConfetti();
      this.updateWheelUI();
      this.modalWheel.classList.add('hidden');
      this.saveProgress();
    }, 4000);
  }

  /* Auto-Save & Load State */
  saveGameState() {
    const state = {
      grid: this.grid,
      score: this.score,
      coins: this.coins,
      tray: this.tray,
      holdShape: this.holdShape,
      mode: this.mode,
      currentLevelNumber: this.currentLevelNumber,
      maxUnlockedLevel: this.maxUnlockedLevel,
      ultimateEnergy: this.ultimateEnergy,
      movesRemaining: this.movesRemaining,
      levelProgress: this.levelProgress,
      timeRemaining: this.timeRemaining,
      botHP: this.botHP
    };
    localStorage.setItem('blockblast_saved_state', JSON.stringify(state));
  }

  loadGameState() {
    try {
      const saved = localStorage.getItem('blockblast_saved_state');
      if (!saved) return false;
      const state = JSON.parse(saved);
      if (!state || typeof state !== 'object') return false;
      if (!Array.isArray(state.grid) || state.grid.length !== this.GRID_SIZE) return false;
      for (let r = 0; r < this.GRID_SIZE; r++) {
        if (!Array.isArray(state.grid[r]) || state.grid[r].length !== this.GRID_SIZE) return false;
      }
      if (!Array.isArray(state.tray) || state.tray.length !== 3) return false;

      this.grid = state.grid;
      this.score = (typeof state.score === 'number' && !isNaN(state.score)) ? state.score : 0;
      this.coins = (typeof state.coins === 'number' && !isNaN(state.coins)) ? state.coins : this.coins;
      this.tray = state.tray;
      this.holdShape = state.holdShape || null;
      this.mode = state.mode || 'classic';
      this.currentLevelNumber = (typeof state.currentLevelNumber === 'number' && !isNaN(state.currentLevelNumber)) ? state.currentLevelNumber : 1;
      this.maxUnlockedLevel = (typeof state.maxUnlockedLevel === 'number' && !isNaN(state.maxUnlockedLevel)) ? state.maxUnlockedLevel : 1;
      this.ultimateEnergy = (typeof state.ultimateEnergy === 'number' && !isNaN(state.ultimateEnergy)) ? state.ultimateEnergy : 0;
      if (state.movesRemaining !== undefined) this.movesRemaining = state.movesRemaining;
      if (state.levelProgress) this.levelProgress = state.levelProgress;
      if (state.timeRemaining !== undefined) this.timeRemaining = state.timeRemaining;
      if (state.botHP !== undefined) this.botHP = state.botHP;
      this.updateUltimateUI();
      return true;
    } catch (e) {
      return false;
    }
  }

  /* FX Draw Helpers */
  spawnTrailParticle(x, y) {
    this.trailParticles.push({
      x, y,
      size: 4 + Math.random() * 5,
      color: '#00f2ff',
      life: 1.0
    });
  }

  spawnShockwave(x, y) {
    this.shockwaves.push({
      x, y,
      radius: 5,
      maxRadius: 50,
      alpha: 1.0
    });
  }

  spawnLaserBeam(dir, index) {
    this.laserBeams.push({
      dir,
      index,
      life: 1.0
    });
  }

  spawnRowParticles(row) {
    const y = this.gridPadding + row * this.cellSize + this.cellSize / 2;
    for (let c = 0; c < this.GRID_SIZE; c++) {
      this.createBurst(this.gridPadding + c * this.cellSize + this.cellSize / 2, y);
    }
  }

  spawnColParticles(col) {
    const x = this.gridPadding + col * this.cellSize + this.cellSize / 2;
    for (let r = 0; r < this.GRID_SIZE; r++) {
      this.createBurst(x, this.gridPadding + r * this.cellSize + this.cellSize / 2);
    }
  }

  createBurst(x, y) {
    const colors = ['#00f2ff', '#9d4edd', '#ff2a6d', '#ffd166', '#06d6a0'];
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.0
      });
    }
  }

  spawnConfetti() {
    const colors = ['#00f2ff', '#ffd166', '#ff2a6d', '#06d6a0', '#9d4edd'];
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * (this.canvasHeight / 2),
        vx: (Math.random() - 0.5) * 6,
        vy: 2 + Math.random() * 5,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1.5
      });
    }
  }

  gameLoop(time) {
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.updateAndDrawMeteors();

    this.drawGridBackground();
    this.drawHoverPreview();
    this.drawGridBlocks();

    this.updateAndDrawLaserBeams();
    this.updateAndDrawShockwaves();
    this.updateAndDrawTrailParticles();
    this.updateAndDrawParticles();
    this.updateAndDrawPopups();

    this.drawDraggedShape();

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame((t) => this.gameLoop(t));
    }
  }

  drawGridBackground() {
    for (let r = 0; r < this.GRID_SIZE; r++) {
      for (let c = 0; c < this.GRID_SIZE; c++) {
        const x = this.gridPadding + c * this.cellSize;
        const y = this.gridPadding + r * this.cellSize;
        const size = this.cellSize - 4;

        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
        this.ctx.lineWidth = 1;

        this.drawRoundedRect(this.ctx, x + 2, y + 2, size, size, 8, true, true);
      }
    }
  }

  drawGridBlocks() {
    const colors = window.ShapeFactory.getActiveThemeColors();

    for (let r = 0; r < this.GRID_SIZE; r++) {
      for (let c = 0; c < this.GRID_SIZE; c++) {
        const cell = this.grid[r][c];
        if (cell !== null) {
          const x = this.gridPadding + c * this.cellSize + 2;
          const y = this.gridPadding + r * this.cellSize + 2;
          const size = this.cellSize - 4;

          let colorIdx = typeof cell === 'object' ? cell.colorIdx : cell;
          const color = colors[colorIdx] || colors[0];

          this.drawBlockCell(this.ctx, x, y, size, color);

          if (typeof cell === 'object') {
            if (cell.isBomb) {
              this.ctx.font = 'bold 16px sans-serif';
              this.ctx.fillStyle = '#fff';
              this.ctx.textAlign = 'center';
              this.ctx.fillText(`💣${cell.timer}`, x + size / 2, y + size / 2 + 5);
            } else if (cell.type === 'ice') {
              this.ctx.font = 'bold 16px sans-serif';
              this.ctx.fillStyle = '#00f2ff';
              this.ctx.textAlign = 'center';
              this.ctx.fillText(cell.hp === 2 ? '🧊' : '❄️', x + size / 2, y + size / 2 + 5);
            } else if (cell.type === 'diamond') {
              this.ctx.font = 'bold 16px sans-serif';
              this.ctx.fillStyle = '#ffd166';
              this.ctx.textAlign = 'center';
              this.ctx.fillText('💎', x + size / 2, y + size / 2 + 5);
            }
          }
        }
      }
    }
  }

  drawHoverPreview() {
    if (!this.activeDrag) return;

    const drag = this.activeDrag;
    const rect = this.canvas.getBoundingClientRect();
    const dropX = drag.x - rect.left;
    const dropY = drag.y - rect.top;

    const col = Math.round((dropX - this.gridPadding - (drag.shape.cols * this.cellSize) / 2) / this.cellSize);
    const row = Math.round((dropY - this.gridPadding - (drag.shape.rows * this.cellSize) / 2) / this.cellSize);

    if (window.ShapeFactory.canPlaceShape(this.grid, drag.shape.matrix, row, col)) {
      const colors = window.ShapeFactory.getActiveThemeColors();
      const color = colors[drag.shape.colorIdx] || colors[0];
      this.ctx.fillStyle = color.glow;

      for (let r = 0; r < drag.shape.rows; r++) {
        for (let c = 0; c < drag.shape.cols; c++) {
          if (drag.shape.matrix[r][c]) {
            const x = this.gridPadding + (col + c) * this.cellSize + 2;
            const y = this.gridPadding + (row + r) * this.cellSize + 2;
            const size = this.cellSize - 4;
            this.drawRoundedRect(this.ctx, x, y, size, size, 8, true, false);
          }
        }
      }
    }
  }

  drawDraggedShape() {
    if (!this.activeDrag) return;

    const drag = this.activeDrag;
    const rect = this.canvas.getBoundingClientRect();
    const x = drag.x - rect.left - (drag.shape.cols * this.cellSize) / 2;
    const y = drag.y - rect.top - (drag.shape.rows * this.cellSize) / 2;

    const colors = window.ShapeFactory.getActiveThemeColors();
    const color = drag.shape.isRainbow ? { main: '#ff2a6d', glow: 'rgba(255, 42, 109, 0.6)', shadow: '#ffd166' } : (colors[drag.shape.colorIdx] || colors[0]);

    for (let r = 0; r < drag.shape.rows; r++) {
      for (let c = 0; c < drag.shape.cols; c++) {
        if (drag.shape.matrix[r][c]) {
          const bx = x + c * this.cellSize;
          const by = y + r * this.cellSize;
          const size = this.cellSize - 4;

          this.drawBlockCell(this.ctx, bx, by, size, color);
        }
      }
    }
  }

  drawBlockCell(ctx, x, y, size, color) {
    ctx.shadowBlur = 0; // Disabled shadowBlur for 60 FPS mobile speed

    const grad = ctx.createLinearGradient(x, y, x + size, y + size);
    grad.addColorStop(0, color.main);
    grad.addColorStop(1, color.shadow);

    ctx.fillStyle = grad;
    this.drawRoundedRect(ctx, x, y, size, size, 8, true, false);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    this.drawRoundedRect(ctx, x + 3, y + 3, size - 6, size / 3, 4, true, false);
  }

  drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  updateAndDrawTrailParticles() {
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      p.life -= 0.05;
      if (p.life <= 0) {
        this.trailParticles.splice(i, 1);
        continue;
      }
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life * 0.6;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }

  updateAndDrawShockwaves() {
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.radius += 2.5;
      s.alpha -= 0.04;

      if (s.alpha <= 0 || s.radius >= s.maxRadius) {
        this.shockwaves.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.strokeStyle = `rgba(0, 242, 255, ${s.alpha})`;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  updateAndDrawLaserBeams() {
    for (let i = this.laserBeams.length - 1; i >= 0; i--) {
      const b = this.laserBeams[i];
      b.life -= 0.05;

      if (b.life <= 0) {
        this.laserBeams.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = b.life;
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      this.ctx.shadowColor = '#00f2ff';
      this.ctx.shadowBlur = 15;

      if (b.dir === 'h') {
        const y = this.gridPadding + b.index * this.cellSize + 2;
        this.ctx.fillRect(this.gridPadding, y, this.canvasWidth - this.gridPadding * 2, this.cellSize - 4);
      } else {
        const x = this.gridPadding + b.index * this.cellSize + 2;
        this.ctx.fillRect(x, this.gridPadding, this.cellSize - 4, this.canvasHeight - this.gridPadding * 2);
      }
      this.ctx.restore();
    }
  }

  updateAndDrawParticles() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.025;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1.0;
  }

  updateAndDrawPopups() {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.y -= 1.2;
      pop.life -= 0.02;

      if (pop.life <= 0) {
        this.popups.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.font = 'bold 20px "Segoe UI", sans-serif';
      this.ctx.fillStyle = '#ffd166';
      this.ctx.shadowColor = 'rgba(255, 209, 102, 0.8)';
      this.ctx.shadowBlur = 10;
      this.ctx.globalAlpha = pop.life;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(pop.text, pop.x, pop.y);
      this.ctx.restore();
    }
  }
}

const initBlockBlastGame = () => {
  if (!window.game) {
    window.game = new BlockBlastGame();
    window.game.init();
  }
};

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initBlockBlastGame);
  window.addEventListener('load', initBlockBlastGame);
} else {
  initBlockBlastGame();
}
