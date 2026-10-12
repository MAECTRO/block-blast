/**
 * Block Shapes Definitions, Skin Themes, Background Themes, Difficulty Levels & Procedural Generator
 */

const SHAPES = [
  // Basic Shapes (Easy/Normal)
  { matrix: [[1]], colorIdx: 0, minDifficulty: 'easy' },
  { matrix: [[1, 1]], colorIdx: 1, minDifficulty: 'easy' },
  { matrix: [[1], [1]], colorIdx: 1, minDifficulty: 'easy' },
  { matrix: [[1, 1, 1]], colorIdx: 2, minDifficulty: 'easy' },
  { matrix: [[1], [1], [1]], colorIdx: 2, minDifficulty: 'easy' },
  { matrix: [[1, 0], [1, 1]], colorIdx: 2, minDifficulty: 'easy' },
  { matrix: [[0, 1], [1, 1]], colorIdx: 2, minDifficulty: 'easy' },
  { matrix: [[1, 1], [1, 1]], colorIdx: 3, minDifficulty: 'easy' },
  { matrix: [[1, 1, 1, 1]], colorIdx: 3, minDifficulty: 'normal' },
  { matrix: [[1], [1], [1], [1]], colorIdx: 3, minDifficulty: 'normal' },
  { matrix: [[1, 0, 0], [1, 1, 1]], colorIdx: 3, minDifficulty: 'normal' },
  { matrix: [[0, 0, 1], [1, 1, 1]], colorIdx: 3, minDifficulty: 'normal' },
  { matrix: [[0, 1, 0], [1, 1, 1]], colorIdx: 3, minDifficulty: 'normal' },
  { matrix: [[1, 1, 0], [0, 1, 1]], colorIdx: 3, minDifficulty: 'normal' },
  { matrix: [[0, 1, 1], [1, 1, 0]], colorIdx: 3, minDifficulty: 'normal' },

  // Hardcore & Extreme Shapes
  { matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], colorIdx: 4, minDifficulty: 'hard' },
  { matrix: [[0, 1, 0], [1, 1, 1], [0, 1, 0]], colorIdx: 4, minDifficulty: 'hard' }, // ✝️ Plus Cross
  { matrix: [[1, 1, 1], [1, 0, 0], [1, 0, 0]], colorIdx: 4, minDifficulty: 'hard' }, // 📐 Giant Corner
  { matrix: [[1, 1, 1], [1, 0, 1]], colorIdx: 4, minDifficulty: 'hard' },             // 🔲 Giant Arch
  { matrix: [[1, 1, 0], [0, 1, 0], [0, 1, 1]], colorIdx: 4, minDifficulty: 'hard' }, // ⚡ Super Z
  { matrix: [[1, 1, 1, 1], [0, 1, 0, 0]], colorIdx: 4, minDifficulty: 'hard' },       // 🛡️ Giant T
  { matrix: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], colorIdx: 4, minDifficulty: 'hard' }  // 🎯 Diagonal
];

const DIFFICULTY_LEVELS = {
  easy: {
    id: 'easy',
    name: '🟢 Easy',
    gridSize: 8,
    scoreMult: 0.8,
    desc: 'Simple shapes (1-3 blocks)'
  },
  normal: {
    id: 'normal',
    name: '🟡 Normal',
    gridSize: 8,
    scoreMult: 1.0,
    desc: 'Classic shape set'
  },
  hard: {
    id: 'hard',
    name: '🔴 Hardcore',
    gridSize: 9,
    scoreMult: 1.5,
    desc: 'Giant shapes and 9x9 grid'
  }
};

const THEMES = {
  cyber: {
    id: 'cyber',
    name: 'Cyberpunk',
    price: 0,
    colors: [
      { main: '#00f2ff', glow: 'rgba(0, 242, 255, 0.6)', shadow: '#0077ff' },
      { main: '#ff2a6d', glow: 'rgba(255, 42, 109, 0.6)', shadow: '#b0003a' },
      { main: '#ffd166', glow: 'rgba(255, 209, 102, 0.6)', shadow: '#ff9f1c' },
      { main: '#9d4edd', glow: 'rgba(157, 78, 221, 0.6)', shadow: '#5a189a' },
      { main: '#06d6a0', glow: 'rgba(6, 214, 160, 0.6)', shadow: '#028060' }
    ]
  },
  gold_rush: {
    id: 'gold_rush',
    name: 'Золотая Лихорадка',
    price: 400,
    colors: [
      { main: '#ffd166', glow: 'rgba(255, 209, 102, 0.8)', shadow: '#ff9f1c' },
      { main: '#ffb703', glow: 'rgba(255, 183, 3, 0.8)', shadow: '#fb8500' },
      { main: '#e9c46a', glow: 'rgba(233, 196, 106, 0.8)', shadow: '#f4a261' },
      { main: '#f3c05b', glow: 'rgba(243, 192, 91, 0.8)', shadow: '#d48c2e' },
      { main: '#fff3b0', glow: 'rgba(255, 243, 176, 0.8)', shadow: '#e09f3e' }
    ]
  },
  sakura_pink: {
    id: 'sakura_pink',
    name: 'Неоновая Сакура',
    price: 500,
    colors: [
      { main: '#ff70a6', glow: 'rgba(255, 112, 166, 0.8)', shadow: '#ff0a54' },
      { main: '#ff97b7', glow: 'rgba(255, 151, 183, 0.8)', shadow: '#ff477e' },
      { main: '#ffc6ff', glow: 'rgba(255, 198, 255, 0.8)', shadow: '#b8c0ff' },
      { main: '#f72585', glow: 'rgba(247, 37, 133, 0.8)', shadow: '#7209b7' },
      { main: '#ff9ebb', glow: 'rgba(255, 158, 187, 0.8)', shadow: '#ff5c8a' }
    ]
  },
  galaxy: {
    id: 'galaxy',
    name: 'Галактика',
    price: 300,
    colors: [
      { main: '#e0aaff', glow: 'rgba(224, 170, 255, 0.6)', shadow: '#7b2cbf' },
      { main: '#c77dff', glow: 'rgba(199, 125, 255, 0.6)', shadow: '#5a189a' },
      { main: '#7b2cbf', glow: 'rgba(123, 44, 191, 0.6)', shadow: '#3c096c' },
      { main: '#9d4edd', glow: 'rgba(157, 78, 221, 0.6)', shadow: '#240046' },
      { main: '#e2afff', glow: 'rgba(226, 175, 255, 0.6)', shadow: '#10002b' }
    ]
  },
  jewel: {
    id: 'jewel',
    name: 'Изумруд',
    price: 500,
    colors: [
      { main: '#52b788', glow: 'rgba(82, 183, 136, 0.6)', shadow: '#1b4332' },
      { main: '#74c69d', glow: 'rgba(116, 198, 157, 0.6)', shadow: '#2d6a4f' },
      { main: '#95d5b2', glow: 'rgba(149, 213, 178, 0.6)', shadow: '#40916c' },
      { main: '#b7e4c7', glow: 'rgba(183, 228, 199, 0.6)', shadow: '#52b788' },
      { main: '#d8f3dc', glow: 'rgba(216, 243, 220, 0.6)', shadow: '#74c69d' }
    ]
  },
  wood: {
    id: 'wood',
    name: 'Дерево Классика',
    price: 800,
    colors: [
      { main: '#cb997e', glow: 'rgba(203, 153, 126, 0.6)', shadow: '#6b4226' },
      { main: '#ddbea9', glow: 'rgba(221, 190, 169, 0.6)', shadow: '#a5a58d' },
      { main: '#ffe8d6', glow: 'rgba(255, 232, 214, 0.6)', shadow: '#b7b7a4' },
      { main: '#b7b7a4', glow: 'rgba(183, 183, 164, 0.6)', shadow: '#6b705c' },
      { main: '#a5a58d', glow: 'rgba(165, 165, 141, 0.6)', shadow: '#3f4238' }
    ]
  }
};

const BACKGROUNDS = {
  space: {
    id: 'space',
    name: 'Неоновый Космос',
    price: 0,
    bgRadial: 'radial-gradient(circle at 50% 35%, #1d2338 0%, #0a0c14 100%)',
    particleColor: '#00f2ff'
  },
  cyber_city: {
    id: 'cyber_city',
    name: 'Кибер Сити',
    price: 400,
    bgRadial: 'radial-gradient(circle at 50% 35%, #2a0845 0%, #0b001a 100%)',
    particleColor: '#ff2a6d'
  },
  sunset: {
    id: 'sunset',
    name: 'Огненный Закат',
    price: 600,
    bgRadial: 'radial-gradient(circle at 50% 35%, #4a1525 0%, #17050a 100%)',
    particleColor: '#ffd166'
  }
};

class ShapeFactory {
  static activeTheme = (typeof localStorage !== 'undefined' ? (() => { try { return localStorage.getItem('blockblast_active_theme') || 'cyber'; } catch (e) { return 'cyber'; } })() : 'cyber');
  static activeBg = (typeof localStorage !== 'undefined' ? (() => { try { return localStorage.getItem('blockblast_active_bg') || 'space'; } catch (e) { return 'space'; } })() : 'space');

  static getRandomShape(difficulty = 'normal') {
    let pool = SHAPES.filter(s => {
      if (difficulty === 'easy') return s.minDifficulty === 'easy';
      if (difficulty === 'normal') return s.minDifficulty === 'easy' || s.minDifficulty === 'normal';
      return true; // hard includes all shapes
    });

    if (pool.length === 0) pool = SHAPES;

    const isRainbow = Math.random() < 0.05;
    const base = pool[Math.floor(Math.random() * pool.length)];

    return {
      matrix: JSON.parse(JSON.stringify(base.matrix)),
      rows: base.matrix.length,
      cols: base.matrix[0].length,
      colorIdx: base.colorIdx,
      isRainbow
    };
  }

  static createSpecificShape(name) {
    const map = {
      'dot_1x1': [[1]],
      'line_1x2': [[1, 1]],
      'line_2x1': [[1], [1]],
      'line_1x3': [[1, 1, 1]],
      'line_3x1': [[1], [1], [1]],
      'square_2x2': [[1, 1], [1, 1]],
      'corner_2x2': [[1, 0], [1, 1]]
    };
    const matrix = map[name] || [[1]];
    return {
      matrix: JSON.parse(JSON.stringify(matrix)),
      rows: matrix.length,
      cols: matrix[0].length,
      colorIdx: Math.floor(Math.random() * 4),
      isRainbow: false
    };
  }

  static getActiveThemeColors() {
    const theme = THEMES[this.activeTheme] || THEMES.cyber;
    return theme.colors;
  }

  static setActiveTheme(themeId) {
    if (THEMES[themeId]) {
      this.activeTheme = themeId;
      localStorage.setItem('blockblast_active_theme', themeId);
    }
  }

  static setActiveBackground(bgId) {
    if (BACKGROUNDS[bgId]) {
      this.activeBg = bgId;
      localStorage.setItem('blockblast_active_bg', bgId);
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.backgroundImage = BACKGROUNDS[bgId].bgRadial;
      }
    }
  }

  static canPlaceShape(grid, shapeMatrix, startRow, startCol) {
    const rows = shapeMatrix.length;
    const cols = shapeMatrix[0].length;
    const gridSize = grid.length;

    if (startRow < 0 || startCol < 0 || startRow + rows > gridSize || startCol + cols > gridSize) {
      return false;
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shapeMatrix[r][c] && grid[startRow + r][startCol + c] !== null) {
          return false;
        }
      }
    }
    return true;
  }

  static canPlaceAnywhere(grid, shapeMatrix) {
    const gridSize = grid.length;
    const rows = shapeMatrix.length;
    const cols = shapeMatrix[0].length;

    for (let r = 0; r <= gridSize - rows; r++) {
      for (let c = 0; c <= gridSize - cols; c++) {
        if (this.canPlaceShape(grid, shapeMatrix, r, c)) {
          return true;
        }
      }
    }
    return false;
  }
}

class ProceduralLevelGenerator {
  static TOTAL_LEVELS = 500;
  static LEVELS_PER_CHAPTER = 20;
  static TOTAL_CHAPTERS = 25;

  static CHAPTERS = [
    { id: 1, nameRu: 'Неоновый Старт', nameEn: 'Neon Origins', nameTr: 'Neon Başlangıç', icon: '🌟' },
    { id: 2, nameRu: 'Кибер Импульс', nameEn: 'Cyber Surge', nameTr: 'Siber Darbe', icon: '⚡' },
    { id: 3, nameRu: 'Изумрудный Пик', nameEn: 'Emerald Peak', nameTr: 'Zümrüt Zirvesi', icon: '💎' },
    { id: 4, nameRu: 'Ночной Мегаполис', nameEn: 'Night Metropolis', nameTr: 'Gece Şehri', icon: '🏙️' },
    { id: 5, nameRu: 'Галактический Рубеж', nameEn: 'Galaxy Frontier', nameTr: 'Galaksi Sınırı', icon: '🌌' },
    { id: 6, nameRu: 'Плазменный Шторм', nameEn: 'Plasma Storm', nameTr: 'Plazma Fırtınası', icon: '🔥' },
    { id: 7, nameRu: 'Квантовый Ледник', nameEn: 'Quantum Glacier', nameTr: 'Kuantum Buzulu', icon: '❄️' },
    { id: 8, nameRu: 'Восстание Дроидов', nameEn: 'Droid Awakening', nameTr: 'Droid Uyanışı', icon: '🤖' },
    { id: 9, nameRu: 'Кольца Сатурна', nameEn: 'Saturn Rings', nameTr: 'Satürn Halkaları', icon: '🪐' },
    { id: 10, nameRu: 'Электро-Шок', nameEn: 'Electro Shock', nameTr: 'Elektro Şok', icon: '⚡' },
    { id: 11, nameRu: 'Матрица Снов', nameEn: 'Dream Matrix', nameTr: 'Rüya Matrisi', icon: '🔮' },
    { id: 12, nameRu: 'Магма Кор', nameEn: 'Magma Core', nameTr: 'Magma Çekirdeği', icon: '🌋' },
    { id: 13, nameRu: 'Метеорный Поток', nameEn: 'Meteor Shower', nameTr: 'Meteor Yağmuru', icon: '🌠' },
    { id: 14, nameRu: 'Кибер Щит', nameEn: 'Cyber Aegis', nameTr: 'Siber Kalkan', icon: '🛡️' },
    { id: 15, nameRu: 'Арена Чемпионов', nameEn: 'Champions Arena', nameTr: 'Şampiyonlar Arenası', icon: '🏆' },
    { id: 16, nameRu: 'Черная Дыра', nameEn: 'Black Hole Event', nameTr: 'Kara Delik', icon: '🌀' },
    { id: 17, nameRu: 'Скорость Света', nameEn: 'Warp Speed', nameTr: 'Işık Hızı', icon: '🚀' },
    { id: 18, nameRu: 'Королевский Бласт', nameEn: 'Royal Blast', nameTr: 'Kraliyet Patlaması', icon: '👑' },
    { id: 19, nameRu: 'Сверхновая', nameEn: 'Supernova', nameTr: 'Süpernova', icon: '💫' },
    { id: 20, nameRu: 'Туманность Андромеды', nameEn: 'Andromeda Nebula', nameTr: 'Andromeda Bulutsusu', icon: '🪐' },
    { id: 21, nameRu: 'Квантовый Код', nameEn: 'Quantum Matrix', nameTr: 'Kuantum Kodu', icon: '🧬' },
    { id: 22, nameRu: 'Арена Гладиаторов', nameEn: 'Gladiator Arena', nameTr: 'Gladyatör Arenası', icon: '⚔️' },
    { id: 23, nameRu: 'Врата Бесконечности', nameEn: 'Infinity Gate', nameTr: 'Sonsuzluk Kapısı', icon: '🌌' },
    { id: 24, nameRu: 'Титанический Взрыв', nameEn: 'Titanic Explosion', nameTr: 'Titanik Patlama', icon: '💥' },
    { id: 25, nameRu: 'Абсолютный Мастер', nameEn: 'Grandmaster Finale', nameTr: 'Büyük Usta Finali', icon: '👑' }
  ];

  static getChapterInfo(chapterId) {
    const safeId = Math.max(1, Math.min(this.TOTAL_CHAPTERS, chapterId || 1));
    const ch = this.CHAPTERS[safeId - 1] || this.CHAPTERS[0];
    const startLevel = (safeId - 1) * this.LEVELS_PER_CHAPTER + 1;
    const endLevel = safeId * this.LEVELS_PER_CHAPTER;
    
    const lang = (window.vkSDK && window.vkSDK.lang) || 'ru';
    const name = lang === 'tr' ? ch.nameTr : (lang === 'en' ? ch.nameEn : ch.nameRu);

    return {
      id: safeId,
      name,
      icon: ch.icon,
      startLevel,
      endLevel
    };
  }

  static getChapterForLevel(levelNumber) {
    const num = Math.max(1, Math.min(this.TOTAL_LEVELS, levelNumber || 1));
    return Math.floor((num - 1) / this.LEVELS_PER_CHAPTER) + 1;
  }

  static getLevelConfig(levelNumber) {
    const num = Math.max(1, Math.min(this.TOTAL_LEVELS, levelNumber || 1));
    const chapterId = this.getChapterForLevel(num);
    const chapter = this.getChapterInfo(chapterId);

    const isBoss = (num % this.LEVELS_PER_CHAPTER === 0);
    const isHard = (num % 5 === 0 && !isBoss);

    const t = (k, def) => (window.vkSDK && typeof window.vkSDK.t === 'function' ? (window.vkSDK.t(k, def) || def) : def);
    const rawMax = parseInt(localStorage.getItem('blockblast_max_unlocked_level') || '1', 10);
    const maxUnlocked = (!isNaN(rawMax) && rawMax >= 1) ? rawMax : 1;
    const rawStars = parseInt(localStorage.getItem(`level_stars_${num}`) || '0', 10);
    const stars = (!isNaN(rawStars) && rawStars >= 0) ? rawStars : 0;

    let config = {
      level: num,
      chapterId: chapterId,
      chapterName: chapter.name,
      chapterIcon: chapter.icon,
      isBoss: isBoss,
      isHard: isHard,
      stars: stars,
      unlocked: num <= maxUnlocked,
      mode: 'classic'
    };

    const typeMod = num % 5;

    if (isBoss) {
      // Гранд-Босс финала главы (каждые 20 уровней)
      const targetScore = Math.round(500 + num * 20 + Math.pow(num, 1.2) * 5);
      const targetLines = Math.min(20, 5 + Math.floor(num * 0.08));
      config.mode = 'classic';
      config.targetScore = targetScore;
      config.targetLines = targetLines;
      config.movesLimit = Math.max(15, 30 - Math.floor(num / 40));
      config.desc = t('goalBoss', 'Boss: {pts} pts + {lines} lines')
        .replace('{pts}', targetScore)
        .replace('{lines}', targetLines);
      config.rewardCoins = 150 + num * 2;
    } else if (typeMod === 1) {
      // Набор очков (Score Target)
      const targetScore = Math.round(300 + num * 18 + Math.pow(num, 1.15) * 4);
      config.mode = 'classic';
      config.targetScore = targetScore;
      config.movesLimit = Math.max(14, 28 - Math.floor(num / 35));
      config.desc = t('goalScore', 'Score {n} points').replace('{n}', targetScore);
      config.rewardCoins = 50 + Math.floor(num * 1.2);
    } else if (typeMod === 2) {
      // Очистка линий (Lines Clear)
      const targetLines = Math.min(22, 3 + Math.floor(num * 0.12) + (num % 3));
      config.mode = 'classic';
      config.targetLines = targetLines;
      config.movesLimit = Math.max(14, 26 - Math.floor(num / 40));
      config.desc = t('goalLines', 'Clear {n} lines').replace('{n}', targetLines);
      config.rewardCoins = 55 + Math.floor(num * 1.2);
    } else if (typeMod === 3) {
      // Обезвреживание бомб (Bomb Defusal)
      const targetBombs = num <= 5 ? 2 : Math.min(6, 2 + Math.floor(num * 0.04));
      config.mode = 'bomb';
      config.targetBombs = targetBombs;
      config.movesLimit = Math.max(16, 30 - Math.floor(num / 35));
      config.desc = t('goalBombs', 'Defuse {n} bombs').replace('{n}', targetBombs);
      config.rewardCoins = 65 + Math.floor(num * 1.3);
    } else if (typeMod === 4) {
      // Достижение серии комбо (Streak Goal)
      const targetStreak = Math.min(4, 2 + Math.floor(num / 80));
      config.mode = 'classic';
      config.targetStreak = targetStreak;
      config.movesLimit = Math.max(12, 22 - Math.floor(num / 50));
      config.desc = t('goalCombo', 'Reach Combo x{n}').replace('{n}', targetStreak);
      config.rewardCoins = 60 + Math.floor(num * 1.2);
    } else {
      // Челлендж-уровень (Hard level каждые 5)
      const targetScore = Math.round(400 + num * 22 + Math.pow(num, 1.18) * 4);
      config.mode = 'classic';
      config.targetScore = targetScore;
      config.movesLimit = Math.max(13, 24 - Math.floor(num / 40));
      config.desc = t('goalChallenge', 'Hard: Score {n} pts').replace('{n}', targetScore);
      config.rewardCoins = 80 + Math.floor(num * 1.5);
    }

    return config;
  }
}

window.SHAPES = SHAPES;
window.THEMES = THEMES;
window.BACKGROUNDS = BACKGROUNDS;
window.DIFFICULTY_LEVELS = DIFFICULTY_LEVELS;
window.ShapeFactory = ShapeFactory;
window.ProceduralLevelGenerator = ProceduralLevelGenerator;
