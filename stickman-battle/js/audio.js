'use strict';
// Tiny synthesized sound effects (WebAudio) - no asset files needed.
const Sfx = (() => {
  let ctx = null, master = null, nbuf = null, on = true;

  function init() {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.45;
        master.connect(ctx.destination);
        nbuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
        const d = nbuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
  }

  function tone(f, f2, dur, type, vol, delay) {
    if (!ctx || !on) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(dur, vol, f1, f2, type, delay) {
    if (!ctx || !on) return;
    const t = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource();
    s.buffer = nbuf;
    const fl = ctx.createBiquadFilter();
    fl.type = type || 'bandpass';
    fl.frequency.setValueAtTime(f1, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    fl.Q.value = 1.1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  }

  return {
    init,
    setEnabled(v) { on = !!v; },
    isEnabled() { return on; },
    swing(kb) { noise(0.16, 0.10 + (kb || 1) * 0.03, 500, 2600, 'bandpass'); },
    hit(kb) {
      const p = Math.min(2.4, kb || 1);
      tone(170, 45, 0.16, 'sine', 0.45 + p * 0.1);
      noise(0.09, 0.28, 1400, 400, 'lowpass');
    },
    block() { tone(900, 650, 0.09, 'square', 0.10); tone(1500, 1100, 0.07, 'triangle', 0.09, 0.01); },
    die() { tone(320, 55, 0.55, 'sawtooth', 0.16); noise(0.25, 0.25, 900, 150, 'lowpass'); },
    thunder() { noise(1.3, 0.34, 260, 50, 'lowpass', 0.12); noise(0.4, 0.2, 900, 120, 'lowpass', 0.1); },
    jump() { tone(240, 480, 0.12, 'sine', 0.10); },
    land() { noise(0.07, 0.10, 500, 200, 'lowpass'); },
    coin() { tone(880, 0, 0.08, 'square', 0.09); tone(1320, 0, 0.14, 'square', 0.09, 0.07); },
    click() { tone(620, 0, 0.04, 'square', 0.07); },
    no() { tone(180, 120, 0.15, 'square', 0.10); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0, 0.18, 'triangle', 0.16, i * 0.09)); },
    lose() { tone(330, 90, 0.7, 'sawtooth', 0.14); }
  };
})();
