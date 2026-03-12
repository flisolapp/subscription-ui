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
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe, CommonModule } from '@angular/common';
import { debounceTime, map, Observable, startWith, Subject, takeUntil } from 'rxjs';
import { PageStructure } from '../../components/page-structure/page-structure';
import { DISTROS, SelectOption, STUDENT_OPTIONS } from '../form-participant/form-participant';
import { FormStorageService } from '../../services/form-storage/form-storage-service';

// ── Storage keys ──────────────────────────────────────────────────────────────
const KEY_COLLABORATOR = 'flisol_form_collaborator';
const KEY_SHIFTS = 'flisol_form_collaborator_disp';
const KEY_AREAS = 'flisol_form_collaborator_grupos';

// ── Phone Validator ───────────────────────────────────────────────────────────
function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const raw = (control.value ?? '').replace(/\D/g, '');
  if (!raw) return null;
  return raw.length >= 10 && raw.length <= 11 ? null : { phoneInvalid: true };
}

// ── Static data ───────────────────────────────────────────────────────────────
export const SHIFT_OPTIONS: SelectOption[] = [
  { value: '1', label: 'Manhã - Todos os dias' },
  { value: '2', label: 'Tarde - Todos os dias' },
  { value: '3', label: 'Noite - Todos os dias' },
  { value: '4', label: 'Sábado pela manhã' },
  { value: '5', label: 'Sábado pela tarde' },
];

export const COLLABORATION_AREAS: SelectOption[] = [
  { value: '1', label: 'Grupo 1 – Na busca por patrocínio e apoio' },
  { value: '2', label: 'Grupo 2 – Na publicidade e divulgação (redes sociais)' },
  { value: '3', label: 'Grupo 3 – Na organização do blog' },
  {
    value: '4',
    label:
      'Grupo 4 – No controle de inscrição (participantes e palestrantes), certificados e controle das atividades',
  },
  {
    value: '5',
    label:
      'Grupo 5 – Na infra-estrutura tecnológica (rede local e wifi, servidores e repositórios)',
  },
  {
    value: '6',
    label: 'Grupo 6 – Na oficina de instalação (InstallFest) e gravação de imagens em mídias',
  },
  { value: '7', label: 'Grupo 7 – Temário (Outras palestras, Oficinas e Mini-cursos)' },
  { value: '8', label: 'Grupo 8 – Sistema de inscrição' },
  { value: '9', label: 'Grupo 9 – Organização de salas' },
  { value: '10', label: 'Grupo 10 – Visita e divulgação em outras IES e escolas' },
  { value: '11', label: 'Grupo 11 – Filmagem, fotografia e documentário do evento' },
  { value: '12', label: 'Grupo 12 – Arte Gráfica e material gráfico' },
  {
    value: '13',
    label: 'Grupo 13 – Comunicação colaborativa (divulgação em tempo real nas redes sociais)',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-form-collaborator',
  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    PageStructure,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatRadioGroup,
    MatRadioButton,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    MatCheckbox,
    MatButton,
    MatIcon,
    MatIconButton,
  ],
  templateUrl: './form-collaborator.html',
  styleUrl: './form-collaborator.scss',
})
export class FormCollaborator implements OnInit, OnDestroy {
  public submittedSig: WritableSignal<boolean> = signal<boolean>(false);
  public restoredSig: WritableSignal<boolean> = signal(false);

  public form!: FormGroup;

  public readonly distros: SelectOption[] = DISTROS;
  public readonly studentOptions: SelectOption[] = STUDENT_OPTIONS;
  public readonly shiftOptions: SelectOption[] = SHIFT_OPTIONS;
  public readonly collaborationAreas: SelectOption[] = COLLABORATION_AREAS;

  public selectedShifts: string[] = [];
  public selectedAreas: string[] = [];

  public filteredDistros$!: Observable<SelectOption[]>;

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
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, phoneValidator]],
      usesFreeSoftware: ['', Validators.required],
      distro: ['', Validators.required],
      isStudent: ['', Validators.required],
      institution: ['', [Validators.required, Validators.minLength(3)]],
    });

    this.filteredDistros$ = this.form.get('distro')!.valueChanges.pipe(
      startWith(''),
      takeUntil(this.destroy$),
      map((v) => this._filter(v ?? '', this.distros)),
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
  public applyPhoneMask(event: Event): void {
    const input = event.target as HTMLInputElement;
    let v = input.value.replace(/\D/g, '').slice(0, 11);
    if (v.length > 10) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    else if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
    else if (v.length > 0) v = `(${v}`;
    this.form.get('phone')!.setValue(v, { emitEvent: true });
  }

  // ── Checkbox helpers ───────────────────────────────────────────────────────
  public isShiftSelected(value: string): boolean {
    return this.selectedShifts.includes(value);
  }

  public toggleShift(value: string): void {
    this.selectedShifts = this.isShiftSelected(value)
      ? this.selectedShifts.filter((v) => v !== value)
      : [...this.selectedShifts, value];
    this.saveCheckboxesToStorage();
  }

  public isAreaSelected(value: string): boolean {
    return this.selectedAreas.includes(value);
  }

  public toggleArea(value: string): void {
    this.selectedAreas = this.isAreaSelected(value)
      ? this.selectedAreas.filter((v) => v !== value)
      : [...this.selectedAreas, value];
    this.saveCheckboxesToStorage();
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
    if (!this.submittedSig() && !ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'Este campo é obrigatório.';
    if (ctrl.hasError('minlength'))
      return `Mínimo de ${ctrl.errors!['minlength'].requiredLength} caracteres.`;
    if (ctrl.hasError('email')) return 'Informe um e-mail válido.';
    if (ctrl.hasError('phoneInvalid')) return 'Número de telefone inválido.';
    return null;
  }

  public hasError(controlName: string): boolean {
    return !!this.getError(controlName);
  }

  // ── Submit / Back ──────────────────────────────────────────────────────────
  public onSubmit(event: Event): void {
    event.preventDefault();
    this.submittedSig.set(true);
    this.form.markAllAsTouched();

    if (this.form.invalid || !this.selectedShifts.length || !this.selectedAreas.length) return;

    this.router.navigate(['/subscribe/collaborator/review'], {
      state: {
        payload: {
          ...this.form.getRawValue(),
          shifts: this.selectedShifts,
          collaborationAreas: this.selectedAreas,
        },
      },
    });
  }

  public onBack(): void {
    this.router.navigate(['/subscribe']);
  }

  // ── Storage ────────────────────────────────────────────────────────────────
  private restoreFromStorage(): void {
    try {
      const savedForm = this.storage.load<Record<string, unknown>>(KEY_COLLABORATOR, {});
      if (Object.keys(savedForm).length > 0) {
        this.form.patchValue(savedForm, { emitEvent: false });
      }

      const savedShifts = this.storage.load<string[]>(KEY_SHIFTS, []);
      if (savedShifts.length) this.selectedShifts = savedShifts;

      const savedAreas = this.storage.load<string[]>(KEY_AREAS, []);
      if (savedAreas.length) this.selectedAreas = savedAreas;
    } catch (err) {
      console.error('FormCollaborator: error restoring storage', err);
    }
  }

  private setupAutoSave(): void {
    this.form.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => this.saveFormToStorage());
  }

  private saveFormToStorage(): void {
    this.storage.save(KEY_COLLABORATOR, this.form.getRawValue());
  }

  private saveCheckboxesToStorage(): void {
    this.storage.save(KEY_SHIFTS, this.selectedShifts);
    this.storage.save(KEY_AREAS, this.selectedAreas);
  }

  private clearStorage(): void {
    this.storage.clear(KEY_COLLABORATOR);
    this.storage.clear(KEY_SHIFTS);
    this.storage.clear(KEY_AREAS);
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
