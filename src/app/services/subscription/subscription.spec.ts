import { TestBed } from '@angular/core/testing';

import { Subscription } from './subscription';

describe('Subscription', () => {
  let service: Subscription;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Subscription);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
