import { Clock } from './clock.base.ts';

export class SystemClock extends Clock {
  public now(): Date {
    return new Date();
  }
}
