import { beforeEach, describe, expect, it } from 'vitest';
import { EventEmitter } from '@angular/core';
import { EventEmitterService } from './event-emitter-service';

describe('EventEmitterService', () => {
  beforeEach(() => {
    // Clear emitters before each test to avoid cross-test pollution
    (EventEmitterService as any).emitters = {};
  });

  it('should create a new EventEmitter if not existing', () => {
    const emitter = EventEmitterService.get('testEvent');

    expect(emitter).toBeDefined();
    expect(emitter instanceof EventEmitter).toBe(true);
  });

  it('should return the same EventEmitter instance for the same name', () => {
    const emitter1 = EventEmitterService.get('testEvent');
    const emitter2 = EventEmitterService.get('testEvent');

    expect(emitter1).toBe(emitter2);
  });

  it('should emit and listen to events', async () => {
    const emitter = EventEmitterService.get('customEvent');

    const received = await new Promise<string>((resolve) => {
      const sub = emitter.subscribe((value: string) => {
        sub.unsubscribe(); // avoid leaking subscriptions in tests
        resolve(value);
      });

      emitter.emit('Hello World');
    });

    expect(received).toBe('Hello World');
  });
});
