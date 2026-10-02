import type { IClock } from '../../../@core/application/clock.interface.ts';

export abstract class Clock implements IClock {
  abstract now(): Date;
}
