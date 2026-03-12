import { Component, ElementRef, input, OnDestroy, OnInit, output, ViewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe, CommonModule } from '@angular/common';
import { map, Observable, startWith, Subject, takeUntil } from 'rxjs';
import { SelectOption } from '../../form-participant/form-participant'; // adjust path as needed

// ── Static data ───────────────────────────────────────────────────────────────
export const TEMAS: SelectOption[] = [
  { value: 'administracao-de-sistemas', label: 'Administração de Sistemas' },
  { value: 'banco-de-dados', label: 'Banco de Dados' },
  { value: 'cultura-livre', label: 'Cultura Livre' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'desenvolvimento-de-software', label: 'Desenvolvimento de Software' },
  { value: 'devops-sre', label: 'DevOps / SRE' },
  { value: 'educacao', label: 'Educação' },
  { value: 'embarcados-iot', label: 'Embarcados / IoT' },
  { value: 'infraestrutura', label: 'Infraestrutura' },
  { value: 'jogos', label: 'Jogos' },
  { value: 'kernel', label: 'Kernel' },
  { value: 'redes', label: 'Redes' },
  { value: 'seguranca', label: 'Segurança' },
  { value: 'web', label: 'Web' },
  { value: 'outro', label: 'Outro' },
];

export const TIPOS: SelectOption[] = [
  { value: 'palestra', label: 'Palestra (1 hora)' },
  { value: 'oficina', label: 'Oficina (2 horas)' },
];

export const TURNOS: SelectOption[] = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'sem-preferencia', label: 'Sem preferência' },
];

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-talk-card',
  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatRadioGroup,
    MatRadioButton,
    MatAutocomplete,
    MatAutocompleteTrigger,
    MatOption,
    MatIconButton,
    MatIcon,
  ],
  templateUrl: './talk-card.html',
  styleUrl: './talk-card.scss',
})
export class TalkCard implements OnInit, OnDestroy {
  readonly group = input.required<FormGroup>();
  readonly idx = input.required<number>();
  readonly total = input(1);
  readonly slideFile = input<File | null>(null);
  readonly submitted = input(false);

  readonly remove = output<void>();
  readonly slideFileChange = output<File | null>();

  @ViewChild('slideFileInput') private slideFileInput!: ElementRef<HTMLInputElement>;

  readonly temas = TEMAS;
  readonly tipos = TIPOS;
  readonly turnos = TURNOS;

  filteredTemas$!: Observable<SelectOption[]>;

  private readonly destroy$ = new Subject<void>();

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.filteredTemas$ = this.group()
      .get('tema')!
      .valueChanges.pipe(
        startWith(''),
        takeUntil(this.destroy$),
        map((v) => this._filterTemas(v ?? '')),
      );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Autocomplete helpers ───────────────────────────────────────────────────
  displayTema(value: string): string {
    return TEMAS.find((t) => t.value === value)?.label ?? value ?? '';
  }

  selectTema(option: SelectOption): void {
    this.group().get('tema')!.setValue(option.value);
  }

  // ── File input ─────────────────────────────────────────────────────────────
  onSlideSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.slideFileChange.emit(file);
  }

  onSlideRemove(event: MouseEvent): void {
    event.stopPropagation();
    this.slideFileInput.nativeElement.value = '';
    this.slideFileChange.emit(null);
  }

  downloadSlide(): void {
    const file = this.slideFile();
    if (!file) return;
    const url = URL.createObjectURL(file);
    Object.assign(document.createElement('a'), { href: url, download: file.name }).click();
    URL.revokeObjectURL(url);
  }

  // ── Validation helpers ─────────────────────────────────────────────────────
  hasError(controlName: string): boolean {
    return !!this.getError(controlName);
  }

  getError(controlName: string): string | null {
    const ctrl = this.group().get(controlName);
    if (!ctrl) return null;
    if (!this.submitted() && !ctrl.touched) return null;
    if (ctrl.hasError('required')) return 'Este campo é obrigatório.';
    return null;
  }

  // ── Private ────────────────────────────────────────────────────────────────
  private _filterTemas(val: string): SelectOption[] {
    if (!val || TEMAS.some((t) => t.value === val)) return TEMAS;
    const q = val.toLowerCase();
    return TEMAS.filter(
      (t) => t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q),
    );
  }
}
