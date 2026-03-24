import {
  Component,
  ElementRef,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
  ViewChild,
  WritableSignal
} from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatError, MatFormField, MatInput, MatLabel } from '@angular/material/input';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import { MatAutocomplete, MatAutocompleteTrigger, MatOption } from '@angular/material/autocomplete';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe, CommonModule } from '@angular/common';
import { map, Observable, startWith, Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { SelectOption, TEMAS, TIPOS, TURNOS } from '../../../constants/form-options';
import { buildDisplayLabel, filterTranslatedOptions, getControlError } from '../../../forms/form-field/form-field';

/** Maximum allowed slide size in bytes (10 MB). */
const SLIDE_MAX_BYTES = 10 * 1024 * 1024;

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

  readonly temas: SelectOption[] = TEMAS;
  readonly tipos: SelectOption[] = TIPOS;
  readonly turnos: SelectOption[] = TURNOS;

  filteredTemas$!: Observable<SelectOption[]>;

  /** Translation key for the current file-size error, or null when valid. */
  readonly slideSizeErrorKey: WritableSignal<string | null> = signal(null);

  /** Name of the rejected file, used as the {{ name }} param in the error message. */
  readonly slideRejectedName: WritableSignal<string> = signal('');

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly translate: TranslateService) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.filteredTemas$ = this.group()
      .get('tema')!
      .valueChanges.pipe(
        startWith(''),
        takeUntil(this.destroy$),
        map((v) => filterTranslatedOptions(v ?? '', TEMAS, this.translate)),
      );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Autocomplete helpers ───────────────────────────────────────────────────

  displayTema = (value: string): string => buildDisplayLabel(TEMAS, this.translate)(value);

  selectTema(option: SelectOption): void {
    this.group().get('tema')!.setValue(option.value);
  }

  // ── File input ─────────────────────────────────────────────────────────────

  onSlideSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;

    if (!file) {
      this.slideSizeErrorKey.set(null);
      this.slideRejectedName.set('');
      this.slideFileChange.emit(null);
      return;
    }

    if (file.size > SLIDE_MAX_BYTES) {
      this.slideFileInput.nativeElement.value = '';
      this.slideSizeErrorKey.set('fileSizeError.slide');
      this.slideRejectedName.set(file.name);
      return;
    }

    this.slideSizeErrorKey.set(null);
    this.slideRejectedName.set('');
    this.slideFileChange.emit(file);
  }

  onSlideRemove(event: MouseEvent): void {
    event.stopPropagation();
    this.slideFileInput.nativeElement.value = '';
    this.slideSizeErrorKey.set(null);
    this.slideRejectedName.set('');
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

  getError(controlName: string): string | null {
    return getControlError(this.group().get(controlName), this.submitted(), this.translate);
  }

  hasError(controlName: string): boolean {
    return !!this.getError(controlName);
  }
}
