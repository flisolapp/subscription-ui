import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmClearDialog } from './confirm-clear-dialog';

describe('ConfirmClearDialog', () => {
  let component: ConfirmClearDialog;
  let fixture: ComponentFixture<ConfirmClearDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmClearDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmClearDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
