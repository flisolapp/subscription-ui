import { Component, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatError, MatFormField, MatHint, MatInput, MatLabel } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AsyncPipe, CommonModule } from '@angular/common';
import { debounceTime, map, Observable, startWith, Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PageStructure } from '../../components/page-structure/page-structure';
import { FormStorageService } from '../../services/form-storage/form-storage-service';
import { CustomValidators } from '../../forms/custom-validators/custom-validators';
import {
  buildDisplayLabel,
  filterOptions,
  formatCpf,
  formatPhone,
  getControlError,
} from '../../forms/form-field/form-field';
import { DISTROS, SelectOption, STATES_BR, STUDENT_OPTIONS } from '../../constants/form-options';
import { STORAGE_KEYS } from '../../constants/storage-keys';
import { SNACK_DURATION } from '../../app.config';

@Component({
  selector: 'app-form-participant',
  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    TranslatePipe,
    PageStructure,
    MatFormField,
    MatLabel,
    MatError,
    MatHint,
    MatInput,
    MatRadioGroup,
    MatRadioButton,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    MatButton,
    MatIcon,
    MatIconButton,
  ],
  templateUrl: './form-participant.html',
  styleUrl: './form-participant.scss',
})
export class FormParticipant implements OnInit, OnDestroy {
  public submitted: WritableSignal<boolean> = signal<boolean>(false);
  public restoredSig: WritableSignal<boolean> = signal(false);

  public form!: FormGroup;

  public readonly distros: SelectOption[] = DISTROS;
  public readonly studentOptions: SelectOption[] = STUDENT_OPTIONS;
  public readonly statesBr: SelectOption[] = STATES_BR;

  public filteredDistros$!: Observable<SelectOption[]>;
  public filteredStates$!: Observable<SelectOption[]>;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly snackBar: MatSnackBar,
    private readonly storage: FormStorageService,
    private readonly translate: TranslateService,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  public ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      federalCode: ['', [Validators.required, CustomValidators.cpfValidator]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, CustomValidators.phoneValidator]],
      usesFreeSoftware: ['', Validators.required],
      distro: ['', Validators.required],
      isStudent: ['', Validators.required],
      institution: ['', [Validators.required, Validators.minLength(3)]],
      course: ['', [Validators.required, Validators.minLength(3)]],
      state: ['', Validators.required],
    });

    this.filteredDistros$ = this.form.get('distro')!.valueChanges.pipe(
      startWith(''),
      takeUntil(this.destroy$),
      map((v) => filterOptions(v ?? '', this.distros)),
    );

    this.filteredStates$ = this.form.get('state')!.valueChanges.pipe(
      startWith(''),
      takeUntil(this.destroy$),
      map((v) => filterOptions(v ?? '', this.statesBr)),
    );

    this.restoreFromStorage();
    this.setupAutoSave();
    this.restoredSig.set(true);
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Input masks ────────────────────────────────────────────────────────────

  public onFederalCodeInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.form.get('federalCode')!.setValue(formatCpf(raw), { emitEvent: false });
  }

  public onPhoneInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    this.form.get('phone')!.setValue(formatPhone(raw), { emitEvent: false });
  }

  // ── Autocomplete helpers ───────────────────────────────────────────────────

  public displayLabel(options: SelectOption[]): (value: string) => string {
    return buildDisplayLabel(options, this.translate);
  }

  public selectOption(controlName: string, option: SelectOption): void {
    this.form.get(controlName)!.setValue(option.value);
  }

  // ── Validation helpers ─────────────────────────────────────────────────────

  public getError(controlName: string): string | null {
    return getControlError(this.form.get(controlName), this.submitted(), this.translate, {
      cpfInvalid: 'formParticipant.federalCodeInvalid',
    });
  }

  public hasError(controlName: string): boolean {
    return !!this.getError(controlName);
  }

  // ── Submit / Back ──────────────────────────────────────────────────────────

  public onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snackBar.open(
        this.translate.instant('formErrors.summary'),
        this.translate.instant('common.ok'),
        {
          duration: SNACK_DURATION,
        },
      );
      return;
    }

    this.router.navigate(['/subscribe/participant/review'], {
      state: { payload: this.form.getRawValue() },
    });
  }

  public onBack(): void {
    this.router.navigate(['/subscribe']);
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  private restoreFromStorage(): void {
    try {
      const saved = this.storage.load<Record<string, unknown>>(STORAGE_KEYS.PARTICIPANT, {});
      if (Object.keys(saved).length > 0) {
        this.form.patchValue(saved, { emitEvent: false });
      }
    } catch (err) {
      console.error('FormParticipant: error restoring storage', err);
    }
  }

  private setupAutoSave(): void {
    this.form.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => this.saveToStorage());
  }

  private saveToStorage(): void {
    this.storage.save(STORAGE_KEYS.PARTICIPANT, this.form.getRawValue());
  }

  private clearStorage(): void {
    this.storage.clear(STORAGE_KEYS.PARTICIPANT);
  }
}
