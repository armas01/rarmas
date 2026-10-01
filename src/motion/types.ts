import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger';
import type { SplitText as Split } from 'gsap/SplitText';

export type Cleanup = () => void;

export interface MotionContext {
  gsap: typeof Gsap;
  ScrollTrigger: typeof ST;
  SplitText: typeof Split;
  finePointer: boolean;
  /** true when prefers-reduced-motion matches: modules must use gentle, non-spatial motion only */
  reduced: boolean;
  /** data-motion-* attributes of the element, camelCased without the prefix (e.g. data-motion-delay → delay) */
  options: Record<string, string>;
}

export type MotionModule = (el: HTMLElement, ctx: MotionContext) => Cleanup | void;
