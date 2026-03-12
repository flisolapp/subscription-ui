import { Component, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatError, MatFormField, MatHint, MatInput, MatLabel } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe, CommonModule } from '@angular/common';
import { debounceTime, map, Observable, startWith, Subject, takeUntil } from 'rxjs';
import { PageStructure } from '../../components/page-structure/page-structure';
import { FormStorageService } from '../../services/form-storage/form-storage-service';

// ── Storage key ───────────────────────────────────────────────────────────────
const KEY_PARTICIPANT = 'flisol_form_participant';

// ── CPF Validator ─────────────────────────────────────────────────────────────
export function cpfValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value ?? '').replace(/\D/g, '');
  if (!raw) return null;
  if (raw.length !== 11 || /^(\d)\1{10}$/.test(raw)) return { cpfInvalid: true };
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +raw[i] * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== +raw[9]) return { cpfInvalid: true };
  sum = 0;
  for (let i = 0; i < 10; i++) sum += +raw[i] * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r !== +raw[10] ? { cpfInvalid: true } : null;
}

// ── Phone Validator ───────────────────────────────────────────────────────────
export function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value ?? '').replace(/\D/g, '');
  if (!raw) return null;
  return raw.length >= 10 && raw.length <= 11 ? null : { phoneInvalid: true };
}

// ── Option types & static data ────────────────────────────────────────────────
export interface SelectOption {
  value: string;
  label: string;
}

export const DISTROS: SelectOption[] = [
  { value: '1', label: 'Não uso Linux' },
  { value: '2', label: 'BigLinux' },
  { value: '3', label: 'Debian' },
  { value: '4', label: 'Duzeru' },
  { value: '5', label: 'Educatux' },
  { value: '6', label: 'Elementary OS' },
  { value: '7', label: 'Fedora' },
  { value: '8', label: 'Kaiana' },
  { value: '9', label: 'Kali Linux' },
  { value: '10', label: 'LinuxMint' },
  { value: '11', label: 'LXLE' },
  { value: '12', label: 'SlackWare' },
  { value: '13', label: 'Suse' },
  { value: '14', label: 'Tails' },
  { value: '15', label: 'Trisquel' },
  { value: '16', label: 'Ubuntu/Kubuntu' },
  { value: '17', label: 'Outro' },
];

export const STUDENT_OPTIONS: SelectOption[] = [
  { value: '1', label: 'Sim, no ensino médio' },
  { value: '2', label: 'Sim, no ensino médio técnico' },
  { value: '3', label: 'Sim, no ensino superior' },
  { value: '4', label: 'Não, já terminei o ensino superior' },
  { value: '5', label: 'Não, estou apenas trabalhando' },
  { value: '6', label: 'Não estou estudando, nem trabalhando' },
  { value: '7', label: 'Não, sou professor' },
  { value: '8', label: 'Outro' },
];

export const STATES_BR: SelectOption[] = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-form-participant',
  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
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
    private readonly storage: FormStorageService,
  ) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  public ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      federalCode: ['', [Validators.required, cpfValidator]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, phoneValidator]],
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
      map((v) => this._filter(v ?? '', this.distros)),
    );

    this.filteredStates$ = this.form.get('state')!.valueChanges.pipe(
      startWith(''),
      takeUntil(this.destroy$),
      map((v) => this._filter(v ?? '', this.statesBr)),
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
  public applyFederalCodeMask(event: Event): void {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 9) v = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9)}`;
    else if (v.length > 6) v = `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
    else if (v.length > 3) v = `${v.slice(0, 3)}.${v.slice(3)}`;
    this.form.get('federalCode')!.setValue(v, { emitEvent: true });
  }

  public applyPhoneMask(event: Event): void {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    else if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    else if (v.length > 0) v = `(${v}`;
    this.form.get('phone')!.setValue(v, { emitEvent: true });
  }

  // ── Autocomplete helpers ───────────────────────────────────────────────────
  public displayLabel(options: SelectOption[]): (value: string) => string {
    return (value: string) => options.find((o) => o.value === value)?.label ?? value ?? '';
  }

  public selectOption(controlName: string, option: SelectOption): void {
    this.form.get(controlName)!.setValue(option.value);
  }

  // ── Validation helpers ─────────────────────────────────────────────────────
  public getError(controlName: string): string | null {
    const ctrl = this.form.get(controlName);
    if (!ctrl) return null;
    if (!this.submitted() && !ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'Este campo é obrigatório.';
    if (ctrl.hasError('minlength'))
      return `Mínimo de ${ctrl.errors!['minlength'].requiredLength} caracteres.`;
    if (ctrl.hasError('email')) return 'Informe um e-mail válido.';
    if (ctrl.hasError('cpfInvalid')) return 'CPF inválido. Verifique os dígitos.';
    if (ctrl.hasError('phoneInvalid')) return 'Número de telefone inválido.';
    return null;
  }

  public hasError(controlName: string): boolean {
    return !!this.getError(controlName);
  }

  // ── Submit / Back ──────────────────────────────────────────────────────────
  public onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

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
      const saved = this.storage.load<Record<string, unknown>>(KEY_PARTICIPANT, {});
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
    this.storage.save(KEY_PARTICIPANT, this.form.getRawValue());
  }

  private clearStorage(): void {
    this.storage.clear(KEY_PARTICIPANT);
  }

  // ── Private ────────────────────────────────────────────────────────────────
  private _filter(val: string, list: SelectOption[]): SelectOption[] {
    if (!val || list.some((o) => o.value === val)) return list;
    const q = val.toLowerCase();
    return list.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }
}
