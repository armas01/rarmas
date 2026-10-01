import type { MotionModule } from '../types';
import { revealWords } from './reveal-words';
import { revealUp } from './reveal-up';
import { scrubWords } from './scrub-words';
import { counter } from './counter';
import { cursorGlow } from './cursor-glow';
import { heroScale } from './hero-scale';
import { magnetic } from './magnetic';
import { tilt } from './tilt';

export const modules: Record<string, MotionModule> = {
  'reveal-words': revealWords,
  'reveal-up': revealUp,
  'scrub-words': scrubWords,
  counter,
  'cursor-glow': cursorGlow,
  'hero-scale': heroScale,
  magnetic,
  tilt,
};
