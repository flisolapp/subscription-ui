import { Component, computed, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { debounceTime, Subject, takeUntil } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { PageStructure } from '../../components/page-structure/page-structure';
import { FormStorageService } from '../../services/form-storage/form-storage-service';
import { CustomValidators } from '../../forms/custom-validators/custom-validators';
import { FILE_PREFIXES, STORAGE_KEYS } from '../../constants/storage-keys';
import { SpeakerCard } from './speaker-card/speaker-card';
import { TalkCard } from './talk-card/talk-card';
import { SpeakerFormNav } from './speaker-form-nav/speaker-form-nav';
import { SNACK_DURATION } from '../../app.config';

// ── Serialisation helpers ─────────────────────────────────────────────────────

interface SerializedSpeaker {
  name: string;
  federalCode: string;
  email: string;
  phone: string;
  minicurriculo: string;
  site: string;
  hasPhoto: boolean;
  photoName?: string;
}

interface SerializedTalk {
  titulo: string;
  descricao: string;
  turno: string;
  tipo: string;
  tema: string;
  slideUrl: string;
  hasSlide: boolean;
  slideName?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-form-speaker',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    PageStructure,
    SpeakerCard,
    TalkCard,
    SpeakerFormNav,
    MatButton,
    MatIcon,
    MatIconButton,
  ],
  templateUrl: './form-speaker.html',
  styleUrl: './form-speaker.scss',
})
export class FormSpeaker implements OnInit, OnDestroy {
  public submittedSig: WritableSignal<boolean> = signal(false);
  public restoredSig: WritableSignal<boolean> = signal(false);

  public form!: FormGroup;

  public speakerPhotos: WritableSignal<(File | null)[]> = signal([null]);
  public slideFiles: WritableSignal<(File | null)[]> = signal([null]);

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
      speakers: this.fb.array([this.createSpeakerGroup()]),
      talks: this.fb.array([this.createTalkGroup()]),
    });

    this.restoreFromStorage().then(() => {
      this.restoredSig.set(true);
      this.setupAutoSave();
    });
  }

  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── FormArray accessors ────────────────────────────────────────────────────

  get speakersArray(): FormArray {
    return this.form.get('speakers') as FormArray;
  }

  get talksArray(): FormArray {
    return this.form.get('talks') as FormArray;
  }

  speakerGroup(i: number): FormGroup {
    return this.speakersArray.at(i) as FormGroup;
  }

  talkGroup(i: number): FormGroup {
    return this.talksArray.at(i) as FormGroup;
  }

  // ── Speaker CRUD ───────────────────────────────────────────────────────────

  public addSpeaker(): void {
    this.speakersArray.push(this.createSpeakerGroup());
    this.speakerPhotos.update((arr) => [...arr, null]);
  }

  public removeSpeaker(idx: number): void {
    this.speakersArray.removeAt(idx);
    this.speakerPhotos.update((arr) => arr.filter((_, i) => i !== idx));
  }

  public updateSpeakerPhoto(idx: number, file: File | null): void {
    this.speakerPhotos.update((arr) => {
      const next = [...arr];
      next[idx] = file;
      return next;
    });

    const fileKey = `${FILE_PREFIXES.SPEAKER}foto_${idx}`;
    if (file) {
      this.storage.saveFile(fileKey, file).catch(console.error);
    } else {
      this.storage.deleteFile(fileKey).catch(console.error);
    }

    this.saveTextDataToStorage();
  }

  // ── Talk CRUD ──────────────────────────────────────────────────────────────

  public addTalk(): void {
    this.talksArray.push(this.createTalkGroup());
    this.slideFiles.update((arr) => [...arr, null]);
  }

  public removeTalk(idx: number): void {
    this.talksArray.removeAt(idx);
    this.slideFiles.update((arr) => arr.filter((_, i) => i !== idx));
  }

  public updateSlideFile(idx: number, file: File | null): void {
    this.slideFiles.update((arr) => {
      const next = [...arr];
      next[idx] = file;
      return next;
    });

    const fileKey = `${FILE_PREFIXES.SPEAKER}slide_${idx}`;
    if (file) {
      this.storage.saveFile(fileKey, file).catch(console.error);
    } else {
      this.storage.deleteFile(fileKey).catch(console.error);
    }

    this.saveTextDataToStorage();
  }

  // ── Navigation helpers ─────────────────────────────────────────────────────

  get showNav(): boolean {
    return this.speakersArray.length + this.talksArray.length > 2;
  }

  readonly speakerNavItems = computed(() =>
    this.speakersArray.controls.map((ctrl, i) => ({
      label:
        (ctrl.get('name')?.value as string) ||
        this.translate.instant('formSpeaker.speakerCard.title', { n: i + 1 }),
      hasError: this.submittedSig() && (ctrl.invalid || !this.speakerPhotos()[i]),
      anchorId: `speaker-${i}`,
    })),
  );

  readonly talkNavItems = computed(() =>
    this.talksArray.controls.map((ctrl, i) => ({
      label:
        (ctrl.get('titulo')?.value as string) ||
        this.translate.instant('formSpeaker.talkCard.title', { n: i + 1 }),
      hasError: this.submittedSig() && ctrl.invalid,
      anchorId: `talk-${i}`,
    })),
  );

  // ── Submit / Back ──────────────────────────────────────────────────────────

  public onSubmit(event: Event): void {
    event.preventDefault();
    this.submittedSig.set(true);
    this.form.markAllAsTouched();

    const photosValid = this.speakerPhotos().every((p) => p !== null);
    if (this.form.invalid || !photosValid) {
      this.snackBar.open(
        this.translate.instant('formErrors.summaryWithBlocks'),
        this.translate.instant('common.ok'),
        {
          duration: SNACK_DURATION,
        },
      );
      return;
    }

    this.router.navigate(['/subscribe/speaker/review'], {
      state: {
        payload: {
          speakers: this.speakersArray.getRawValue().map((s, i) => ({
            ...s,
            photo: this.speakerPhotos()[i],
          })),
          talks: this.talksArray.getRawValue().map((t, i) => ({
            ...t,
            slideFile: this.slideFiles()[i],
          })),
        },
      },
    });
  }

  public onBack(): void {
    this.router.navigate(['/subscribe']);
  }

  // ── Storage ────────────────────────────────────────────────────────────────

  private async restoreFromStorage(): Promise<void> {
    try {
      const savedSpeakers = this.storage.load<SerializedSpeaker[]>(STORAGE_KEYS.SPEAKERS, []);
      const savedTalks = this.storage.load<SerializedTalk[]>(STORAGE_KEYS.TALKS, []);

      if (savedSpeakers.length > 0) {
        while (this.speakersArray.length < savedSpeakers.length)
          this.speakersArray.push(this.createSpeakerGroup());
        while (this.speakersArray.length > savedSpeakers.length)
          this.speakersArray.removeAt(this.speakersArray.length - 1);

        savedSpeakers.forEach((s, i) =>
          this.speakersArray.at(i).patchValue(s, { emitEvent: false }),
        );

        const photos = await Promise.all(
          savedSpeakers.map((s, i) =>
            s.hasPhoto
              ? this.storage.loadFile(`${FILE_PREFIXES.SPEAKER}foto_${i}`).catch(() => null)
              : Promise.resolve(null),
          ),
        );
        this.speakerPhotos.set(photos);
      }

      if (savedTalks.length > 0) {
        while (this.talksArray.length < savedTalks.length)
          this.talksArray.push(this.createTalkGroup());
        while (this.talksArray.length > savedTalks.length)
          this.talksArray.removeAt(this.talksArray.length - 1);

        savedTalks.forEach((t, i) => this.talksArray.at(i).patchValue(t, { emitEvent: false }));

        const slides = await Promise.all(
          savedTalks.map((t, i) =>
            t.hasSlide
              ? this.storage.loadFile(`${FILE_PREFIXES.SPEAKER}slide_${i}`).catch(() => null)
              : Promise.resolve(null),
          ),
        );
        this.slideFiles.set(slides);
      }
    } catch (err) {
      console.error('FormSpeaker: error restoring storage', err);
    }
  }

  private setupAutoSave(): void {
    this.form.valueChanges
      .pipe(debounceTime(400), takeUntil(this.destroy$))
      .subscribe(() => this.saveTextDataToStorage());
  }

  private saveTextDataToStorage(): void {
    const speakers: SerializedSpeaker[] = this.speakersArray.getRawValue().map((s, i) => ({
      ...s,
      hasPhoto: !!this.speakerPhotos()[i],
      photoName: this.speakerPhotos()[i]?.name,
    }));

    const talks: SerializedTalk[] = this.talksArray.getRawValue().map((t, i) => ({
      ...t,
      hasSlide: !!this.slideFiles()[i],
      slideName: this.slideFiles()[i]?.name,
    }));

    this.storage.save(STORAGE_KEYS.SPEAKERS, speakers);
    this.storage.save(STORAGE_KEYS.TALKS, talks);
  }

  private async clearStorage(): Promise<void> {
    this.storage.clear(STORAGE_KEYS.SPEAKERS);
    this.storage.clear(STORAGE_KEYS.TALKS);
    await this.storage.clearFilesByPrefix(FILE_PREFIXES.SPEAKER);
  }

  // ── Factory helpers ────────────────────────────────────────────────────────

  private createSpeakerGroup(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      federalCode: ['', [Validators.required, CustomValidators.cpfValidator]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, CustomValidators.phoneValidator]],
      minicurriculo: ['', [Validators.required, Validators.minLength(10)]],
      site: [''],
    });
  }

  private createTalkGroup(): FormGroup {
    return this.fb.group({
      titulo: ['', Validators.required],
      descricao: ['', Validators.required],
      turno: ['', Validators.required],
      tipo: ['', Validators.required],
      tema: ['', Validators.required],
      slideUrl: [''],
    });
  }
}
