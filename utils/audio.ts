
// Simple Arcade Synthesizer using Web Audio API
// No external assets required

let audioCtx: AudioContext | null = null;
let wakaOsc: OscillatorNode | null = null;
let wakaGain: GainNode | null = null;
let wakaInterval: number | null = null;

export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const createOscillator = (type: OscillatorType, freq: number, duration: number, vol: number = 0.1) => {
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(vol, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
  
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

export const playSound = (type: 'intro' | 'waka' | 'eat_dot' | 'eat_ghost' | 'eat_fruit' | 'die' | 'siren') => {
  if (!audioCtx) return;

  switch (type) {
    case 'intro':
      const now = audioCtx.currentTime;
      const notes = [
        493.88, 987.77, 739.99, 622.25, 987.77, 739.99, 622.25, 
        1046.50, 2093.00, 1567.98, 1318.51, 2093.00, 1567.98, 1318.51,
        493.88, 987.77, 739.99, 622.25, 987.77, 739.99, 622.25,
        493.88
      ];
      notes.forEach((note, i) => {
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.type = 'square';
        osc.frequency.value = note;
        gain.gain.value = 0.1;
        gain.gain.linearRampToValueAtTime(0, now + i * 0.15 + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.start(now + i * 0.15);
        osc.stop(now + i * 0.15 + 0.14);
      });
      break;

    case 'eat_dot':
      createOscillator('triangle', 300, 0.05, 0.05);
      break;

    case 'eat_fruit':
      createOscillator('sine', 600, 0.1, 0.2);
      createOscillator('sine', 900, 0.2, 0.2);
      break;

    case 'eat_ghost':
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(2000, audioCtx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      break;

    case 'die':
      const dieOsc = audioCtx.createOscillator();
      const dieGain = audioCtx.createGain();
      dieOsc.type = 'sawtooth';
      dieOsc.frequency.setValueAtTime(500, audioCtx.currentTime);
      dieOsc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 1);
      dieOsc.frequency.linearRampToValueAtTime(20, audioCtx.currentTime + 1.2); // Sputter out
      
      // Volume flutter for classic sound
      dieGain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      dieGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.2);
      
      dieOsc.connect(dieGain);
      dieGain.connect(audioCtx.destination);
      dieOsc.start();
      dieOsc.stop(audioCtx.currentTime + 1.5);
      break;
  }
};

// Special handling for Waka loop to avoid stutter
export const startWaka = () => {
  if (!audioCtx || wakaOsc) return;
  
  wakaOsc = audioCtx.createOscillator();
  wakaGain = audioCtx.createGain();
  wakaOsc.type = 'triangle';
  wakaGain.gain.value = 0.05;
  
  wakaOsc.connect(wakaGain);
  wakaGain.connect(audioCtx.destination);
  wakaOsc.start();

  let toggle = false;
  wakaInterval = window.setInterval(() => {
    if (wakaOsc && audioCtx) {
        wakaOsc.frequency.setValueAtTime(toggle ? 200 : 400, audioCtx.currentTime);
        toggle = !toggle;
    }
  }, 150);
};

export const stopWaka = () => {
  if (wakaOsc) {
    try { wakaOsc.stop(); } catch(e) {}
    wakaOsc.disconnect();
    wakaOsc = null;
  }
  if (wakaGain) {
    wakaGain.disconnect();
    wakaGain = null;
  }
  if (wakaInterval) {
    clearInterval(wakaInterval);
    wakaInterval = null;
  }
};
