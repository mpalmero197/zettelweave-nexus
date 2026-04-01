import { useEffect, useRef } from 'react';

interface FocusAmbientSoundProps {
  sound: string;
  volume: number;
  isPlaying: boolean;
}

// Generate ambient sounds using Web Audio API — no external files needed
export function FocusAmbientSound({ sound, volume, isPlaying }: FocusAmbientSoundProps) {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | OscillatorNode | null>(null);

  useEffect(() => {
    if (sound === 'none' || !isPlaying) {
      cleanup();
      return;
    }

    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.3; // keep ambient subtle
    gain.connect(ctx.destination);
    ctxRef.current = ctx;
    gainRef.current = gain;

    if (sound === 'white-noise' || sound === 'brown-noise' || sound === 'rain') {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      if (sound === 'white-noise') {
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      } else if (sound === 'brown-noise') {
        let last = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.02 * white) / 1.02;
          data[i] = last * 3.5;
        }
      } else {
        // Rain-like: filtered noise with random amplitude modulation
        let last = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          last = (last + 0.04 * white) / 1.04;
          const mod = 0.5 + 0.5 * Math.sin(i / (ctx.sampleRate * 0.3));
          data[i] = last * 2.5 * mod;
        }
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(gain);
      src.start();
      sourceRef.current = src;
    } else if (sound === 'binaural') {
      // Create binaural beat: 200Hz left, 210Hz right (10Hz alpha)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const merger = ctx.createChannelMerger(2);
      osc1.frequency.value = 200;
      osc2.frequency.value = 210;
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.connect(merger, 0, 0);
      osc2.connect(merger, 0, 1);
      merger.connect(gain);
      osc1.start();
      osc2.start();
      sourceRef.current = osc1; // store one for cleanup
      // Store osc2 to stop it too
      (sourceRef.current as any).__osc2 = osc2;
    }

    return () => cleanup();
  }, [sound, isPlaying]);

  // Update volume without re-creating context
  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = volume * 0.3;
    }
  }, [volume]);

  function cleanup() {
    try {
      if (sourceRef.current) {
        (sourceRef.current as any).__osc2?.stop?.();
        sourceRef.current.stop?.();
        sourceRef.current.disconnect?.();
      }
    } catch {}
    try { ctxRef.current?.close(); } catch {}
    ctxRef.current = null;
    gainRef.current = null;
    sourceRef.current = null;
  }

  return null;
}
