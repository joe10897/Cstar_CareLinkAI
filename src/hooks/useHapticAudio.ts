/* Hallmark · pre-emit critique: P5 H5 E5 S4 R5 V4 */
import { useCallback, useState } from 'react';

const STORAGE_KEY = 'carelink_haptic_audio_enabled_v1';

export interface UseHapticAudioResult {
  hapticEnabled: boolean;
  toggleHapticAudio: () => void;
  triggerWaterDropTap: () => void;
  triggerConfirmChord: () => void;
}

export function useHapticAudio(): UseHapticAudioResult {
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const playTone = useCallback(
    (kind: 'tap' | 'confirm') => {
      if (!hapticEnabled || typeof window === 'undefined') return;

      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(kind === 'confirm' ? [12, 30, 18] : 8);
        } catch {
          // 忽略瀏覽器權限限制
        }
      }

      try {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;

        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        if (kind === 'tap') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(520, now + 0.045);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.05);
        } else {
          const notes = [523.25, 659.25, 783.99];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.045);
            gain.gain.setValueAtTime(0.07, now + idx * 0.045);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.045 + 0.14);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now + idx * 0.045);
            osc.stop(now + idx * 0.045 + 0.15);
          });
        }
      } catch {
        // 忽略自動播放阻擋
      }
    },
    [hapticEnabled]
  );

  const toggleHapticAudio = useCallback(() => {
    setHapticEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // 忽略
      }
      return next;
    });
  }, []);

  const triggerWaterDropTap = useCallback(() => {
    playTone('tap');
  }, [playTone]);

  const triggerConfirmChord = useCallback(() => {
    playTone('confirm');
  }, [playTone]);

  return {
    hapticEnabled,
    toggleHapticAudio,
    triggerWaterDropTap,
    triggerConfirmChord,
  };
}
