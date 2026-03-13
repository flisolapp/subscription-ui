import { Component, ElementRef, input, OnDestroy, OnInit, output, ViewChild } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe, CommonModule } from '@angular/common';
import { map, Observable, startWith, Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SelectOption } from '../../form-participant/form-participant';

// ── Static data - labels are translation keys ─────────────────────────────────
export const TEMAS: SelectOption[] = [
  { value: 'administracao-de-sistemas', label: 'formSpeaker.temas.administracaoDeSistemas' },
  { value: 'banco-de-dados', label: 'formSpeaker.temas.bancoDeDados' },
  { value: 'cultura-livre', label: 'formSpeaker.temas.culturaLivre' },
  { value: 'desktop', label: 'formSpeaker.temas.desktop' },
  { value: 'desenvolvimento-de-software', label: 'formSpeaker.temas.desenvolvimentoDeSoftware' },
  { value: 'devops-sre', label: 'formSpeaker.temas.devopsSre' },
  { value: 'educacao', label: 'formSpeaker.temas.educacao' },
  { value: 'embarcados-iot', label: 'formSpeaker.temas.embarcadosIot' },
  { value: 'infraestrutura', label: 'formSpeaker.temas.infraestrutura' },
  { value: 'jogos', label: 'formSpeaker.temas.jogos' },
  { value: 'kernel', label: 'formSpeaker.temas.kernel' },
  { value: 'redes', label: 'formSpeaker.temas.redes' },
  { value: 'seguranca', label: 'formSpeaker.temas.seguranca' },
  { value: 'web', label: 'formSpeaker.temas.web' },
  { value: 'outro', label: 'formSpeaker.temas.outro' },
];

export const TIPOS: SelectOption[] = [
  { value: 'palestra', label: 'formSpeaker.types.talk' },
  { value: 'oficina', label: 'formSpeaker.types.workshop' },
];

export const TURNOS: SelectOption[] = [
  { value: 'manha', label: 'formSpeaker.shifts.morning' },
  { value: 'tarde', label: 'formSpeaker.shifts.afternoon' },
  { value: 'sem-preferencia', label: 'formSpeaker.shifts.noPreference' },
];

// ── Component ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-talk-card',
  imports: [
    CommonModule,
    AsyncPipe,
    ReactiveFormsModule,
    TranslatePipe,
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

  constructor(private readonly translate: TranslateService) {}

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
  displayTema = (value: string): string => {
    const found = TEMAS.find((t) => t.value === value);
    return found ? this.translate.instant(found.label) : (value ?? '');
  };

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
    if (ctrl.hasError('required')) return this.translate.instant('common.required');
    return null;
  }

  // ── Private ────────────────────────────────────────────────────────────────
  private _filterTemas(val: string): SelectOption[] {
    if (!val || TEMAS.some((t) => t.value === val)) return TEMAS;
    const q = val.toLowerCase();
    // Filter against translated labels for a better UX
    return TEMAS.filter((t) => {
      const translated = this.translate.instant(t.label).toLowerCase();
      return translated.includes(q) || t.value.toLowerCase().includes(q);
    });
  }
}
