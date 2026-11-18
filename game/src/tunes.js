// tunes.js — sound for Neon Bay v3, all synthesized with WebAudio: an
// engine hum that follows speed, three procedural radio stations (synthwave,
// coastal jazz, bassline drive), a two-tone police siren, and effects for
// gunshots, punches, pickups, cash and the BUSTED sting. No audio files.
export function createSoundBank() {
  const bank = {
    ctx: null, master: null, engineOsc: null, engineGain: null,
    sirenOsc: null, sirenGain: null, radioTimer: null, radioStep: 0,
    station: 0, muted: false,
    stations: [
      { name: 'NEON FM — Synthwave', bass: [55, 55, 65.4, 49], lead: [220, 261.6, 329.6, 392] },
      { name: 'BAY 101 — Coastal Jazz', bass: [65.4, 58.3, 49, 55], lead: [329.6, 392, 440, 523.3] },
      { name: 'TURBO — Bassline Drive', bass: [41.2, 41.2, 55, 61.7], lead: [164.8, 196, 246.9, 293.7] },
    ],
    init() {
      if (bank.ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        bank.ctx = new AC();
        bank.master = bank.ctx.createGain();
        bank.master.gain.value = 0.5;
        bank.master.connect(bank.ctx.destination);
        bank.engineOsc = bank.ctx.createOscillator();
        bank.engineOsc.type = 'sawtooth';
        bank.engineOsc.frequency.value = 55;
        bank.engineGain = bank.ctx.createGain();
        bank.engineGain.gain.value = 0;
        bank.engineOsc.connect(bank.engineGain);
        bank.engineGain.connect(bank.master);
        bank.engineOsc.start();
        bank.sirenOsc = bank.ctx.createOscillator();
        bank.sirenOsc.type = 'square';
        bank.sirenOsc.frequency.value = 700;
        bank.sirenGain = bank.ctx.createGain();
        bank.sirenGain.gain.value = 0;
        bank.sirenOsc.connect(bank.sirenGain);
        bank.sirenGain.connect(bank.master);
        bank.sirenOsc.start();
        bank.radioTimer = setInterval(() => bank.radioTick(), 240);
      } catch (err) {
        bank.ctx = null;
      }
    },
    radioTick() {
      if (!bank.ctx || bank.muted) return;
      const st = bank.stations[bank.station];
      const i = bank.radioStep % 8;
      bank.radioStep += 1;
      const bassNote = st.bass[Math.floor(i / 2) % st.bass.length];
      bank.blip(bassNote, 0.22, 'triangle', 0.1);
      if (i % 2 === 0) {
        const lead = st.lead[(bank.radioStep >> 1) % st.lead.length];
        bank.blip(lead * 2, 0.16, 'sine', 0.045);
      }
      if (i === 4) bank.blip(880, 0.05, 'square', 0.02);
    },
    blip(freq, dur, type, vol) {
      if (!bank.ctx) return;
      const o = bank.ctx.createOscillator();
      const g = bank.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol ?? 0.1, bank.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, bank.ctx.currentTime + dur);
      o.connect(g);
      g.connect(bank.master);
      o.start();
      o.stop(bank.ctx.currentTime + dur);
    },
    noise(dur, vol, freq) {
      if (!bank.ctx) return;
      const len = Math.floor(bank.ctx.sampleRate * dur);
      const buf = bank.ctx.createBuffer(1, len, bank.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = bank.ctx.createBufferSource();
      src.buffer = buf;
      const f = bank.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = freq || 1800;
      const g = bank.ctx.createGain();
      g.gain.value = vol || 0.25;
      src.connect(f);
      f.connect(g);
      g.connect(bank.master);
      src.start();
    },
    setEngine(mph, inCar) {
      if (!bank.ctx) return;
      const target = inCar ? 0.05 + Math.min(0.12, mph / 900) : 0;
      bank.engineGain.gain.setTargetAtTime(target, bank.ctx.currentTime, 0.1);
      bank.engineOsc.frequency.setTargetAtTime(48 + mph * 1.6, bank.ctx.currentTime, 0.1);
    },
    setSiren(wanted) {
      if (!bank.ctx) return;
      if (wanted > 0) {
        const f = Math.sin(Date.now() / 380) > 0 ? 780 : 620;
        bank.sirenOsc.frequency.setTargetAtTime(f, bank.ctx.currentTime, 0.05);
        bank.sirenGain.gain.setTargetAtTime(0.035, bank.ctx.currentTime, 0.2);
      } else {
        bank.sirenGain.gain.setTargetAtTime(0, bank.ctx.currentTime, 0.2);
      }
    },
    sirenBlip() { bank.blip(920, 0.16, 'square', 0.06); },
    shot() { bank.noise(0.14, 0.3, 2400); },
    punch() { bank.noise(0.09, 0.22, 500); bank.blip(90, 0.1, 'sine', 0.2); },
    pickup() { bank.blip(660, 0.09, 'sine', 0.12); setTimeout(() => bank.blip(880, 0.12, 'sine', 0.12), 90); },
    cash() { bank.blip(990, 0.08, 'sine', 0.1); setTimeout(() => bank.blip(1320, 0.14, 'sine', 0.1), 80); },
    click() { bank.blip(440, 0.05, 'square', 0.06); },
    thud() { bank.noise(0.16, 0.3, 300); },
    busted() { bank.blip(392, 0.25, 'square', 0.1); setTimeout(() => bank.blip(311, 0.3, 'square', 0.1), 220); setTimeout(() => bank.blip(233, 0.5, 'square', 0.1), 480); },
    nextStation() {
      bank.station = (bank.station + 1) % bank.stations.length;
      bank.radioStep = 0;
      bank.click();
    },
    stationName() { return bank.stations[bank.station].name; },
    toggleMute() {
      bank.muted = !bank.muted;
      if (bank.master) bank.master.gain.value = bank.muted ? 0 : 0.5;
      return bank.muted;
    },
  };
  return bank;
}
