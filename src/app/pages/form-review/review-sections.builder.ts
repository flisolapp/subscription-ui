/**
 * review-sections.builder.ts
 *
 * Pure functions that convert the raw form payload (passed via router state)
 * into a ConfirmationSection[] ready for <app-form-review>.
 */

import { ConfirmationSection } from './form-review';
import { DISTROS, STATES_BR, STUDENT_OPTIONS } from '../form-participant/form-participant';
import { COLLABORATION_AREAS, SHIFT_OPTIONS } from '../form-collaborator/form-collaborator';

// ── Shared lookup helper ───────────────────────────────────────────────────────
function lbl(options: ReadonlyArray<{ value: string; label: string }>, value: unknown): string {
  return options.find((o) => o.value === String(value ?? ''))?.label ?? String(value ?? '—');
}

// ══════════════════════════════════════════════════════════════════════════════
// Participant  →  title "Inscreva-se"
// ══════════════════════════════════════════════════════════════════════════════
export function buildParticipantSections(data: Record<string, unknown>): ConfirmationSection[] {
  return [
    {
      fields: [
        { label: 'Nome', value: String(data['name'] ?? '') },
        { label: 'CPF', value: String(data['federalCode'] ?? '') },
        { label: 'E-mail', value: String(data['email'] ?? ''), inline: true },
        { label: 'Telefone', value: String(data['phone'] ?? ''), inline: true },
        { label: 'Usa software livre', value: data['usesFreeSoftware'] === 'sim' ? 'Sim' : 'Não' },
        { label: 'Distribuição Linux', value: lbl(DISTROS, data['distro']) },
        { label: 'Situação acadêmica', value: lbl(STUDENT_OPTIONS, data['isStudent']) },
        { label: 'Instituição', value: String(data['institution'] ?? ''), inline: true },
        { label: 'Curso', value: String(data['course'] ?? ''), inline: true },
        { label: 'Estado', value: lbl(STATES_BR, data['state']) },
      ],
    },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// Collaborator  →  title "Quero colaborar"
// ══════════════════════════════════════════════════════════════════════════════
export function buildCollaboratorSections(data: Record<string, unknown>): ConfirmationSection[] {
  const shifts = (data['shifts'] as string[] | undefined) ?? [];
  const areas = (data['collaborationAreas'] as string[] | undefined) ?? [];

  return [
    {
      fields: [
        { label: 'Nome', value: String(data['name'] ?? '') },
        { label: 'E-mail', value: String(data['email'] ?? ''), inline: true },
        { label: 'Telefone', value: String(data['phone'] ?? ''), inline: true },
        { label: 'Usa software livre', value: data['usesFreeSoftware'] === 'sim' ? 'Sim' : 'Não' },
        { label: 'Distribuição Linux', value: lbl(DISTROS, data['distro']) },
        { label: 'Situação acadêmica', value: lbl(STUDENT_OPTIONS, data['isStudent']) },
        { label: 'Instituição', value: String(data['institution'] ?? '') },
      ],
    },
    {
      title: 'Disponibilidade',
      tagLayout: true,
      fields: shifts.map((v) => ({ label: lbl(SHIFT_OPTIONS, v), value: '' })),
    },
    {
      title: 'Áreas de colaboração',
      tagLayout: true,
      fields: areas.map((v) => ({ label: lbl(COLLABORATION_AREAS, v), value: '' })),
    },
  ];
}

// ══════════════════════════════════════════════════════════════════════════════
// Speaker  →  title "Submissão de palestras"
// ══════════════════════════════════════════════════════════════════════════════
export function buildSpeakerSections(data: Record<string, unknown>): ConfirmationSection[] {
  const speakers = (data['speakers'] as Array<Record<string, unknown>>) ?? [];
  const talks = (data['talks'] as Array<Record<string, unknown>>) ?? [];
  const sections: ConfirmationSection[] = [];

  speakers.forEach((sp, i) => {
    sections.push({
      title: speakers.length > 1 ? `Palestrante ${i + 1}` : 'Palestrante',
      cardLayout: true,
      fields: [
        { label: 'Foto', value: '', image: sp['photo'] as File | null },
        { label: 'Nome', value: String(sp['name'] ?? '') },
        { label: 'E-mail', value: String(sp['email'] ?? ''), inline: true },
        { label: 'Telefone', value: String(sp['phone'] ?? ''), inline: true },
        { label: 'Site', value: String(sp['site'] ?? '') },
        { label: 'Mini currículo', value: String(sp['minicurriculo'] ?? '') },
      ],
    });
  });

  talks.forEach((tk, i) => {
    sections.push({
      title: talks.length > 1 ? `Atividade ${i + 1}` : 'Atividade',
      fields: [
        { label: 'Título', value: String(tk['titulo'] ?? '') },
        { label: 'Descrição', value: String(tk['descricao'] ?? '') },
        { label: 'Turno', value: String(tk['turno'] ?? ''), inline: true },
        { label: 'Tipo', value: String(tk['tipo'] ?? ''), inline: true },
        { label: 'Tema', value: String(tk['temaLabel'] ?? tk['tema'] ?? '') },
        ...(tk['slideUrl'] ? [{ label: 'URL do slide', value: String(tk['slideUrl']) }] : []),
        ...(tk['slideFile']
          ? [{ label: 'Arquivo de slide', value: (tk['slideFile'] as File).name }]
          : []),
      ],
    });
  });

  return sections;
}
