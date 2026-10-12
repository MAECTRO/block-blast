/**
 * VK Play SDK Manager & VK Bridge Universal Adapter
 * Supports VK Play (iframeApi / mailru.core.js) and VK Mini Apps / VK Games (vkBridge)
 * Complete Multi-Language Support (RU, EN, TR), Ads (Interstitial & Rewarded),
 * Cloud Saves, Leaderboard, and Offline Fallback Mock Mode.
 */

// Gracefully handle cross-window postMessage errors in sandboxed iframes
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (event && event.reason) {
      const msg = event.reason.message || String(event.reason);
      if (msg.includes('No parent to post message') || msg.includes('Can not get appId')) {
        event.preventDefault();
      }
    }
  });
}

class VKSDKManager {
  constructor() {
    this.externalApi = null;
    this.vkBridge = null;
    this.isInitialized = false;
    this.isAdShowing = false;
    this.deviceType = 'desktop';

    // Parse URL params passed by VK Play iframe (?appid=...&uid=...&currency=RUB&lang=ru_RU&sign=...) or VK Mini Apps (?vk_app_id=...&vk_user_id=...)
    this.urlParams = this._parseQueryParams();
    this.appId = this.urlParams.appid || this.urlParams.gmr_id || this.urlParams.vk_app_id || 1;
    this.uid = this.urlParams.uid || this.urlParams.vk_user_id || null;

    // Detect initial language
    this.lang = this.detectInitialLang();

    this.lastAdTime = 0;
    this.AD_COOLDOWN_MS = 60000; // 60 seconds cooldown between interstitials

    this.activeAdSession = null;

    this.player = {
      uid: this.uid || 'vk_guest',
      nick: 'Игрок VK',
      avatar: '',
      isAuth: false
    };

    this.mockData = {
      score: 0,
      bestScore: parseInt(localStorage.getItem('blockblast_best_score') || '0', 10)
    };

    this.i18n = {
      ru: {
        score: 'СЧЁТ',
        best: 'РЕКОРД',
        hold: 'ЗАПАС',
        holdEmpty: 'Пусто',
        gameOver: 'ИГРА ОКОНЧЕНА',
        yourScore: 'Ваш счёт',
        record: 'Рекорд',
        continueRevive: 'Продолжить!',
        clearLinesSub: 'Очистить 3 линии (Реклама)',
        playAgain: 'Играть заново',
        rateGame: 'Оценить игру',
        leaderboardTitle: 'Таблица лидеров',
        loading: 'Загрузка...',
        adCountdown: 'Реклама начнётся через',
        combo: 'КОМБО x',
        streak: 'СЕРИЯ x',
        superClear: 'СУПЕР ОЧИСТКА!',
        classic: 'Классика',
        levels: '⭐ Уровни',
        duel: '⚔️ Дуэль с ИИ',
        bomb: '💣 Бомбы',
        time: '⏱️ На время',
        easy: '🟢 Легкий',
        normal: '🟡 Средний',
        hard: '🔴 Хардкор (9x9)',
        rankBronze: '🥉 Бронза',
        rankSilver: '🥈 Серебро',
        rankGold: '🥇 Золото',
        rankDiamond: '💎 Бриллиант',
        rankLegend: '👑 Легенда',
        botDuelDefeat: 'ИИ-БОТ ПОБЕДИЛ! 🤖',
        botDuelVictory: '🎉 ПОБЕДА НАД ИИ-БОТОМ!',
        botHp: '⚔️ ИИ-Бот: Здоровье',
        botActive: '⚔️ ИИ-Бот: Соперник активен!',
        lvlTitle: 'Уровень {lvl}',
        goalScore: 'Набрать {n} очков',
        goalLines: 'Сжечь {n} линий',
        goalBombs: 'Обезвредить {n} бомб',
        goalCombo: 'Достичь Комбо x{n}',
        levelGoal: 'Уровень {lvl}: {pts}',
        noMoves: '⚠️ НЕТ ХОДОВ!',
        startAgain: '🔄 Начать заново',
        tipMascot: 'Маскот',
        tipSound: 'Звук',
        tipUltimate: '⚡ Радужная Молния (Ультимейт)',
        tipTrophies: 'Зал Славы и Достижения',
        tipDaily: 'Календарь Подарков',
        tipLevels: 'Карта Уровней',
        tipQuests: 'Квесты и Ачивки',
        tipShop: 'Магазин скинов и фонов',
        tipScratch: 'Скретч-Лотерея',
        tipWheel: 'Колесо удачи',
        tipLeaderboard: 'Лидерборд',
        tipRestart: 'Заново',
        tipShortcut: 'В закладки браузера',
        tipUndo: 'Отмена хода',
        tipHammer: 'Молоток',
        tipBomb: 'Бомба 3x3',
        tipShuffle: 'Перемешать',
        scratchTitle: '🎟️ Скретч-Лотерея!',
        scratchHint: 'Сотрите серебряный слой пальцем или мышкой!',
        scratchCanvasText: '✨ Сотрите защитный слой ✨',
        scratchClaim: '✨ Забрать Награду!',
        scratchCongrat: '🎉 Поздравляем! Награда {prize} начислена на баланс!',
        ticketAlert: '🎟️ ВЫ ПОЛУЧИЛИ СКРЕТЧ-БИЛЕТ!\nПричина: {reason}\nБилетов в запасе: {count}',
        ticketRewardWatchAd: 'Награда за просмотр видео! 🎬',
        ticketLevelPassed: 'Пройден рубеж: Уровень {lvl}! 🏆',
        ticketDuelVictory: 'Победа над ИИ-ботом в дуэли! ⚔️',
        ticketGreatPlay: 'За отличную игру!',
        trophiesTitle: '🏆 Зал Славы',
        trophyCombo: 'Мастер Комбо',
        trophyScore: 'Владыка Очков',
        trophyBombs: 'Сапёр 5 Бомб',
        trophyDuel: 'Чемпион Дуэлей',
        trophyUnlocked: '✓ Разблокировано',
        trophyLocked: '🔒 Заперто',
        calendarTitle: '🎁 7-Дневный Календарь',
        calendarClaim: '🎁 Забрать Награду!',
        day: 'День',
        claimed: '✓ Забрано',
        available: 'Доступно',
        levelsTitle: 'Карта Уровней',
        questsTitle: 'Ежедневные Квесты',
        questLines: 'Очистить 5 линий',
        questScore: 'Набрать 500 очков',
        questCombo: 'Достичь Комбо x2',
        rewardLabel: 'Награда:',
        questInProgress: 'В процессе',
        questClaim: 'Забрать',
        questClaimed: 'Получено',
        shopTitle: 'Магазин Скинов и Фонов',
        tabBlocks: '🎨 Темы Блоков',
        tabBackgrounds: '🌌 Темы Фона',
        shopActive: '✓ Активно',
        shopSelect: 'Выбрать',
        theme_cyber: 'Киберпанк (Неон)',
        theme_gold_rush: 'Золотая Лихорадка',
        theme_sakura_pink: 'Неоновая Сакура',
        theme_galaxy: 'Галактика',
        theme_jewel: 'Изумруд',
        theme_wood: 'Дерево Классика',
        bg_space: 'Неоновый Космос',
        bg_cyber_city: 'Кибер Сити',
        bg_sunset: 'Огненный Закат',
        wheelTitle: 'Колесо Фортуны',
        spinFree: 'Крутить (Бесплатно)',
        spinAd: 'Крутить (Реклама)',
        rewardGrantedLocal: '🎁 Награда начислена!',
        settingsTitle: '⚙️ Настройки & Пауза',
        lblSettingsLang: 'Язык игры',
        lblSettingsSound: 'Звуковые эффекты',
        soundOn: '🔊 Звук: ВКЛ',
        soundOff: '🔇 Звук: ВЫКЛ',
        btnResume: '▶️ Продолжить',
        btnRestartGame: '🔄 Начать заново',
        tipSettings: 'Пауза и Настройки',
        menuSubtitle: '🧩 Взрывай блоки • Ставь рекорды!',
        btnPlayGame: '▶️ ИГРАТЬ',
        lblMenuBest: '🏆 ЛУЧШИЙ СЧЁТ',
        lblMenuCoins: '🪙 МОНЕТЫ',
        lblSelectMode: 'ВЫБЕРИТЕ РЕЖИМ',
        btnHomeMenu: '🏠 В главное меню',
        pauseTitle: '⏸️ Пауза',
        tipPause: 'Пауза',
        chapter: 'Глава',
        jumpCurrent: '📍 К текущему уровню',
        startLevelBtn: '▶️ НАЧАТЬ',
        movesLimit: 'Ходы',
        goalBoss: '👑 Босс: {pts} очков + {lines} линий',
        goalChallenge: '⚡ Челлендж: {n} очков',
        boss: 'БОСС',
        linesShort: 'лин.',
        coins: 'монет',
        levelShort: 'Ур.',
        rotateTitle: 'Поверните экран',
        rotateSub: 'Для комфортной игры переверните телефон вертикально'
      },
      en: {
        score: 'SCORE',
        best: 'BEST',
        hold: 'HOLD',
        holdEmpty: 'Empty',
        gameOver: 'GAME OVER',
        yourScore: 'Your Score',
        record: 'Best Score',
        continueRevive: 'Continue!',
        clearLinesSub: 'Clear 3 lines (Watch Ad)',
        playAgain: 'Play Again',
        rateGame: 'Rate Game',
        leaderboardTitle: 'Leaderboards',
        loading: 'Loading...',
        adCountdown: 'Ad starting in',
        combo: 'COMBO x',
        streak: 'STREAK x',
        superClear: 'SUPER CLEAR!',
        classic: 'Classic',
        levels: '⭐ Levels',
        duel: '⚔️ Bot Duel',
        bomb: '💣 Bombs',
        time: '⏱️ Time Attack',
        easy: '🟢 Easy',
        normal: '🟡 Normal',
        hard: '🔴 Hardcore (9x9)',
        rankBronze: '🥉 Bronze',
        rankSilver: '🥈 Silver',
        rankGold: '🥇 Gold',
        rankDiamond: '💎 Diamond',
        rankLegend: '👑 Legend',
        botDuelDefeat: 'AI BOT WON! 🤖',
        botDuelVictory: '🎉 VICTORY OVER AI BOT!',
        botHp: '⚔️ AI Bot: HP',
        botActive: '⚔️ AI Bot: Opponent is active!',
        lvlTitle: 'Level {lvl}',
        goalScore: 'Score {n} points',
        goalLines: 'Clear {n} lines',
        goalBombs: 'Defuse {n} bombs',
        goalCombo: 'Reach Combo x{n}',
        levelGoal: 'Level {lvl}: {pts}',
        noMoves: '⚠️ NO MOVES!',
        startAgain: '🔄 Play Again',
        tipMascot: 'Mascot',
        tipSound: 'Sound',
        tipUltimate: '⚡ Rainbow Lightning (Ultimate)',
        tipTrophies: 'Hall of Fame & Trophies',
        tipDaily: 'Daily Gifts Calendar',
        tipLevels: 'Levels Map',
        tipQuests: 'Quests & Achievements',
        tipShop: 'Skins & Backgrounds Shop',
        tipScratch: 'Scratch Lottery',
        tipWheel: 'Lucky Wheel',
        tipLeaderboard: 'Leaderboards',
        tipRestart: 'Restart',
        tipShortcut: 'Bookmark Game',
        tipUndo: 'Undo Move',
        tipHammer: 'Hammer',
        tipBomb: 'Bomb 3x3',
        tipShuffle: 'Shuffle',
        scratchTitle: '🎟️ Scratch Lottery!',
        scratchHint: 'Scratch off the silver layer with your finger or mouse!',
        scratchCanvasText: '✨ Scratch off protective layer ✨',
        scratchClaim: '✨ Claim Reward!',
        scratchCongrat: '🎉 Congratulations! {prize} added to your balance!',
        ticketAlert: '🎟️ YOU RECEIVED A SCRATCH TICKET!\nReason: {reason}\nTickets in stock: {count}',
        ticketRewardWatchAd: 'Reward for watching video! 🎬',
        ticketLevelPassed: 'Milestone reached: Level {lvl}! 🏆',
        ticketDuelVictory: 'Victory over AI Bot in duel! ⚔️',
        ticketGreatPlay: 'For excellent play!',
        trophiesTitle: '🏆 Hall of Fame',
        trophyCombo: 'Combo Master',
        trophyScore: 'Score Lord',
        trophyBombs: 'Bomb Sweeper (5)',
        trophyDuel: 'Duel Champion',
        trophyUnlocked: '✓ Unlocked',
        trophyLocked: '🔒 Locked',
        calendarTitle: '🎁 7-Day Calendar',
        calendarClaim: '🎁 Claim Reward!',
        day: 'Day',
        claimed: '✓ Claimed',
        available: 'Available',
        levelsTitle: 'Levels Map',
        questsTitle: 'Daily Quests',
        questLines: 'Clear 5 lines',
        questScore: 'Score 500 points',
        questCombo: 'Reach Combo x2',
        rewardLabel: 'Reward:',
        questInProgress: 'In Progress',
        questClaim: 'Claim',
        questClaimed: 'Claimed',
        shopTitle: 'Skins & Backgrounds Shop',
        tabBlocks: '🎨 Block Themes',
        tabBackgrounds: '🌌 Backgrounds',
        shopActive: '✓ Active',
        shopSelect: 'Select',
        theme_cyber: 'Cyberpunk (Neon)',
        theme_gold_rush: 'Gold Rush',
        theme_sakura_pink: 'Neon Sakura',
        theme_galaxy: 'Galaxy',
        theme_jewel: 'Emerald',
        theme_wood: 'Classic Wood',
        bg_space: 'Neon Space',
        bg_cyber_city: 'Cyber City',
        bg_sunset: 'Fiery Sunset',
        wheelTitle: 'Wheel of Fortune',
        spinFree: 'Spin (Free)',
        spinAd: 'Spin (Watch Ad)',
        rewardGrantedLocal: '🎁 Reward granted!',
        settingsTitle: '⚙️ Settings & Pause',
        lblSettingsLang: 'Game Language',
        lblSettingsSound: 'Sound Effects',
        soundOn: '🔊 Sound: ON',
        soundOff: '🔇 Sound: OFF',
        btnResume: '▶️ Resume',
        btnRestartGame: '🔄 Restart Game',
        tipSettings: 'Pause & Settings',
        menuSubtitle: '🧩 Blast Blocks • Set Records!',
        btnPlayGame: '▶️ PLAY GAME',
        lblMenuBest: '🏆 BEST SCORE',
        lblMenuCoins: '🪙 COINS',
        lblSelectMode: 'SELECT GAME MODE',
        btnHomeMenu: '🏠 Main Menu',
        pauseTitle: '⏸️ Pause',
        tipPause: 'Pause',
        chapter: 'Chapter',
        jumpCurrent: '📍 Current Level',
        startLevelBtn: '▶️ START',
        movesLimit: 'Moves',
        goalBoss: '👑 Boss: {pts} pts + {lines} lines',
        goalChallenge: '⚡ Challenge: {n} pts',
        boss: 'BOSS',
        linesShort: 'lines',
        coins: 'coins',
        levelShort: 'Lvl',
        rotateTitle: 'Rotate Device',
        rotateSub: 'Please rotate your device to portrait orientation'
      },
      tr: {
        score: 'SKOR',
        best: 'EN İYİ',
        hold: 'YEDEK',
        holdEmpty: 'Boş',
        gameOver: 'OYUN BİTTİ',
        yourScore: 'Skorunuz',
        record: 'Rekor',
        continueRevive: 'Devam Et!',
        clearLinesSub: '3 Satır Temizle (Reklam)',
        playAgain: 'Tekrar Oyna',
        rateGame: 'Oyunu Değerlendir',
        leaderboardTitle: 'Lider Tablosu',
        loading: 'Yükleniyor...',
        adCountdown: 'Reklam başlıyor',
        combo: 'KOMBO x',
        streak: 'SERİ x',
        superClear: 'SÜPER TEMİZLEME!',
        classic: 'Klasik',
        levels: '⭐ Seviyeler',
        duel: '⚔️ Bot Düellosu',
        bomb: '💣 Bombalar',
        time: '⏱️ Zamana Karşı',
        easy: '🟢 Kolay',
        normal: '🟡 Orta',
        hard: '🔴 Zor (9x9)',
        rankBronze: '🥉 Bronz',
        rankSilver: '🥈 Gümüş',
        rankGold: '🥇 Altın',
        rankDiamond: '💎 Elmas',
        rankLegend: '👑 Efsane',
        botDuelDefeat: 'YZ BOT KAZANDI! 🤖',
        botDuelVictory: '🎉 YZ BOTU YENDİNİZ!',
        botHp: '⚔️ YZ Bot: Can',
        botActive: '⚔️ YZ Bot: Rakip aktif!',
        lvlTitle: 'Seviye {lvl}',
        goalScore: '{n} puan topla',
        goalLines: '{n} satır temizle',
        goalBombs: '{n} bomba imha et',
        goalCombo: 'Kombo x{n} yap',
        levelGoal: 'Seviye {lvl}: {pts}',
        noMoves: '⚠️ HAMLE YOK!',
        startAgain: '🔄 Yeniden Başla',
        tipMascot: 'Maskot',
        tipSound: 'Ses',
        tipUltimate: '⚡ Gökkuşağı Yıldırımı (Nihai)',
        tipTrophies: 'Şöhretler Salonu ve Başarılar',
        tipDaily: 'Günlük Hediye Takvimi',
        tipLevels: 'Seviye Haritası',
        tipQuests: 'Görevler ve Başarılar',
        tipShop: 'Görünüm ve Tema Mağazası',
        tipScratch: 'Kazı Kazan Piyangosu',
        tipWheel: 'Şans Çarkı',
        tipLeaderboard: 'Lider Tablosu',
        tipRestart: 'Yeniden Başlat',
        tipShortcut: 'Yer İmlerine Ekle',
        tipUndo: 'Hamleyi Geri Al',
        tipHammer: 'Çekiç',
        tipBomb: 'Bomba 3x3',
        tipShuffle: 'Karıştır',
        scratchTitle: '🎟️ Kazı Kazan!',
        scratchHint: 'Gümüş tabakayı parmağınızla veya fareyle kazıyın!',
        scratchCanvasText: '✨ Koruyucu tabakayı kazıyın ✨',
        scratchClaim: '✨ Ödülü Al!',
        scratchCongrat: '🎉 Tebrikler! {prize} bakiyenize eklendi!',
        ticketAlert: '🎟️ KAZI KAZAN BİLETİ KAZANDINIZ!\nNeden: {reason}\nKalan bilet: {count}',
        ticketRewardWatchAd: 'Video izleme ödülü! 🎬',
        ticketLevelPassed: 'Aşama geçildi: Seviye {lvl}! 🏆',
        ticketDuelVictory: 'Düelloda YZ botuna karşı zafer! ⚔️',
        ticketGreatPlay: 'Mükemmel oyun için!',
        trophiesTitle: '🏆 Şöhretler Salonu',
        trophyCombo: 'Kombo Ustası',
        trophyScore: 'Puan Lordu',
        trophyBombs: '5 Bomba İmhası',
        trophyDuel: 'Düello Şampiyonu',
        trophyUnlocked: '✓ Açıldı',
        trophyLocked: '🔒 Kilitli',
        calendarTitle: '🎁 7 Günlük Takvim',
        calendarClaim: '🎁 Ödülü Al!',
        day: 'Gün',
        claimed: '✓ Alındı',
        available: 'Mevcut',
        levelsTitle: 'Seviye Haritası',
        questsTitle: 'Günlük Görevler',
        questLines: '5 satır temizle',
        questScore: '500 puan topla',
        questCombo: 'Kombo x2 yap',
        rewardLabel: 'Ödül:',
        questInProgress: 'Devam Ediyor',
        questClaim: 'Al',
        questClaimed: 'Alındı',
        shopTitle: 'Görünüm ve Tema Mağazası',
        tabBlocks: '🎨 Blok Temaları',
        tabBackgrounds: '🌌 Arka Planlar',
        shopActive: '✓ Aktif',
        shopSelect: 'Seç',
        theme_cyber: 'Siberpunk (Neon)',
        theme_gold_rush: 'Altına Hücum',
        theme_sakura_pink: 'Neon Sakura',
        theme_galaxy: 'Galaksi',
        theme_jewel: 'Zümrüt',
        theme_wood: 'Klasik Ahşap',
        bg_space: 'Neon Uzay',
        bg_cyber_city: 'Siber Şehir',
        bg_sunset: 'Ateşli Gün Batımı',
        wheelTitle: 'Şans Çarkı',
        spinFree: 'Çevir (Ücretsiz)',
        spinAd: 'Çevir (Reklam)',
        rewardGrantedLocal: '🎁 Ödül verildi!',
        settingsTitle: '⚙️ Ayarlar ve Duraklat',
        lblSettingsLang: 'Oyun Dili',
        lblSettingsSound: 'Ses Efektleri',
        soundOn: '🔊 Ses: AÇIK',
        soundOff: '🔇 Ses: KAPALI',
        btnResume: '▶️ Devam Et',
        btnRestartGame: '🔄 Yeniden Başlat',
        tipSettings: 'Duraklat ve Ayarlar',
        menuSubtitle: '🧩 Blokları Patlat • Rekor Kır!',
        btnPlayGame: '▶️ OYNA',
        lblMenuBest: '🏆 EN İYİ SKOR',
        lblMenuCoins: '🪙 JETON',
        lblSelectMode: 'OYUN MODU SEÇİN',
        btnHomeMenu: '🏠 Ana Menü',
        pauseTitle: '⏸️ Duraklat',
        tipPause: 'Duraklat',
        chapter: 'Bölüm',
        jumpCurrent: '📍 Mevcut Bölüm',
        startLevelBtn: '▶️ BAŞLA',
        movesLimit: 'Hamle',
        goalBoss: '👑 Patron: {pts} puan + {lines} satır',
        goalChallenge: '⚡ Mücadele: {n} puan',
        boss: 'PATRON',
        linesShort: 'satır',
        coins: 'jeton',
        levelShort: 'Sev.',
        rotateTitle: 'Ekranı Döndürün',
        rotateSub: 'Lütfen cihazınızı dikey konuma getirin'
      }
    };

    // Apply translations on load
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.updateUIMode());
      } else {
        this.updateUIMode();
      }
    }
  }

  _parseQueryParams() {
    const params = {};
    if (typeof window !== 'undefined' && window.location.search) {
      try {
        const usp = new URLSearchParams(window.location.search);
        for (const [k, v] of usp.entries()) {
          params[k.toLowerCase()] = v;
        }
      } catch (e) {}
    }
    return params;
  }

  _normalizeLang(code) {
    if (!code || typeof code !== 'string') return null;
    const l = code.toLowerCase().trim();
    if (l === 'tr' || l.startsWith('tr')) return 'tr';
    if (l === 'en' || l.startsWith('en')) return 'en';
    return 'ru';
  }

  detectInitialLang() {
    try {
      if (this.urlParams.lang) {
        const l = this._normalizeLang(this.urlParams.lang);
        if (l) return l;
      }
      if (this.urlParams.vk_language) {
        const l = this._normalizeLang(this.urlParams.vk_language);
        if (l) return l;
      }
      const saved = this._normalizeLang(localStorage.getItem('blockblast_custom_lang'));
      if (saved) return saved;

      if (typeof navigator !== 'undefined' && navigator.language) {
        const nav = this._normalizeLang(navigator.language);
        if (nav) return nav;
      }
    } catch (e) {}
    return 'ru';
  }

  setLanguage(lang) {
    const n = this._normalizeLang(lang) || 'ru';
    this.lang = n;
    try {
      localStorage.setItem('blockblast_custom_lang', n);
    } catch (e) {}
    this.updateUIMode();
    if (window.game && typeof window.game.onLanguageChanged === 'function') {
      window.game.onLanguageChanged(n);
    }
  }

  t(key, fallback = '') {
    const dict = this.i18n[this.lang] || this.i18n.ru;
    return dict[key] || (this.i18n.ru && this.i18n.ru[key]) || fallback || key;
  }

  updateUIMode() {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = this.lang;
    }
    const dict = this.i18n[this.lang] || this.i18n.ru;

    const setTxt = (id, key) => {
      const el = document.getElementById(id);
      if (el && dict[key]) el.textContent = dict[key];
    };
    const setTip = (id, key) => {
      const el = document.getElementById(id);
      if (el && typeof el.setAttribute === 'function' && dict[key]) el.setAttribute('title', dict[key]);
    };

    setTxt('lbl-score', 'score');
    setTxt('lbl-best', 'best');
    setTxt('lbl-hold', 'hold');
    setTxt('lbl-hold-hint', 'holdEmpty');
    setTip('mascot-emote', 'tipMascot');

    setTxt('btn-mode-classic', 'classic');
    setTxt('btn-mode-levels', 'levels');
    setTxt('btn-mode-duel', 'duel');
    setTxt('btn-mode-bomb', 'bomb');
    setTxt('btn-mode-time', 'time');

    setTxt('btn-diff-easy', 'easy');
    setTxt('btn-diff-normal', 'normal');
    setTxt('btn-diff-hard', 'hard');

    setTxt('bot-status-txt', 'botActive');

    setTip('btn-sound', 'tipSound');
    setTip('btn-ultimate', 'tipUltimate');
    setTip('btn-trophies', 'tipTrophies');
    setTip('btn-daily-calendar', 'tipDaily');
    setTip('btn-levels-modal', 'tipLevels');
    setTip('btn-quests', 'tipQuests');
    setTip('btn-shop', 'tipShop');
    setTip('btn-scratch', 'tipScratch');
    setTip('btn-wheel', 'tipWheel');
    setTip('btn-leaderboard', 'tipLeaderboard');
    setTip('btn-restart', 'tipRestart');
    setTip('btn-shortcut', 'tipShortcut');

    setTip('booster-undo', 'tipUndo');
    setTip('booster-hammer', 'tipHammer');
    setTip('booster-bomb', 'tipBomb');
    setTip('booster-shuffle', 'tipShuffle');
    setTip('btn-settings', 'tipSettings');
    setTip('btn-pause-game', 'tipPause');

    setTxt('settings-title', 'settingsTitle');
    setTxt('lbl-settings-lang', 'lblSettingsLang');
    setTxt('lbl-settings-sound', 'lblSettingsSound');
    setTxt('btn-resume-txt', 'btnResume');
    setTxt('btn-settings-restart-txt', 'btnRestartGame');
    setTxt('btn-pause-home-txt', 'btnHomeMenu');

    const badgeEl = document.getElementById('menu-title-badge');
    if (badgeEl) {
      if (this.lang === 'ru') {
        badgeEl.textContent = 'МАНИЯ БЛОКОВ';
        badgeEl.style.display = 'inline-block';
      } else {
        badgeEl.textContent = '';
        badgeEl.style.display = 'none';
      }
    }
    setTxt('menu-sub-txt', 'menuSubtitle');
    setTxt('btn-menu-play-txt', 'btnPlayGame');
    setTxt('lbl-menu-best', 'lblMenuBest');
    setTxt('lbl-menu-coins', 'lblMenuCoins');
    setTxt('lbl-menu-modes', 'lblSelectMode');
    setTxt('menu-txt-classic', 'classic');
    setTxt('menu-txt-levels', 'levels');
    setTxt('menu-txt-duel', 'duel');
    setTxt('menu-txt-bomb', 'bomb');
    setTxt('menu-txt-time', 'time');

    setTxt('no-moves-title', 'noMoves');
    setTxt('btn-quick-restart-txt', 'startAgain');
    setTxt('ad-title', 'adCountdown');
    setTxt('scratch-title', 'scratchTitle');
  }

  _bridgeSend(method, params = {}, timeoutMs = 2500) {
    if (!this.vkBridge || typeof this.vkBridge.send !== 'function') {
      return Promise.reject(new Error('vkBridge unavailable'));
    }
    const callPromise = this.vkBridge.send(method, params);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${method} timeout`)), timeoutMs)
    );
    return Promise.race([callPromise, timeoutPromise]);
  }

  async init() {
    console.log('🎮 [VK Play SDK] Initializing SDK Manager...');
    this.deviceType = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

    const isInsideFrame = (typeof window !== 'undefined') && (window.self !== window.top);
    const hasVkParams = (typeof window !== 'undefined') && (
      window.location.search.includes('vk_') ||
      window.location.search.includes('appid') ||
      window.location.search.includes('sign')
    );
    const isVkContainer = isInsideFrame || hasVkParams;

    // 1. Check for VK Bridge (VK Mini Apps / VK Games) only when inside real container
    if (isVkContainer && typeof window !== 'undefined' && window.vkBridge && typeof window.vkBridge.send === 'function') {
      try {
        this.vkBridge = window.vkBridge;
        await this._bridgeSend('VKWebAppInit', {}, 2000);
        this.isInitialized = true;
        console.log('✅ [VK Bridge] Initialized successfully');

        if (typeof this.vkBridge.subscribe === 'function') {
          this.vkBridge.subscribe((e) => {
            if (!e || !e.detail) return;
            if (e.detail.type === 'VKWebAppViewHide') {
              window.dispatchEvent(new CustomEvent('game-mute-toggle', { detail: { muted: true } }));
            } else if (e.detail.type === 'VKWebAppViewRestore') {
              window.dispatchEvent(new CustomEvent('game-mute-toggle', { detail: { muted: false } }));
            }
          });
        }

        // Fetch user info from VK Bridge
        try {
          const user = await this._bridgeSend('VKWebAppGetUserInfo', {}, 2000);
          if (user) {
            this.player.uid = user.id;
            this.player.nick = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Игрок VK';
            this.player.avatar = user.photo_200 || user.photo_100 || '';
            this.player.isAuth = true;
            console.log('👤 [VK Bridge] User profile loaded:', this.player.nick);
          }
        } catch (e) {}
        return true;
      } catch (err) {
        console.warn('⚠️ [VK Bridge] Init warning or timeout (falling back):', err);
      }
    }

    // 2. Setup VK Play iframeApi callbacks
    const callbacks = {
      appid: parseInt(this.appId, 10) || 1,
      getLoginStatusCallback: (status) => this._onLoginStatus(status),
      userInfoCallback: (info) => this._onUserInfo(info),
      userProfileCallback: (profile) => this._onUserProfile(profile),
      registerUserCallback: (info) => this._onRegisterUser(info),
      adsCallback: (context) => this._onAdsCallback(context),
      paymentReceivedCallback: (data) => console.log('[VK Play] Payment received:', data),
      paymentWindowClosedCallback: () => console.log('[VK Play] Payment window closed')
    };

    // 3. Connect to window.iframeApi if present
    if (typeof window !== 'undefined' && typeof window.iframeApi === 'function') {
      try {
        const apiPromise = window.iframeApi(callbacks);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('iframeApi timeout')), 3500));
        const api = await Promise.race([apiPromise, timeoutPromise]);
        this.externalApi = api;
        this.isInitialized = true;
        console.log('✅ [VK Play JS API] Connected via iframeApi');
        try {
          if (typeof this.externalApi.getLoginStatus === 'function') this.externalApi.getLoginStatus();
          if (typeof this.externalApi.userProfile === 'function') this.externalApi.userProfile();
        } catch (e) {}
        return true;
      } catch (e) {
        console.warn('⚠️ [VK Play JS API] iframeApi init failed, using fallback:', e);
      }
    }

    // 4. Try dynamic loading if inside VK Play domain
    const isVkDomain = typeof window !== 'undefined' && (
      window.location.hostname.includes('vkplay') ||
      window.location.hostname.includes('mail.ru') ||
      (window.self !== window.top && this.urlParams.sign)
    );

    if (isVkDomain && typeof document !== 'undefined') {
      const loaded = await this._loadVkPlayScript(this.appId, callbacks);
      if (loaded) return true;
    }

    // 5. Local Mock Fallback
    console.log('ℹ️ [VK SDK] Running in local/mock mode (standalone or outside iframe)');
    this.initMock();
    return true;
  }

  _loadVkPlayScript(appId, callbacks) {
    return new Promise((resolve) => {
      let resolved = false;
      const done = (val) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(val);
        }
      };

      const timer = setTimeout(() => {
        console.warn('[VK Play] mailru.core.js load timeout (3.5s), using fallback');
        done(false);
      }, 3500);

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `//vkplay.ru/app/${appId}/static/mailru.core.js`;
      script.onload = () => {
        if (typeof window.iframeApi === 'function') {
          const apiPromise = window.iframeApi(callbacks);
          const apiTimeout = new Promise((_, rej) => setTimeout(() => rej(new Error('api timeout')), 2500));
          Promise.race([apiPromise, apiTimeout]).then(
            (api) => {
              this.externalApi = api;
              this.isInitialized = true;
              console.log('✅ [VK Play JS API] Loaded mailru.core.js and connected!');
              try {
                if (typeof this.externalApi.getLoginStatus === 'function') this.externalApi.getLoginStatus();
                if (typeof this.externalApi.userProfile === 'function') this.externalApi.userProfile();
              } catch (e) {}
              done(true);
            },
            (err) => {
              console.warn('[VK Play] iframeApi error:', err);
              done(false);
            }
          );
        } else {
          done(false);
        }
      };
      script.onerror = () => {
        console.warn('[VK Play] mailru.core.js load failed, using local mock');
        done(false);
      };
      document.head.appendChild(script);
    });
  }

  _onLoginStatus(status) {
    console.log('👤 [VK Play] getLoginStatusCallback:', status);
    if (!status) return;
    const s = typeof status.loginStatus !== 'undefined' ? status.loginStatus : status;
    if (s === 0) {
      this.player.isAuth = false;
    } else if (s === 1) {
      console.log('👤 [VK Play] User is authorized but not registered in game. Registering...');
      if (this.externalApi && typeof this.externalApi.registerUser === 'function') {
        this.externalApi.registerUser();
      }
    } else if (s === 2 || s === 3) {
      this.player.isAuth = true;
      if (this.externalApi) {
        if (typeof this.externalApi.userInfo === 'function') this.externalApi.userInfo();
        if (typeof this.externalApi.userProfile === 'function') this.externalApi.userProfile();
      }
    }
  }

  _onUserInfo(info) {
    console.log('👤 [VK Play] userInfoCallback:', info);
    if (info && info.status === 'ok') {
      if (info.uid) this.player.uid = info.uid;
      this.player.isAuth = true;
    }
  }

  _onUserProfile(profile) {
    console.log('👤 [VK Play] userProfileCallback:', profile);
    if (profile && profile.status === 'ok') {
      if (profile.uid) this.player.uid = profile.uid;
      if (profile.nick) this.player.nick = profile.nick;
      if (profile.avatar) this.player.avatar = profile.avatar;
      this.player.isAuth = true;
    }
  }

  _onRegisterUser(info) {
    console.log('👤 [VK Play] registerUserCallback:', info);
    if (info && info.status === 'ok') {
      console.log('🔄 [VK Play] Registration successful. Reloading iframe window to sync token...');
      if (this.externalApi && typeof this.externalApi.reloadWindow === 'function') {
        this.externalApi.reloadWindow();
      }
    }
  }

  _onAdsCallback(context) {
    console.log('📺 [VK Play] adsCallback received:', context);
    if (!this.activeAdSession) return;

    const session = this.activeAdSession;
    const type = context ? context.type : null;

    if (type === 'adCompleted') {
      console.log('✅ [VK Play] Ad completed!');
      session.completed = true;
      if (session.isRewarded && !session.rewardGranted && typeof session.onRewarded === 'function') {
        session.rewardGranted = true;
        try {
          session.onRewarded();
        } catch (err) {
          console.error('[VK Play] Error in onRewarded callback:', err);
        }
      }
      // Set short safety fallback timer in case adDismissed is omitted by ad network
      if (!session.dismissFallbackTimer) {
        session.dismissFallbackTimer = setTimeout(() => {
          if (this.activeAdSession === session) {
            console.log('ℹ️ [VK Play] Auto-dismissing ad after adCompleted fallback');
            this._finishAdSession(true);
          }
        }, 1200);
      }
    } else if (type === 'adDismissed') {
      console.log('ℹ️ [VK Play] Ad dismissed/closed');
      const wasShown = session.completed || !session.isRewarded;
      this._finishAdSession(wasShown);
    } else if (type === 'adError') {
      console.warn('⚠️ [VK Play] Ad error occurred:', context ? context.code : 'unknown');
      if (typeof session.onError === 'function') {
        try {
          session.onError(context);
        } catch (err) {
          console.error('[VK Play] Error in onError callback:', err);
        }
      }
      this._finishAdSession(false);
    }
  }

  _finishAdSession(wasShown) {
    if (!this.activeAdSession) return;
    const session = this.activeAdSession;
    this.activeAdSession = null;

    if (session.watchdogTimer) {
      clearTimeout(session.watchdogTimer);
      session.watchdogTimer = null;
    }
    if (session.dismissFallbackTimer) {
      clearTimeout(session.dismissFallbackTimer);
      session.dismissFallbackTimer = null;
    }

    this.isAdShowing = false;
    this.lastAdTime = Date.now();

    this._muteAudio(false);

    if (typeof session.onClose === 'function') {
      try {
        session.onClose(wasShown);
      } catch (e) {
        console.error('Error in ad onClose callback:', e);
      }
    }

    if (window.game && !session.wasPausedBeforeAd) {
      const isModal = typeof window.game.isAnyModalOpen === 'function' ? window.game.isAnyModalOpen() : false;
      if (!isModal && !window.game.isGameOver && typeof window.game.resumeGame === 'function') {
        window.game.resumeGame();
      }
    }
  }

  initMock() {
    this.isInitialized = true;
    this.player = {
      uid: 'local_vk_player',
      nick: 'Игрок (VK Play)',
      avatar: '',
      isAuth: false
    };
  }

  _muteAudio(muted) {
    try {
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('game-mute-toggle', { detail: { muted: !!muted } }));
      }
    } catch (e) {}
    const sm = window.soundManager || window.audioManager;
    if (sm && typeof sm.setMuted === 'function') {
      sm.setMuted(muted);
    }
    if (window.game && typeof window.game.updateSoundUI === 'function') {
      window.game.updateSoundUI();
    }
  }

  _notifyGameplay(start) {
    // Gameplay lifecycle signal for analytics and focus
    try {
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('vk-gameplay-state', { detail: { active: !!start } }));
      }
    } catch (e) {}
  }

  ready() {
    console.log('✅ [VK Play SDK] Game ready acknowledged');
    this._notifyGameplay(true);
  }

  showFullscreenAd(options = {}) {
    const cb = options.callbacks || options;
    const onClose = cb.onClose || options.onClose;
    const onOpen = cb.onOpen || options.onOpen;
    const onError = cb.onError || options.onError;

    if (this.isAdShowing) {
      console.warn('[VK SDK] Ad already in progress, skipping duplicate call');
      if (onClose) onClose(false);
      return;
    }

    const now = Date.now();
    if (now - this.lastAdTime < this.AD_COOLDOWN_MS) {
      console.log('[VK SDK] Ad cooldown active, skipping interstitial');
      if (onClose) onClose(false);
      return;
    }

    const wasPausedBeforeAd = window.game ? !!window.game.isPaused : true;
    this.isAdShowing = true;
    this._muteAudio(true);
    this._notifyGameplay(false);

    if (window.game && typeof window.game.pauseGame === 'function') {
      window.game.pauseGame(false);
    }

    if (onOpen) {
      try { onOpen(); } catch (e) {}
    }

    // Safety watchdog timer to prevent infinite hang if platform fails to respond
    const watchdogTimer = setTimeout(() => {
      console.warn('⚠️ [VK SDK] Interstitial watchdog timeout (35s) triggered. Resuming game.');
      this._finishAdSession(false);
    }, 35000);

    this.activeAdSession = {
      isRewarded: false,
      completed: false,
      wasPausedBeforeAd,
      watchdogTimer,
      onClose,
      onError
    };

    // 1. Native VK Play iframeApi showAds
    if (this.externalApi && typeof this.externalApi.showAds === 'function') {
      try {
        console.log('📺 [VK Play] Calling externalApi.showAds({ interstitial: true })');
        this.externalApi.showAds({ interstitial: true });
        return;
      } catch (err) {
        console.warn('[VK Play] showAds failed:', err);
      }
    }

    // 2. VK Bridge Show Native Ads
    if (this.vkBridge && typeof this.vkBridge.send === 'function') {
      this._bridgeSend('VKWebAppShowNativeAds', { ad_format: 'interstitial' }, 35000)
        .then((data) => {
          this._finishAdSession(data && data.result);
        })
        .catch((err) => {
          console.warn('[VK Bridge] Ad error:', err);
          if (onError) {
            try { onError(err); } catch (e) {}
          }
          this._finishAdSession(false);
        });
      return;
    }

    // 3. Fallback / Mock Simulation
    setTimeout(() => {
      this._finishAdSession(true);
    }, 400);
  }

  showRewardedAd(options = {}) {
    const cb = options.callbacks || options;
    const onRewarded = cb.onRewarded || options.onRewarded;
    const onClose = cb.onClose || options.onClose;
    const onOpen = cb.onOpen || options.onOpen;
    const onError = cb.onError || options.onError;

    if (this.isAdShowing) {
      console.warn('[VK SDK] Ad already in progress, skipping duplicate call');
      if (onClose) onClose(false);
      return;
    }

    const wasPausedBeforeAd = window.game ? !!window.game.isPaused : true;
    this.isAdShowing = true;
    this._muteAudio(true);
    this._notifyGameplay(false);

    if (window.game && typeof window.game.pauseGame === 'function') {
      window.game.pauseGame(false);
    }

    if (onOpen) {
      try { onOpen(); } catch (e) {}
    }

    // Safety watchdog timer to prevent infinite hang if platform fails to respond
    const watchdogTimer = setTimeout(() => {
      console.warn('⚠️ [VK SDK] Rewarded video watchdog timeout (65s) triggered. Resuming game.');
      this._finishAdSession(false);
    }, 65000);

    this.activeAdSession = {
      isRewarded: true,
      completed: false,
      rewardGranted: false,
      wasPausedBeforeAd,
      watchdogTimer,
      onRewarded,
      onClose,
      onError
    };

    // 1. Native VK Play iframeApi showAds (interstitial: false means rewarded video)
    if (this.externalApi && typeof this.externalApi.showAds === 'function') {
      try {
        console.log('🎁 [VK Play] Calling externalApi.showAds({ interstitial: false }) for Rewarded Video');
        this.externalApi.showAds({ interstitial: false });
        return;
      } catch (err) {
        console.warn('[VK Play] showAds rewarded failed:', err);
      }
    }

    // 2. VK Bridge Rewarded Video
    if (this.vkBridge && typeof this.vkBridge.send === 'function') {
      this._bridgeSend('VKWebAppShowNativeAds', { ad_format: 'reward' }, 65000)
        .then((data) => {
          if (data && data.result) {
            if (onRewarded) {
              try { onRewarded(); } catch (e) { console.error('[VK Bridge] onRewarded callback error:', e); }
            }
            this._finishAdSession(true);
          } else {
            this._finishAdSession(false);
          }
        })
        .catch((err) => {
          console.warn('[VK Bridge] Rewarded ad error:', err);
          if (onError) {
            try { onError(err); } catch (e) {}
          }
          this._finishAdSession(false);
        });
      return;
    }

    // 3. Fallback / Mock Simulation (Grant reward smoothly for testing)
    setTimeout(() => {
      console.log('🎁 [Mock/Local] Rewarded video simulated. Granting reward.');
      if (onRewarded) {
        try { onRewarded(); } catch (e) {}
      }
      this._finishAdSession(true);
    }, 500);
  }

  showInterstitial(callbacks = {}) {
    return this.showFullscreenAd(callbacks);
  }

  showRewardedVideo(callbacks = {}) {
    return this.showRewardedAd(callbacks);
  }

  getBestScore() {
    return parseInt(localStorage.getItem('blockblast_best_score') || '0', 10);
  }

  saveBestScore(score) {
    const s = parseInt(score, 10) || 0;
    const current = this.getBestScore();
    if (s > current) {
      localStorage.setItem('blockblast_best_score', s.toString());
      this.mockData.bestScore = s;
      this.saveCloudData({ bestScore: s });
    }
  }

  _buildLocalSaveSnapshot() {
    const safeInt = (key, def) => {
      try {
        const v = parseInt(localStorage.getItem(key) || String(def), 10);
        return (!isNaN(v) && isFinite(v)) ? v : def;
      } catch (e) {
        return def;
      }
    };
    return {
      coins: safeInt('blockblast_coins', 100),
      bestScore: safeInt('blockblast_best_score', 0),
      maxUnlockedLevel: safeInt('blockblast_max_unlocked_level', 1),
      scratchTickets: safeInt('blockblast_scratch_tickets', 1),
      dailyStreak: safeInt('blockblast_daily_streak', 1),
      activeTheme: localStorage.getItem('blockblast_active_theme') || 'cyber',
      activeBg: localStorage.getItem('blockblast_active_bg') || 'space',
      boosters: {
        undo: safeInt('blockblast_b_undo', 2),
        hammer: safeInt('blockblast_b_hammer', 2),
        bomb: safeInt('blockblast_b_bomb', 1),
        shuffle: safeInt('blockblast_b_shuffle', 2)
      }
    };
  }

  async saveCloudData(data) {
    try {
      const localSnapshot = this._buildLocalSaveSnapshot();
      const existing = await this.loadCloudData();
      const updated = Object.assign({}, existing, localSnapshot, data || {});
      localStorage.setItem('blockblast_vk_cloud_cache', JSON.stringify(updated));

      // If VK Bridge is available, save to VK Cloud Storage
      if (this.vkBridge && typeof this.vkBridge.send === 'function') {
        try {
          await this._bridgeSend('VKWebAppStorageSet', {
            key: 'blockblast_progress',
            value: JSON.stringify(updated).slice(0, 4000)
          }, 2500);
        } catch (e) {}
      }
      return true;
    } catch (e) {
      console.warn('[VK SDK] saveCloudData error:', e);
      return false;
    }
  }

  async loadCloudData() {
    try {
      let data = null;
      if (this.vkBridge && typeof this.vkBridge.send === 'function') {
        try {
          const res = await this._bridgeSend('VKWebAppStorageGet', { keys: ['blockblast_progress'] }, 2500);
          if (res && res.keys && res.keys[0] && res.keys[0].value) {
            data = JSON.parse(res.keys[0].value);
          }
        } catch (e) {}
      }

      if (!data) {
        data = JSON.parse(localStorage.getItem('blockblast_vk_cloud_cache') || '{}');
      }

      const safeInt = (val, def) => {
        const n = parseInt(val, 10);
        return (!isNaN(n) && isFinite(n)) ? n : def;
      };

      if (data.coins !== undefined) {
        localStorage.setItem('blockblast_coins', safeInt(data.coins, 100).toString());
      }
      if (data.bestScore !== undefined) {
        localStorage.setItem('blockblast_best_score', safeInt(data.bestScore, 0).toString());
      }
      if (data.maxUnlockedLevel !== undefined) {
        localStorage.setItem('blockblast_max_unlocked_level', safeInt(data.maxUnlockedLevel, 1).toString());
      }
      if (data.scratchTickets !== undefined) {
        localStorage.setItem('blockblast_scratch_tickets', safeInt(data.scratchTickets, 1).toString());
      }
      if (data.dailyStreak !== undefined) {
        localStorage.setItem('blockblast_daily_streak', safeInt(data.dailyStreak, 1).toString());
      }
      if (data.activeTheme) {
        localStorage.setItem('blockblast_active_theme', data.activeTheme);
      }
      if (data.activeBg) {
        localStorage.setItem('blockblast_active_bg', data.activeBg);
      }
      if (data.boosters && typeof data.boosters === 'object') {
        ['undo', 'hammer', 'bomb', 'shuffle'].forEach(b => {
          if (data.boosters[b] !== undefined) {
            localStorage.setItem(`blockblast_b_${b}`, safeInt(data.boosters[b], 0).toString());
          }
        });
      }

      return data;
    } catch (err) {
      console.warn('[VK SDK] loadCloudData fallback to local:', err);
      return {};
    }
  }

  async loadLeaderboards() {
    const userBest = this.getBestScore();
    const playerName = (this.player && this.player.nick) ? this.player.nick : 'Игрок VK';

    return [
      { rank: 1, name: 'CyberMaster 👑', score: Math.max(8500, userBest + 1200) },
      { rank: 2, name: `${playerName} (Вы) 💎`, score: Math.max(6200, userBest) },
      { rank: 3, name: 'PixelNinja 🥇', score: Math.max(4800, userBest - 500) },
      { rank: 4, name: 'NeonKnight 🥈', score: 3400 },
      { rank: 5, name: 'BlockPro 🥉', score: 2100 }
    ];
  }

  promptReviewAtLevel(lvl) {
    console.log(`[VK SDK] Review prompt triggered at level ${lvl}`);
    // VK doesn't have review modal for web, player can be redirected or offered community bookmark
  }

  promptAuth() {
    if (this.externalApi && typeof this.externalApi.authUser === 'function') {
      try {
        console.log('👤 [VK Play] Opening auth dialog via externalApi.authUser()');
        this.externalApi.authUser();
        return true;
      } catch (e) {
        console.warn('Auth dialog error:', e);
      }
    }
    return false;
  }

  showBannerAdv() {
    if (this.vkBridge && typeof this.vkBridge.send === 'function') {
      return this.vkBridge.send('VKWebAppShowBannerAd', { banner_location: 'bottom' }).catch(() => {});
    }
    return Promise.resolve(false);
  }

  hideBannerAdv() {
    if (this.vkBridge && typeof this.vkBridge.send === 'function') {
      return this.vkBridge.send('VKWebAppHideBannerAd').catch(() => {});
    }
    return Promise.resolve(false);
  }

  showLeaderboardBox(score) {
    const s = score !== undefined ? score : this.getBestScore();
    if (this.vkBridge && typeof this.vkBridge.send === 'function') {
      return this.vkBridge.send('VKWebAppShowLeaderBoardBox', { user_result: s }).catch(e => {
        console.warn('[VK Bridge] Leaderboard box warning:', e);
      });
    }
    return Promise.resolve(false);
  }

  isPlayerAuthorized() {
    return !!(this.player && this.player.isAuth);
  }
}

// Global Singleton Instance & Aliases
window.vkSDK = new VKSDKManager();
window.vkPlay = window.vkSDK;
window.vkService = window.vkSDK;
