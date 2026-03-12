import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EventEmitterService {
  private static emitters: {
    [name: string]: EventEmitter<any>;
  } = {};

  static get(name: string): EventEmitter<any> {
    if (!this.emitters[name])
      //
      this.emitters[name] = new EventEmitter<any>();

    return this.emitters[name];
  }
}
