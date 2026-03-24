/**
 * review-sections.builder.ts
 *
 * Pure functions that convert the raw form payload (passed via router state)
 * into a ConfirmationSection[] ready for <app-form-review>.
 *
 * A TranslateFn callback is received from FormReview so this module stays
 * free of Angular DI while still producing fully-translated labels.
 *
 * All option datasets are imported from the centralised form-options constants
 * file — never from component files.
 */

import { ConfirmationSection } from './form-review';
import {
  COLLABORATION_AREAS,
  DISTROS,
  SHIFT_OPTIONS,
  STATES_BR,
  STUDENT_OPTIONS,
  TEMAS,
  TIPOS,
  TURNOS,
} from '../../constants/form-options';

// ── Translate callback type ────────────────────────────────────────────────────

export type TranslateFn = (key: string, params?: Record<string, unknown>) => string;

// ── Lookup helpers ────────────────────────────────────────────────────────────

/** Resolves a plain-text label (e.g. distro names, state names). */
function lbl(options: ReadonlyArray<{ value: string; label: string }>, value: unknown): string {
  return options.find((o) => o.value === String(value ?? ''))?.label ?? String(value ?? '-');
}

/** Resolves a translation-key label via the translate callback. */
function lblT(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: unknown,
  t: TranslateFn,
): string {
  const found = options.find((o) => o.value === String(value ?? ''));
  return found ? t(found.label) : String(value ?? '-');
}

// ══════════════════════════════════════════════════════════════════════════════
// Participant
// ══════════════════════════════════════════════════════════════════════════════

export function buildParticipantSections(
  data: Record<string, unknown>,
  t: TranslateFn,
): ConfirmationSection[] {
  return [
    {
      fields: [
        { label: t('formReview.fields.name'), value: String(data['name'] ?? '') },
        { label: t('formReview.fields.federalCode'), value: String(data['federalCode'] ?? '') },
        { label: t('formReview.fields.email'), value: String(data['email'] ?? ''), inline: true },
        { label: t('formReview.fields.phone'), value: String(data['phone'] ?? ''), inline: true },
        {
          label: t('formReview.fields.usesFreeSoftware'),
          value: data['usesFreeSoftware'] === 'yes' ? t('common.yes') : t('common.no'),
        },
        { label: t('formReview.fields.distro'), value: lbl(DISTROS, data['distro']) },
        {
          label: t('formReview.fields.academicStatus'),
          value: lblT(STUDENT_OPTIONS, data['isStudent'], t),
        },
        {
          label: t('formReview.fields.institution'),
          value: String(data['institution'] ?? ''),
          inline: true,
        },
        { label: t('formReview.fields.course'), value: String(data['course'] ?? ''), inline: true },
        { label: t('formReview.fields.state'), value: lbl(STATES_BR, data['state']) },
      ],
    },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// Collaborator
// ══════════════════════════════════════════════════════════════════════════════

export function buildCollaboratorSections(
  data: Record<string, unknown>,
  t: TranslateFn,
): ConfirmationSection[] {
  const shifts = (data['shifts'] as string[] | undefined) ?? [];
  const areas = (data['collaborationAreas'] as string[] | undefined) ?? [];

  return [
    {
      fields: [
        { label: t('formReview.fields.name'), value: String(data['name'] ?? '') },
        { label: t('formReview.fields.email'), value: String(data['email'] ?? ''), inline: true },
        { label: t('formReview.fields.phone'), value: String(data['phone'] ?? ''), inline: true },
        {
          label: t('formReview.fields.usesFreeSoftware'),
          value: data['usesFreeSoftware'] === 'yes' ? t('common.yes') : t('common.no'),
        },
        { label: t('formReview.fields.distro'), value: lbl(DISTROS, data['distro']) },
        {
          label: t('formReview.fields.academicStatus'),
          value: lblT(STUDENT_OPTIONS, data['isStudent'], t),
        },
        { label: t('formReview.fields.institution'), value: String(data['institution'] ?? '') },
      ],
    },
    {
      title: t('formCollaborator.availabilityLabel'),
      tagLayout: true,
      fields: shifts.map((v) => ({ label: lblT(SHIFT_OPTIONS, v, t), value: '' })),
    },
    {
      title: t('formCollaborator.areasLabel'),
      tagLayout: true,
      fields: areas.map((v) => ({ label: lblT(COLLABORATION_AREAS, v, t), value: '' })),
    },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// Speaker
// ══════════════════════════════════════════════════════════════════════════════

export function buildSpeakerSections(
  data: Record<string, unknown>,
  t: TranslateFn,
): ConfirmationSection[] {
  const speakers = (data['speakers'] as Array<Record<string, unknown>>) ?? [];
  const talks = (data['talks'] as Array<Record<string, unknown>>) ?? [];
  const sections: ConfirmationSection[] = [];

  speakers.forEach((sp, i) => {
    sections.push({
      title:
        speakers.length > 1
          ? t('formReview.sections.speakerN', { n: i + 1 })
          : t('formReview.sections.speaker'),
      cardLayout: true,
      fields: [
        { label: t('formReview.fields.photo'), value: '', image: sp['photo'] as File | null },
        { label: t('formReview.fields.name'), value: String(sp['name'] ?? '') },
        // federalCode is shown inline beside email so the card stays compact
        {
          label: t('formReview.fields.federalCode'),
          value: String(sp['federalCode'] ?? ''),
          inline: true,
        },
        { label: t('formReview.fields.email'), value: String(sp['email'] ?? ''), inline: true },
        { label: t('formReview.fields.phone'), value: String(sp['phone'] ?? '') },
        { label: t('formReview.fields.site'), value: String(sp['site'] ?? '') },
        { label: t('formReview.fields.minicurriculo'), value: String(sp['minicurriculo'] ?? '') },
      ],
    });
  });

  talks.forEach((tk, i) => {
    sections.push({
      title:
        talks.length > 1
          ? t('formReview.sections.talkN', { n: i + 1 })
          : t('formReview.sections.talk'),
      fields: [
        {
          label: t('formReview.fields.talkTitle'),
          value: String(tk['titulo'] ?? ''),
          fullWidth: true,
        },
        {
          label: t('formReview.fields.talkDescription'),
          value: String(tk['descricao'] ?? ''),
          fullWidth: true,
        },
        { label: t('formReview.fields.shift'), value: lblT(TURNOS, tk['turno'], t), inline: true },
        { label: t('formReview.fields.type'), value: lblT(TIPOS, tk['tipo'], t), inline: true },
        { label: t('formReview.fields.subject'), value: lblT(TEMAS, tk['tema'], t) },
        ...(tk['slideUrl']
          ? [{ label: t('formReview.fields.slideUrl'), value: String(tk['slideUrl']) }]
          : []),
        ...(tk['slideFile']
          ? [{ label: t('formReview.fields.slideFile'), value: (tk['slideFile'] as File).name }]
          : []),
      ],
    });
  });

  return sections;
}
