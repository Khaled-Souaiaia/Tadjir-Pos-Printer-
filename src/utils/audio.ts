// نظام المؤثرات الصوتية لنقطة البيع (يعمل 100% Offline باستخدام Web Audio API بدون ملفات خارجية)
// Web Audio API Synthesizer for POS hardware feedback (No external assets required)

class SoundService {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // التحقق من تفعيل الصوت في الإعدادات
    const saved = localStorage.getItem('dzpos_sound_enabled');
    this.soundEnabled = saved !== 'false';
  }

  private getContext(): AudioContext | null {
    if (!this.soundEnabled) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    localStorage.setItem('dzpos_sound_enabled', enabled ? 'true' : 'false');
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  // صوت قراءة الباركود السريع (Supermarket Beep)
  public playScanBeep(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, ctx.currentTime); // نغمة A6 واضحة وسريعة

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // تجاهل إذا كان المتصفح يمنع تشغيل الصوت قبل التفاعل
    }
  }

  // صوت إتمام البيع والقبض بنجاح (Cash Register / Success Chime)
  public playCheckoutSuccess(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 (نغمات بهيجة)

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.12, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.25);
      });
    } catch {
      // ignore
    }
  }

  // صوت تنبيه الخطأ أو نفاد المخزون (Alert Beep)
  public playAlert(): void {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
    } catch {
      // ignore
    }
  }
}

export const sound = new SoundService();
