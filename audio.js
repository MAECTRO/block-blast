/**
 * Procedural Sound Manager & Synthwave/Lofi BGM Generator using Web Audio API
 */
class SoundManager {
  constructor() {
    this.ctx = null;
    this.hasUserInteracted = false;
    this.isMuted = false;
    try {
      this.isMuted = localStorage.getItem('blockblast_sound_muted') === 'true';
    } catch (e) {}

    // BGM State
    this.bgmOsc1 = null;
    this.bgmOsc2 = null;
    this.bgmGain = null;
    this.bgmInterval = null;
    this.isBGMPlaying = false;

    // Platform § 1.3: Pause audio when tab loses focus or swiped away
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      } else {
        const isAdShowing = (window.vkSDK && window.vkSDK.isAdShowing);
        if (this.hasUserInteracted && this.ctx && this.ctx.state === 'suspended' && !this.isMuted && !isAdShowing) {
          this.ctx.resume().catch(() => {});
        }
      }
    });

    // VK Mini Apps Rule 2.2.5: Pause audio on VKWebAppViewHide and resume on VKWebAppViewRestore
    if (typeof window !== 'undefined' && window.vkBridge && typeof window.vkBridge.subscribe === 'function') {
      window.vkBridge.subscribe((e) => {
        if (!e || !e.detail) return;
        if (e.detail.type === 'VKWebAppViewHide') {
          if (this.ctx && this.ctx.state === 'running') {
            this.ctx.suspend().catch(() => {});
          }
        } else if (e.detail.type === 'VKWebAppViewRestore') {
          const isAdShowing = (window.vkSDK && window.vkSDK.isAdShowing);
          if (this.hasUserInteracted && this.ctx && this.ctx.state === 'suspended' && !this.isMuted && !isAdShowing) {
            this.ctx.resume().catch(() => {});
          }
        }
      });
    }

    // Listen for platform/SDK mute events
    window.addEventListener('game-mute-toggle', (e) => {
      if (e && e.detail && typeof e.detail.muted === 'boolean') {
        this.setMuted(e.detail.muted);
      }
    });

    // One-time user gesture unlock for browser Autoplay Policy & iOS Safari
    const unlockAudio = () => {
      this.hasUserInteracted = true;
      this.ensureContext();
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().then(() => {
            if (!this.isMuted && !this.isBGMPlaying) {
              this.startBGM();
            }
          }).catch(() => {});
        } else if (this.ctx.state === 'running') {
          if (!this.isMuted && !this.isBGMPlaying) {
            this.startBGM();
          }
        }
      }
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
  }

  init() {
    if (!this.ctx && this.hasUserInteracted) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended' && this.hasUserInteracted) {
      this.ctx.resume().catch(() => {});
    }
  }

  setMuted(muted) {
    if (muted) {
      this.isMuted = true;
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
      this.stopBGM();
    } else {
      let userWantsMuted = false;
      try {
        userWantsMuted = localStorage.getItem('blockblast_sound_muted') === 'true';
      } catch (e) {}
      if (userWantsMuted) {
        this.isMuted = true;
        return;
      }
      this.isMuted = false;
      if (this.hasUserInteracted && this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (this.hasUserInteracted && !this.isMuted) this.startBGM();
        }).catch(() => {});
      } else if (this.hasUserInteracted) {
        this.startBGM();
      }
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('blockblast_sound_muted', this.isMuted.toString());
    } catch (e) {}

    if (this.isMuted) {
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
      this.stopBGM();
    } else {
      if (this.hasUserInteracted && this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (!this.isMuted) this.startBGM();
        }).catch(() => {});
      } else if (this.hasUserInteracted) {
        this.startBGM();
      }
    }

    return this.isMuted;
  }

  playLineClear(streak = 1) {
    this.playClearLine(streak);
  }

  playTone(freq, type = 'sine', duration = 0.1, gainVal = 0.1, pitchDecay = false) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      if (pitchDecay) {
        osc.frequency.exponentialRampToValueAtTime(freq * 0.1, this.ctx.currentTime + duration);
      }

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playPickup() {
    this.playTone(440, 'sine', 0.08, 0.15);
  }

  playPlace() {
    this.playTone(220, 'triangle', 0.1, 0.2);
    setTimeout(() => this.playTone(180, 'sine', 0.08, 0.1), 30);
  }

  playClearLine(streak = 1) {
    const baseFreq = 300 + streak * 80;
    this.playTone(baseFreq, 'sine', 0.12, 0.25);
    setTimeout(() => this.playTone(baseFreq * 1.25, 'sine', 0.15, 0.25), 60);
    setTimeout(() => this.playTone(baseFreq * 1.5, 'triangle', 0.2, 0.2), 120);
  }

  playCombo(comboCount = 2) {
    const chord = [261.63, 329.63, 392.00, 523.25];
    chord.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq * (1 + comboCount * 0.1), 'sine', 0.25, 0.2);
      }, idx * 50);
    });
  }

  playHighScoreFanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.3, 0.3);
      }, idx * 100);
    });
  }

  playGameOver() {
    this.playTone(300, 'sawtooth', 0.4, 0.25, true);
  }

  /* Procedural Synthwave/Lofi BGM */
  startBGM() {
    if (!this.hasUserInteracted || this.isMuted || this.isBGMPlaying) return;
    this.ensureContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        if (!this.isMuted && !this.isBGMPlaying) {
          this.startBGM();
        }
      }).catch(() => {});
      return;
    }
    if (this.ctx.state !== 'running') return;

    this.isBGMPlaying = true;
    const chords = [
      [220.00, 261.63, 329.63], // Am
      [174.61, 220.00, 261.63], // F
      [130.81, 164.81, 196.00], // C
      [146.83, 185.00, 220.00]  // G
    ];

    let chordIdx = 0;

    this.bgmInterval = setInterval(() => {
      if (!this.isBGMPlaying || this.isMuted) return;
      const currentChord = chords[chordIdx % chords.length];
      chordIdx++;

      currentChord.forEach(freq => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const filter = this.ctx.createBiquadFilter();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(400, this.ctx.currentTime);

          gain.gain.setValueAtTime(0.015, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 1.8);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start();
          osc.stop(this.ctx.currentTime + 1.9);
        } catch (e) {}
      });
    }, 2000);
  }

  stopBGM() {
    this.isBGMPlaying = false;
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
  }
}

window.soundManager = new SoundManager();
window.audioManager = window.soundManager;
