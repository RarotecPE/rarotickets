import type { IClock } from '@core/contracts/clock.contract';

export class SystemClock implements IClock {
  public now(): Date {
    return new Date();
  }
}
