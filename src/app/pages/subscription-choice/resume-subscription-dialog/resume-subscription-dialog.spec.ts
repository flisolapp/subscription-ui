import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResumeSubscriptionDialog } from './resume-subscription-dialog';

describe('ResumeSubscriptionDialog', () => {
  let component: ResumeSubscriptionDialog;
  let fixture: ComponentFixture<ResumeSubscriptionDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumeSubscriptionDialog],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumeSubscriptionDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
