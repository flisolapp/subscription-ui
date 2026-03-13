import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EventEmitterService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static readonly emitters: Record<string, EventEmitter<any>> = {};

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static get(name: string): EventEmitter<any> {
    if (!this.emitters[name]) {
      this.emitters[name] = new EventEmitter();
    }
    return this.emitters[name];
  }
}
